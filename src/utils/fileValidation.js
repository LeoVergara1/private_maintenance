/**
 * Allowed file types
 */
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic'],
  'application/pdf': ['.pdf']
};

/**
 * Maximum file size (5MB in bytes)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validate file type
 */
export const validateFileType = (file) => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Check MIME type
  if (Object.keys(ALLOWED_TYPES).includes(fileType)) {
    return { valid: true, error: null };
  }
  
  // Check file extension for HEIC (sometimes not recognized by MIME type)
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  if (extension === '.heic') {
    return { valid: true, error: null };
  }
  
  return { 
    valid: false, 
    error: 'Formato no válido. Solo se permiten archivos JPG, PNG, HEIC y PDF.' 
  };
};

/**
 * Validate file size
 */
export const validateFileSize = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return { 
      valid: false, 
      error: `El archivo es demasiado grande (${sizeMB}MB). El tamaño máximo permitido es 5MB.` 
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate file (type and size)
 */
export const validateFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No se ha seleccionado ningún archivo.' };
  }
  
  // Validate type
  const typeValidation = validateFileType(file);
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  // Validate size
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }
  
  return { valid: true, error: null };
};

/**
 * Get file type for display
 */
export const getFileTypeDisplay = (fileName) => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  switch (extension) {
    case '.pdf':
      return 'PDF';
    case '.jpg':
    case '.jpeg':
      return 'JPG';
    case '.png':
      return 'PNG';
    case '.heic':
      return 'HEIC';
    default:
      return 'Archivo';
  }
};

/**
 * Check if file is an image
 */
export const isImageFile = (fileName) => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return ['.jpg', '.jpeg', '.png', '.heic'].includes(extension);
};

/**
 * Check if file is a PDF
 */
export const isPdfFile = (fileName) => {
  return fileName.toLowerCase().endsWith('.pdf');
};
