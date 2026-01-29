# Checklist de Deployment

Lista de verificación para desplegar el Sistema de Gestión de Pagos de Mantenimiento.

## ✅ Pre-requisitos

- [ ] Node.js v22.11.0+ instalado
- [ ] npm v10.9.0+ instalado
- [ ] Cuenta de Firebase creada
- [ ] Proyecto de Firebase configurado

## 🔧 Configuración Local

### 1. Instalación
- [ ] Clonar o descargar el repositorio
- [ ] Ejecutar `npm install`
- [ ] Verificar que no haya errores en la instalación

### 2. Configuración de Firebase
- [ ] Crear proyecto en Firebase Console
- [ ] Habilitar Authentication con Google
- [ ] Crear base de datos Firestore (modo Production)
- [ ] Crear bucket de Storage
- [ ] Copiar configuración de Firebase
- [ ] Actualizar `src/config/firebase.js` con credenciales reales
- [ ] Desplegar Firestore Rules desde `firestore.rules`
- [ ] Desplegar Storage Rules desde `storage.rules`

### 3. Índices de Firestore
- [ ] Crear índice: payments (userId, year, month DESC)
- [ ] Crear índice: payments (year, createdAt DESC)
- [ ] Crear índice: payments (month, year)

### 4. Pruebas Locales
- [ ] Ejecutar `npm run dev`
- [ ] Abrir `http://localhost:5173`
- [ ] Verificar que carga sin errores
- [ ] Probar login con Google
- [ ] Probar onboarding
- [ ] Crear primer admin manualmente en Firestore

## 👥 Pruebas de Usuario

### Pruebas de Residente
- [ ] Crear cuenta de residente con Google
- [ ] Completar onboarding (seleccionar casa)
- [ ] Ver dashboard de residente
- [ ] Subir comprobante de pago válido
- [ ] Verificar validación de archivo (formato y tamaño)
- [ ] Verificar que aparezca en historial como "Pendiente"
- [ ] Intentar duplicar pago (debe fallar)
- [ ] Ver alerta de pago tardío (si aplica)
- [ ] Previsualizar comprobante subido

### Pruebas de Administrador
- [ ] Acceder con cuenta de admin
- [ ] Ver dashboard de admin
- [ ] Verificar estadísticas (total, aprobados, pendientes, rechazados)
- [ ] Ver listado de todos los pagos
- [ ] Filtrar por estado
- [ ] Filtrar por casa
- [ ] Filtrar por mes
- [ ] Aprobar un pago pendiente
- [ ] Rechazar un pago con notas
- [ ] Editar monto para agregar multa
- [ ] Ver panel de casas sin pagar
- [ ] Exportar pagos a Excel
- [ ] Exportar casas sin pagar a Excel
- [ ] Previsualizar comprobantes

## 🔒 Seguridad

### Firestore Rules
- [ ] Verificar que residents no pueden leer pagos de otros
- [ ] Verificar que residents no pueden crear pagos duplicados
- [ ] Verificar que residents no pueden actualizar sus pagos
- [ ] Verificar que solo admins pueden ver todos los pagos
- [ ] Verificar que solo admins pueden actualizar estado de pagos
- [ ] Verificar prevención de escalada de privilegios

### Storage Rules
- [ ] Verificar que usuarios solo pueden subir a su carpeta
- [ ] Verificar validación de tipo de archivo
- [ ] Verificar validación de tamaño máximo
- [ ] Verificar que solo admins pueden ver todos los comprobantes

## 🚀 Deployment

### Opción 1: Firebase Hosting (Recomendado)

#### Configuración Inicial
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar proyecto
firebase init hosting
```

Configuración recomendada:
- Public directory: `dist`
- Single-page app: `Yes`
- GitHub integration: Opcional
- Overwrite index.html: `No`

#### Deploy
```bash
# Build de producción
npm run build

# Preview local
firebase serve

# Deploy a Firebase Hosting
firebase deploy --only hosting
```

#### Post-Deploy
- [ ] Verificar URL de producción
- [ ] Agregar dominio en Firebase Auth Authorized Domains
- [ ] Probar login en producción
- [ ] Verificar que todas las funcionalidades funcionen

### Opción 2: Vercel

#### Deploy
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel
```

