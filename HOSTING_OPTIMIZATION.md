# Firebase Hosting - Optimización para Free Tier

## 📊 Límites Gratuitos

| Límite | Capacidad | Estimado (60 casas) |
|--------|-----------|-------------------|
| **Almacenamiento** | 1 GB | ~400 MB ✅ |
| **Ancho de banda/mes** | 10 GB | 5-10 GB ⚠️ |
| **HTTPS/SSL** | Gratis | Gratis ✅ |
| **CDN Global** | Gratis | Gratis ✅ |

---

## ✅ Optimizaciones Implementadas

### 1. **Cache Headers Agresivos** (firebase.json)

**Assets (JS/CSS):**
- Cache: 1 año (`max-age=31536000`)
- Immutable (nunca cambiam)
- Se usan hashes de Vite: `index-Bv8Ms6C2.js`

**index.html:**
- Cache: 1 hora (`max-age=3600`)
- Must revalidate (verifica cambios)
- Permite actualizaciones sin limpiar caché del usuario

**Recursos (imágenes, fonts):**
- Cache: 1 año
- Immutable

### 2. **Archivo .gitignore Actualizado**
Evita subir archivos innecesarios:
```
node_modules/
.env
.env.local
dist/
.DS_Store
```

### 3. **Bundle Size Tracking**
- Actual: 913 KB (comprimido)
- Límite recomendado: < 1 MB
- Gzip: Habilitado automáticamente ✅

---

## 🚀 Estrategia para Reducir Ancho de Banda

### Estimación Mensual (60 casas)

```
Visitantes activos: ~5-10 por día
Visitas/mes: ~300 (5 × 60 casas)
Tamaño descarga: ~1 MB (con Gzip)
Total bandwidthbb mensual: ~300 MB

CON CACHE HEADERS:
- Visita 1: 1 MB descargado
- Visitas 2-30: ~50 KB (solo HTML actualizado)
- Total: ~1.5 GB/mes ✅
```

### Sin Cache Headers:
```
- Cada visita: 1 MB
- Total: ~300 MB × 1 MB = 300 MB? 
- Pero con 60 casas activas + admin: ~5-10 GB/mes ⚠️
```

---

## 🛡️ Mejores Prácticas

### ✅ Hacer:
- ✅ Mantener bundle < 1 MB
- ✅ Usar Gzip (automático en Hosting)
- ✅ Cache headers como se configuró
- ✅ Minificar código (Vite lo hace)
- ✅ Lazy load componentes grandes
- ✅ Servir imágenes comprimidas
- ✅ Usar CDN (Hosting lo proporciona)

### ❌ NO hacer:
- ❌ Servir node_modules
- ❌ Subir archivos .env
- ❌ Incluir assets sin usar
- ❌ Cache headers muy agresivos en HTML
- ❌ Servir archivos sin compresión
- ❌ Subir código fuente (src/)

---

## 📈 Monitoreo

**Firebase Console > Hosting > Usage:**
1. **Storage usado**: Debe estar < 1 GB
2. **Bandwidth mensual**: Monitorear antes de alcanzar 10 GB
3. **Requests**: Sin límite, pero indica actividad

**Comando para ver tamaño:**
```bash
du -sh dist/
```

---

## 💡 Si Alcanzas Límite de Bandwith

Opciones:
1. **Compresión más agresiva** (webpack plugins)
2. **Code splitting** (dynamic imports)
3. **Service Worker** (offline caching)
4. **Plan Spark** (primeros 12 meses gratis después)
5. **Cloudflare** (CDN gratuito adicional)

---

## 🔄 Después de Cambios en firebase.json

Despliega con:
```bash
firebase deploy --only hosting
```

Esto actualiza los headers de caché automáticamente.
