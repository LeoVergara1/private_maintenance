import { getPaymentsByHouseAndYear } from '../services/paymentService';
import { getMonthName } from './dateValidation';

/**
 * Verifica si una casa tiene adeudos (pagos faltantes en meses anteriores al actual)
 * @param {number} houseNumber - Número de la casa a verificar
 * @param {number} currentMonth - Mes actual (1-12), opcional
 * @param {number} currentYear - Año actual, opcional
 * @returns {Promise<{hasDebt: boolean, unpaidMonths: number[]}>}
 */
export const checkHouseDebt = async (houseNumber, currentMonth = null, currentYear = null) => {
  try {
    // Use current date if not provided
    const now = new Date();
    const month = currentMonth || (now.getMonth() + 1);
    const year = currentYear || now.getFullYear();

    // Get all payments for this house in current year
    const payments = await getPaymentsByHouseAndYear(houseNumber, year);
    
    // Build set of months with payments
    const paidMonths = new Set(payments.map(p => p.month));
    
    // Check all previous months (1 to current month - 1)
    const unpaidMonths = [];
    for (let m = 1; m < month; m++) {
      if (!paidMonths.has(m)) {
        unpaidMonths.push(m);
      }
    }
    
    return {
      hasDebt: unpaidMonths.length > 0,
      unpaidMonths: unpaidMonths
    };
  } catch (error) {
    console.error('Error al verificar adeudos de la casa:', error);
    throw error;
  }
};

/**
 * Obtiene una descripción legible de los meses adeudados
 * @param {number[]} unpaidMonths - Array de números de mes (1-12)
 * @returns {string} - Nombres de meses separados por coma
 */
export const getMonthsDescription = (unpaidMonths) => {
  return unpaidMonths
    .map(m => getMonthName(m))
    .join(', ');
};
