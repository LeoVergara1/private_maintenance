import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get all utilities (non-archived) grouped by category
 * Ordering is done in-memory to avoid needing composite indexes
 */
export const getAllUtilities = async () => {
  try {
    const q = query(
      collection(db, 'utilities'),
      where('isArchived', '==', false)
    );

    const snapshot = await getDocs(q);
    const utilities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
    }));

    // Sort by category, then by createdAt (newest first)
    utilities.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return b.createdAt - a.createdAt;
    });

    return utilities;
  } catch (error) {
    console.error('Error al obtener utilidades:', error);
    throw error;
  }
};

/**
 * Create new utility item
 */
export const createUtility = async (utilityData, userId) => {
  try {
    const utility = {
      category: utilityData.category,
      title: utilityData.title,
      content: utilityData.content,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isArchived: false
    };

    const docRef = await addDoc(collection(db, 'utilities'), utility);

    return {
      id: docRef.id,
      ...utility,
      createdAt: utility.createdAt.toDate(),
      updatedAt: utility.updatedAt.toDate()
    };
  } catch (error) {
    console.error('Error al crear utilidad:', error);
    throw error;
  }
};

/**
 * Update existing utility item
 */
export const updateUtility = async (utilityId, utilityData) => {
  try {
    const utilityRef = doc(db, 'utilities', utilityId);

    const updateData = {
      category: utilityData.category,
      title: utilityData.title,
      content: utilityData.content,
      updatedAt: Timestamp.now()
    };

    await updateDoc(utilityRef, updateData);

    return {
      id: utilityId,
      ...utilityData,
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error al actualizar utilidad:', error);
    throw error;
  }
};

/**
 * Delete (archive) utility item
 * Uses soft delete to maintain audit trail
 */
export const deleteUtility = async (utilityId) => {
  try {
    const utilityRef = doc(db, 'utilities', utilityId);

    await updateDoc(utilityRef, {
      isArchived: true,
      updatedAt: Timestamp.now()
    });

    return true;
  } catch (error) {
    console.error('Error al eliminar utilidad:', error);
    throw error;
  }
};
