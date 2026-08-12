import { useState, useEffect } from 'react';
import { getReservationsByHouse, cancelReservation } from '../services/commonAreaService';
import { getCurrentYear, getMonthName } from '../utils/dateValidation';

export default function ReservationsList({ houseNumber, onReservationUpdated }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const year = getCurrentYear();
      const data = await getReservationsByHouse(houseNumber, year);
      setReservations(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      setError('Error al cargar las reservas');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (reservationId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
      return;
    }

    try {
      setCancelling(reservationId);
      await cancelReservation(reservationId, 'Cancelada por residente');
      
      // Reload list
      await loadReservations();
      
      if (onReservationUpdated) {
        onReservationUpdated();
      }
    } catch (error) {
      console.error('Error al cancelar reserva:', error);
      setError('Error al cancelar la reserva');
    } finally {
      setCancelling(null);
    }
  };

  const getDayName = (day) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day];
  };

  const getStatusBadge = (status) => {
    const styles = {
      confirmed: 'bg-green-100 text-green-800 border border-green-300',
      cancelled: 'bg-gray-100 text-gray-800 border border-gray-300'
    };

    const labels = {
      confirmed: '✓ Confirmada',
      cancelled: '✗ Cancelada'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.confirmed}`}>
        {labels[status] || 'Confirmada'}
      </span>
    );
  };

  const getEventBadge = (eventType) => {
    return eventType === 'private' 
      ? <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">Privado</span>
      : <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">Espontáneo</span>;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Historial de Reservas</h2>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Historial de Reservas</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  const confirmedReservations = reservations.filter(r => r.status === 'confirmed');
  const cancelledReservations = reservations.filter(r => r.status === 'cancelled');

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Historial de Reservas {getCurrentYear()}</h2>

      {reservations.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No tienes reservas registradas</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Confirmed Reservations */}
          {confirmedReservations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Reservas Confirmadas ({confirmedReservations.length})
              </h3>
              <div className="space-y-3">
                {confirmedReservations.map(reservation => (
                  <div
                    key={reservation.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {getMonthName(reservation.date.getMonth() + 1)} {reservation.date.getDate()}
                            {' - '}
                            {getDayName(reservation.date.getDay())}
                          </h4>
                          {getEventBadge(reservation.eventType)}
                        </div>
                      </div>
                      {getStatusBadge(reservation.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">
                          <span className="font-medium">Propósito:</span> {reservation.purpose}
                        </p>
                      </div>
                    </div>

                    {reservation.notes && (
                      <div className="bg-gray-50 rounded p-2 mb-3 text-sm text-gray-700">
                        <span className="font-medium">Notas:</span> {reservation.notes}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancel(reservation.id)}
                        disabled={cancelling === reservation.id}
                        className="flex-1 px-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium border border-red-300 rounded hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelling === reservation.id ? 'Cancelando...' : 'Cancelar Reserva'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Reservations */}
          {cancelledReservations.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Reservas Canceladas ({cancelledReservations.length})
              </h3>
              <div className="space-y-3">
                {cancelledReservations.map(reservation => (
                  <div
                    key={reservation.id}
                    className="border border-gray-200 rounded-lg p-4 opacity-60"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 line-through">
                            {getMonthName(reservation.date.getMonth() + 1)} {reservation.date.getDate()}
                            {' - '}
                            {getDayName(reservation.date.getDay())}
                          </h4>
                          {getEventBadge(reservation.eventType)}
                        </div>
                      </div>
                      {getStatusBadge(reservation.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
