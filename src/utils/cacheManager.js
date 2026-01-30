/**
 * Cache manager para reducir lecturas a Firestore
 * Almacena datos en localStorage con expiración
 */

const CACHE_DURATION = 1000 * 60 * 30; // 30 minutos

export const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    
    // Si expiró, eliminar
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

export const setCachedData = (key, data) => {
  try {
    localStorage.setItem(
      `cache_${key}`,
      JSON.stringify({
        data,
        timestamp: Date.now()
      })
    );
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

export const clearCache = (key) => {
  localStorage.removeItem(`cache_${key}`);
};

export const clearAllCache = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('cache_')) {
      localStorage.removeItem(key);
    }
  });
};
