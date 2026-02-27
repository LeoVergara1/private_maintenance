import { useState, useEffect } from 'react';
import { createAnnualPayment, getAllPaymentsByYear } from '../services/paymentService';
import { getCurrentMonth, getCurrentYear, getMonthName } from '../utils/dateValidation';
import { validateFile } from '../utils/fileValidation';
import { useAuth } from '../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export default function AnnualPaymentPanel({ onPaymentCreated }) {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allPayments, setAllPayments] = useState([]);

  // Form state
  const [houseNumber, setHouseNumber] = useState('');
  const [amount, setAmount] = useState(3600);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [status, setStatus] = useState('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const currentMonth = getCurrentMonth();

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
    const storageRef = ref(storage, `receipts/annual/${houseNumber}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

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
      // Upload receipt first if provided
      let receiptUrl = null;
      if (selectedFile) {
        try {
          receiptUrl = await uploadReceiptFile(selectedFile, parseInt(houseNumber));
        } catch (uploadErr) {
          console.error('Error al subir comprobante:', uploadErr);
          setError(`Error al subir comprobante: ${uploadErr.message}`);
          setLoading(false);
          return;
        }
      }

      const paymentIds = await createAnnualPayment(
        parseInt(houseNumber),
        parseFloat(amount),
        currentMonth,
        parseInt(selectedYear),
        currentUser.uid,
        status,
        adminNotes,
        receiptUrl
      );

      setSuccess('✅ Pago anual registrado para los 12 meses');

      setHouseNumber('');
      setAmount(3600);
      setSelectedYear(getCurrentYear());
      setStatus('pending');
      setAdminNotes('');
      setSelectedFile(null);

      setTimeout(() => {
        setSuccess('');
        setShowForm(false);
        if (onPaymentCreated) {
          onPaymentCreated();
        }
      }, 3000);
    } catch (err) {
      console.error('Error al registrar pago anual:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">🗓️</span>
            Registrar Pago Anual
          </h2>
          <p className="text-sm text-gray-600">Registra un pago para los 12 meses</p>
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
                Monto Total Anual (Pesos)
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
              <p className="mt-1 text-xs text-gray-500">
                Se registrará el monto completo en {getMonthName(currentMonth)}, el resto de meses con valor 0
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Nota:</strong> Se generarán registros de pago para todos los 12 meses del año. El monto completo se registrará en <strong>{getMonthName(currentMonth)}</strong>, y los 11 meses restantes tendrán valor 0.
            </p>
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
              placeholder="Agregar comentarios sobre el pago anual..."
            />
          </div>

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
              {loading ? 'Registrando...' : 'Registrar Pago Anual'}
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
