import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Icons ──────────────────────────────────────────────

const IconPayments = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const IconGate = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const IconReport = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconAdmin = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const IconUtilities = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconCommonArea = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

// ── Nav configuration per role ─────────────────────────

const NAV_ITEMS = {
  admin: [
    { label: 'Panel de Pagos',        path: '/admin',            icon: <IconAdmin /> },
    { label: 'Área Común',            path: '/common-area',      icon: <IconCommonArea /> },
    { label: 'Controles del Portón',  path: '/gate-controls',    icon: <IconGate /> },
    { label: 'Reporte Financiero',    path: '/financial-report', icon: <IconReport /> },
    { label: 'Utilidades',            path: '/utilities',        icon: <IconUtilities /> },
  ],
  gate_manager: [
    { label: 'Mis Pagos',             path: '/dashboard',        icon: <IconPayments /> },
    { label: 'Área Común',            path: '/common-area',      icon: <IconCommonArea /> },
    { label: 'Controles del Portón',  path: '/gate-controls',    icon: <IconGate /> },
    { label: 'Utilidades',            path: '/utilities',        icon: <IconUtilities /> },
    { label: 'Reporte Financiero',    path: '/financial-report', icon: <IconReport /> },
  ],
  resident: [
    { label: 'Mis Pagos',             path: '/dashboard',        icon: <IconPayments /> },
    //{ label: 'Área Común',            path: '/common-area',      icon: <IconCommonArea /> },
    { label: 'Ver Desglose',          path: '/financial-report', icon: <IconReport /> },
  ],
  resident_beta: [
    { label: 'Mis Pagos',             path: '/dashboard',        icon: <IconPayments /> },
    { label: 'Área Común',            path: '/common-area',      icon: <IconCommonArea /> },
    { label: 'Ver Desglose',          path: '/financial-report', icon: <IconReport /> },
  ],
};

const ROLE_LABELS = {
  admin:        'Administrador',
  gate_manager: 'Encargado del Portón',
  resident:     'Residente',
};

const ROLE_COLORS = {
  admin:        'bg-blue-100 text-blue-700',
  gate_manager: 'bg-green-100 text-green-700',
  resident:     'bg-gray-100 text-gray-600',
};

// ── Component ──────────────────────────────────────────

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = userData?.role || 'resident';
  const navItems = NAV_ITEMS[role] || NAV_ITEMS.resident;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    setOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* App name */}
      <div className="px-5 py-5 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <span className="text-lg font-bold text-gray-900">Privada</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-3">
        <div className="px-3">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {userData?.displayName || userData?.email}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Casa {userData?.houseNumber}</p>
          <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}>
            {ROLE_LABELS[role]}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="font-bold text-gray-900">Privada</span>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm font-semibold text-gray-900 leading-tight truncate max-w-[140px]">
            {userData?.displayName || userData?.email}
          </p>
          <p className="text-xs text-gray-500">Casa {userData?.houseNumber}</p>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-white/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Cerrar menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
