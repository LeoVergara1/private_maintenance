import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get all users from Firestore
 */
export const getAllUsers = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    throw error;
  }
};

/**
 * Get user by UID
 */
export const getUserById = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
};

/**
 * Create or update user document
 */
export const createUser = async (uid, userData) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...userData,
      createdAt: userData.createdAt || new Date()
    }, { merge: true });
    
    return await getUserById(uid);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

/**
 * Check if house number is already taken
 */
export const isHouseNumberTaken = async (houseNumber) => {
  try {
    const q = query(
      collection(db, 'users'), 
      where('houseNumber', '==', parseInt(houseNumber))
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error al verificar número de casa:', error);
    throw error;
  }
};

/**
 * Get user by house number
 */
export const getUserByHouseNumber = async (houseNumber) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('houseNumber', '==', parseInt(houseNumber))
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error al obtener usuario por casa:', error);
    throw error;
  }
};
/**
 * Get all unregistered houses (1-60)
 */
export const getUnregisteredHouses = async () => {
  try {
    const allUsers = await getAllUsers();
    const registeredHouses = allUsers
      .map(user => user.houseNumber)
      .filter(num => num !== undefined && num !== null);

    const allHouses = Array.from({ length: 60 }, (_, i) => i + 1);
    return allHouses.filter(house => !registeredHouses.includes(house));
  } catch (error) {
    console.error('Error al obtener casas sin registro:', error);
    throw error;
  }
};