import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

/**
 * Upload bank statement file to Firebase Storage
 */
export const uploadBankStatementFile = async (file, month, year, uploadedBy) => {
  try {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${year}-${month}-${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `bankStatements/${year}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return { downloadURL, fileName };
  } catch (error) {
    console.error('Error al subir estado de cuenta:', error);
    throw error;
  }
};

/**
 * Create bank statement record
 */
export const createBankStatement = async (statementData) => {
  try {
    const statement = {
      month: statementData.month,
      year: statementData.year,
      fileName: statementData.fileName,
      fileUrl: statementData.fileUrl,
      originalName: statementData.originalName,
      uploadedBy: statementData.uploadedBy,
      notes: statementData.notes || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'bankStatements'), statement);
    
    return { id: docRef.id, ...statement };
  } catch (error) {
    console.error('Error al crear estado de cuenta:', error);
    throw error;
  }
};

/**
 * Get bank statements by year
 */
export const getBankStatementsByYear = async (year) => {
  try {
    const q = query(
      collection(db, 'bankStatements'),
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
    console.error('Error al obtener estados de cuenta:', error);
    throw error;
  }
};

/**
 * Get bank statements by month and year
 */
export const getBankStatementsByMonthYear = async (month, year) => {
  try {
    const q = query(
      collection(db, 'bankStatements'),
      where('month', '==', month),
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
    console.error('Error al obtener estados de cuenta por mes:', error);
    throw error;
  }
};

/**
 * Update bank statement
 */
export const updateBankStatement = async (statementId, updates) => {
  try {
    const statementRef = doc(db, 'bankStatements', statementId);
    await updateDoc(statementRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error al actualizar estado de cuenta:', error);
    throw error;
  }
};

/**
 * Delete bank statement
 */
export const deleteBankStatement = async (statementId) => {
  try {
    // Get the statement to find the file URL
    const statementRef = doc(db, 'bankStatements', statementId);
    const statementDoc = await import('firebase/firestore').then(m => m.getDoc(statementRef));
    
    if (statementDoc.exists()) {
      const data = statementDoc.data();
      // Delete file from storage if it exists
      if (data.fileUrl) {
        try {
          const fileRef = ref(storage, `bankStatements/${data.year}/${data.fileName}`);
          await deleteObject(fileRef);
        } catch (storageError) {
          console.error('Error al eliminar archivo:', storageError);
        }
      }
    }
    
    // Delete document from Firestore
    await deleteDoc(statementRef);
  } catch (error) {
    console.error('Error al eliminar estado de cuenta:', error);
    throw error;
  }
};
