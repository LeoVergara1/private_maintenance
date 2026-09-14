import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { 
  checkDuplicatePayment, 
  checkDuplicatePaymentByHouse,
  uploadReceipt, 
  createPayment, 
  getPaymentsByYear,
  getPaymentsByHouseAndYear
} from '../services/paymentService';
import { 
  getCurrentMonth, 
  getCurrentYear, 
  isLatePayment, 
  getMonthName 
} from '../utils/dateValidation';
import { validateFile } from '../utils/fileValidation';
import { compressImage, formatFileSize } from '../utils/imageOptimization';
import { generateReceiptNumber, generateReceiptHTML } from '../utils/receiptGenerator';
import ReceiptModal from '../components/ReceiptModal';
import PaymentConfirmationModal from '../components/PaymentConfirmationModal';

export default function ResidentDashboard() {
  const { currentUser, userData } = useAuth();
  const [amount, setAmount] = useState(300);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [hasPaidThisMonth, setHasPaidThisMonth] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null);
  const [viewingReceiptPayment, setViewingReceiptPayment] = useState(null);

  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();
  const isLate = isLatePayment();

  useEffect(() => {
    loadPayments();
    checkCurrentMonthPayment();
    // Set default amount based on whether payment is late
    if (isLate) {
      setAmount(315);
    } else {
      setAmount(300);
    }
  }, []);

  const loadPayments = async () => {
    try {
      console.log('Cargando pagos para casa:', userData.houseNumber, 'año:', currentYear);
      const userPayments = await getPaymentsByHouseAndYear(userData.houseNumber, currentYear);
      setPayments(userPayments);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const checkCurrentMonthPayment = async () => {
    try {
      // Check if ANY payment exists for this house this month (resident or admin uploaded)
      const hasPaid = await checkDuplicatePaymentByHouse(userData.houseNumber, currentMonth, currentYear);
      setHasPaidThisMonth(hasPaid);
    } catch (error) {
      console.error('Error al verificar pago del mes:', error);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error);
        setSelectedFile(null);
        return;
      }

      setError('');

      // Comprimir si pesa más de 200KB
      if (file.size > 200 * 1024) {
        try {
          const originalSize = formatFileSize(file.size);
          const compressedFile = await compressImage(file, 1920, 1080, 0.7);
          const compressedSize = formatFileSize(compressedFile.size);
          
          setSelectedFile(compressedFile);
          setSuccess(`Imagen comprimida: ${originalSize} → ${compressedSize}`);
          // Clear success message after 3 seconds
          setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
          console.error('Error al comprimir imagen:', error);
          setError('Error al comprimir la imagen. Por favor intenta de nuevo.');
          setSelectedFile(null);
        }
      } else {
        setSelectedFile(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFile) {
      setError('Por favor selecciona un comprobante');
      return;
    }

    if (!amount || amount <= 0) {
      setError('Por favor ingresa un monto válido');
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate payment
      const isDuplicate = await checkDuplicatePayment(currentUser.uid, currentMonth, currentYear);
      if (isDuplicate) {
        setError('Ya registraste un pago para este mes');
        setLoading(false);
        return;
      }

      // Upload receipt
      const receiptUrl = await uploadReceipt(selectedFile, currentUser.uid, currentMonth, currentYear);

      // Generate receipt number
      const receiptNumber = generateReceiptNumber();

      // Create payment record
      const paymentResult = await createPayment({
        userId: currentUser.uid,
        houseNumber: userData.houseNumber,
        amount: parseFloat(amount),
        receiptUrl,
        month: currentMonth,
        year: currentYear,
        isLate,
        receiptNumber
      });

      setSuccess('Pago registrado exitosamente');
      setSelectedFile(null);
      setAmount(300);
      
      // Show confirmation modal
      setConfirmationData({
        houseNumber: userData.houseNumber,
        amount: parseFloat(amount),
        month: currentMonth,
        year: currentYear,
        isLate,
        receiptNumber,
        createdAt: new Date()
      });

      // Reload payments (without delay - verification now always reads fresh from Firestore)
      await loadPayments();
      await checkCurrentMonthPayment();

      // Clear form
      const fileInput = document.getElementById('receipt');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error al registrar pago:', error);
      setError('Error al registrar el pago. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const handleConfirmationModalClose = async () => {
    // Verify again when closing the confirmation modal
    await checkCurrentMonthPayment();
    setConfirmationData(null);
  };

  return (
    <DashboardLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Late payment alert */}
        {isLate && !hasPaidThisMonth && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-red-800 font-semibold">Pago Tardío</h3>
                <p className="text-red-700 text-sm">
                  El periodo de pago (1-15 del mes) ha terminado. Tu pago será marcado como tardío.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment already done */}
        {hasPaidThisMonth && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-green-800 font-semibold">Pago Registrado</h3>
                <p className="text-green-700 text-sm">
                  Ya registraste tu pago para {getMonthName(currentMonth)} {currentYear}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Registrar Pago</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Periodo de Pago
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900 font-medium">
                    {getMonthName(currentMonth)} {currentYear}
                  </p>
                </div>
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
                  min="1"
                  step="0.01"
                  disabled={loading || hasPaidThisMonth}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {isLate ? 'Monto por pago tardío: $315' : 'Monto base: $300'}
                </p>
              </div>

              <div>
                <label htmlFor="receipt" className="block text-sm font-medium text-gray-700 mb-2">
                  Comprobante de Pago
                </label>
                <input
                  type="file"
                  id="receipt"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.heic,.pdf"
                  disabled={loading || hasPaidThisMonth}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Formatos: JPG, PNG, HEIC, PDF (Máx. 5MB)
                </p>
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
                disabled={loading || hasPaidThisMonth}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Registrando...' : 'Registrar Pago'}
              </button>
            </form>
          </div>

          {/* Payment history */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Historial de Pagos {currentYear}</h2>
            
            {loadingPayments ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">No tienes pagos registrados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {getMonthName(payment.month)} {payment.year}
                      </h3>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium">Monto:</span> {payment.amount === 0 ? '-' : `$${payment.amount}`}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Tardío:</span> {payment.isLate ? 'Sí' : 'No'}
                      </p>
                      {payment.receiptNumber && (
                        <p className="text-gray-600">
                          <span className="font-medium">Recibo #:</span> {payment.receiptNumber}
                        </p>
                      )}
                      {payment.adminNotes && (
                        <p className="text-gray-600">
                          <span className="font-medium">Notas:</span> {payment.adminNotes}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setSelectedReceipt({ url: payment.receiptUrl, fileName: '' })}
                        className="flex-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Ver Comprobante →
                      </button>
                      {payment.amount > 0 && (
                        <button
                          onClick={() => setViewingReceiptPayment({
                            ...payment,
                            receiptNumber: payment.receiptNumber || generateReceiptNumber(),
                            isForOtherMonth: payment.isForOtherMonth || false,
                            coveredMonths: payment.coveredMonths || []
                          })}
                          className="flex-1 text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          Ver Recibo →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        receiptUrl={selectedReceipt?.url}
        fileName={selectedReceipt?.fileName}
      />

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={!!confirmationData}
        onClose={handleConfirmationModalClose}
        paymentData={confirmationData}
      />

      {/* View Receipt Modal */}
      <PaymentConfirmationModal
        isOpen={!!viewingReceiptPayment}
        onClose={() => setViewingReceiptPayment(null)}
        paymentData={viewingReceiptPayment ? {
          houseNumber: viewingReceiptPayment.houseNumber,
          amount: viewingReceiptPayment.amount,
          month: viewingReceiptPayment.month,
          year: viewingReceiptPayment.year,
          isLate: viewingReceiptPayment.isLate,
          receiptNumber: viewingReceiptPayment.receiptNumber,
          createdAt: viewingReceiptPayment.createdAt
        } : null}
      />
    </DashboardLayout>
  );
}
