import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import {
  getAllGateControls,
  createGateControl,
  updateGateControl,
  deleteGateControl
} from '../services/gateControlService';
import { TOTAL_HOUSES } from '../config/constants';

const EMPTY_FORM = { controlNumber: '', houseNumber: '', status: 'active', notes: '' };

export default function GateControlsPage() {
  const { currentUser, userData } = useAuth();

  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingControl, setEditingControl] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [filterControl, setFilterControl] = useState('');
  const [filterHouse, setFilterHouse] = useState('');

  useEffect(() => {
    loadControls();
  }, []);

  const loadControls = async () => {
    try {
      const data = await getAllGateControls();
      setControls(data);
    } catch (err) {
      console.error('Error al cargar controles:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Stats ──────────────────────────────────────────────
  const total = controls.length;
  const assigned = controls.filter(c => c.houseNumber !== null && c.houseNumber !== undefined).length;
  const unassigned = total - assigned;
  const inactive = controls.filter(c => c.status === 'inactive').length;

  // ── Modal helpers ──────────────────────────────────────
  const openCreateModal = () => {
    setEditingControl(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (control) => {
    setEditingControl(control);
    setForm({
      controlNumber: control.controlNumber,
      houseNumber: control.houseNumber !== null && control.houseNumber !== undefined ? String(control.houseNumber) : '',
      status: control.status,
      notes: control.notes || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingControl(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  // ── Form submission ────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.controlNumber.trim()) {
      setFormError('El número de control es requerido.');
      return;
    }

    // Check for duplicate controlNumber (skip self when editing)
    const duplicate = controls.find(
      c => c.controlNumber.toLowerCase() === form.controlNumber.trim().toLowerCase() &&
           c.id !== editingControl?.id
    );
    if (duplicate) {
      setFormError('Ya existe un control con ese número.');
      return;
    }

    const payload = {
      controlNumber: form.controlNumber,
      houseNumber: form.houseNumber !== '' ? Number(form.houseNumber) : null,
      status: form.status,
      notes: form.notes
    };

    setSaving(true);
    try {
      if (editingControl) {
        await updateGateControl(editingControl.id, payload);
      } else {
        await createGateControl({
          ...payload,
          createdBy: currentUser.uid,
          createdByName: userData?.displayName || null
        });
      }
      await loadControls();
      closeModal();
    } catch (err) {
      setFormError('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteGateControl(id);
      await loadControls();
    } catch (error) {
      console.error('Error al eliminar control:', error);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };



  // ── Filtered list ──────────────────────────────────────
  const filteredControls = controls.filter(c => {
    const matchControl = filterControl === '' ||
      c.controlNumber.toLowerCase().includes(filterControl.toLowerCase());
    const matchHouse = filterHouse === '' ||
      (filterHouse === '__unassigned__'
        ? c.houseNumber === null || c.houseNumber === undefined
        : String(c.houseNumber) === filterHouse);
    return matchControl && matchHouse;
  });

  // ── House options ──────────────────────────────────────
  const houseOptions = Array.from({ length: TOTAL_HOUSES }, (_, i) => i + 1);

  return (
    <DashboardLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total" value={total} color="blue" />
          <StatCard label="Asignados" value={assigned} color="green" />
          <StatCard label="Sin asignar" value={unassigned} color="yellow" />
          <StatCard label="Inactivos" value={inactive} color="red" />
        </div>

        {/* Table header */}
        <div className="bg-white rounded-lg shadow-md">
          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={filterControl}
                onChange={e => setFilterControl(e.target.value)}
                placeholder="Buscar por control..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterHouse}
              onChange={e => setFilterHouse(e.target.value)}
              className="flex-1 sm:max-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            >
              <option value="">Todas las casas</option>
              <option value="__unassigned__">Sin asignar</option>
              {houseOptions.map(n => (
                <option key={n} value={n}>Casa {n}</option>
              ))}
            </select>
            {(filterControl || filterHouse) && (
              <button
                onClick={() => { setFilterControl(''); setFilterHouse(''); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Lista de Controles
              {(filterControl || filterHouse) && (
                <span className="ml-2 text-sm font-normal text-gray-500">{filteredControls.length} resultado{filteredControls.length !== 1 ? 's' : ''}</span>
              )}
            </h2>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Control
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
            </div>
          ) : filteredControls.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <p className="text-gray-500 font-medium">
                {controls.length === 0 ? 'No hay controles registrados' : 'Sin resultados para los filtros aplicados'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {controls.length === 0 ? 'Crea el primer control con el botón de arriba' : 'Intenta con otros criterios de búsqueda'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Control</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Casa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredControls.map(control => (
                    <tr key={control.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-gray-900">
                        {control.controlNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {control.houseNumber !== null && control.houseNumber !== undefined
                          ? `Casa ${control.houseNumber}`
                          : <span className="text-gray-400 italic">Sin asignar</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={control.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm max-w-xs truncate">
                        {control.notes || <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {confirmDeleteId === control.id ? (
                          <span className="flex items-center justify-end gap-2">
                            <span className="text-sm text-gray-600">¿Eliminar?</span>
                            <button
                              onClick={() => handleDelete(control.id)}
                              disabled={deletingId === control.id}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {deletingId === control.id ? 'Eliminando...' : 'Sí'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <span className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => openEditModal(control)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Editar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(control.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Eliminar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingControl ? 'Editar Control' : 'Nuevo Control'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Control number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Control <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.controlNumber}
                  onChange={e => setForm(f => ({ ...f, controlNumber: e.target.value.toUpperCase() }))}
                  placeholder="Ej. C-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                />
              </div>

              {/* House */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Casa Asignada
                </label>
                <select
                  value={form.houseNumber}
                  onChange={e => setForm(f => ({ ...f, houseNumber: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                >
                  <option value="">Sin asignar</option>
                  {houseOptions.map(n => (
                    <option key={n} value={n}>Casa {n}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <div className="flex gap-4">
                  {['active', 'inactive'].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={form.status === s}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                        className="accent-green-600"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {s === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Observaciones sobre el control..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editingControl ? 'Guardar Cambios' : 'Crear Control'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ── Sub-components ─────────────────────────────────────

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200'
  };
  return (
    <div className={`rounded-lg border p-4 text-center ${colors[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  return status === 'active'
    ? <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span>
    : <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactivo</span>;
}
