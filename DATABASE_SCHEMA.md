# Esquema de Base de Datos - Firestore

## Diagrama de Colecciones

```
Firebase Project
│
├── Authentication (Firebase Auth)
│   └── Users (Google Sign-in)
│
├── Firestore Database
│   ├── users/
│   │   └── {userId}/
│   │       ├── uid: string
│   │       ├── email: string
│   │       ├── displayName: string
│   │       ├── houseNumber: number (1-60)
│   │       ├── role: string ("resident" | "admin" | "gate_manager")
│   │       └── createdAt: Timestamp
│   │
│   ├── gateControls/
│   │   └── {controlId}/
│   │       ├── controlNumber: string (ej. "C-001")
│   │       ├── houseNumber: number | null
│   │       ├── status: string ("active" | "inactive")
│   │       ├── notes: string
│   │       ├── createdAt: Timestamp
│   │       └── updatedAt: Timestamp
│   │
│   └── payments/
│       └── {paymentId}/
│           ├── userId: string
│           ├── houseNumber: number
│           ├── amount: number
│           ├── receiptUrl: string
│           ├── status: string ("pending" | "approved" | "rejected")
│           ├── month: number (1-12)
│           ├── year: number
│           ├── isLate: boolean
│           ├── adminNotes: string (optional)
│           ├── createdAt: Timestamp
│           └── updatedAt: Timestamp
│
│   └── bankStatements/
│       └── {statementId}/
│           ├── month: number (1-12)
│           ├── year: number
│           ├── fileName: string
│           ├── fileUrl: string
│           ├── originalName: string
│           ├── uploadedBy: string
│           ├── notes: string (optional)
│           ├── createdAt: Timestamp
│           └── updatedAt: Timestamp
│
└── Storage
    └── receipts/
        └── {userId}/
            └── {month}-{year}-{timestamp}.{ext}
```

## Colección: users

### Propósito
Almacena la información de los usuarios registrados en el sistema.

### Estructura del Documento

| Campo | Tipo | Requerido | Descripción | Ejemplo |
|-------|------|-----------|-------------|---------|
| uid | string | Sí | ID único de Firebase Auth | "abc123xyz..." |
| email | string | Sí | Email del usuario | "juan@gmail.com" |
| displayName | string | Sí | Nombre completo | "Juan Pérez" |
| houseNumber | number | Sí | Número de casa (1-60) | 15 |
| role | string | Sí | Rol del usuario | "resident" |
| createdAt | Timestamp | Sí | Fecha de registro | Timestamp(2026, 1, 29) |

### Roles disponibles

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `resident` | Residente de una casa | `/dashboard` — registrar y ver pagos propios |
| `admin` | Administrador del condominio | `/admin`, `/gate-controls` — gestión total |
| `gate_manager` | Administrador del portón | `/gate-controls` + `/dashboard` — controles del portón y sus propios pagos |

### Reglas de Validación
- `houseNumber` debe ser único (no puede haber dos usuarios con la misma casa)
- `houseNumber` debe estar entre 1 y 60
- `role` por defecto es "resident"
- `uid` debe coincidir con el Firebase Auth UID

### Ejemplo de Documento

```javascript
// Document ID: "abc123xyz..."
{
  uid: "abc123xyz...",
  email: "juan@gmail.com",
  displayName: "Juan Pérez",
  houseNumber: 15,
  role: "resident",
  createdAt: Timestamp(2026, 1, 29, 10, 30, 0)
}
```

### Queries Comunes

```javascript
// Obtener usuario por UID
const userDoc = await getDoc(doc(db, 'users', userId));

// Verificar si un número de casa está ocupado
const q = query(
  collection(db, 'users'),
  where('houseNumber', '==', 15)
);
const snapshot = await getDocs(q);

// Obtener todos los usuarios (solo admin)
const allUsers = await getDocs(collection(db, 'users'));
```

---

## Colección: payments

### Propósito
Registra todos los pagos de mantenimiento realizados por los residentes.

### Estructura del Documento

