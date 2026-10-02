// Catálogo central de vistas de la app.
// Es la fuente de verdad para: Sidebar dinámico, ProtectedRoute y la
// administración de roles (colección `roles` en Firestore).
//
// Cada vista tiene:
// - path: ruta de react-router (también se usa como permiso en roles[].views)
// - label: nombre a mostrar en Sidebar / admin de roles
// - description: explicación corta para el admin
// - icon: clave del icono usado en Sidebar

export const APP_VIEWS = [
  {
    path: '/dashboard',
    label: 'Mis Pagos',
    description: 'Panel del residente para registrar y ver sus pagos propios.',
    icon: 'payments',
  },
  {
    path: '/admin',
    label: 'Panel de Pagos',
    description: 'Gestión global de pagos (admin).',
    icon: 'admin',
  },
  {
    path: '/past-debts',
    label: 'Adeudos',
    description: 'Adeudos históricos / casas con deuda.',
    icon: 'debts',
  },
  {
    path: '/common-area',
    label: 'Área Común',
    description: 'Reservas del área común.',
    icon: 'commonArea',
  },
  {
    path: '/gate-controls',
    label: 'Controles del Portón',
    description: 'Gestión de controles del portón.',
    icon: 'gate',
  },
  {
    path: '/financial-report',
    label: 'Reporte Financiero',
    description: 'Reporte / desglose financiero.',
    icon: 'report',
  },
  {
    path: '/utilities',
    label: 'Utilidades',
    description: 'Información de utilidad (combinaciones, contactos, etc.).',
    icon: 'utilities',
  },
  {
    path: '/roles',
    label: 'Roles y Permisos',
    description: 'Administración de roles y accesos a vistas (solo admin).',
    icon: 'shield',
  },
];

/** Mapa path -> vista para búsquedas rápidas. */
export const APP_VIEWS_MAP = Object.fromEntries(
  APP_VIEWS.map((v) => [v.path, v]),
);

/** Valida que un arreglo de vistas solo contenga paths conocidos. */
export const sanitizeViews = (views) => {
  if (!Array.isArray(views)) return [];
  const known = new Set(APP_VIEWS.map((v) => v.path));
  return [...new Set(views.filter((p) => known.has(p)))];
};

// ── Fallback local (mientras no exista el doc en Firestore) ──────────
// Replica exacta del comportamiento actual hardcodeado en Sidebar.jsx.
// Se usa si el documento `roles/{role}` aún no existe.
export const FALLBACK_ROLE_VIEWS = {
  admin: [
    '/admin',
    '/past-debts',
    '/common-area',
    '/gate-controls',
    '/financial-report',
    '/utilities',
    '/roles',
  ],
  gate_manager: [
    '/dashboard',
    '/common-area',
    '/gate-controls',
    '/utilities',
    '/financial-report',
  ],
  resident: ['/dashboard', '/common-area', '/financial-report'],
  resident_beta: ['/dashboard', '/common-area', '/financial-report'],
};
