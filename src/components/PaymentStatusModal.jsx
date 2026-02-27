import { useState, useEffect } from 'react';
import { updatePaymentStatus } from '../services/paymentService';
import { validateFile } from '../utils/fileValidation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export default function PaymentStatusModal({ isOpen, onClose, payment, onUpdate }) {
  const [status, setStatus] = useState(payment?.status || 'pending');
  const [amount, setAmount] = useState(payment?.amount || 300);
  const [adminNotes, setAdminNotes] = useState(payment?.adminNotes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');

  // Update form when payment changes
  useEffect(() => {
    if (payment) {
      setStatus(payment.status || 'pending');
      setAmount(payment.amount || 300);
      setAdminNotes(payment.adminNotes || '');
      setSelectedFile(null);
      setFileError('');
      setError('');
    }
  }, [payment, isOpen]);

  if (!isOpen || !payment) return null;

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

  const uploadReceiptFile = async (file, houseNumber) => {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${houseNumber}-${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, `receipts/manual/${houseNumber}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const updateData = {
        status,
        amount: parseFloat(amount),
        adminNotes: adminNotes.trim()
      };

      // Upload new receipt if selected
      if (selectedFile) {
        const receiptUrl = await uploadReceiptFile(selectedFile, payment.houseNumber);
        updateData.receiptUrl = receiptUrl;
      }

      await updatePaymentStatus(payment.id, updateData);

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error al actualizar pago:', error);
      setError('Error al actualizar el pago. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Actualizar Estado de Pago
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Casa
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-900 font-medium">Casa {payment.houseNumber}</p>
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Editar para agregar multas por pago tardío
              </p>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Agregar comentarios o razón del rechazo..."
              />
            </div>

            {/* Current Receipt Section */}
            {payment.receiptUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Comprobante Actual</p>
                <a
                  href={payment.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Ver Comprobante
                </a>
              </div>
            )}

            {/* New Receipt Upload */}
            <div>
              <label htmlFor="receipt" className="block text-sm font-medium text-gray-700 mb-2">
                Cambiar Comprobante (Opcional)
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

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
