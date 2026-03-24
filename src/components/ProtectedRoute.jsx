import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, requireOnboarding = true, adminOnly = false, gateManagerOnly = false }) => {
  const { currentUser, userData } = useAuth();

  // Not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Needs onboarding
  if (requireOnboarding && !userData) {
    return <Navigate to="/onboarding" replace />;
  }

  // Admin only route
  if (adminOnly && userData?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Gate manager route: accessible by admin and gate_manager
  if (gateManagerOnly && userData?.role !== 'admin' && userData?.role !== 'gate_manager') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
