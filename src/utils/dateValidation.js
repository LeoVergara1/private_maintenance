/**
 * Get current month (1-12)
 */
export const getCurrentMonth = () => {
  return new Date().getMonth() + 1;
};

/**
 * Get current year
 */
export const getCurrentYear = () => {
  return new Date().getFullYear();
};

/**
 * Check if current date is within payment window (1-15 of the month)
 */
export const isWithinPaymentWindow = () => {
  const currentDay = new Date().getDate();
  return currentDay >= 1 && currentDay <= 15;
};

/**
 * Check if payment is late (after day 15)
 */
export const isLatePayment = () => {
  const currentDay = new Date().getDate();
  return currentDay > 15;
};

/**
 * Get month name in Spanish
 */
export const getMonthName = (month) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || '';
};

/**
 * Get payment period text
 */
export const getPaymentPeriodText = (month, year) => {
  return `${getMonthName(month)} ${year}`;
};

/** Días de anticipación antes de fin de mes para ofrecer el pago adelantado. */
export const ADVANCE_WINDOW_DAYS = 5;

/**
 * Días que tiene un mes (maneja febrero/bisiestos).
 */
export const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

/**
 * ¿Estamos en los últimos N días del mes? (ventana de pago anticipado)
 */
export const isWithinAdvanceWindow = (daysBefore = ADVANCE_WINDOW_DAYS) => {
  const now = new Date();
  const dim = getDaysInMonth(now.getFullYear(), now.getMonth() + 1);
  return now.getDate() > dim - daysBefore;
};

/**
 * Siguiente periodo (maneja diciembre → enero del año siguiente).
 * @returns {{ month: number, year: number }}
 */
export const getNextPeriod = (month, year) => {
  if (month === 12) return { month: 1, year: year + 1 };
  return { month: month + 1, year };
};
