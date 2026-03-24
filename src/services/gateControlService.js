import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get all gate controls
 */
export const getAllGateControls = async () => {
  try {
    const q = query(collection(db, 'gateControls'), orderBy('controlNumber', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error al obtener controles del portón:', error);
    throw error;
  }
};

/**
 * Get gate controls assigned to a specific house
 */
export const getGateControlsByHouse = async (houseNumber) => {
  try {
    const q = query(
      collection(db, 'gateControls'),
      where('houseNumber', '==', houseNumber)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error al obtener controles de la casa:', error);
    throw error;
  }
};

/**
 * Create a new gate control
 */
export const createGateControl = async ({ controlNumber, houseNumber, status, notes, createdBy, createdByName }) => {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, 'gateControls'), {
      controlNumber: controlNumber.trim(),
      houseNumber: houseNumber ?? null,
      status: status || 'active',
      notes: notes?.trim() || '',
      createdBy: createdBy || null,
      createdByName: createdByName || null,
      createdAt: now,
      updatedAt: now
    });
    return { id: docRef.id };
  } catch (error) {
    console.error('Error al crear control del portón:', error);
    throw error;
  }
};

/**
 * Update an existing gate control
 */
export const updateGateControl = async (id, { controlNumber, houseNumber, status, notes }) => {
  try {
    const ref = doc(db, 'gateControls', id);
    await updateDoc(ref, {
      controlNumber: controlNumber.trim(),
      houseNumber: houseNumber ?? null,
      status,
      notes: notes?.trim() || '',
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error al actualizar control del portón:', error);
    throw error;
  }
};

/**
 * Delete a gate control
 */
export const deleteGateControl = async (id) => {
  try {
    await deleteDoc(doc(db, 'gateControls', id));
  } catch (error) {
    console.error('Error al eliminar control del portón:', error);
    throw error;
  }
};
