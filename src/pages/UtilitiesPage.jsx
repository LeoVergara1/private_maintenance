import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import UtilityCard from '../components/UtilityCard';
import UtilityFormModal from '../components/UtilityFormModal';
import {
  getAllUtilities,
  createUtility,
  updateUtility,
  deleteUtility
} from '../services/utilitiesService';

const CATEGORIES = [
  'Seguridad',
  'Mantenimiento',
  'Contactos',
  'Notas Generales'
];

export default function UtilitiesPage() {
  const { currentUser, userData } = useAuth();
  const [utilities, setUtilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUtility, setEditingUtility] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = userData?.role === 'admin';
  const canEdit = isAdmin;

  useEffect(() => {
    loadUtilities();
  }, []);

  const loadUtilities = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllUtilities();
      setUtilities(data);
    } catch (err) {
      console.error('Error al cargar utilidades:', err);
      setError('Error al cargar las utilidades. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (utility = null) => {
    setEditingUtility(utility);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUtility(null);
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      setError('');

      if (editingUtility) {
        await updateUtility(editingUtility.id, formData);
        setSuccess('Utilidad actualizada exitosamente');
      } else {
        await createUtility(formData, currentUser.uid);
        setSuccess('Utilidad creada exitosamente');
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

      handleCloseForm();
      await loadUtilities();
    } catch (err) {
      console.error('Error al guardar utilidad:', err);
      setError('Error al guardar la utilidad. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (utilityId) => {
    try {
      setError('');
      await deleteUtility(utilityId);
      setSuccess('Utilidad eliminada exitosamente');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

      await loadUtilities();
    } catch (err) {
      console.error('Error al eliminar utilidad:', err);
      setError('Error al eliminar la utilidad. Por favor intenta de nuevo.');
    }
  };

  const groupedUtilities = CATEGORIES.reduce((acc, category) => {
    acc[category] = utilities.filter(u => u.category === category);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Utilidades de Privada</h1>
            <p className="text-gray-600 mt-1">Información de utilidad para la privada (combinaciones, contactos, etc.)</p>
          </div>
          {canEdit && (
            <button
              onClick={() => handleOpenForm()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              + Agregar Utilidad
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : Object.values(groupedUtilities).every(cat => cat.length === 0) ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-md">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg">No hay utilidades registradas</p>
            {canEdit && (
              <p className="text-gray-400 mt-1">Comienza agregando la primera utilidad</p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {CATEGORIES.map((category) => {
              const categoryUtilities = groupedUtilities[category];
              if (categoryUtilities.length === 0) return null;

              return (
                <div key={category}>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryUtilities.map((utility) => (
                      <UtilityCard
                        key={utility.id}
                        utility={utility}
                        onEdit={() => handleOpenForm(utility)}
                        onDelete={handleDelete}
                        canEdit={canEdit}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <UtilityFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        editingUtility={editingUtility}
        loading={submitting}
      />
    </DashboardLayout>
  );
}
