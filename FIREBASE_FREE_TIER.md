# Firebase Free Tier - Optimizaciones Implementadas

## 📊 Límites Gratuitos de Firebase

### Firestore Database
- **Lecturas**: 50,000/día
- **Escrituras**: 20,000/día
- **Eliminaciones**: 20,000/día
- **Almacenamiento**: 1 GB

### Cloud Storage
- **Descargas**: 1 GB/mes
- **Uploads**: Ilimitadas
- **Almacenamiento**: 5 GB

### Authentication
- **Usuarios**: Ilimitados

---

## ✅ Optimizaciones Implementadas

### 1. **Cache Manager** (`cacheManager.js`)
- Almacena datos en localStorage con expiración de 30 minutos
- Reduce lecturas innecesarias a Firestore
- Especialmente útil para:
  - `checkDuplicatePayment`: Cachea resultado por 30 min
  - `getPaymentsByYear`: Cachea pagos del usuario
  - `getAllPaymentsByYear`: Cachea pagos para admin

### 2. **Image Optimization** (`imageOptimization.js`)
- Comprime imágenes antes de subir
- Reduce tamaño de archivos en ~70%
- Mantiene calidad visual aceptable (quality: 0.8)
- Ajusta dimensiones máximas: 1920x1080

### 3. **Firestore Rules Optimizadas**
```javascript
// Antes: Cualquier usuario podía leer todos los usuarios
allow read: if isAuthenticated();

// Después: Solo lee documentos propios o si es admin
allow read: if isOwner(userId) || isAdmin();
```

### 4. **Storage Rules Simplificadas**
- Eliminadas lecturas de Firestore en rules
- Admins usan lógica del frontend para acceder

### 5. **Queries Optimizadas**
- Agregados `limit()` a todas las queries
- Máximo 12 pagos por usuario/año
- Máximo 500 pagos para admin
- Uso de índices simples

---

## 📈 Estimación de Consumo Mensual (60 casas)

| Operación | Estimado | Límite Gratuito | % Consumo |
|-----------|----------|-----------------|-----------|
| **Lecturas Firestore** | ~2,000/mes | 50,000/día | **0.13%** ✅ |
| **Escrituras Firestore** | ~300/mes | 20,000/día | **0.5%** ✅ |
| **Descargas Storage** | ~1.5 GB/mes | 1 GB/mes | **150%** ⚠️ |
| **Almacenamiento Storage** | ~3 GB | 5 GB | **60%** ✅ |

### ⚠️ Nota sobre Storage
Si las descargas exceden 1 GB/mes, considera:
- Comprimir más agresivamente
- Limitar visualización de comprobantes
- Usar CDN externo (Cloudinary, imgix)

---

## 🚀 Cómo Usar las Optimizaciones

### En ResidentDashboard.jsx

```javascript
import { compressImage, formatFileSize } from '../utils/imageOptimization';
import { clearCache } from '../utils/cacheManager';

// Comprimir imágenes antes de subir
const handleFileChange = async (e) => {
  const file = e.target.files[0];
  
  if (file.type.startsWith('image/')) {
    const compressedBlob = await compressImage(file);
    // Ahora subir el archivo comprimido
  }
};

// Limpiar cache después de crear pago
const handleSubmit = async (e) => {
  // ... código de upload ...
  clearCache(`payment_${userId}_${month}_${year}`);
  clearCache(`payments_${userId}_${year}`);
};
```

---

## 🔍 Monitoreo

**Ve a Firebase Console > Usage para monitorear:**
1. Lecturas/escrituras diarias
2. Almacenamiento usado
3. Descargas de Storage

**Configura alertas cuando alcances:**
- 80% de lecturas diarias
- 80% de escrituras diarias
- 80% de descargas de Storage

---

## 🛡️ Mejores Prácticas para Free Tier

### ❌ NO hagas:
- Queries sin límite (`limit()`)
- Leer documentos completos si solo necesitas campos específicos
- Llamadas a Firestore en bucles
- Operaciones batch frecuentes sin caché
- Descargar archivos innecesariamente

### ✅ SÍ haz:
- Cachear datos frecuentemente accedidos
- Usar `limit()` en todas las queries
- Agrupar operaciones en transacciones
- Comprimir imágenes antes de subir
- Usar reglas de seguridad para filtrar datos

---

## 📱 Para Escalar Fuera del Free Tier

Si creces más allá del free tier:
1. **Firestore**: Configura custom index para mejor performance
2. **Storage**: Usa Cloud CDN de Google
3. **Authentication**: Considera Firebase Auth con custom claims
4. **Analytics**: Agrega Firebase Analytics para insights
