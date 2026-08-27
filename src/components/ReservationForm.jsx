import { useState, useEffect } from 'react';
import { 
  createReservation, 
  countPrivateEventsThisYear
} from '../services/commonAreaService';
import { getCurrentMonth, getCurrentYear } from '../utils/dateValidation';
import { checkHouseDebt, getMonthsDescription } from '../utils/paymentValidation';

export default function ReservationForm({ houseNumber, userId, isAdmin = false, onReservationCreated }) {
  const [selectedHouseNumber, setSelectedHouseNumber] = useState(houseNumber);
  const [formData, setFormData] = useState({
    date: '',
    eventType: 'private',
    purpose: 'Evento privado',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [privateEventsCount, setPrivateEventsCount] = useState(0);

  useEffect(() => {
    loadPrivateEventsCount();
  }, []);

  const loadPrivateEventsCount = async () => {
    try {
      const count = await countPrivateEventsThisYear(selectedHouseNumber);
      setPrivateEventsCount(count);
    } catch (error) {
      console.error('Error al cargar conteo de eventos:', error);
    }
  };

  useEffect(() => {
    loadPrivateEventsCount();
  }, [selectedHouseNumber]);

  const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    return date.getDay();
  };

  const isWeekend = (dayOfWeek) => {
    return dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.date) {
      setError('Por favor selecciona una fecha');
      return;
    }

    if (!formData.purpose.trim()) {
      setError('Por favor describe el propósito del evento');
      return;
    }

    // Check if private event and already has 2
    const dayOfWeek = getDayOfWeek(formData.date);
    if (formData.eventType === 'private' && isWeekend(dayOfWeek)) {
      if (privateEventsCount >= 2) {
        setError('Ya alcanzaste el límite de 2 eventos privados este año en viernes-sábado');
        return;
      }
    }

    setLoading(true);

    try {
      // Check if house has any debt (unpaid months)
      const debtCheck = await checkHouseDebt(selectedHouseNumber, getCurrentMonth(), getCurrentYear());
      if (debtCheck.hasDebt) {
        const monthsList = getMonthsDescription(debtCheck.unpaidMonths);
        setError(`La casa #${selectedHouseNumber} tiene adeudo. Meses pendientes: ${monthsList}. Resuelve los pagos antes de hacer una reserva.`);
        setLoading(false);
        return;
      }
    } catch (debtCheckError) {
      console.error('Error al verificar adeudos:', debtCheckError);
      setError('Error al verificar el estado de pagos. Por favor intenta de nuevo.');
      setLoading(false);
      return;
    }

    try {
      // Create reservation
      const dayOfWeek = getDayOfWeek(formData.date);
      const weekendFlag = isWeekend(dayOfWeek);
      
      // Parse date correctly from input (YYYY-MM-DD format)
      // Keep it in local timezone so when user picks May 9, it stores as May 9 00:00 local time
      const [year, month, day] = formData.date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      dateObj.setHours(0, 0, 0, 0);

      await createReservation({
        houseNumber: selectedHouseNumber,
        userId,
        eventType: formData.eventType,
        date: dateObj,
        startTime: '00:00',
        endTime: '23:59',
        purpose: formData.purpose,
        dayOfWeek,
        isWeekend: weekendFlag,
        notes: formData.notes,
        createdBy: userId
      });

      setSuccess('¡Reserva registrada exitosamente! No olvides notificar a la mesa directiva.');
      
      // Reset form
      setFormData({
        date: '',
        eventType: 'private',
        purpose: 'Evento privado',
        notes: ''
      });

      // Reload counts
      await loadPrivateEventsCount();

      // Notify parent
      if (onReservationCreated) {
        onReservationCreated();
      }

      // Clear success message after 4 seconds
      setTimeout(() => setSuccess(''), 4000);
    } catch (error) {
      console.error('Error al crear reserva:', error);
      setError('Error al registrar la reserva. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const dayOfWeek = formData.date ? getDayOfWeek(formData.date) : -1;
  const isWeekendDay = dayOfWeek >= 0 && isWeekend(dayOfWeek);
  const dateObj = formData.date ? new Date(formData.date) : null;
  const canAddPrivateEvent = formData.eventType === 'private' && isWeekendDay ? privateEventsCount < 2 : true;

  // Remove validateReservationTime import since it's no longer needed
  // and checkReservationConflict since there are no time slots anymore

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Registrar Reserva</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* House Selection for Admin */}
        {isAdmin && (
          <div>
            <label htmlFor="adminHouseNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Casa *
            </label>
            <input
              type="number"
              id="adminHouseNumber"
              value={selectedHouseNumber}
              onChange={(e) => setSelectedHouseNumber(parseInt(e.target.value))}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-600">Registrando evento para casa #{selectedHouseNumber}</p>
          </div>
        )}

        {/* Event Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de Evento
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="eventType"
                value="private"
                checked={formData.eventType === 'private'}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-3 text-sm text-gray-700">
                Privado (descuenta del cupo anual si es viernes-sábado)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="eventType"
                value="spontaneous"
                checked={formData.eventType === 'spontaneous'}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-3 text-sm text-gray-700">
                Espontáneo (uso sin reservación previa)
              </span>
            </label>
          </div>
        </div>

        {/* Cupo Anual Info */}
        {formData.eventType === 'private' && isWeekendDay && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Cupo anual viernes-sábado:</span> {privateEventsCount}/2 eventos usados
              {privateEventsCount >= 2 && (
                <span className="block mt-1 text-red-600 font-semibold">
                  ⚠️ Ya alcanzaste el límite para este año
                </span>
              )}
            </p>
          </div>
        )}

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de la Reserva *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            disabled={loading}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {dateObj && (
            <p className="mt-1 text-xs text-gray-600">
              {isWeekendDay ? '📍 Viernes/Sábado - Máx 2 eventos/año' : '📍 Día con menos restricción'}
            </p>
          )}
        </div>

        {/* Purpose */}
        <div>
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
            Propósito del Evento *
          </label>
          <textarea
            id="purpose"
            name="purpose"
            value={formData.purpose}
            onChange={handleInputChange}
            placeholder="Ej: Cumpleaños, comida familiar, reunión social..."
            disabled={loading}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed h-20 resize-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Notas Adicionales
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Cualquier información adicional..."
            disabled={loading}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed h-16 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !canAddPrivateEvent}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Registrando...' : 'Registrar Reserva'}
        </button>
      </form>
    </div>
  );
}
