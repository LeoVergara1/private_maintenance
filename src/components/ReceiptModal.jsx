import { useState, useEffect } from 'react';
import { isImageFile, isPdfFile } from '../utils/fileValidation';

export default function ReceiptModal({ isOpen, onClose, receiptUrl, fileName }) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setLoadError(false);
    }
  }, [isOpen, receiptUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    window.open(receiptUrl, '_blank');
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setLoadError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  // Extract file extension from URL (handle Firebase Storage URLs with parameters)
  const getFileExtension = (url) => {
    if (!url) return '';
    // Remove query parameters
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\.([^/.]+)$/);
    return match ? match[1].toLowerCase() : '';
  };

  const fileExtension = fileName 
    ? fileName.split('.').pop().toLowerCase()
    : getFileExtension(receiptUrl);

  const isImage = ['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'].includes(fileExtension);
  const isPdf = fileExtension === 'pdf';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 transition-opacity"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Comprobante de Pago
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Descargar
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
            {isLoading && !loadError && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {isImage && (
              <>
                <img
                  src={receiptUrl}
                  alt="Comprobante"
                  className="w-full h-auto rounded-lg"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
                {loadError && (
                  <div className="mt-4 text-center">
                    <p className="text-red-600 mb-4">No se pudo cargar la imagen directamente.</p>
                    <button
                      onClick={handleDownload}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Descargar Imagen
                    </button>
                  </div>
                )}
              </>
            )}

            {isPdf && (
              <iframe
                src={receiptUrl}
                className="w-full h-[70vh] rounded-lg"
                onLoad={handleImageLoad}
                onError={handleImageError}
                title="PDF Comprobante"
              />
            )}

            {!isImage && !isPdf && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 mb-4">
                  No se puede previsualizar este tipo de archivo
                </p>
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Descargar Archivo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
