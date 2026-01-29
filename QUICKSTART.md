# 🚀 Inicio Rápido

## Instalación

```bash
# 1. Asegúrate de usar Node.js v22.11.0+
nvm use

# 2. Instalar dependencias
npm install
```

## Configuración Firebase

```bash
# 1. Edita src/config/firebase.js con tus credenciales
# 2. Despliega las Security Rules (ver FIREBASE_SETUP.md)
# 3. Crea los índices de Firestore
```

## Ejecutar en Desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

## Crear Primer Admin

1. Inicia sesión con Google
2. Completa el onboarding
3. Ve a Firebase Console > Firestore
4. Edita tu usuario: `role: "resident"` → `"admin"`
5. Recarga la app

## Build para Producción

```bash
npm run build
```

Los archivos estarán en `dist/`

## Documentación Completa

- **[README.md](README.md)** - Documentación general
- **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** - Configuración de Firebase paso a paso
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Esquema de base de datos
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Checklist de deployment

## Archivos Importantes

```
src/
├── config/firebase.js          ← Configurar aquí tus credenciales
├── pages/
│   ├── Login.jsx              ← Página de inicio de sesión
│   ├── Onboarding.jsx         ← Registro de nuevos usuarios
│   ├── ResidentDashboard.jsx  ← Dashboard de residentes
│   └── AdminDashboard.jsx     ← Dashboard de administradores
└── App.jsx                    ← Router principal

firestore.rules                 ← Reglas de seguridad Firestore
storage.rules                   ← Reglas de seguridad Storage
```

## Soporte

¿Problemas? Revisa [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) sección Troubleshooting
