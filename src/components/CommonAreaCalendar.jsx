import { useState, useEffect } from 'react';
import { getReservationsByDateRange, getReservationsByDate, deleteReservation } from '../services/commonAreaService';
import { getMonthName, getCurrentMonth, getCurrentYear } from '../utils/dateValidation';
import { checkHouseDebt, getMonthsDescription } from '../utils/paymentValidation';

export default function CommonAreaCalendar({ houseNumber, isAdmin = false, onDateSelect }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateReservations, setSelectedDateReservations] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  // Days of week abbreviations
  const daysOfWeek = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  useEffect(() => {
    loadReservations();
  }, [currentMonth, currentYear]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      
      // Get first and last day of the month
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      
      // Get reservations for the entire month
      const monthReservations = await getReservationsByDateRange(firstDay, lastDay);
      setReservations(monthReservations);
    } catch (error) {
      console.error('Error al cargar reservas del calendario:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const isReservationDay = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reservations.some(res => {
      const resDate = res.date.toISOString().split('T')[0];
      return resDate === dateStr;
    });
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = async (day) => {
    // Check if house has debt before allowing reservation
    try {
      const debtCheck = await checkHouseDebt(houseNumber, getCurrentMonth(), getCurrentYear());
      if (debtCheck.hasDebt) {
        const monthsList = getMonthsDescription(debtCheck.unpaidMonths);
        alert(`La casa #${houseNumber} tiene adeudo.\n\nMeses pendientes: ${monthsList}\n\nResuelve los pagos antes de hacer una reserva.`);
        return;
      }
    } catch (error) {
      console.error('Error al verificar adeudos:', error);
      alert('Error al verificar el estado de pagos. Por favor intenta de nuevo.');
      return;
    }

    const date = new Date(currentYear, currentMonth, day);
    setSelectedDate(date);
    
    // Get reservations for this specific date
    try {
      const dateReservations = await getReservationsByDate(date);
      setSelectedDateReservations(dateReservations);
    } catch (error) {
      console.error('Error al cargar reservas de la fecha:', error);
      setSelectedDateReservations([]);
    }
    
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  const handleDeleteReservation = async (reservationId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta reserva?')) return;
    
    try {
      setDeletingId(reservationId);
      await deleteReservation(reservationId);
      
      // Refresh the selected date reservations
      if (selectedDate) {
        const updatedReservations = await getReservationsByDate(selectedDate);
        setSelectedDateReservations(updatedReservations);
      }
      
      // Refresh the calendar
      await loadReservations();
    } catch (error) {
      console.error('Error al eliminar reserva:', error);
      alert('Error al eliminar la reserva');
    } finally {
      setDeletingId(null);
    }
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const days = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {getMonthName(currentMonth + 1)} {currentYear}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            ←
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            →
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const hasReservation = day && isReservationDay(day);
          const today = isToday(day);

          return (
            <button
              key={index}
              onClick={() => day && handleDateClick(day)}
              disabled={!day}
              className={`
                aspect-square rounded-lg text-sm font-medium transition
                ${!day ? 'bg-gray-50 cursor-default' : ''}
                ${today ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-900' : ''}
                ${hasReservation && !today ? 'bg-red-100 text-red-900 border border-red-300' : ''}
                ${!today && !hasReservation && day ? 'bg-gray-50 hover:bg-gray-100 text-gray-900' : ''}
                ${day ? 'cursor-pointer' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 space-y-3 text-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 ring-2 ring-blue-500 rounded"></div>
            <span className="text-gray-600">Hoy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-gray-600">Con reservas</span>
          </div>
        </div>
        {/* Selected date reservations */}
        {selectedDate && selectedDateReservations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
            <p className="font-semibold text-gray-900 mb-2">
              Reservas para {selectedDate.toLocaleDateString('es-MX', { month: 'long', day: 'numeric' })}
            </p>
            <div className="space-y-2">
              {selectedDateReservations.map(res => (
                <div key={res.id} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
                  <div>
                    <span className="font-medium text-gray-900">Casa #{res.houseNumber}</span>
                    <span className="text-gray-600 ml-2 text-xs">({res.eventType === 'private' ? 'Privado' : 'Espontáneo'})</span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteReservation(res.id)}
                      disabled={deletingId === res.id}
                      className="text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === res.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {selectedDate && selectedDateReservations.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded p-3 mt-4">
            <p className="text-gray-700">
              ✓ {selectedDate.toLocaleDateString('es-MX', { month: 'long', day: 'numeric' })} sin reservas
            </p>
          </div>
        )}
      </div>
      {/* Statistics */}
      {houseNumber && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            📊 Total reservas este mes: <span className="font-semibold">{reservations.length}</span>
          </p>
        </div>
      )}

      {loading && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Cargando calendario...
        </div>
      )}
    </div>
  );
}
