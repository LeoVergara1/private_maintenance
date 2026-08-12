import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import CommonAreaCalendar from '../components/CommonAreaCalendar';
import ReservationForm from '../components/ReservationForm';
import ReservationsList from '../components/ReservationsList';
import CommonAreaRules from '../components/CommonAreaRules';

export default function CommonAreaPage() {
  const { currentUser, userData } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);

  const handleReservationCreated = () => {
    // Refresh calendar and list
    setRefreshKey(prev => prev + 1);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    // Scroll to form
    const formElement = document.getElementById('reservation-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <DashboardLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Área Común</h1>
          <p className="text-gray-600">
            Reserva y gestiona el uso del área común para eventos de tu hogar
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Calendar and Rules */}
          <div className="lg:col-span-2 space-y-8">
            {/* Calendar */}
            <CommonAreaCalendar 
              key={`calendar-${refreshKey}`}
              houseNumber={userData.houseNumber}
              isAdmin={userData.role === 'admin'}
              onDateSelect={handleDateSelect}
            />

            {/* Rules */}
            <CommonAreaRules />
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-1">
            <div id="reservation-form" className="sticky top-8">
              <ReservationForm 
                key={`form-${refreshKey}`}
                houseNumber={userData.houseNumber}
                userId={currentUser.uid}
                isAdmin={userData.role === 'admin'}
                onReservationCreated={handleReservationCreated}
              />
            </div>
          </div>
        </div>

        {/* Reservations History - Full Width Below */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <ReservationsList 
            key={`list-${refreshKey}`}
            houseNumber={userData.houseNumber}
            onReservationUpdated={handleReservationCreated}
          />
        </div>

        {/* WhatsApp Notification Reminder */}
        <div className="mt-8 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-green-800 font-semibold">Recordatorio Importante</h3>
              <p className="text-green-700 text-sm mt-1">
                Después de registrar tu reserva, es <span className="font-semibold">obligatorio</span> notificar a la mesa directiva o a través del grupo de WhatsApp de la privada.
              </p>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
