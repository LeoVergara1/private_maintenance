import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  doc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Create initial deposit/capital contribution
 * Used for registering initial balance (saldo inicial) of the condominium
 */
export const createInitialDeposit = async (amount, month, year, description, adminUid) => {
  try {
    const docRef = await addDoc(collection(db, 'initialDeposits'), {
      amount: parseFloat(amount),
      month: parseInt(month),
      year: parseInt(year),
      description: description || 'Abono inicial',
      createdBy: adminUid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    return { id: docRef.id };
  } catch (error) {
    console.error('Error al crear abono inicial:', error);
    throw error;
  }
};

/**
 * Get initial deposits by year
 */
export const getInitialDepositsByYear = async (year) => {
  try {
    const q = query(
      collection(db, 'initialDeposits'),
      where('year', '==', year),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const deposits = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    return deposits;
  } catch (error) {
    console.error('Error al obtener abonos iniciales:', error);
    throw error;
  }
};

/**
 * Get initial deposits by month and year
 */
export const getInitialDepositsByMonthYear = async (month, year) => {
  try {
    const q = query(
      collection(db, 'initialDeposits'),
      where('month', '==', month),
      where('year', '==', year),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const deposits = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    return deposits;
  } catch (error) {
    console.error('Error al obtener abonos iniciales por mes:', error);
    throw error;
  }
};

/**
 * Delete initial deposit (admin only)
 */
export const deleteInitialDeposit = async (depositId) => {
  try {
    await deleteDoc(doc(db, 'initialDeposits', depositId));
  } catch (error) {
    console.error('Error al eliminar abono inicial:', error);
    throw error;
  }
};
