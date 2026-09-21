import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createExpense, uploadExpenseReceipt, deleteExpense, getExpensesByYear, updateExpense } from '../services/expensesService';
import { getCurrentMonth, getCurrentYear, getMonthName } from '../utils/dateValidation';
import { validateFile } from '../utils/fileValidation';

export default function ExpensesPanel({ onExpenseCreated }) {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentYear = getCurrentYear();

  // Load expenses on component mount
  useEffect(() => {
    loadExpenses();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!description.trim()) {
      setError('Por favor ingresa una descripción del gasto');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Por favor ingresa un monto válido');
      return;
    }

    if (!selectedFile) {
      setError('Por favor adjunta un comprobante');
      return;
    }

    try {
      setSubmitting(true);

      // Verify user is authenticated
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // Create expense record first to get the ID
      const expenseData = {
        description: description.trim(),
        amount: parseFloat(amount),
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        receiptUrl: '',
        createdAt: new Date()
      };

      const expense = await createExpense(expenseData);

      // Upload receipt using the expense ID
      const receiptUrl = await uploadExpenseReceipt(selectedFile, expense.id);

      // Update expense with receipt URL
      await updateExpense(expense.id, { receiptUrl });

      setSuccess('Gasto registrado exitosamente');
      setDescription('');
      setAmount('');
      setSelectedMonth(getCurrentMonth());
      setSelectedYear(getCurrentYear());
      setSelectedFile(null);
      setShowForm(false);

      // Reload expenses
      loadExpenses();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
        // Reload admin dashboard data
        if (onExpenseCreated) {
          onExpenseCreated();
        }
      }, 3000);
    } catch (err) {
      console.error('Error al registrar el gasto:', err);
      setError(`Error al registrar el gasto: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const allExpenses = await getExpensesByYear(currentYear);
      setExpenses(allExpenses);
    } catch (err) {
      console.error('Error al cargar gastos:', err);
      setError('Error al cargar los gastos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expenseId, receiptUrl) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      try {
        await deleteExpense(expenseId, receiptUrl);
        setSuccess('Gasto eliminado exitosamente');
        loadExpenses();
        setTimeout(() => {
          setSuccess('');
          // Reload admin dashboard data
          if (onExpenseCreated) {
            onExpenseCreated();
          }
        }, 3000);
      } catch (err) {
        console.error('Error al eliminar gasto:', err);
        setError('Error al eliminar el gasto');
      }
    }
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getMonthExpenses = (month) => {
    return expenses
      .filter(exp => exp.month === month && exp.year === currentYear)
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('es-MX', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const handleExportCSV = () => {
    const currentYearExpenses = expenses.filter(exp => exp.year === currentYear);
    
    if (currentYearExpenses.length === 0) {
      alert('No hay gastos para exportar');
      return;
    }

    const headers = ['Fecha', 'Descripción', 'Mes', 'Monto', 'Comprobante'];
    const rows = currentYearExpenses
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(expense => {
        const createdDate = new Date(expense.createdAt?.seconds ? expense.createdAt.seconds * 1000 : expense.createdAt);
        return [
          createdDate.toLocaleDateString('es-ES'),
          `"${expense.description.replace(/"/g, '""')}"`,
          getMonthName(expense.month),
          expense.amount.toFixed(2),
          expense.receiptUrl || ''
        ];
      });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gastos-${currentYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">💰</span>
            Gastos de la Privada
          </h2>
          <p className="text-sm text-gray-600 mt-1">Registra gastos comunes y adjunta comprobante</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={expenses.filter(exp => exp.year === currentYear).length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar CSV
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setError('');
              setSuccess('');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {showForm ? 'Cancelar' : 'Nuevo Gasto'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del Gasto
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Reparación de cañería, pintura, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {getMonthName(month)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comprobante (Recibo, Factura, etc.)
            </label>
            <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => document.getElementById('fileInput').click()}>
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  {selectedFile ? selectedFile.name : 'Haz clic para seleccionar archivo o arrastra uno aquí'}
                </p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, PDF - Máx 10MB</p>
              </div>
              <input
                id="fileInput"
                type="file"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.pdf,.heic"
                className="hidden"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Guardando...' : 'Registrar Gasto'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Total Gastos {currentYear}</p>
          <p className="text-2xl font-bold text-blue-600">${formatCurrency(getTotalExpenses())}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-gray-600 mb-1">Gastos Registrados</p>
          <p className="text-2xl font-bold text-green-600">{expenses.filter(e => e.year === currentYear).length}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-gray-600 mb-1">Este Mes</p>
          <p className="text-2xl font-bold text-purple-600">${formatCurrency(getMonthExpenses(getCurrentMonth()))}</p>
        </div>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay gastos registrados aún</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Comprobante</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses
                .filter(exp => exp.year === currentYear)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((expense) => {
                  const createdDate = new Date(expense.createdAt?.seconds ? expense.createdAt.seconds * 1000 : expense.createdAt);
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {createdDate.toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {expense.description}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getMonthName(expense.month)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                        ${formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
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
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleDelete(expense.id, expense.receiptUrl)}
                          className="inline-flex items-center justify-center px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
