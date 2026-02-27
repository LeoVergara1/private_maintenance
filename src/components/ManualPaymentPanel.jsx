import { useState, useEffect } from 'react';
import { createManualPayment, updatePaymentStatus, getAllPaymentsByYear } from '../services/paymentService';
import { getCurrentMonth, getCurrentYear, getMonthName } from '../utils/dateValidation';
import { validateFile } from '../utils/fileValidation';
import { useAuth } from '../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export default function ManualPaymentPanel({ onPaymentCreated }) {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allPayments, setAllPayments] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Form state
  const [houseNumber, setHouseNumber] = useState('');
  const [amount, setAmount] = useState(300);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [isLate, setIsLate] = useState(false);
  const [status, setStatus] = useState('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Load all payments when component mounts
  useEffect(() => {
    const loadPayments = async () => {
      try {
        const payments = await getAllPaymentsByYear(getCurrentYear());
        setAllPayments(payments);
      } catch (err) {
        console.error('Error al cargar pagos:', err);
      }
    };
    loadPayments();
  }, []);

  // Check for duplicate payments when house, month, or year changes
  useEffect(() => {
    if (houseNumber && selectedMonth && selectedYear) {
      const duplicate = allPayments.find(
        p => p.houseNumber === parseInt(houseNumber) && 
             p.month === parseInt(selectedMonth) && 
             p.year === parseInt(selectedYear)
      );

      if (duplicate) {
        setDuplicateWarning({
          exists: true,
          payment: duplicate,
          message: `Ya existe un pago ${duplicate.status === 'approved' ? 'aprobado' : 'pendiente'} para esta casa en ${getMonthName(duplicate.month)} ${duplicate.year}`
        });
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [houseNumber, selectedMonth, selectedYear, allPayments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!houseNumber) {
      setError('Por favor selecciona un número de casa');
      return;
    }

    if (amount === '' || parseFloat(amount) < 0) {
      setError('Por favor ingresa un monto válido');
      return;
    }

    setLoading(true);

    try {
      const result = await createManualPayment(
        parseInt(houseNumber),
        parseFloat(amount),
        parseInt(selectedMonth),
        parseInt(selectedYear),
        currentUser.uid,
        isLate,
        status,
        adminNotes
      );

      // Upload receipt if file was provided
      if (selectedFile) {
        try {
          const receiptUrl = await uploadReceiptFile(selectedFile, parseInt(houseNumber));
          await updatePaymentStatus(result.id, { receiptUrl });
        } catch (uploadErr) {
          console.error('Error al subir comprobante:', uploadErr);
          setError(`Pago registrado pero error al subir comprobante: ${uploadErr.message}`);
        }
      }

      // Show different message based on whether payment was linked
      if (result.isLinked) {
        setSuccess('✅ Pago manual registrado y vinculado a usuario existente');
      } else {
        setSuccess('📋 Pago manual registrado - Se vinculará cuando el usuario se registre');
      }

      setHouseNumber('');
      setAmount(300);
      setSelectedMonth(getCurrentMonth());
      setSelectedYear(getCurrentYear());
      setIsLate(false);
      setStatus('pending');
      setAdminNotes('');
      setSelectedFile(null);

      setTimeout(() => {
        setSuccess('');
        setShowForm(false);
        // Reload payments table
        if (onPaymentCreated) {
          onPaymentCreated();
        }
      }, 3000);
    } catch (err) {
      console.error('Error al registrar pago manual:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('es-MX', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

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

  const uploadReceiptFile = async (file, houseNumber) => {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${houseNumber}-${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, `receipts/manual/${houseNumber}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Registrar Pago Manual
          </h2>
          <p className="text-sm text-gray-600">Para casas sin usuario aún registrado</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showForm
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {showForm ? 'Cancelar' : 'Nuevo Pago'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="house" className="block text-sm font-medium text-gray-700 mb-2">
                Número de Casa
              </label>
              <select
                id="house"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Selecciona una casa</option>
                {Array.from({ length: 60 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>
                    Casa {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Monto (Pesos)
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                Año
              </label>
              <input
                type="number"
                id="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isLate"
              checked={isLate}
              onChange={(e) => setIsLate(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
            />
            <label htmlFor="isLate" className="text-sm font-medium text-gray-700">
              Marcar como pago tardío
            </label>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Estado del Pago
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
            </select>
          </div>

          <div>
            <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-2">
              Notas del Administrador (Opcional)
            </label>
            <textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100"
              placeholder="Agregar comentarios o razón del rechazo..."
            />
          </div>

          {duplicateWarning && duplicateWarning.exists && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <h3 className="font-semibold text-orange-800">Pago Duplicado</h3>
                  <p className="text-sm text-orange-700 mt-1">{duplicateWarning.message}</p>
                  <p className="text-xs text-orange-600 mt-2">
                    Monto del pago existente: <span className="font-medium">${duplicateWarning.payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="receipt" className="block text-sm font-medium text-gray-700 mb-2">
              Comprobante de Pago (Opcional)
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

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Registrar Pago'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={loading}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
