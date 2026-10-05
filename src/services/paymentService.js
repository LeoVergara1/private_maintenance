import {
  collection,
  addDoc,
  query,
  where,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { getCachedData, setCachedData, clearCache } from '../utils/cacheManager';
import { getUserByHouseNumber } from './userService';
import { generateReceiptNumber } from '../utils/receiptGenerator';

/**
 * Check if payment already exists for user in specific month/year
 * IMPORTANT: Does NOT use cache - always reads fresh from Firestore
 * This is critical for accurate payment status
 */
export const checkDuplicatePayment = async (userId, month, year) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('userId', '==', userId),
      where('month', '==', month),
      where('year', '==', year),
      limit(1) // Only need to know if it exists
    );
    
    const snapshot = await getDocs(q);
    const exists = !snapshot.empty;

    return exists;
  } catch (error) {
    console.error('Error al verificar pago duplicado:', error);
    throw error;
  }
};

/**
 * Check if payment already exists for house in specific month/year
 * This checks if ANY payment exists for the house (resident or admin uploaded)
 * Handles offset payments (isForOtherMonth) - only blocks if payment covers this month
 * IMPORTANT: Does NOT use cache - always reads fresh from Firestore
 */
export const checkDuplicatePaymentByHouse = async (houseNumber, month, year) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('houseNumber', '==', houseNumber),
      where('month', '==', month),
      where('year', '==', year),
      limit(5)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return false;

    // Check each payment found
    for (const paymentDoc of snapshot.docs) {
      const payment = paymentDoc.data();
      
      // Placeholder payments count as duplicate (they mark months as covered)
      if (payment.isPlaceholder) {
        return true;
      }
      
      // Normal payments (not offset) count as duplicate
      if (!payment.isForOtherMonth) {
        return true;
      }
      
      // Offset payments: only block if they cover the current month
      if (payment.isForOtherMonth && payment.coveredMonths) {
        if (payment.coveredMonths.includes(month)) {
          return true;
        }
      }
    }
    
    // No payment covers this month
    return false;
  } catch (error) {
    console.error('Error al verificar pago por casa:', error);
    throw error;
  }
};

/**
 * ¿Un documento cubre un periodo dado?
 * Cubre por mes directo (normal/placeholder) o vía coveredMonths desde otro mes
 * (pagos anticipados o del admin "para otros meses").
 * Los docs antiguos sin `coveredYear` asumen el año del propio documento.
 * @param {boolean} ignoreRejected - si true, los rechazados no cubren (para reintentos)
 */
export const doesPaymentCoverMonth = (payment, month, year, ignoreRejected = false) => {
  if (!payment) return false;
  if (ignoreRejected && payment.status === 'rejected') return false;

  // Documento del mismo periodo
  if (payment.month === month && payment.year === year) {
    if (payment.isPlaceholder) return true;
    if (!payment.isForOtherMonth) return true;
    if (Array.isArray(payment.coveredMonths) && payment.coveredMonths.includes(month)) return true;
    return false;
  }

  // Documento de otro mes que cubre este periodo (anticipado / offset del admin)
  if (
    payment.isForOtherMonth &&
    Array.isArray(payment.coveredMonths) &&
    payment.coveredMonths.includes(month)
  ) {
    return (payment.coveredYear ?? payment.year) === year;
  }

  return false;
};

/**
 * Pagos que cubren un periodo vía coveredMonths (anticipados u offsets del admin).
 * Se usa para que octubre no aparezca como impago cuando se adelantó en septiembre.
 */
export const getCoveringPayments = async (month, year) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('coveredMonths', 'array-contains', month)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => (p.coveredYear ?? p.year) === year);
  } catch (error) {
    console.error('Error al obtener pagos con cobertura:', error);
    throw error;
  }
};

/**
 * ¿Ya existe un pago (normal o anticipado) que cubra el periodo objetivo para esta casa?
 * Ignora rechazados para permitir reintentar.
 */
export const checkAdvanceExists = async (houseNumber, targetMonth, targetYear) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('houseNumber', '==', houseNumber),
      limit(40)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.some((d) =>
      doesPaymentCoverMonth({ ...d.data() }, targetMonth, targetYear, true)
    );
  } catch (error) {
    console.error('Error al verificar pago anticipado:', error);
    throw error;
  }
};

