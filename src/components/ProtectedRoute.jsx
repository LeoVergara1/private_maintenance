import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, requireOnboarding = true, adminOnly = false, gateManagerOnly = false, viewPath = null }) => {
  const { currentUser, userData, roleViews, hasAccess } = useAuth();

  // Not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Needs onboarding
  if (requireOnboarding && !userData) {
    return <Navigate to="/onboarding" replace />;
  }

  // Admin only route (el rol admin siempre pasa; además /roles solo admin)
  if (adminOnly && userData?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Gate manager route: accesible por admin y gate_manager (legacy).
  // Si ya hay permisos dinámicos, se respeta roleViews en su lugar.
  if (gateManagerOnly && userData?.role !== 'admin' && userData?.role !== 'gate_manager') {
    // Fallback legacy solo si aún no hay permisos dinámicos cargados
    if (!roleViews || roleViews.length === 0) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Control dinámico por vista (Firestore roles/{role}.views).
  // Admin siempre tiene acceso (ver hasAccess en AuthContext).
  if (viewPath && !hasAccess(viewPath)) {
    // Redirige a la primera vista permitida o al dashboard
    const fallback = roleViews?.[0] || '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
};