| Campo | Tipo | Requerido | Descripción | Ejemplo |
|-------|------|-----------|-------------|---------|
| userId | string | Sí | UID del usuario que pagó | "abc123xyz..." |
| houseNumber | number | Sí | Número de casa | 15 |
| amount | number | Sí | Monto del pago en pesos | 300 |
| receiptUrl | string | Sí | URL del comprobante en Storage | "https://..." |
| status | string | Sí | Estado del pago | "pending" |
| month | number | Sí | Mes del pago (1-12) | 1 |
| year | number | Sí | Año del pago | 2026 |
| isLate | boolean | Sí | Indica si es pago tardío | false |
| adminNotes | string | No | Notas del administrador | "Aprobado" |
| createdAt | Timestamp | Sí | Fecha de creación | Timestamp(...) |
| updatedAt | Timestamp | Sí | Última actualización | Timestamp(...) |

### Reglas de Validación
- Cada usuario solo puede tener un pago por `month` + `year` + `houseNumber`
- `status` solo puede ser: "pending", "approved", "rejected"
- `month` debe estar entre 1 y 12
- `amount` debe ser mayor a 0
- `userId` debe coincidir con el usuario autenticado al crear
- `houseNumber` debe coincidir con el del usuario

### Ejemplo de Documento

```javascript
// Document ID: auto-generado
{
  userId: "abc123xyz...",
  houseNumber: 15,
  amount: 300,
  receiptUrl: "https://firebasestorage.googleapis.com/.../receipts/abc123xyz.../1-2026-1738180800000.jpg",
  status: "pending",
  month: 1,
  year: 2026,
  isLate: false,
  adminNotes: "",
  createdAt: Timestamp(2026, 1, 29, 10, 35, 0),
  updatedAt: Timestamp(2026, 1, 29, 10, 35, 0)
}
```

### Estados del Pago

| Estado | Descripción | Puede cambiar a |
|--------|-------------|-----------------|
| pending | Recién creado, pendiente de revisión | approved, rejected |
| approved | Aprobado por el administrador | rejected |
| rejected | Rechazado por el administrador | approved |

### Queries Comunes

```javascript
// Obtener pagos de un usuario en un año
const q = query(
  collection(db, 'payments'),
  where('userId', '==', userId),
  where('year', '==', 2026),
  orderBy('month', 'desc')
);

// Obtener todos los pagos de un mes/año (para casas sin pagar)
const q = query(
  collection(db, 'payments'),
  where('month', '==', 1),
  where('year', '==', 2026)
);

// Verificar pago duplicado
const q = query(
  collection(db, 'payments'),
  where('userId', '==', userId),
  where('month', '==', 1),
  where('year', '==', 2026)
);

// Obtener todos los pagos del año (admin)
const q = query(
  collection(db, 'payments'),
  where('year', '==', 2026),
  orderBy('createdAt', 'desc')
);
```

---

## Colección: bankStatements

### Propósito
Almacena los estados de cuenta del banco subidos por el administrador.

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `month` | number | Mes del estado de cuenta (1-12) |
| `year` | number | Año del estado de cuenta |
| `fileName` | string | Nombre del archivo en Storage |
| `fileUrl` | string | URL de descarga del archivo |
| `originalName` | string | Nombre original del archivo subido |
| `uploadedBy` | string | UID del administrador que subió el archivo |
| `notes` | string | Notas opcionales sobre el estado de cuenta |
| `createdAt` | Timestamp | Fecha de creación |
| `updatedAt` | Timestamp | Fecha de última actualización |

### Consultas Comunes

```javascript
// Obtener estados de cuenta por año
const q = query(
  collection(db, 'bankStatements'),
  where('year', '==', 2026),
  orderBy('createdAt', 'desc')
);

// Obtener estados de cuenta por mes y año
const q = query(
  collection(db, 'bankStatements'),
  where('month', '==', 9),
  where('year', '==', 2026),
  orderBy('createdAt', 'desc')
);
```

---

## Storage: receipts

### Propósito
Almacena los comprobantes de pago (imágenes y PDFs) subidos por los usuarios.

### Estructura de Carpetas

```
receipts/
└── {userId}/
    ├── 1-2026-1738180800000.jpg
    ├── 2-2026-1740859200000.pdf
    └── 3-2026-1743537600000.png
```

### Nomenclatura de Archivos

**Patrón**: `{month}-{year}-{timestamp}.{extension}`

