# Guía de Configuración de Firebase

Esta guía te ayudará a configurar Firebase para el Sistema de Gestión de Pagos de Mantenimiento.

## Paso 1: Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Ingresa el nombre: `private-maintenance` (o el que prefieras)
4. Desactiva Google Analytics (opcional para MVP)
5. Haz clic en "Crear proyecto"

## Paso 2: Configurar Authentication

1. En el menú lateral, ve a **Build > Authentication**
2. Haz clic en "Get started"
3. En la pestaña "Sign-in method", habilita:
   - **Google**: 
     - Activa el toggle
     - Configura el nombre público del proyecto
     - Ingresa un email de soporte
     - Guarda

## Paso 3: Crear Base de Datos Firestore

1. En el menú lateral, ve a **Build > Firestore Database**
2. Haz clic en "Create database"
3. Selecciona el modo: **Production mode** (usaremos las rules personalizadas)
4. Elige la ubicación más cercana (ej: `us-central`)
5. Haz clic en "Enable"

### Configurar Índices (Importante)

Firestore necesita índices compuestos para las consultas. Crea los siguientes:

#### Índice 1: Payments por userId y year
- Colección: `payments`
- Campos:
  - `userId` - Ascending
  - `year` - Ascending
  - `month` - Descending

#### Índice 2: Payments por year
- Colección: `payments`
- Campos:
  - `year` - Ascending
  - `createdAt` - Descending

#### Índice 3: Payments por month y year
- Colección: `payments`
- Campos:
  - `month` - Ascending
  - `year` - Ascending

**Nota**: También puedes esperar a que la aplicación te muestre el enlace directo para crear los índices cuando intentes hacer las queries por primera vez.

## Paso 4: Configurar Storage

1. En el menú lateral, ve a **Build > Storage**
2. Haz clic en "Get started"
3. Selecciona **Production mode** (usaremos las rules personalizadas)
4. Elige la misma ubicación que Firestore
5. Haz clic en "Done"

## Paso 5: Obtener Configuración del Proyecto

1. En la página principal de Firebase Console, haz clic en el ícono de engranaje ⚙️ > **Project settings**
2. En la sección "Your apps", haz clic en el ícono web `</>`
3. Registra tu app:
   - Nombre: `Private Maintenance Web`
   - No habilites Firebase Hosting por ahora
   - Haz clic en "Register app"
4. Copia la configuración de Firebase que aparece:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Paso 6: Actualizar el Código

1. Abre el archivo `src/config/firebase.js`
2. Reemplaza la configuración con tus valores:

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

## Paso 7: Configurar Security Rules

### Firestore Rules

1. Ve a **Firestore Database > Rules**
2. Copia y pega el contenido completo del archivo `firestore.rules`
3. Haz clic en "Publish"

### Storage Rules

1. Ve a **Storage > Rules**
2. Copia y pega el contenido completo del archivo `storage.rules`
3. Haz clic en "Publish"

## Paso 8: Crear el Primer Administrador

1. Ejecuta la aplicación: `npm run dev`
2. Abre el navegador en `http://localhost:5173`
3. Haz clic en "Continuar con Google"
4. Completa el onboarding seleccionando un número de casa
5. Ve a Firebase Console > Firestore Database
6. Busca la colección `users` y tu documento
7. Haz clic en el documento
8. Edita el campo `role`:
   - Valor anterior: `"resident"`
   - Valor nuevo: `"admin"`
9. Guarda los cambios
10. Recarga la aplicación en el navegador

¡Ahora deberías ver el Dashboard de Administrador!

## Paso 9: Configurar Dominio Autorizado (Producción)

Cuando despliegues a producción:

1. Ve a **Authentication > Settings > Authorized domains**
2. Agrega tu dominio personalizado
3. Guarda los cambios

## Verificación

Para verificar que todo funciona correctamente:

### Test de Residente:
1. Inicia sesión con una cuenta de Google diferente
2. Selecciona un número de casa en el onboarding
3. Intenta subir un comprobante de pago
4. Verifica que aparezca en tu historial con estado "Pendiente"

### Test de Admin:
1. Inicia sesión con tu cuenta de admin
2. Deberías ver el Dashboard de Administrador
3. Verifica que puedas ver el pago del residente
4. Prueba cambiar el estado a "Aprobado"
5. Prueba exportar a Excel

## Solución de Problemas

### Error: "Firebase: Error (auth/unauthorized-domain)"
**Solución**: Agrega tu dominio en Authentication > Settings > Authorized domains

### Error: "Missing or insufficient permissions"
**Solución**: Verifica que hayas desplegado correctamente las Security Rules

### Error: "The query requires an index"
**Solución**: Haz clic en el enlace del error para crear el índice automáticamente en Firebase Console

### Error: "Storage object not found"
**Solución**: Verifica que el bucket de Storage esté creado y las rules desplegadas

## Recursos Adicionales

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

## Monitoreo

Puedes monitorear el uso en tiempo real:

- **Authentication**: Usuarios activos, nuevos registros
- **Firestore**: Lecturas/escrituras, documentos almacenados
- **Storage**: Archivos subidos, ancho de banda usado

## Límites del Plan Gratuito (Spark)

- **Firestore**: 50,000 lecturas/día, 20,000 escrituras/día
- **Storage**: 5GB almacenamiento, 1GB transferencia/día
- **Authentication**: Ilimitado

Para una privada de 60 casas, estos límites son más que suficientes para el MVP.
