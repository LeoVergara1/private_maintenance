import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

/**
 * Create new expense record
 */
export const createExpense = async (expenseData) => {
  try {
    const expense = {
      ...expenseData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'expenses'), expense);
    
    return { id: docRef.id, ...expense };
  } catch (error) {
    console.error('Error al crear gasto:', error);
    throw error;
  }
};

/**
 * Upload receipt/evidence file to Firebase Storage
 * Uses expenseId as the folder path
 */
export const uploadExpenseReceipt = async (file, expenseId) => {
  try {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `expenses/${expenseId}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error al subir comprobante de gasto:', error);
    throw error;
  }
};

/**
 * Get all expenses for a specific year
 * Sorted by createdAt descending (client-side to avoid index requirement)
 */
export const getExpensesByYear = async (year) => {
  try {
    const q = query(
      collection(db, 'expenses'),
      where('year', '==', year)
    );
    
    const snapshot = await getDocs(q);
    
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort by createdAt descending on client-side
    return expenses.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    throw error;
  }
};

/**
 * Get all expenses (no year filter)
 * Sorted by createdAt descending (client-side to avoid index requirement)
 */
export const getAllExpenses = async () => {
  try {
    const q = query(collection(db, 'expenses'));
    
    const snapshot = await getDocs(q);
    
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort by createdAt descending on client-side
    return expenses.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error al obtener todos los gastos:', error);
    throw error;
  }
};

/**
 * Update expense
 */
export const updateExpense = async (expenseId, updates) => {
  try {
    const expenseRef = doc(db, 'expenses', expenseId);
    
    await updateDoc(expenseRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    throw error;
  }
};

/**
 * Delete expense and its associated file
 */
export const deleteExpense = async (expenseId, receiptUrl) => {
  try {
    // Delete the file from storage if it exists
    if (receiptUrl) {
      try {
        const fileRef = ref(storage, receiptUrl);
        await deleteObject(fileRef);
      } catch (err) {
        console.warn('Advertencia al eliminar archivo:', err);
        // Continue with deleting the document anyway
      }
    }
    
    // Delete the expense document
    await deleteDoc(doc(db, 'expenses', expenseId));
  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    throw error;
  }
};

/**
 * Get expenses for a specific month and year
 * Sorted by createdAt descending (client-side to avoid index requirement)
 */
export const getExpensesByMonth = async (month, year) => {
  try {
    const q = query(
      collection(db, 'expenses'),
      where('month', '==', month),
      where('year', '==', year)
    );
    
    const snapshot = await getDocs(q);
    
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort by createdAt descending on client-side
    return expenses.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error al obtener gastos del mes:', error);
    throw error;
  }
};
