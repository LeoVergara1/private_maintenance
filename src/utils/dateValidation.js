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
 * Check if current date is within payment window (1-10 of the month)
 */
export const isWithinPaymentWindow = () => {
  const currentDay = new Date().getDate();
  return currentDay >= 1 && currentDay <= 10;
};

/**
 * Check if payment is late (after day 10)
 */
export const isLatePayment = () => {
  const currentDay = new Date().getDate();
  return currentDay > 10;
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