- `month`: Mes del pago (1-12)
- `year`: Año del pago
- `timestamp`: Timestamp de subida para unicidad
- `extension`: Extensión del archivo (jpg, png, heic, pdf)

**Ejemplos**:
- `1-2026-1738180800000.jpg` - Pago de enero 2026
- `12-2025-1735689600000.pdf` - Pago de diciembre 2025

### Formatos Permitidos

| Formato | MIME Type | Uso |
|---------|-----------|-----|
| JPG | image/jpeg | Fotos de comprobantes |
| PNG | image/png | Capturas de pantalla |
| HEIC | image/heic | Fotos de iPhone |
| PDF | application/pdf | Documentos escaneados |

### Límites

---

## Storage: bankStatements

### Propósito
Almacena los estados de cuenta del banco subidos por el administrador.

### Estructura de Carpetas

```
bankStatements/
└── {year}/
    ├── 2026-9-1725849600000.pdf
    ├── 2026-9-1725849600000.xlsx
    └── 2026-10-1728441600000.csv
```

### Nomenclatura de Archivos

**Patrón**: `{year}-{month}-{timestamp}.{extension}`

- `year`: Año del estado de cuenta
- `month`: Mes del estado de cuenta (1-12)
- `timestamp`: Timestamp de subida para unicidad
- `extension`: Extensión del archivo (pdf, xlsx, xls, csv)

**Ejemplos**:
- `2026-9-1725849600000.pdf` - Estado de cuenta septiembre 2026
- `2026-10-1728441600000.xlsx` - Estado de cuenta octubre 2026

### Formatos Permitidos

| Formato | MIME Type | Uso |
|---------|-----------|-----|
| PDF | application/pdf | Estados de cuenta en PDF |
| XLSX | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | Estados de cuenta en Excel |
| XLS | application/vnd.ms-excel | Estados de cuenta en Excel (legacy) |
| CSV | text/csv | Estados de cuenta en CSV |
- **Tamaño máximo**: 5MB por archivo
- **Organización**: Por usuario (carpeta por UID)

### Reglas de Seguridad

```javascript
// Los usuarios solo pueden subir a su propia carpeta
allow create: if isOwner(userId) && 
                 isValidFileType() && 
                 isValidFileSize();

// Los usuarios solo pueden leer sus propios archivos
allow read: if isOwner(userId);

// Los admins pueden leer todos los archivos
allow read: if isAdmin();
```

---

## Colección: utilities

### Propósito
Almacena información de utilidad para la privada (combinaciones de candados, ubicaciones de equipos, contactos de emergencia, notas generales). Accesible solo para administradores y encargados del portón.

### Estructura del Documento

| Campo | Tipo | Requerido | Descripción | Ejemplo |
|-------|------|-----------|-------------|---------|
| category | string | Sí | Categoría del item | "Seguridad" |
| title | string | Sí | Título corto del item | "Bomba trasera" |
| content | string | Sí | Contenido/descripción détallada | "Combinación: 123-456" |
| createdBy | string | Sí | UID del usuario que creó | "abc123xyz..." |
| createdAt | Timestamp | Sí | Fecha de creación | Timestamp(2026, 3, 25) |
| updatedAt | Timestamp | Sí | Fecha de última actualización | Timestamp(2026, 3, 25) |
| isArchived | boolean | Sí | Indica si el item está archivado (soft delete) | false |

### Categorías Disponibles

| Categoría | Descripción |
|-----------|-------------|
| `Seguridad` | Combinaciones de candados, códigos de acceso, etc. |
| `Mantenimiento` | Ubicaciones de herramientas, equipos, etc. |
| `Contactos` | Números de emergencia, servicios (electricista, plomero, etc.) |
| `Notas Generales` | Recordatorios e información general |

### Reglas de Validación
- `category` debe estar en la lista de categorías disponibles
- `title` una cadena no vacía (máx 100 caracteres)
- `content` una cadena no vacía (máx 5000 caracteres)
- `isArchived` por defecto es `false`
- Soft delete: No se elimina físicamente, se marca como archivado

### Ejemplo de Documento