/**
 * Crea un pago anticipado del residente.
 * Se registra en el mes real del dinero (conciliación bancaria) con
 * referencia al mes cubierto, igual que el flujo manual del admin:
 * month/year = mes del abono, coveredMonths/coveredYear = mes cubierto.
 * Siempre queda en `pending` hasta validación del admin.
 *
 * Además crea el abono simbólico de $0 del mes cubierto (placeholder),
 * para que todas las consultas por mes (filtros del admin, duplicados,
 * casas sin pagar) lo encuentren sin lógica especial.
 */
export const createAdvancePayment = async ({
  userId,
  houseNumber,
  amount,
  receiptUrl,
  month,
  year,
  targetMonth,
  targetYear,
  receiptNumber,
  adminNotes = '',
}) => {
  const now = Timestamp.now();
  const mainData = {
    userId,
    houseNumber,
    amount,
    receiptUrl,
    month,
    year,
    isLate: false,
    status: 'pending',
    receiptNumber,
    isForOtherMonth: true,
    coveredMonths: [targetMonth],
    coveredYear: targetYear,
    isAdvance: true,
    placeholderId: null,
    adminNotes: adminNotes || `Pago anticipado de ${targetMonth}/${targetYear} registrado en ${month}/${year}`,
    createdAt: now,
    updatedAt: now,
  };
  const mainRef = await addDoc(collection(db, 'payments'), mainData);

  // Abono simbólico $0 del mes cubierto (mismo patrón que el admin)
  let placeholderId = null;
  try {
    const phRef = await addDoc(collection(db, 'payments'), {
      houseNumber,
      amount: 0,
      month: targetMonth,
      year: targetYear,
      userId,
      createdBy: null,
      isLate: false,
      status: 'pending',
      adminNotes: `Cobertura simbólica — anticipo registrado en ${month}/${year}`,
      manuallyCreated: false,
      isForOtherMonth: false,
      coveredMonths: [],
      coveredYear: targetYear,
      isPlaceholder: true,
      advanceId: mainRef.id,
      receiptUrl: null,
      receiptNumber: null,
      createdAt: now,
      updatedAt: now,
    });
    placeholderId = phRef.id;
    await updateDoc(mainRef, { placeholderId, updatedAt: Timestamp.now() });
  } catch (placeholderError) {
    console.error('Error al crear placeholder del anticipo (el pago principal sí se creó):', placeholderError);
  }

  return { id: mainRef.id, ...mainData, placeholderId };
};

/**
 * Aprueba un anticipo y su placeholder simbólico.
 */
export const approveAdvancePayment = async (advanceId, updates = {}) => {
  const mainRef = doc(db, 'payments', advanceId);
  const snap = await getDoc(mainRef);
  const data = snap.exists() ? snap.data() : {};
  await updateDoc(mainRef, { ...updates, status: 'approved', updatedAt: Timestamp.now() });
  if (data.placeholderId) {
    try {
      await updateDoc(doc(db, 'payments', data.placeholderId), {
        status: 'approved',
        updatedAt: Timestamp.now(),
      });
    } catch (e) {
      console.warn('Anticipo aprobado pero no se pudo aprobar su placeholder:', e);
    }
  }
};

/**
 * Rechaza un anticipo y elimina su placeholder para liberar el mes cubierto
 * (permite que el residente reintente).
 */
export const rejectAdvancePayment = async (advanceId, updates = {}) => {
  const mainRef = doc(db, 'payments', advanceId);
  const snap = await getDoc(mainRef);
  const data = snap.exists() ? snap.data() : {};
  await updateDoc(mainRef, { ...updates, status: 'rejected', updatedAt: Timestamp.now() });
  if (data.placeholderId) {
    try {
      await deleteDoc(doc(db, 'payments', data.placeholderId));
    } catch (e) {
      console.warn('Anticipo rechazado pero no se pudo eliminar su placeholder:', e);
    }
  }
};

/**
 * Elimina un anticipo junto con su placeholder (solo admin).
 */
export const deleteAdvancePayment = async (advance) => {
  if (advance?.placeholderId) {
    try {
      await deleteDoc(doc(db, 'payments', advance.placeholderId));
    } catch (e) {
      console.warn('No se pudo eliminar el placeholder del anticipo:', e);
    }
  }
  await deleteDoc(doc(db, 'payments', advance.id));
};

/**
 * Upload receipt file to Firebase Storage
 */
