import { useState, useEffect } from 'react';
import { getAllUsers } from '../services/userService';
import { getPaymentsByMonthYear } from '../services/paymentService';
import { getCurrentMonth, getCurrentYear, getMonthName } from '../utils/dateValidation';
import { exportUnpaidHousesToExcel } from '../utils/excelExport';

export default function UnpaidHousesPanel() {
  const [unpaidHouses, setUnpaidHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();

  useEffect(() => {
    loadUnpaidHouses();
  }, []);

  const loadUnpaidHouses = async () => {
    try {
      setLoading(true);

      // Get all users
      const allUsers = await getAllUsers();

      // Get payments for current month
      const payments = await getPaymentsByMonthYear(currentMonth, currentYear);
      
      // Get house numbers that have paid
      const paidHouseNumbers = payments.map(p => p.houseNumber);

      // Filter users who haven't paid
      const unpaid = allUsers.filter(user => 
        user.houseNumber && !paidHouseNumbers.includes(user.houseNumber)
      );

      // Sort by house number
      unpaid.sort((a, b) => a.houseNumber - b.houseNumber);

      setUnpaidHouses(unpaid);
    } catch (error) {
      console.error('Error al cargar casas sin pagar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const filename = `casas-sin-pagar-${getMonthName(currentMonth)}-${currentYear}.xlsx`;
      await exportUnpaidHousesToExcel(unpaidHouses, currentMonth, currentYear, filename);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar el archivo');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Casas Sin Pagar
          </h2>
          <p className="text-sm text-gray-600">
            {getMonthName(currentMonth)} {currentYear}
          </p>
        </div>
        {unpaidHouses.length > 0 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        )}
      </div>

      {unpaidHouses.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium">¡Todas las casas han pagado!</p>
          <p className="text-gray-500 text-sm mt-1">No hay casas pendientes de pago este mes</p>
        </div>
      ) : (
        <div>
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">
              {unpaidHouses.length} {unpaidHouses.length === 1 ? 'casa' : 'casas'} sin pagar
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {unpaidHouses.map((house) => (
              <div
                key={house.id}
                className="p-4 border-2 border-red-200 bg-red-50 rounded-lg text-center hover:shadow-md transition-shadow"
              >
                <div className="text-2xl font-bold text-red-700 mb-1">
                  {house.houseNumber}
                </div>
                {house.displayName && (
                  <div className="text-xs text-gray-600 truncate">
                    {house.displayName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
