import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getMonthName } from './dateValidation';

/**
 * Generate confirmation receipt HTML
 */
export const generateReceiptHTML = (paymentData) => {
  const {
    houseNumber,
    amount,
    month,
    year,
    isLate,
    createdAt,
    receiptNumber
  } = paymentData;

  const formattedDate = new Date(createdAt).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <div style="
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px;
      background: white;
    ">
      <!-- Header -->
      <div style="
        text-align: center;
        border-bottom: 2px solid #3b82f6;
        padding-bottom: 20px;
        margin-bottom: 30px;
      ">
        <h1 style="
          color: #1e40af;
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        ">
          ✓ PAGO REGISTRADO EXITOSAMENTE
        </h1>
      </div>

      <!-- Receipt Number -->
      <div style="
        text-align: center;
        background: #f0f9ff;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 30px;
      ">
        <p style="
          margin: 0;
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
        ">
          Número de Recibo
        </p>
        <p style="
          margin: 5px 0 0 0;
          color: #1e40af;
          font-size: 20px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
        ">
          ${receiptNumber}
        </p>
      </div>

      <!-- Payment Details -->
      <div style="
        margin-bottom: 30px;
      ">
        <h2 style="
          color: #1f2937;
          font-size: 16px;
          margin-top: 0;
          margin-bottom: 15px;
          font-weight: 600;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
        ">
          Detalles del Pago
        </h2>

        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        ">
          <div>
            <p style="
              margin: 0 0 5px 0;
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
            ">
              Casa Número
            </p>
            <p style="
              margin: 0;
              color: #1f2937;
              font-size: 18px;
              font-weight: bold;
            ">
              ${houseNumber}
            </p>
          </div>

          <div>
            <p style="
              margin: 0 0 5px 0;
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
            ">
              Periodo
            </p>
            <p style="
              margin: 0;
              color: #1f2937;
              font-size: 18px;
              font-weight: bold;
            ">
              ${getMonthName(month)} ${year}
            </p>
          </div>

          <div>
            <p style="
              margin: 0 0 5px 0;
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
            ">
              Monto
            </p>
            <p style="
              margin: 0;
              color: #059669;
              font-size: 24px;
              font-weight: bold;
            ">
              $${amount.toFixed(2)}
            </p>
          </div>

          <div>
            <p style="
              margin: 0 0 5px 0;
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
            ">
              Fecha de Registro
            </p>
            <p style="
              margin: 0;
              color: #1f2937;
              font-size: 14px;
            ">
              ${formattedDate}
            </p>
          </div>
        </div>
      </div>

      <!-- Late Payment Notice -->
      ${isLate ? `
        <div style="
          background: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 15px;
          margin-bottom: 30px;
          border-radius: 4px;
        ">
          <p style="
            margin: 0;
            color: #7f1d1d;
            font-size: 13px;
            font-weight: 600;
          ">
            ⚠️ PAGO REGISTRADO COMO TARDÍO
          </p>
          <p style="
            margin: 8px 0 0 0;
            color: #7f1d1d;
            font-size: 12px;
          ">
            Este pago fue registrado después del período de pago (1-10 del mes).
          </p>
        </div>
      ` : `
        <div style="
          background: #f0fdf4;
          border-left: 4px solid #22c55e;
          padding: 15px;
          margin-bottom: 30px;
          border-radius: 4px;
        ">
          <p style="
            margin: 0;
            color: #166534;
            font-size: 13px;
            font-weight: 600;
          ">
            ✓ PAGO A TIEMPO
          </p>
          <p style="
            margin: 8px 0 0 0;
            color: #166534;
            font-size: 12px;
          ">
            Pago registrado dentro del período permitido (1-10 del mes).
          </p>
        </div>
      `}

      <!-- Next Steps -->
      <div style="
        background: #f3f4f6;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      ">
        <h3 style="
          margin-top: 0;
          margin-bottom: 10px;
          color: #1f2937;
          font-size: 14px;
          font-weight: 600;
        ">
          Próximos Pasos
        </h3>
        <ol style="
          margin: 0;
          padding-left: 20px;
          color: #4b5563;
          font-size: 13px;
          line-height: 1.8;
        ">
          <li>Tu pago está pendiente de aprobación</li>
          <li>Recibirás una notificación cuando sea revisado</li>
          <li>Guarda este recibo como comprobante</li>
        </ol>
      </div>

      <!-- Footer -->
      <div style="
        text-align: center;
        border-top: 1px solid #e5e7eb;
        padding-top: 20px;
        color: #666;
        font-size: 12px;
      ">
        <p style="margin: 0;">
          Este es un comprobante automático. Por favor guárdalo para tus registros.
        </p>
        <p style="margin: 5px 0 0 0;">
          ${new Date().toLocaleString('es-MX')}
        </p>
      </div>
    </div>
  `;
};

/**
 * Download receipt as PDF
 */
export const downloadReceiptPDF = async (paymentData, fileName = 'recibo_pago.pdf') => {
  try {
    // Create temporary container
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = generateReceiptHTML(paymentData);
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '600px';
    tempContainer.style.backgroundColor = 'white';
    document.body.appendChild(tempContainer);

    // Convert to canvas
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save(fileName);

    // Clean up
    document.body.removeChild(tempContainer);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw error;
  }
};

/**
 * Generate unique receipt number
 */
export const generateReceiptNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RCP-${timestamp}-${random}`;
};
