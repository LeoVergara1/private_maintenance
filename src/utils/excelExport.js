import * as XLSX from 'xlsx';
import { getMonthName } from './dateValidation';

/**
 * Export payments to Excel file
 * Columns: Casa, Monto, Estado, Fecha, Tardío
 */
export const exportPaymentsToExcel = (payments, filename = 'pagos.xlsx') => {
  try {
    // Transform data for Excel
    const excelData = payments.map(payment => ({
      'Casa': payment.houseNumber,
      'Monto': `$${payment.amount}`,
      'Estado': getStatusText(payment.status),
      'Fecha': `${getMonthName(payment.month)} ${payment.year}`,
      'Tardío': payment.isLate ? 'Sí' : 'No'
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 10 },  // Casa
      { wch: 12 },  // Monto
      { wch: 15 },  // Estado
      { wch: 20 },  // Fecha
      { wch: 10 }   // Tardío
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos');

    // Generate and download file
    XLSX.writeFile(workbook, filename);
    
    return { success: true };
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export users to Excel file
 * Columns: Casa, Nombre, Correo, Rol
 */
export const exportUsersToExcel = (users, roleLabels = {}, filename = 'usuarios.xlsx') => {
  try {
    const sorted = [...users].sort((a, b) => (a.houseNumber || 0) - (b.houseNumber || 0));
    const excelData = sorted.map(user => ({
      'Casa': user.houseNumber ?? 'N/A',
      'Nombre': user.displayName || 'N/A',
      'Correo': user.email || 'N/A',
      'Rol': roleLabels[user.role] || user.role || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet['!cols'] = [
      { wch: 10 },  // Casa
      { wch: 30 },  // Nombre
      { wch: 35 },  // Correo
      { wch: 22 }   // Rol
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

    XLSX.writeFile(workbook, filename);

    return { success: true };
  } catch (error) {
    console.error('Error al exportar usuarios a Excel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get status text in Spanish
 */
const getStatusText = (status) => {
  const statusMap = {
    'pending': 'Pendiente',
    'approved': 'Aprobado',
    'rejected': 'Rechazado'
  };
  return statusMap[status] || status;
};

/**
 * Export unpaid houses to Excel
 */
export const exportUnpaidHousesToExcel = (unpaidHouses, month, year, filename = 'casas-sin-pagar.xlsx') => {
  try {
    // Transform data for Excel
    const excelData = unpaidHouses.map(house => ({
      'Número de Casa': house.houseNumber,
      'Propietario': house.displayName || 'N/A',
      'Email': house.email || 'N/A',
      'Mes': getMonthName(month),
      'Año': year
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 },  // Número de Casa
      { wch: 25 },  // Propietario
      { wch: 30 },  // Email
      { wch: 15 },  // Mes
      { wch: 10 }   // Año
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Casas Sin Pagar');

    // Generate and download file
    XLSX.writeFile(workbook, filename);
    
    return { success: true };
  } catch (error) {
    console.error('Error al exportar casas sin pagar:', error);
    return { success: false, error: error.message };
  }
};
