import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { APP_VIEWS } from '../config/views';
import {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  updateUserRole,
  seedDefaultRoles,
} from '../services/roleService';
import { getAllUsers, updateUserHouse } from '../services/userService';
import { TOTAL_HOUSES } from '../config/constants';
import { exportUsersToExcel } from '../utils/excelExport';

const EMPTY_FORM = { label: '', description: '', views: [] };

export default function RolesPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [editingHouseId, setEditingHouseId] = useState(null);
  const [houseDraft, setHouseDraft] = useState('');
  const [savingHouseId, setSavingHouseId] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');
      // Asegura que existan los roles base (admin, gate_manager, resident...)
      try {
        await seedDefaultRoles();
      } catch (seedErr) {
        console.warn('Seed de roles omitido:', seedErr);
      }
      const [rolesData, usersData] = await Promise.all([
        getAllRoles(),
        getAllUsers(),
      ]);
      setRoles(rolesData);
      setUsers(usersData);
    } catch (err) {
      console.error('Error al cargar roles:', err);
      setError('Error al cargar roles y usuarios. Revisa las reglas de Firestore (colección `roles`).');
    } finally {
      setLoading(false);
    }
  };

  const usersByRole = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      const r = u.role || 'resident';
      map[r] = (map[r] || 0) + 1;
    });
    return map;
  }, [users]);

  const flashSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Rol: modal ─────────────────────────────────────────
  const openCreateModal = () => {
    setEditingRole(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setForm({
      label: role.label || '',
      description: role.description || '',
      views: Array.isArray(role.views) ? [...role.views] : [],
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRole(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const toggleView = (path) => {
    setForm((f) => ({
      ...f,
      views: f.views.includes(path)
        ? f.views.filter((v) => v !== path)
        : [...f.views, path],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.label.trim()) {
      setFormError('El nombre del rol es requerido.');
      return;
    }
    if (form.views.length === 0) {
      setFormError('Selecciona al menos una vista a la que tendrá acceso.');
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, {
          label: form.label,
          description: form.description,
          views: form.views,
        });
        flashSuccess('Rol actualizado exitosamente');
      } else {
        await createRole({
          label: form.label,
          description: form.description,
          views: form.views,
        });
        flashSuccess('Rol creado exitosamente');
      }
      const rolesData = await getAllRoles();
      setRoles(rolesData);
      closeModal();
    } catch (err) {
      console.error('Error al guardar rol:', err);
      setFormError(err.message || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId) => {
    const assigned = usersByRole[roleId] || 0;
    if (assigned > 0) {
      setError(
        `No se puede eliminar: hay ${assigned} usuario(s) con este rol. Reasígnalos primero desde la pestaña Usuarios.`,
      );
      setConfirmDeleteId(null);
      return;
    }
    setDeleting(true);
    try {
      setError('');
      await deleteRole(roleId);
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      flashSuccess('Rol eliminado exitosamente');
    } catch (err) {
      console.error('Error al eliminar rol:', err);
      setError(err.message || 'Error al eliminar el rol.');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  // ── Usuarios: cambio de rol ────────────────────────────
  const handleUserRoleChange = async (user, newRoleId) => {
    if (!newRoleId || newRoleId === user.role) return;
    if (user.id === currentUser?.uid && user.role === 'admin' && newRoleId !== 'admin') {
      const ok = window.confirm(
        'Te quitarás a ti mismo el rol de Administrador y perderás acceso a esta pantalla. ¿Continuar?',
      );
      if (!ok) return;
    }
    setUpdatingUserId(user.id);
    try {
      setError('');
      await updateUserRole(user.id, newRoleId);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRoleId } : u)));
      flashSuccess(`Casa ${user.houseNumber ?? '—'} ahora es "${roles.find((r) => r.id === newRoleId)?.label || newRoleId}"`);
    } catch (err) {
      console.error('Error al cambiar rol:', err);
      setError(err.message || 'Error al cambiar el rol del usuario.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const takenHouses = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      if (u.houseNumber !== undefined && u.houseNumber !== null) set.add(Number(u.houseNumber));
    });
    return set;
  }, [users]);

  const startEditHouse = (user) => {
    setEditingHouseId(user.id);
    setHouseDraft(user.houseNumber ? String(user.houseNumber) : '');
    setError('');
  };

  const cancelEditHouse = () => {
    setEditingHouseId(null);
    setHouseDraft('');
  };

  const saveHouse = async (user) => {
    const houseNum = parseInt(houseDraft, 10);
    if (!Number.isInteger(houseNum) || houseNum < 1 || houseNum > TOTAL_HOUSES) {
      setError(`El número de casa debe estar entre 1 y ${TOTAL_HOUSES}.`);
      return;
    }
    if (houseNum === Number(user.houseNumber)) {
      cancelEditHouse();
      return;
    }
    if (takenHouses.has(houseNum)) {
      setError(`La casa ${houseNum} ya está registrada por otro usuario.`);
      return;
    }
    setSavingHouseId(user.id);
    try {
      setError('');
      await updateUserHouse(user.id, houseNum);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, houseNumber: houseNum } : u)));
      flashSuccess(`Casa actualizada: ${user.displayName || user.email} ahora es Casa ${houseNum}`);
      cancelEditHouse();
    } catch (err) {
      console.error('Error al cambiar casa:', err);
      setError(err.message || 'Error al cambiar la casa del usuario.');
    } finally {
      setSavingHouseId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const s = userSearch.toLowerCase();
    return (
      (u.displayName || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      String(u.houseNumber || '').includes(s)
    );
  });

  const handleExportUsers = async () => {
    setExporting(true);
    try {
      const roleLabels = Object.fromEntries(roles.map((r) => [r.id, r.label || r.id]));
      const result = exportUsersToExcel(filteredUsers, roleLabels, 'usuarios-privada.xlsx');
      if (!result.success) {
        setError('Error al exportar la lista de usuarios.');
      } else {
        flashSuccess(`Lista exportada (${filteredUsers.length} usuarios)`);
      }
    } catch (err) {
      console.error('Error al exportar usuarios:', err);
      setError('Error al exportar la lista de usuarios.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Roles y Permisos</h1>
          <p className="text-gray-600 mt-1">
            Define qué vistas ve cada rol al cargar el usuario, asigna roles y corrige la casa de los residentes.
          </p>
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[
            { id: 'roles', label: `Roles (${roles.length})` },
            { id: 'users', label: `Usuarios (${users.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : activeTab === 'roles' ? (
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Lista de Roles</h2>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Rol
              </button>
            </div>

            {roles.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 font-medium">No hay roles registrados</p>
                <p className="text-gray-400 text-sm mt-1">Crea el primer rol con el botón de arriba</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {roles.map((role) => {
                  const assigned = usersByRole[role.id] || 0;
                  return (
                    <div key={role.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{role.label}</span>
                          <code className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">
                            {role.id}
                          </code>
                          {role.isSystem && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              Sistema
                            </span>
                          )}
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            {assigned} usuario{assigned !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {role.description && (
                          <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(role.views || []).map((path) => (
                            <span
                              key={path}
                              className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full"
                            >
                              {APP_VIEWS.find((v) => v.path === path)?.label || path}
                            </span>
                          ))}
                          {(!role.views || role.views.length === 0) && (
                            <span className="text-xs text-gray-400 italic">Sin vistas asignadas</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {confirmDeleteId === role.id ? (
                          <span className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">¿Eliminar?</span>
                            <button
                              onClick={() => handleDelete(role.id)}
                              disabled={deleting}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {deleting ? 'Eliminando...' : 'Sí'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditModal(role)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Editar vistas del rol"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {!role.isSystem && (
                              <button
                                onClick={() => setConfirmDeleteId(role.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Eliminar rol"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar por nombre, correo o casa..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleExportUsers}
                  disabled={exporting || filteredUsers.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? 'Exportando...' : `Exportar Excel (${filteredUsers.length})`}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Usa el lápiz junto a la casa para corregir registros erróneos. Las casas ocupadas aparecen deshabilitadas. Nota: los pagos históricos conservan la casa original.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Casa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol actual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cambiar a</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{u.displayName || '—'}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {editingHouseId === u.id ? (
                          <span className="flex items-center gap-2">
                            <select
                              value={houseDraft}
                              onChange={(e) => setHouseDraft(e.target.value)}
                              disabled={savingHouseId === u.id}
                              className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                              autoFocus
                            >
                              <option value="">Seleccionar...</option>
                              {Array.from({ length: TOTAL_HOUSES }, (_, i) => i + 1).map((n) => {
                                const occupied = takenHouses.has(n) && n !== Number(u.houseNumber);
                                return (
                                  <option key={n} value={n} disabled={occupied}>
                                    Casa {n}{occupied ? ' (ocupada)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                            <button
                              onClick={() => saveHouse(u)}
                              disabled={savingHouseId === u.id || !houseDraft}
                              className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              {savingHouseId === u.id ? '...' : 'Guardar'}
                            </button>
                            <button
                              onClick={cancelEditHouse}
                              disabled={savingHouseId === u.id}
                              className="px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50"
                            >
                              X
                            </button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            {u.houseNumber ? `Casa ${u.houseNumber}` : <span className="text-gray-400 italic">—</span>}
                            <button
                              onClick={() => startEditHouse(u)}
                              className="text-gray-400 hover:text-blue-600"
                              title="Corregir casa (registro erróneo)"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {roles.find((r) => r.id === u.role)?.label || u.role || 'resident'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={u.role || 'resident'}
                          disabled={updatingUserId === u.id}
                          onChange={(e) => handleUserRoleChange(u, e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        {updatingUserId === u.id && (
                          <span className="ml-2 text-xs text-gray-400">Guardando...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">Sin resultados</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal crear / editar rol */}
      {modalOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del rol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Ej. Tesorero"
                  disabled={!!editingRole?.isSystem}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
                {editingRole?.isSystem && (
                  <p className="text-xs text-gray-400 mt-1">El nombre de los roles del sistema no se puede cambiar.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="¿Para quién es este rol?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vistas a las que tiene acceso <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                  {APP_VIEWS.map((view) => (
                    <label
                      key={view.path}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.views.includes(view.path)}
                        onChange={() => toggleView(view.path)}
                        className="mt-1 accent-blue-600"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900">
                          {view.label}{' '}
                          <code className="text-xs font-normal text-gray-400">{view.path}</code>
                        </span>
                        <span className="block text-xs text-gray-500">{view.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Al guardar, el menú lateral (Sidebar) del usuario mostrará solo estas vistas la próxima vez que cargue.
                </p>
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editingRole ? 'Guardar Cambios' : 'Crear Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
