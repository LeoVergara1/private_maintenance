import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createInitialDeposit, getInitialDepositsByYear, deleteInitialDeposit } from '../services/initialDepositService';
import { getCurrentYear, getMonthName } from '../utils/dateValidation';
import { validateFile } from '../utils/fileValidation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export default function InitialDepositPanel({ onDepositCreated }) {
  const { currentUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deposits, setDeposits] = useState([]);
  const [loadingDeposits, setLoadingDeposits] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const currentYear = getCurrentYear();

  useEffect(() => {
    loadDeposits();
  }, [selectedYear]);

  const loadDeposits = async () => {
    try {
      setLoadingDeposits(true);
      const depositsData = await getInitialDepositsByYear(selectedYear);
      setDeposits(depositsData);
    } catch (err) {
      console.error('Error al cargar abonos iniciales:', err);
      setError('Error al cargar abonos iniciales');
    } finally {
      setLoadingDeposits(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('Por favor ingresa un monto válido');
      return;
    }

    setLoading(true);

    try {
      let receiptUrl = null;
      
      // Upload receipt if file was provided
      if (selectedFile) {
        receiptUrl = await uploadReceiptFile(selectedFile);
      }

      await createInitialDeposit(
        parseFloat(amount),
        parseInt(selectedMonth),
        parseInt(selectedYear),
        description,
        currentUser.uid,
        receiptUrl
      );

      setSuccess('✅ Abono inicial registrado correctamente');
      setAmount('');
      setDescription('');
      setSelectedMonth(new Date().getMonth() + 1);
      setSelectedFile(null);

      // Recargar abonos
      await loadDeposits();

      setTimeout(() => {
        setSuccess('');
        setShowForm(false);
        // Reload admin dashboard data
        if (onDepositCreated) {
          onDepositCreated();
        }
      }, 3000);
    } catch (err) {
      console.error('Error al registrar abono:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (depositId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este abono?')) {
      try {
        await deleteInitialDeposit(depositId);
        setSuccess('Abono eliminado correctamente');
        await loadDeposits();
        setTimeout(() => {
          setSuccess('');
          // Reload admin dashboard data
          if (onDepositCreated) {
            onDepositCreated();
          }
        }, 3000);
      } catch (err) {
        console.error('Error al eliminar abono:', err);
        setError(`Error al eliminar: ${err.message}`);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setFileError(validation.error);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setFileError('');
    }
  };

  const uploadReceiptFile = async (file) => {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `deposit-${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, `receipts/deposits/${fileName}`);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const totalDeposits = deposits.reduce((sum, dep) => sum + dep.amount, 0);
  const monthlyDeposits = deposits.filter(d => d.month === selectedMonth);
  const monthlyTotal = monthlyDeposits.reduce((sum, dep) => sum + dep.amount, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">💰</span>
            Abonos Iniciales
          </h2>
          <p className="text-sm text-gray-600">Registrar saldo inicial de la privada</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showForm
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {showForm ? 'Cancelar' : '+ Nuevo Abono'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Monto (Pesos) *
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                required
              />
            </div>

            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">
                Mes
              </label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {getMonthName(month)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (Opcional)
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Saldo anterior, Pago inicial, etc."
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label htmlFor="receipt" className="block text-sm font-medium text-gray-700 mb-2">
              Comprobante (Opcional)
            </label>
            <input
              type="file"
              id="receipt"
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.heic,.pdf"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Formatos: JPG, PNG, HEIC, PDF (Máx. 5MB)
            </p>
            {selectedFile && (
              <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                ✓ {selectedFile.name}
              </p>
            )}
            {fileError && (
              <p className="mt-2 text-sm text-red-600">
                {fileError}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Registrar Abono'}
          </button>
        </form>
      )}

      {/* Year selector */}
      <div className="mb-6 flex items-center gap-4">
        <label className="block text-sm font-medium text-gray-700">Año:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 font-medium">Total {selectedYear}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            ${formatCurrency(totalDeposits)}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700 font-medium">{getMonthName(selectedMonth)}</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            ${formatCurrency(monthlyTotal)}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-700 font-medium">Registros</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {deposits.length}
          </p>
        </div>
      </div>

      {/* Deposits list */}
      {loadingDeposits ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : deposits.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No hay abonos iniciales registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Comprobante</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deposits.map((deposit) => (
                <tr key={deposit.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {deposit.createdAt?.toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {getMonthName(deposit.month)} {deposit.year}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                    {deposit.description}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                    ${formatCurrency(deposit.amount)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
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
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleDelete(deposit.id)}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                      title="Eliminar abono"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
