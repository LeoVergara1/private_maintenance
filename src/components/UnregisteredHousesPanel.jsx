import { useState, useEffect } from 'react';
import { getUnregisteredHouses } from '../services/userService';

export default function UnregisteredHousesPanel() {
  const [unregisteredHouses, setUnregisteredHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHouses, setShowHouses] = useState(false);

  useEffect(() => {
    loadUnregisteredHouses();
  }, []);

  const loadUnregisteredHouses = async () => {
    try {
      setLoading(true);
      setError('');
      const houses = await getUnregisteredHouses();
      setUnregisteredHouses(houses);
    } catch (err) {
      console.error('Error al cargar casas sin registro:', err);
      setError('Error al cargar casas sin registro');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          Casas sin Registro
        </h2>
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          Casas sin Registro
        </h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              Casas sin Registro
            </h2>
            <button
              onClick={() => setShowHouses(!showHouses)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showHouses
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={showHouses ? 'Ocultar desglose' : 'Mostrar desglose'}
            >
              {showHouses ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Ocultar
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  Mostrar
                </span>
              )}
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {unregisteredHouses.length} de 60 casas sin usuario registrado
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-orange-600">
            {unregisteredHouses.length}
          </div>
          <p className="text-sm text-gray-600">casas</p>
        </div>
      </div>

      {showHouses && unregisteredHouses.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
          {unregisteredHouses.map(houseNum => (
            <div
              key={houseNum}
              className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center hover:bg-orange-100 transition-colors"
            >
              <p className="text-lg font-semibold text-orange-700">
                Casa {houseNum}
              </p>
            </div>
          ))}
        </div>
      ) : showHouses && unregisteredHouses.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mb-6">
          <p className="text-green-700 font-medium">
            ✓ ¡Todas las casas tienen usuario registrado!
          </p>
        </div>
      ) : null}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <span className="font-semibold">Tip:</span> Puedes registrar pagos manuales para estas casas usando el panel de "Registrar Pago Manual" arriba. Cuando el usuario de la casa se registre, el pago se vinculará automáticamente.
        </p>
      </div>
    </div>
  );
}
