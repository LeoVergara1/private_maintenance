import { useState, useEffect } from 'react';
import { getAllUsers } from '../services/userService';
import { getAllPaymentsByYear } from '../services/paymentService';
import { getCurrentYear, getMonthName } from '../utils/dateValidation';

const TOTAL_HOUSES = 60;

export default function PastDebtsPanel() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = todos los meses
  const [expandedHouse, setExpandedHouse] = useState(null);
  const [filterHouse, setFilterHouse] = useState('');
  const [sortByDebt, setSortByDebt] = useState(false);

  useEffect(() => {
    loadDebts();
  }, [selectedYear]);

  const loadDebts = async () => {
    try {
      setLoading(true);

      // Get all users
      const allUsers = await getAllUsers();
      const registeredHouses = allUsers.filter(u => u.houseNumber);
      const registeredHouseNumbers = registeredHouses.map(u => u.houseNumber);

      // Get all payments for the selected year
      const allPayments = await getAllPaymentsByYear(selectedYear);

      // Get current month/year
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = getCurrentYear();

      // Check months from January up to current month (only past/current months)
      const monthsToCheck = currentYear === selectedYear
        ? Array.from({ length: currentMonth }, (_, i) => i + 1) // Jan to current month
        : Array.from({ length: 12 }, (_, i) => i + 1); // All months for past years

      // Check all 60 houses (registered + unregistered)
      const houseDebts = [];

      for (let houseNum = 1; houseNum <= TOTAL_HOUSES; houseNum++) {
        const user = registeredHouses.find(u => u.houseNumber === houseNum);
        const housePayments = allPayments.filter(p => p.houseNumber === houseNum);
        const missingMonths = [];

        for (const month of monthsToCheck) {
          // Find payments for this month
          const monthPayments = housePayments.filter(p => p.month === month);

          if (monthPayments.length === 0) {
            // No payment at all for this month → debt
            missingMonths.push(month);
          } else {
            // Check if any payment actually covers this month
            const hasValidPayment = monthPayments.some(p => {
              // Placeholder payments cover this month
              if (p.isPlaceholder) return true;
              
              // Normal payments (not offset) cover this month
              if (!p.isForOtherMonth) return true;
              
              // Offset payments: only cover if month is in coveredMonths
              if (p.isForOtherMonth && p.coveredMonths) {
                return p.coveredMonths.includes(month);
              }
              
              return false;
            });

            if (!hasValidPayment) {
              // Payments exist but none cover this month → debt
              missingMonths.push(month);
            }
          }
        }

        if (missingMonths.length > 0) {
          houseDebts.push({
            houseNumber: houseNum,
            displayName: user?.displayName || null,
            isRegistered: registeredHouseNumbers.includes(houseNum),
            hasPaid: housePayments.length > 0,
            missingMonths,
            totalDebt: missingMonths.length * 300 // $300 per month
          });
        }
      }

      // Sort by house number
      houseDebts.sort((a, b) => a.houseNumber - b.houseNumber);

      setDebts(houseDebts);
    } catch (error) {
      console.error('Error al cargar adeudos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHouse = (houseNumber) => {
    setExpandedHouse(expandedHouse === houseNumber ? null : houseNumber);
  };

  // Filter debts by house number
  let filteredDebts = filterHouse
    ? debts.filter(d => d.houseNumber === parseInt(filterHouse))
    : [...debts];

  // Filter by selected month
  if (selectedMonth > 0) {
    filteredDebts = filteredDebts.filter(d => d.missingMonths.includes(selectedMonth));
  }

  // Sort by debt (most months first) if enabled
  if (sortByDebt) {
    filteredDebts.sort((a, b) => b.missingMonths.length - a.missingMonths.length);
  }

  const totalDebtAllHouses = filteredDebts.reduce((sum, d) => sum + d.totalDebt, 0);
  const totalMissingMonths = filteredDebts.reduce((sum, d) => sum + d.missingMonths.length, 0);

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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            Adeudos de Meses Pasados
          </h2>
          <p className="text-sm text-gray-600">
            Todas las {TOTAL_HOUSES} casas - meses sin cubrir
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Casa:</label>
            <input
              type="number"
              value={filterHouse}
              onChange={(e) => setFilterHouse(e.target.value)}
              placeholder="Buscar..."
              min="1"
              max={TOTAL_HOUSES}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setSortByDebt(!sortByDebt)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortByDebt
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            {sortByDebt ? '↓ Mayor deuda' : 'Ordenar por deuda'}
          </button>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Array.from({ length: 5 }, (_, i) => getCurrentYear() - i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={0}>Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>{getMonthName(month)}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredDebts.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium">
            {filterHouse ? `Casa ${filterHouse} no tiene adeudos` : '¡No hay adeudos!'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {filterHouse ? 'O busca otra casa' : 'Todas las casas están al corriente'}
          </p>
        </div>
      ) : (
        <div>
          {/* Summary */}
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-red-800 font-semibold">
                  {filteredDebts.length} {filteredDebts.length === 1 ? 'casa' : 'casas'} con adeudos
                </p>
              </div>
              <div className="text-red-700">
                <span className="font-medium">{totalMissingMonths}</span> meses pendientes
              </div>
              <div className="text-red-700">
                Total: <span className="font-medium">${totalDebtAllHouses.toLocaleString('es-MX')}</span>
              </div>
            </div>
          </div>

          {/* Debt list */}
          <div className="space-y-3">
            {filteredDebts.map((debt) => (
              <div
                key={debt.houseNumber}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleHouse(debt.houseNumber)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">Casa {debt.houseNumber}</span>
                    {!debt.isRegistered && (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                        No registrada
                      </span>
                    )}
                    {debt.hasPaid && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Ha pagado
                      </span>
                    )}
                    {debt.displayName && (
                      <span className="text-sm text-gray-500">({debt.displayName})</span>
                    )}
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      {debt.missingMonths.length} {debt.missingMonths.length === 1 ? 'mes' : 'meses'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-red-600">
                      ${debt.totalDebt.toLocaleString('es-MX')}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedHouse === debt.houseNumber ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedHouse === debt.houseNumber && (
                  <div className="px-4 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Meses pendientes:</p>
                    <div className="flex flex-wrap gap-2">
                      {debt.missingMonths.map((month) => (
                        <span
                          key={month}
                          className="px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-lg"
                        >
                          {getMonthName(month)}
                        </span>
                      ))}
                    </div>
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
