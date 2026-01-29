import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

/**
 * Check if payment already exists for user in specific month/year
 */
export const checkDuplicatePayment = async (userId, month, year) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('userId', '==', userId),
      where('month', '==', month),
      where('year', '==', year)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error al verificar pago duplicado:', error);
    throw error;
  }
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
 */
export const getPaymentsByYear = async (userId, year) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('userId', '==', userId),
      where('year', '==', year),
      orderBy('month', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    throw error;
  }
};

/**
 * Get all payments for admin (filtered by year)
 */
export const getAllPaymentsByYear = async (year) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('year', '==', year),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
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