export const uploadReceipt = async (file, userId, month, year) => {
  try {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${month}-${year}-${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, `receipts/${userId}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error al subir comprobante:', error);
    throw error;
  }
};

/**
 * Create new payment
 * Note: No need to clear cache since we're not caching critical data anymore
 */
export const createPayment = async (paymentData) => {
  try {
    const payment = {
      ...paymentData,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'payments'), payment);
    
    return { id: docRef.id, ...payment };
  } catch (error) {
    console.error('Error al crear pago:', error);
    throw error;
  }
};

/**
 * Get payments by user ID and year
 * IMPORTANT: Does NOT use cache - always reads fresh from Firestore
 * This ensures payment history is always current
 */
export const getPaymentsByYear = async (userId, year) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('userId', '==', userId),
      where('year', '==', year),
      orderBy('month', 'desc'),
      limit(12) // Max 12 months per year
    );
    
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    return payments;
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    throw error;
  }
};

/**
 * Get payments by house number and year
 * Shows ALL payments for a house (resident + admin uploaded)
 * IMPORTANT: Does NOT use cache - always reads fresh from Firestore
 */
export const getPaymentsByHouseAndYear = async (houseNumber, year) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('houseNumber', '==', houseNumber),
      where('year', '==', year),
      orderBy('month', 'desc'),
      limit(12) // Max 12 months per year
    );
    
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    return payments;
  } catch (error) {
    console.error('Error al obtener pagos por casa:', error);
    throw error;
  }
};

/**
 * Get all payments for admin (filtered by year)
 * IMPORTANT: Does NOT use cache - always reads fresh from Firestore
 */
export const getAllPaymentsByYear = async (year) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('year', '==', year),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    return payments;
  } catch (error) {
    console.error('Error al obtener todos los pagos:', error);
    throw error;
  }
};

/**
 * Get payments by month and year (for unpaid houses check)
 */
export const getPaymentsByMonthYear = async (month, year) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('month', '==', month),
      where('year', '==', year)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error al obtener pagos del mes:', error);
    throw error;
  }
};

/**
 * Update payment status and other fields (admin only)
 */
export const updatePaymentStatus = async (paymentId, updates) => {
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error al actualizar estado del pago:', error);
    throw error;
  }
};

/**
 * Create a manual payment (admin only) without userId
 * Automatically links to user if they're already registered
 * If not registered yet, payment stays with userId: null until user registers
 * Supports offset payments (isForOtherMonth) with placeholder records for covered months
 */
export const createManualPayment = async (
  houseNumber, amount, month, year, createdByUserId,
  isLate = false, status = 'pending', adminNotes = '',
  isForOtherMonth = false, coveredMonths = []
) => {
  try {
    // If payment is for other months, auto-approve the main payment
    const paymentStatus = isForOtherMonth ? 'approved' : status;

    const paymentData = {
      houseNumber,
      amount,
      month,
      year,
      userId: null, // Initially null
      createdBy: createdByUserId, // Track which admin created this
      isLate,
      status: paymentStatus, // Use provided status (auto-approve if offset)
      adminNotes: adminNotes.trim(), // Add admin notes
      manuallyCreated: true,
      linkedAt: null, // Will be set when linked to user
      receiptUrl: null,
      receiptNumber: amount > 0 ? generateReceiptNumber() : null,
      isForOtherMonth,
      coveredMonths: isForOtherMonth ? coveredMonths : [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'payments'), paymentData);
    const paymentId = docRef.id;
    let isLinked = false;

    // Create placeholder $0 payments for each covered month
    // Exclude the current payment month to avoid duplicates
    const monthsForPlaceholders = isForOtherMonth
      ? coveredMonths.filter(m => m !== month)
      : [];

    if (monthsForPlaceholders.length > 0) {
      for (const monthNum of monthsForPlaceholders) {
        const placeholderData = {
          houseNumber,
          amount: 0,
          month: monthNum,
          year,
          userId: null,
          createdBy: createdByUserId,
          isLate: false,
          status: 'approved',
          adminNotes: `Placeholder - Pago cubierto por pago del mes ${month}/${year}`,
          manuallyCreated: true,
          linkedAt: null,
          receiptUrl: null,
          isForOtherMonth: false,
          coveredMonths: [],
          isPlaceholder: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        const placeholderRef = await addDoc(collection(db, 'payments'), placeholderData);

        // Try to link placeholder to user if registered
        try {
          const user = await getUserByHouseNumber(houseNumber);
          if (user && user.uid) {
            await updateDoc(doc(db, 'payments', placeholderRef.id), {
              userId: user.uid,
              linkedAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            });
          }
        } catch (linkError) {
          console.error('Error al vincular placeholder:', linkError);
        }
      }
    }

    // Try to link to user if they're already registered
    try {
      const user = await getUserByHouseNumber(houseNumber);
      if (user && user.uid) {
        // User already registered, link the payment automatically
        await updateDoc(doc(db, 'payments', paymentId), {
          userId: user.uid,
          linkedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        isLinked = true;
        paymentData.userId = user.uid;
        paymentData.linkedAt = new Date();
      }
    } catch (error) {
      console.error('Error al buscar usuario para vincular:', error);
      // Continue without linking - will happen when user registers
    }

    return {
      id: paymentId,
      ...paymentData,
      isLinked // Indicate if payment was linked to existing user
    };
  } catch (error) {
    console.error('Error al crear pago manual:', error);
    throw error;
  }
};

/**
 * Get all unlinked payments for a specific house
 * Used when user registers to auto-link payments
 */
export const getUnlinkedPaymentsByHouse = async (houseNumber) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('houseNumber', '==', houseNumber),
      where('userId', '==', null),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error al obtener pagos sin usuario:', error);
    throw error;
  }
};

/**
 * Link an unlinked payment to a user (when they register)
 * Updates userId and linkedAt timestamp
 */
export const linkPaymentToUser = async (paymentId, userId) => {
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, {
      userId,
      linkedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error al vincular pago a usuario:', error);
    throw error;
  }
};

/**
 * Create semestral payments (6 months)
 * Distributes payment across selected months, only current month has the full amount
 */
export const createSemestralPayment = async (houseNumber, amount, months, currentMonth, year, createdByUserId, Status = 'pending', adminNotes = '', receiptUrl = null) => {
  try {
    const paymentIds = [];
    const note = `Pago semestral - ${adminNotes}`.trim();
    
    // Try to get user for this house
    let userId = null;
    try {
      const user = await getUserByHouseNumber(houseNumber);
      if (user && user.uid) {
        userId = user.uid;
      }
    } catch (error) {
      console.error('Error al buscar usuario:', error);
    }

    // Create payment for each selected month
    for (const month of months) {
      const paymentData = {
        houseNumber,
        amount: month === currentMonth ? amount : 0, // Only current month has the full amount
        month,
        year,
        userId,
        createdBy: createdByUserId,
        status: Status,
        adminNotes: note,
        manuallyCreated: true,
        isSemestral: true,
        semestralMonths: months,
        linkedAt: userId ? Timestamp.now() : null,
        receiptUrl: receiptUrl, // Same receipt for all payments
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'payments'), paymentData);
      paymentIds.push(docRef.id);
    }

    return paymentIds;
  } catch (error) {
    console.error('Error al crear pago semestral:', error);
    throw error;
  }
};

/**
 * Create annual payments (12 months)
 * Distributes payment across all 12 months, only current month has the full amount
 */
export const createAnnualPayment = async (houseNumber, amount, currentMonth, year, createdByUserId, Status = 'pending', adminNotes = '', receiptUrl = null) => {
  try {
    const paymentIds = [];
    const note = `Pago anual - ${adminNotes}`.trim();
    
    // Try to get user for this house
    let userId = null;
    try {
      const user = await getUserByHouseNumber(houseNumber);
      if (user && user.uid) {
        userId = user.uid;
      }
    } catch (error) {
      console.error('Error al buscar usuario:', error);
    }

    // Create payment for each month of the year
    for (let month = 1; month <= 12; month++) {
      const paymentData = {
        houseNumber,
        amount: month === currentMonth ? amount : 0, // Only current month has the full amount
        month,
        year,
        userId,
        createdBy: createdByUserId,
        status: Status,
        adminNotes: note,
        manuallyCreated: true,
        isAnnual: true,
        linkedAt: userId ? Timestamp.now() : null,
        receiptUrl: receiptUrl, // Same receipt for all payments
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'payments'), paymentData);
      paymentIds.push(docRef.id);
    }

    return paymentIds;
  } catch (error) {
    console.error('Error al crear pago anual:', error);
    throw error;
  }
};

/**
 * Delete a payment record (admin only)
 */
export const deletePayment = async (paymentId) => {
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await deleteDoc(paymentRef);
    clearCache('payments'); // Clear payments cache after deletion
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    throw error;
  }
};
