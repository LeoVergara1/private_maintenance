# Sistema de Gestión de Pagos de Mantenimiento

Plataforma MVP para gestión de pagos de mantenimiento de una privada de 60 casas.

## 🛠 Stack Tecnológico

- **Frontend**: React 19.1 con Vite 7.3.1
- **Estilos**: Tailwind CSS 4.1
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Routing**: React Router v7
- **Utilidades**: date-fns, xlsx

## 📋 Características

### Residentes
- ✅ Autenticación con Google
- ✅ Registro inicial (onboarding) con selección de casa
- ✅ Ventana de pago del 1-10 de cada mes
- ✅ Alerta de pago tardío después del día 10
- ✅ Subida de comprobantes (JPG, PNG, HEIC, PDF - Máx 5MB)
- ✅ Validación anti-duplicados (un pago por mes)
- ✅ Historial de pagos del año actual
- ✅ Previsualización de comprobantes en modal

### Administradores
- ✅ Dashboard con estadísticas (total, aprobados, pendientes, rechazados)
- ✅ Listado completo de todos los pagos
- ✅ Filtros por estado, casa y mes
- ✅ Actualización de estado de pagos (aprobar/rechazar)
- ✅ Edición de monto para agregar multas
- ✅ Panel de casas sin pagar del mes actual
- ✅ Exportación a Excel de pagos y casas sin pagar
- ✅ Previsualización de comprobantes

## 📊 Esquema de Firestore

### Colección: `users`
```javascript
{
  uid: string,              // Firebase Auth UID
  email: string,            // Email del usuario
  displayName: string,      // Nombre completo
  houseNumber: number,      // Número de casa (1-60)
  role: string,            // "resident" | "admin"
  createdAt: Timestamp     // Fecha de creación
}
```

### Colección: `payments`
```javascript
{
  userId: string,          // UID del usuario que pagó
  houseNumber: number,     // Número de casa
  amount: number,          // Monto del pago en pesos
  receiptUrl: string,      // URL del comprobante en Storage
  status: string,          // "pending" | "approved" | "rejected"
  month: number,           // Mes del pago (1-12)
  year: number,            // Año del pago
  isLate: boolean,         // Si el pago es tardío (después del día 10)
  adminNotes: string,      // Notas del administrador (opcional)
  createdAt: Timestamp,    // Fecha de creación
  updatedAt: Timestamp     // Fecha de última actualización
}
```

## 🚀 Configuración

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita Authentication con Google
3. Crea una base de datos Firestore
4. Crea un bucket de Storage
5. Copia la configuración de Firebase

6. Edita `src/config/firebase.js` y reemplaza los valores:
```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 3. Desplegar Security Rules

#### Firestore Rules
En Firebase Console > Firestore Database > Rules, copia el contenido de `firestore.rules`

#### Storage Rules
En Firebase Console > Storage > Rules, copia el contenido de `storage.rules`

### 4. Crear el Primer Administrador

1. Inicia sesión con Google en la aplicación
2. Completa el onboarding seleccionando una casa
3. Ve a Firebase Console > Firestore Database
4. Busca tu documento en la colección `users`
5. Edita el campo `role` y cámbialo de `"resident"` a `"admin"`

### 5. Ejecutar la Aplicación

```bash
npm run dev
```

## 📁 Estructura del Proyecto

```
src/
├── components/           # Componentes reutilizables
│   ├── ProtectedRoute.jsx
│   ├── ReceiptModal.jsx
│   ├── PaymentStatusModal.jsx
│   └── UnpaidHousesPanel.jsx
├── contexts/            # Context API
│   └── AuthContext.jsx
├── pages/              # Páginas principales
│   ├── Login.jsx
│   ├── Onboarding.jsx
│   ├── ResidentDashboard.jsx
│   └── AdminDashboard.jsx
├── services/           # Servicios de Firebase
│   ├── userService.js
│   └── paymentService.js
├── utils/             # Funciones utilitarias
│   ├── dateValidation.js
│   ├── fileValidation.js
│   └── excelExport.js
├── config/            # Configuración
│   └── firebase.js
├── App.jsx           # Router principal
└── main.jsx          # Punto de entrada
```

## 🔒 Reglas de Seguridad

### Firestore
- ✅ Residents solo pueden leer/crear sus propios pagos
- ✅ Validación de pago único por mes/año/casa
- ✅ Validación de campos requeridos
- ✅ Admins pueden leer todos los pagos y usuarios
- ✅ Admins pueden actualizar estado y monto de pagos
- ✅ Prevención de escalada de privilegios

### Storage
- ✅ Usuarios solo pueden subir a su carpeta (`receipts/{userId}/`)
- ✅ Validación de tipo de archivo (JPG, PNG, HEIC, PDF)
- ✅ Validación de tamaño máximo (5MB)
- ✅ Admins pueden leer todos los comprobantes

## 💰 Lógica de Pagos

- **Monto base**: $300 pesos
- **Ventana de pago**: Día 1-10 de cada mes
- **Pago tardío**: Después del día 10 (marcado con `isLate: true`)
- **Multas**: El admin puede editar el monto para agregar penalizaciones
- **Anti-duplicados**: Solo se permite un pago por casa por mes

## 📤 Exportación a Excel

### Pagos
Columnas: Casa | Monto | Estado | Fecha | Tardío

### Casas Sin Pagar
Columnas: Número de Casa | Propietario | Email | Mes | Año

## 🎨 UI/UX

- Interfaz completamente en español
- Diseño responsivo con Tailwind CSS 4.1
- Indicadores visuales de estado
- Alertas contextuales
- Modales para previsualización
- Loading states

## 🔑 Nomenclatura

- **Código**: Inglés (colecciones, campos, variables, funciones)
- **UI**: Español (textos, botones, mensajes)

## 📝 Próximos Pasos (Fuera de Alcance MVP)

- [ ] Notificaciones por email
- [ ] Histórico de años anteriores
- [ ] Reportes avanzados
- [ ] Dashboard de métricas
- [ ] Gestión de multas automáticas
- [ ] Sistema de recordatorios

## 🐛 Solución de Problemas

### Error: House number already taken
El número de casa ya está asignado a otro usuario. Contacta al administrador.

### Error: Payment already exists
Ya existe un pago registrado para el mes actual. Solo se permite un pago por mes.

### Error: Invalid file format
El archivo no cumple con los formatos permitidos (JPG, PNG, HEIC, PDF) o excede 5MB.

### Error: Late payment
Estás intentando pagar después del día 10. Tu pago será marcado como tardío.

## 📄 Licencia

Este proyecto es privado y está diseñado específicamente para la gestión de una privada residencial.