```javascript
// Document ID: "doc123abc..."
{
  category: "Seguridad",
  title: "Bomba trasera",
  content: "Combinación: 123-456-789\nÚltima actualización: Marzo 2026",
  createdBy: "admin123xyz...",
  createdAt: Timestamp(2026, 3, 25, 10, 30, 0),
  updatedAt: Timestamp(2026, 3, 25, 10, 30, 0),
  isArchived: false
}
```

### Queries Comunes

```javascript
// Obtener todas las utilidades (no archivadas)
const q = query(
  collection(db, 'utilities'),
  where('isArchived', '==', false),
  orderBy('category', 'asc'),
  orderBy('createdAt', 'desc')
);

// Obtener utilidades por categoría
const q = query(
  collection(db, 'utilities'),
  where('category', '==', 'Seguridad'),
  where('isArchived', '==', false),
  orderBy('createdAt', 'desc')
);
```

### Acceso
- **Lectura**: Admin y Gate Manager
- **Escritura (crear/actualizar)**: Solo Admin
- **Eliminación**: Solo Admin (soft delete via isArchived flag)

---

## Índices Compuestos Requeridos

Firestore requiere índices para consultas complejas:

### Índice 1: Utilidades por Categoría
```
Collection: utilities
Fields:
  - isArchived (Ascending)
  - category (Ascending)
  - createdAt (Descending)
```

### Índice 2: Pagos por Usuario y Año
```
Collection: payments
Fields:
  - userId (Ascending)
  - year (Ascending)
  - month (Descending)
```

### Índice 2: Pagos por Año (Admin)
```
Collection: payments
Fields:
  - year (Ascending)
  - createdAt (Descending)
```

### Índice 3: Pagos por Mes/Año (Casas sin pagar)
```
Collection: payments
Fields:
  - month (Ascending)
  - year (Ascending)
```

---

## Relaciones entre Colecciones

```
users (1) ────── (N) payments
  │                    │
  │                    │
  └─────────────────── │
         userId        │
                       │
                   receiptUrl
                       │
                       ↓
                   Storage
                 receipts/{userId}/
```

### Descripción de Relaciones

1. **users → payments**: Un usuario puede tener muchos pagos (uno por mes)
2. **payments → Storage**: Cada pago tiene un comprobante almacenado
3. **Integridad**: El `userId` en payments debe existir en users

---

## Migraciones y Mantenimiento

### Agregar un Campo Nuevo

Si necesitas agregar un campo en el futuro:

```javascript
// Actualizar todos los documentos existentes
const paymentsSnapshot = await getDocs(collection(db, 'payments'));
paymentsSnapshot.forEach(async (doc) => {
  await updateDoc(doc.ref, {
    newField: defaultValue
  });
});
```

### Limpiar Pagos Antiguos

```javascript
// Eliminar pagos de años anteriores (si es necesario)
const oldPaymentsQuery = query(
  collection(db, 'payments'),
  where('year', '<', 2024)
);
const snapshot = await getDocs(oldPaymentsQuery);
snapshot.forEach(async (doc) => {
  await deleteDoc(doc.ref);
});
```

### Backup

Firebase ofrece backups automáticos en el plan Blaze. Para el plan gratuito:
- Exporta datos regularmente usando la Admin SDK
- Considera implementar un job programado de backup

---

## Monitoreo y Métricas

### Métricas Importantes

```javascript
// Total de pagos aprobados en el mes
const approvedCount = payments.filter(p => 
  p.status === 'approved' && 
  p.month === currentMonth && 
  p.year === currentYear
).length;

// Tasa de aprobación
const approvalRate = (approvedCount / totalPayments) * 100;

// Casas sin pagar
const unpaidHouses = 60 - paymentsThisMonth.length;

// Monto total recaudado
const totalAmount = payments
  .filter(p => p.status === 'approved')
  .reduce((sum, p) => sum + p.amount, 0);
```

---

## Consideraciones de Escalabilidad

Para el MVP con 60 casas:
- **Lecturas/mes estimadas**: ~10,000 (muy por debajo del límite)
- **Escrituras/mes estimadas**: ~500 (muy por debajo del límite)
- **Storage usado**: ~60 archivos/mes × 2MB promedio = 120MB/mes

El plan gratuito es más que suficiente para esta aplicación.
