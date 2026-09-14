import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { getAllPaymentsByYear } from '../services/paymentService';
import { getExpensesByMonth, getExpensesByYear } from '../services/expensesService';
import { getInitialDepositsByMonthYear, getInitialDepositsByYear } from '../services/initialDepositService';
import { getBankStatementsByMonthYear } from '../services/bankStatementService';
import { getAllUsers } from '../services/userService';
import { getCurrentYear, getMonthName } from '../utils/dateValidation';
import { TOTAL_HOUSES } from '../config/constants';
import BankStatementPanel from '../components/BankStatementPanel';

export default function AdminFinancialReport() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthlyReport, setMonthlyReport] = useState({});
  const [allHouses, setAllHouses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthExpenses, setMonthExpenses] = useState([]);
  const [monthInitialDeposits, setMonthInitialDeposits] = useState([]);
  const [yearExpenses, setYearExpenses] = useState([]);
  const [yearInitialDeposits, setYearInitialDeposits] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);

  const currentYear = getCurrentYear();

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get all payments for the year
      const payments = await getAllPaymentsByYear(currentYear);
      setAllPayments(payments);

      // Get all residents (houses)
      const users = await getAllUsers();
      const residents = users.filter(u => u.role === 'resident');
      setAllHouses(residents);

      // Get expenses for selected month
      const expenses = await getExpensesByMonth(selectedMonth, currentYear);
      setMonthExpenses(expenses);

      // Get expenses for the entire year
      const expensesYear = await getExpensesByYear(currentYear);
      setYearExpenses(expensesYear);

      // Get initial deposits for selected month
      const deposits = await getInitialDepositsByMonthYear(selectedMonth, currentYear);
      setMonthInitialDeposits(deposits);

      // Get initial deposits for the entire year
      const depositsYear = await getInitialDepositsByYear(currentYear);
      setYearInitialDeposits(depositsYear);

      // Get bank statements for selected month
      const statements = await getBankStatementsByMonthYear(selectedMonth, currentYear);
      setBankStatements(statements);

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
        uniquePaidHouses: 0,
        onTimePayments: 0,
        latePayments: 0
      };
    }

    // Process payments - Filter out invalid house numbers (only 1-60)
    payments
      .filter(payment => payment.houseNumber >= 1 && payment.houseNumber <= TOTAL_HOUSES)
      .forEach(payment => {
        if (payment.month && report[payment.month]) {
          report[payment.month].paid.push({
            houseNumber: payment.houseNumber,
            amount: payment.amount,
            isLate: payment.isLate,
            status: payment.status
          });
          
          // Only count approved payments in totalCollected (like AdminDashboard)
          if (payment.status === 'approved') {
            report[payment.month].totalCollected += payment.amount;
          }
        }
      });

    // Calculate on-time and late payments for each month (count unique houses)
    Object.keys(report).forEach(month => {
      const onTimeHouses = new Set();
      const lateHouses = new Set();
      
      report[month].paid.forEach(payment => {
        if (payment.isLate) {
          lateHouses.add(payment.houseNumber);
        } else {
          onTimeHouses.add(payment.houseNumber);
        }
      });
      
      report[month].onTimePayments = onTimeHouses.size;
      report[month].latePayments = lateHouses.size;
    });

    // Find unpaid houses for each month - Show all 60 houses
    Object.keys(report).forEach(month => {
      const paidHouses = new Set(report[month].paid.map(p => p.houseNumber));
      report[month].uniquePaidHouses = paidHouses.size;
      
      // Add all houses from 1 to 60 that haven't paid
      for (let houseNumber = 1; houseNumber <= TOTAL_HOUSES; houseNumber++) {
        if (!paidHouses.has(houseNumber)) {
          const resident = residents.find(r => r.houseNumber === houseNumber);
          report[month].unpaid.push({
            houseNumber,
            isRegistered: !!resident
          });
        }
      }
    });

    setMonthlyReport(report);
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('es-MX', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Month Selector */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Seleccionar Mes
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full md:w-56 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
              <option key={month} value={month}>
                {getMonthName(month)} {currentYear}
              </option>
            ))}
          </select>
        </div>

        {/* Bank Statement Panel - Only visible for admins */}
        {userData?.role === 'admin' && (
          <BankStatementPanel onStatementCreated={loadData} />
        )}

        {/* Bank Statement Download Button */}
        {bankStatements.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-white font-semibold">Estados de Cuenta Disponibles</p>
                  <p className="text-green-100 text-sm">{bankStatements.length} archivo(s) para {getMonthName(selectedMonth)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {bankStatements.map((statement) => (
                  <a
                    key={statement.id}
                    href={statement.fileUrl}
                    download
                    className="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors text-sm"
                  >
                    Descargar {statement.originalName}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {monthlyReport[selectedMonth] && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Recaudado</p>
              <p className="text-3xl md:text-2xl xl:text-3xl font-bold text-gray-900 mt-2 break-words">
                ${formatCurrency(
                  monthlyReport[selectedMonth].totalCollected + 
                  monthInitialDeposits.reduce((sum, dep) => sum + dep.amount, 0)
                )}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <p className="text-xs md:text-sm font-medium text-gray-600">Pagos a Tiempo</p>
              <p className="text-3xl md:text-2xl xl:text-3xl font-bold text-green-600 mt-2 break-words">
                {monthlyReport[selectedMonth].onTimePayments}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <p className="text-xs md:text-sm font-medium text-gray-600">Pagos Tardíos</p>
              <p className="text-3xl md:text-2xl xl:text-3xl font-bold text-orange-600 mt-2 break-words">
                {monthlyReport[selectedMonth].latePayments}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 md:p-6 border-l-4 border-red-500">
              <p className="text-xs md:text-sm font-medium text-gray-600">Casas por Pagar</p>
              <p className="text-3xl md:text-2xl xl:text-3xl font-bold text-red-600 mt-2 break-words">
                {monthlyReport[selectedMonth]?.unpaid.length || 0}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <p className="text-xs md:text-sm font-medium text-gray-600">Casas Totales</p>
              <p className="text-3xl md:text-2xl xl:text-3xl font-bold text-blue-600 mt-2 break-words">
                {TOTAL_HOUSES}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <p className="text-xs md:text-sm font-medium text-gray-600">Casas con Registro</p>
              <p className="text-3xl md:text-2xl xl:text-3xl font-bold text-blue-600 mt-2 break-words">
                {allHouses.length}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Gastos</p>
              <p className="text-3xl md:text-2xl xl:text-3xl font-bold text-red-600 mt-2 break-words">
                ${formatCurrency(monthExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
              </p>
            </div>

            <div className={`bg-white rounded-lg shadow p-4 md:p-6 ${
              (allPayments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0) + yearInitialDeposits.reduce((sum, dep) => sum + dep.amount, 0) - yearExpenses.reduce((sum, exp) => sum + exp.amount, 0)) >= 0
                ? 'border-l-4 border-green-500'
                : 'border-l-4 border-red-500'
            }`}>
              <p className="text-xs md:text-sm font-medium text-gray-600">💰 Dinero en Cuenta (Año)</p>
              <p className={`text-3xl md:text-2xl xl:text-3xl font-bold mt-2 break-words ${
                (allPayments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0) + yearInitialDeposits.reduce((sum, dep) => sum + dep.amount, 0) - yearExpenses.reduce((sum, exp) => sum + exp.amount, 0)) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                ${formatCurrency(Math.abs(allPayments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0) + yearInitialDeposits.reduce((sum, dep) => sum + dep.amount, 0) - yearExpenses.reduce((sum, exp) => sum + exp.amount, 0)))}
              </p>
            </div>

          </div>
        )}

        {/* Expenses Section */}
        {monthlyReport[selectedMonth] && (
          <div className="mb-8 bg-white rounded-lg shadow overflow-hidden">
            {/* Expenses Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Gastos del Mes</h2>
                  <p className="text-red-50 text-sm">Total: ${formatCurrency(monthExpenses.reduce((sum, exp) => sum + exp.amount, 0))}</p>
                </div>
                <div>
                  <p className="text-red-50 text-sm">Registros: {monthExpenses.length}</p>
                </div>
              </div>
            </div>

            {/* Expenses Content */}
            <div className="p-6">
              {monthExpenses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay gastos registrados para este mes</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-4 py-2 bg-gray-50 font-medium text-gray-700">Fecha</th>
                        <th className="text-left px-4 py-2 bg-gray-50 font-medium text-gray-700">Descripción</th>
                        <th className="text-right px-4 py-2 bg-gray-50 font-medium text-gray-700">Monto</th>
                        <th className="text-center px-4 py-2 bg-gray-50 font-medium text-gray-700">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthExpenses.map((expense, idx) => {
                        const createdDate = new Date(expense.createdAt?.seconds ? expense.createdAt.seconds * 1000 : expense.createdAt);
                        return (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600">{createdDate.toLocaleDateString('es-MX')}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{expense.description}</td>
                            <td className="px-4 py-3 text-sm font-bold text-red-600 text-right">${formatCurrency(expense.amount)}</td>
                            <td className="px-4 py-3 text-center">
                              {expense.receiptUrl && (
                                <a
                                  href={expense.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                  title="Ver comprobante"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Initial Deposits Section */}
        {monthlyReport[selectedMonth] && (
          <div className="mb-8 bg-white rounded-lg shadow overflow-hidden">
            {/* Deposits Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Abonos Iniciales</h2>
                  <p className="text-green-50 text-sm">Total: ${formatCurrency(monthInitialDeposits.reduce((sum, dep) => sum + dep.amount, 0))}</p>
                </div>
                <div>
                  <p className="text-green-50 text-sm">Registros: {monthInitialDeposits.length}</p>
                </div>
              </div>
            </div>

            {/* Deposits Content */}
            <div className="p-6">
              {monthInitialDeposits.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay abonos iniciales registrados para este mes</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-4 py-2 bg-gray-50 font-medium text-gray-700">Fecha</th>
                        <th className="text-left px-4 py-2 bg-gray-50 font-medium text-gray-700">Descripción</th>
                        <th className="text-right px-4 py-2 bg-gray-50 font-medium text-gray-700">Monto</th>
                        <th className="text-center px-4 py-2 bg-gray-50 font-medium text-gray-700">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthInitialDeposits.map((deposit, idx) => {
                        const createdDate = new Date(deposit.createdAt?.seconds ? deposit.createdAt.seconds * 1000 : deposit.createdAt);
                        return (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600">{createdDate.toLocaleDateString('es-MX')}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{deposit.description}</td>
                            <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">${formatCurrency(deposit.amount)}</td>
                            <td className="px-4 py-3 text-center">
                              {deposit.receiptUrl ? (
                                <a
                                  href={deposit.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                  title="Ver comprobante"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monthly Report */}
        {monthlyReport[selectedMonth] && (
          <div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Month Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{monthlyReport[selectedMonth].monthName} {currentYear}</h2>
                    <p className="text-blue-50 text-sm">Total recaudado: ${formatCurrency(monthlyReport[selectedMonth].totalCollected + monthInitialDeposits.reduce((sum, dep) => sum + dep.amount, 0))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-50 text-sm">A tiempo: {monthlyReport[selectedMonth].onTimePayments}</p>
                    <p className="text-blue-100 text-sm">Tardíos: {monthlyReport[selectedMonth].latePayments}</p>
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
                    Casas que Pagaron ({monthlyReport[selectedMonth].uniquePaidHouses})
                  </h3>

                  {monthlyReport[selectedMonth].paid.length === 0 ? (
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
                          {monthlyReport[selectedMonth].paid.map((payment, idx) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">#{payment.houseNumber}</td>
                              <td className="px-4 py-3 text-gray-700">{payment.amount === 0 ? '-' : `$${formatCurrency(payment.amount)}`}</td>
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
                {monthlyReport[selectedMonth].unpaid.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-full mr-3">
                        <span className="text-red-600 font-bold">✕</span>
                      </span>
                      Pendientes de pago ({monthlyReport[selectedMonth].unpaid.length})
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left px-4 py-2 bg-gray-50 font-medium text-gray-700">Casa</th>
                            <th className="text-left px-4 py-2 bg-gray-50 font-medium text-gray-700">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyReport[selectedMonth].unpaid.map((house, idx) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                                  Casa #{house.houseNumber}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {house.isRegistered ? (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                                    ✓ Registrada
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-200 text-gray-800 text-xs font-medium">
                                    ⚠ Sin registrar
                                  </span>
                                )}
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
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
