import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createUser, isHouseNumberTaken } from '../services/userService';

export default function Onboarding() {
  const { currentUser, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [houseNumber, setHouseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!houseNumber) {
      setError('Por favor selecciona el número de casa');
      return;
    }

    const houseNum = parseInt(houseNumber);
    if (houseNum < 1 || houseNum > 60) {
      setError('El número de casa debe estar entre 1 y 60');
      return;
    }

    setLoading(true);

    try {
      // Check if house number is already taken
      const isTaken = await isHouseNumberTaken(houseNum);
      if (isTaken) {
        setError('Este número de casa ya está registrado');
        setLoading(false);
        return;
      }

      // Create user document
      await createUser(currentUser.uid, {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        houseNumber: houseNum,
        role: 'resident' // Default role
      });

      // Refresh user data in context
      await refreshUserData();

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error al registrar:', error);
      setError('Error al registrar. Por favor intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg 
                className="w-8 h-8 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bienvenido
            </h1>
            <p className="text-gray-600">
              Por favor, selecciona tu número de casa para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Número de Casa
              </label>
              <select
                id="houseNumber"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading}
              >
                <option value="">Seleccionar casa...</option>
                {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    Casa {num}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Continuar'}
            </button>
          </form>

          {/* User info */}
          {currentUser && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                {currentUser.photoURL && (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{currentUser.displayName}</p>
                  <p className="text-gray-500">{currentUser.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