- [ ] Configurar variables de entorno en Vercel Dashboard
- [ ] Agregar dominio en Firebase Auth Authorized Domains
- [ ] Probar aplicación en producción

### Opción 3: Netlify

#### Deploy
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

- [ ] Configurar redirects para SPA (`_redirects` file)
- [ ] Agregar dominio en Firebase Auth Authorized Domains
- [ ] Probar aplicación en producción

## 📊 Post-Deployment

### Configuración de Dominio
- [ ] Configurar dominio personalizado (opcional)
- [ ] Configurar SSL/HTTPS (automático en Firebase/Vercel/Netlify)
- [ ] Agregar dominio a Firebase Auth Authorized Domains

### Monitoreo
- [ ] Verificar Firebase Console > Authentication > Users
- [ ] Verificar Firebase Console > Firestore > Data
- [ ] Verificar Firebase Console > Storage > Files
- [ ] Configurar alertas de uso (opcional)

### Usuarios Iniciales
- [ ] Crear cuenta de admin principal
- [ ] Invitar a residentes a registrarse
- [ ] Verificar que cada casa solo tenga un propietario
- [ ] Documentar procedimiento para agregar nuevos admins

## 📝 Documentación

- [ ] Compartir URL de la aplicación
- [ ] Compartir instrucciones de uso para residentes
- [ ] Compartir instrucciones de uso para administradores
- [ ] Documentar proceso de crear nuevos admins
- [ ] Documentar proceso de cambiar casa de un residente

## 🔄 Mantenimiento

### Mensual
- [ ] Revisar pagos pendientes
- [ ] Verificar casas sin pagar
- [ ] Exportar reportes para contabilidad
- [ ] Revisar uso de Firebase (lecturas/escrituras)

### Trimestral
- [ ] Revisar y limpiar usuarios inactivos (si aplica)
- [ ] Verificar integridad de datos
- [ ] Actualizar dependencias: `npm update`
- [ ] Revisar logs de errores

### Anual
- [ ] Archivar pagos de años anteriores (opcional)
- [ ] Revisar y actualizar precios base
- [ ] Evaluar upgrade a plan pago de Firebase (si es necesario)

## 🐛 Troubleshooting

### Problemas Comunes

#### "Firebase: Error (auth/unauthorized-domain)"
**Solución**: 
```
1. Ve a Firebase Console > Authentication > Settings
2. Agrega tu dominio en "Authorized domains"
3. Guarda y vuelve a intentar
```

#### "The query requires an index"
**Solución**:
```
1. Haz clic en el enlace del error
2. Te llevará a Firebase Console
3. Crea el índice automáticamente
4. Espera 2-3 minutos
5. Vuelve a intentar la query
```

#### Comprobantes no se suben
**Solución**:
```
1. Verifica Storage Rules en Firebase Console
2. Verifica que el archivo cumpla validaciones (tipo y tamaño)
3. Revisa la consola del navegador para errores
```

#### Usuario no puede ver sus pagos
**Solución**:
```
1. Verifica que el usuario completó el onboarding
2. Verifica que el documento del usuario existe en Firestore
3. Verifica que los índices de Firestore están creados
```

## 📞 Soporte

Para problemas técnicos:
1. Revisar consola del navegador (F12)
2. Revisar Firebase Console > Firestore > Usage
3. Revisar Firebase Console > Authentication > Users
4. Verificar que las rules estén desplegadas correctamente

## 🎉 Checklist Final

- [ ] Aplicación accesible en producción
- [ ] Login con Google funciona
- [ ] Residents pueden registrarse y pagar
- [ ] Admins pueden gestionar pagos
- [ ] Security Rules desplegadas y funcionando
- [ ] Índices de Firestore creados
- [ ] Dominio configurado en Firebase Auth
- [ ] Documentación compartida con usuarios
- [ ] Plan de mantenimiento establecido

---

**¡Felicidades! Tu sistema está listo para producción 🚀**
