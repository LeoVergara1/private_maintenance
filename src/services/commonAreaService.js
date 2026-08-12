import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  Timestamp,
  limit,
  and
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentYear } from '../utils/dateValidation';

/**
 * Check if house has a conflicting reservation at the same time
 * IMPORTANT: Does NOT use cache - always reads fresh from Firestore
 */
export const checkReservationConflict = async (houseNumber, date, startTime, endTime) => {
  try {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    const q = query(
      collection(db, 'commonAreaReservations'),
      where('houseNumber', '==', houseNumber),
      where('date', '>=', Timestamp.fromDate(dateObj)),
      where('date', '<', Timestamp.fromDate(nextDay)),
      where('status', '==', 'confirmed'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    
    // Check if any reservation overlaps with the requested time
    for (const doc of snapshot.docs) {
      const reservation = doc.data();
      const existingStart = reservation.startTime;
      const existingEnd = reservation.endTime;

      // Check for time overlap
      if (startTime < existingEnd && endTime > existingStart) {
        return true; // Conflict found
      }
    }

    return false; // No conflict
  } catch (error) {
    console.error('Error al verificar conflicto de reserva:', error);
    throw error;
  }
};

/**
 * Count private events for a house in current year (Friday/Saturday only)
 * Only counts confirmed reservations with eventType="private"
 */
export const countPrivateEventsThisYear = async (houseNumber) => {
  try {
    const year = getCurrentYear();
    
    // Get all days that are Friday (5) or Saturday (6)
    // We need to check all reservations for this house with eventType="private" and isWeekend=true
    const q = query(
      collection(db, 'commonAreaReservations'),
      where('houseNumber', '==', houseNumber),
      where('isWeekend', '==', true),
      where('eventType', '==', 'private'),
      where('status', '==', 'confirmed'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    
    // Filter by current year
    const currentYear = new Date().getFullYear();
    const eventsThisYear = snapshot.docs.filter(doc => {
      const date = doc.data().date.toDate();
      return date.getFullYear() === currentYear;
    });

    return eventsThisYear.length;
  } catch (error) {
    console.error('Error al contar eventos privados:', error);
    throw error;
  }
};

/**
 * Create a new reservation
 */
export const createReservation = async (reservationData) => {
  try {
    const reservation = {
      ...reservationData,
      status: 'confirmed',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'commonAreaReservations'), reservation);

    return { id: docRef.id, ...reservation };
  } catch (error) {
    console.error('Error al crear reserva:', error);
    throw error;
  }
};

/**
 * Get all reservations for a house in a specific year
 */
export const getReservationsByHouse = async (houseNumber, year) => {
  try {
    // Create date range for the year
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31`);

    const q = query(
      collection(db, 'commonAreaReservations'),
      where('houseNumber', '==', houseNumber),
      where('date', '>=', Timestamp.fromDate(startOfYear)),
      where('date', '<=', Timestamp.fromDate(endOfYear)),
      orderBy('date', 'asc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const reservations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate()
    }));

    return reservations;
  } catch (error) {
    console.error('Error al obtener reservas por casa:', error);
    throw error;
  }
};

/**
 * Get all reservations for a specific date (admin view)
 */
export const getReservationsByDate = async (date) => {
  try {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    const q = query(
      collection(db, 'commonAreaReservations'),
      where('date', '>=', Timestamp.fromDate(dateObj)),
      where('date', '<', Timestamp.fromDate(nextDay)),
      where('status', '==', 'confirmed'),
      orderBy('date', 'asc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const reservations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate()
    }));

    return reservations;
  } catch (error) {
    console.error('Error al obtener reservas por fecha:', error);
    throw error;
  }
};

/**
 * Get all reservations in a date range (useful for calendar view)
 */
export const getReservationsByDateRange = async (startDate, endDate) => {
  try {
    const startObj = new Date(startDate);
    startObj.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(endDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'commonAreaReservations'),
      where('status', '==', 'confirmed'),
      where('date', '>=', Timestamp.fromDate(startObj)),
      where('date', '<', Timestamp.fromDate(nextDay)),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    const reservations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate()
    }));

    return reservations;
  } catch (error) {
    console.error('Error al obtener reservas por rango de fechas:', error);
    throw error;
  }
};

/**
 * Cancel a reservation (set status to cancelled)
 */
export const cancelReservation = async (reservationId, reason = '') => {
  try {
    const reservationRef = doc(db, 'commonAreaReservations', reservationId);
    
    await updateDoc(reservationRef, {
      status: 'cancelled',
      cancellationReason: reason,
      updatedAt: Timestamp.now()
    });

    return { id: reservationId, status: 'cancelled' };
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    throw error;
  }
};

/**
 * Update reservation details
 */
export const updateReservation = async (reservationId, updateData) => {
  try {
    const reservationRef = doc(db, 'commonAreaReservations', reservationId);
    
    await updateDoc(reservationRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });

    return { id: reservationId, ...updateData };
  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    throw error;
  }
};

/**
 * Delete a reservation (admin only)
 */
export const deleteReservation = async (reservationId) => {
  try {
    await deleteDoc(doc(db, 'commonAreaReservations', reservationId));
    return { id: reservationId };
  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    throw error;
  }
};

/**
 * Validate reservation time based on day of week
 * Sunday-Thursday: until 22:00
 * Friday-Saturday: until 02:00 (03:00 for seeing guests out)
 */
export const validateReservationTime = (dayOfWeek, endTime, isSeingOutGuests = false) => {
  console.log('Validating reservation time:', { dayOfWeek, endTime, isSeingOutGuests });
  const [hours] = endTime.split(':').map(Number);
  
  if (dayOfWeek >= 0 && dayOfWeek <= 4) { // Sunday to Thursday
    if (hours > 22) {
      return {
        valid: false,
        error: 'Domingo a jueves: El área debe estar disponible a las 22:00 hrs'
      };
    }
  } else if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday and Saturday
    console.log('Checking Friday/Saturday rules. Hours:', hours);
    const maxHour = isSeingOutGuests ? 3 : 2;
    console.log(`Max hour for this reservation: ${maxHour}:00 hrs`);
    // Allow: 0-maxHour (00:00 a 02:00/03:00 AM) and 22-23 (10 PM a 11:59 PM)
    if (hours > maxHour && hours < 22) {
      return {
        valid: false,
        error: `Viernes-sábado: Máximo hasta las ${maxHour}:00 hrs o desde las 22:00 hrs${isSeingOutGuests ? ' (hasta 03:00 para despedir visitas)' : ''}`
      };
    }
  }
  
  return { valid: true };
};

/**
 * Check if a house is restricted from making reservations
 */
export const checkHouseRestriction = async (houseNumber) => {
  try {
    // Note: This would require querying users collection by houseNumber
    // For now, return false as restriction is managed at UI level
    // Future: Add user service function to check restriction
    return false;
  } catch (error) {
    console.error('Error al verificar restricción de casa:', error);
    throw error;
  }
};

/**
 * Get statistics for a house (annual private events count, etc)
 */
export const getHouseReservationStats = async (houseNumber) => {
  try {
    const year = getCurrentYear();
    const privateCount = await countPrivateEventsThisYear(houseNumber);
    
    return {
      houseNumber,
      year,
      privateEventsUsed: privateCount,
      privateEventsLimit: 2,
      privateEventsRemaining: Math.max(0, 2 - privateCount)
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de casa:', error);
    throw error;
  }
};
