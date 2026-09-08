import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import ResidentDashboard from './pages/ResidentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminFinancialReport from './pages/AdminFinancialReport';
import GateControlsPage from './pages/GateControlsPage';
import UtilitiesPage from './pages/UtilitiesPage';
import CommonAreaPage from './pages/CommonAreaPage';
import PastDebtsPage from './pages/PastDebtsPage';

function AppRoutes() {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route */}
      <Route 
        path="/login" 
        element={
          currentUser ? (
            <Navigate to={userData ? (userData.role === 'admin' ? '/admin' : userData.role === 'gate_manager' ? '/gate-controls' : '/dashboard') : '/onboarding'} replace />
          ) : (
            <Login />
          )
        } 
      />

      {/* Onboarding route */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requireOnboarding={false}>
            {userData ? (
              <Navigate to={userData.role === 'admin' ? '/admin' : userData.role === 'gate_manager' ? '/gate-controls' : '/dashboard'} replace />
            ) : (
              <Onboarding />
            )}
          </ProtectedRoute>
        }
      />

      {/* Resident dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ResidentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin dashboard */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Financial report */}
      <Route
        path="/financial-report"
        element={
          <ProtectedRoute>
            <AdminFinancialReport />
          </ProtectedRoute>
        }
      />

      {/* Gate controls */}
      <Route
        path="/gate-controls"
        element={
          <ProtectedRoute gateManagerOnly>
            <GateControlsPage />
          </ProtectedRoute>
        }
      />

      {/* Utilities */}
      <Route
        path="/utilities"
        element={
          <ProtectedRoute gateManagerOnly>
            <UtilitiesPage />
          </ProtectedRoute>
        }
      />

      {/* Common Area */}
      <Route
        path="/common-area"
        element={
          <ProtectedRoute>
            <CommonAreaPage />
          </ProtectedRoute>
        }
      />

      {/* Past Debts */}
      <Route
        path="/past-debts"
        element={
          <ProtectedRoute adminOnly>
            <PastDebtsPage />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route
        path="/"
        element={
          currentUser ? (
            userData ? (
              <Navigate to={userData.role === 'admin' ? '/admin' : userData.role === 'gate_manager' ? '/gate-controls' : '/dashboard'} replace />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
