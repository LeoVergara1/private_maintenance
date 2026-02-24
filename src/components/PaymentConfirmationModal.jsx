import { useState } from 'react';
import { downloadReceiptPDF, generateReceiptHTML } from '../utils/receiptGenerator';
import { getMonthName } from '../utils/dateValidation';

export default function PaymentConfirmationModal({ isOpen, onClose, paymentData }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFullReceipt, setShowFullReceipt] = useState(false);

  if (!isOpen || !paymentData) return null;

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const fileName = `recibo_pago_casa${paymentData.houseNumber}_${paymentData.month}_${paymentData.year}.pdf`;
      await downloadReceiptPDF(paymentData, fileName);
    } catch (error) {
      console.error('Error al descargar PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const receiptHTML = generateReceiptHTML(paymentData);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo de Pago</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${receiptHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
      </html>
    `);
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
        <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h2 className="text-2xl font-bold">¡Pago Registrado!</h2>
                  <p className="text-green-50 text-sm">Confirmación de transacción</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-green-50 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6">
            {/* Receipt Number */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-xs font-semibold text-blue-600 uppercase">Número de Recibo</p>
              <p className="text-xl font-bold text-blue-900 font-mono mt-1">{paymentData.receiptNumber}</p>
            </div>

            {/* Payment Summary */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Casa</p>
                <p className="text-3xl font-bold text-gray-900">{paymentData.houseNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Período</p>
                <p className="text-lg font-semibold text-gray-900">
                  {getMonthName(paymentData.month)} {paymentData.year}
                </p>
              </div>
            </div>

            {/* Amount */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Monto Registrado</p>
              <p className="text-4xl font-bold text-green-600">${paymentData.amount.toFixed(2)}</p>
            </div>

            {/* Status */}
            {paymentData.isLate ? (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-800">Pago Tardío</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      El pago fue registrado después del período permitido (1-10 del mes).
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-green-800">Pago a Tiempo</h3>
                    <p className="text-sm text-green-700 mt-1">
                      El pago fue registrado dentro del período permitido.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Información Adicional</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 flex-shrink-0">•</span>
                  <span>Tu pago está pendiente de revisión y aprobación</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 flex-shrink-0">•</span>
                  <span>Recibirás una notificación cuando sea procesado</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 flex-shrink-0">•</span>
                  <span>Guarda este recibo para tus registros</span>
                </li>
              </ul>
            </div>

            {/* Preview Button */}
            {!showFullReceipt && (
              <button
                onClick={() => setShowFullReceipt(true)}
                className="w-full mb-4 text-blue-600 hover:text-blue-700 text-sm font-medium py-2"
              >
                Ver recibo completo →
              </button>
            )}

            {/* Full Receipt Preview */}
            {showFullReceipt && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-96 overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: generateReceiptHTML(paymentData) }} />
              </div>
            )}
          </div>

          {/* Footer with Actions */}
          <div className="bg-gray-50 px-8 py-4 flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4H9a2 2 0 01-2-2v-4a2 2 0 012-2h6a2 2 0 012 2v4a2 2 0 01-2 2zm-6 4h6" />
              </svg>
              Imprimir
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isDownloading ? 'Descargando...' : 'Descargar PDF'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
