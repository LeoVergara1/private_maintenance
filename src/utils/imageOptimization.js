/**
 * Detectar si un archivo es imagen
 */
const isImageFile = (file) => {
  const imageTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.webp'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return imageTypes.includes(file.type) || imageExtensions.includes(ext);
};

/**
 * Optimizar imágenes antes de subir
 * Reduce tamaño significativamente sin cambiar formato
 */
export const compressImage = async (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
  // Solo comprimir si es imagen
  if (!isImageFile(file)) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Usar JPEG para mejor compresión de capturas
        canvas.toBlob(
          (blob) => {
            // Crear un nuevo archivo con el blob comprimido
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '.jpg'), // Cambiar extensión a .jpg
              { type: 'image/jpeg' }
            );
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Error cargando imagen'));
      img.src = event.target.result;
    };

    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsDataURL(file);
  });
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
