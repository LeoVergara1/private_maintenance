import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAllPaymentsByYear } from '../services/paymentService';
import { getAllUsers } from '../services/userService';
import { getCurrentYear, getMonthName } from '../utils/dateValidation';

export default function AdminFinancialReport() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthlyReport, setMonthlyReport] = useState({});
  const [allHouses, setAllHouses] = useState([]);

  const currentYear = getCurrentYear();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get all payments for the year
      const payments = await getAllPaymentsByYear(currentYear);

      // Get all residents (houses)
      const users = await getAllUsers();
      const residents = users.filter(u => u.role === 'resident');
      setAllHouses(residents);

      // Generate report
      generateReport(payments, residents);
    } catch (err) {
      console.error('Error loading financial data:', err);
      setError('Error al cargar datos financieros');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = (payments, residents) => {
    const report = {};

    // Initialize all months
    for (let month = 1; month <= 12; month++) {
      report[month] = {
        month,
        monthName: getMonthName(month),
        totalCollected: 0,
        paid: [],
        unpaid: [],
        onTimePayments: 0,
        latePayments: 0
      };
    }

    // Process payments
    payments.forEach(payment => {
      if (payment.month && report[payment.month]) {
        report[payment.month].paid.push({
          houseNumber: payment.houseNumber,
          amount: payment.amount,
          isLate: payment.isLate,
          status: payment.status
        });
        report[payment.month].totalCollected += payment.amount;

        if (payment.isLate) {
          report[payment.month].latePayments++;
        } else {
          report[payment.month].onTimePayments++;
        }
      }
    });

    // Find unpaid houses for each month
    Object.keys(report).forEach(month => {
      const paidHouses = new Set(report[month].paid.map(p => p.houseNumber));
      
      residents.forEach(resident => {
        if (!paidHouses.has(resident.houseNumber)) {
          report[month].unpaid.push({
            houseNumber: resident.houseNumber
          });
        }
      });
    });

    setMonthlyReport(report);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reporte Financiero</h1>
              <p className="text-sm text-gray-600">Desglose de pagos por mes - {currentYear}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBackToDashboard}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors"
              >
                Atrás
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Recaudado</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              ${Object.values(monthlyReport).reduce((sum, m) => sum + m.totalCollected, 0).toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Pagos a Tiempo</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {Object.values(monthlyReport).reduce((sum, m) => sum + m.onTimePayments, 0)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Pagos Tardíos</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {Object.values(monthlyReport).reduce((sum, m) => sum + m.latePayments, 0)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Casas Totales</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {allHouses.length}
            </p>
          </div>
        </div>

        {/* Monthly Reports */}
        <div className="space-y-8">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
            const monthData = monthlyReport[month];
            if (!monthData) return null;

            return (
              <div key={month} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Month Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{monthData.monthName} {currentYear}</h2>
                      <p className="text-blue-50 text-sm">Total recaudado: ${monthData.totalCollected.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-50 text-sm">A tiempo: {monthData.onTimePayments}</p>
                      <p className="text-blue-100 text-sm">Tardíos: {monthData.latePayments}</p>
                    </div>
                  </div>
                </div>

                {/* Month Content */}
                <div className="p-6">
                  {/* Paid Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full mr-3">
                        <span className="text-green-600 font-bold">✓</span>
                      </span>
                      Casas que Pagaron ({monthData.paid.length})
                    </h3>

                    {monthData.paid.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No hay pagos registrados</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left px-4 py-2 bg-gray-50 font-medium text-gray-700">Casa</th>
                              <th className="text-left px-4 py-2 bg-gray-50 font-medium text-gray-700">Monto</th>
                              <th className="text-left px-4 py-2 bg-gray-50 font-medium text-gray-700">Estado</th>
                              <th className="text-left px-4 py-2 bg-gray-50 font-medium text-gray-700">Tipo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthData.paid.map((payment, idx) => (
                              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">#{payment.houseNumber}</td>
                                <td className="px-4 py-3 text-gray-700">${payment.amount.toFixed(2)}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {payment.status === 'approved' ? 'Aprobado' : 
                                     payment.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {payment.isLate ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      ⚠️ Tardío
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      A tiempo
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Unpaid Section */}
                  {monthData.unpaid.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-full mr-3">
                          <span className="text-red-600 font-bold">✕</span>
                        </span>
                        Casas que NO Pagaron ({monthData.unpaid.length})
                      </h3>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left px-4 py-2 bg-gray-50 font-medium text-gray-700">Casa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthData.unpaid.map((house, idx) => (
                              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                                    Casa #{house.houseNumber}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
