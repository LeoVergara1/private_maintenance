import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { APP_VIEWS, FALLBACK_ROLE_VIEWS, sanitizeViews } from '../config/views';

const ROLES_COLLECTION = 'roles';

/**
 * Documento en Firestore: roles/{roleId}
 * {
 *   id: string (slug, ej "admin"),
 *   label: string (ej "Administrador"),
 *   description: string,
 *   views: string[] (paths permitidos, ej ["/admin", "/roles"]),
 *   isSystem: boolean (los del sistema no se pueden eliminar),
 *   createdAt, updatedAt: Timestamp
 * }
 */

export const slugifyRoleId = (text) =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || `rol_${Date.now()}`;

/** Obtiene todos los roles ordenados por label. */
export const getAllRoles = async () => {
  const snapshot = await getDocs(collection(db, ROLES_COLLECTION));
  const roles = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  return roles.sort((a, b) =>
    (a.label || a.id).localeCompare(b.label || b.id, 'es'),
  );
};

/** Obtiene un rol por id. Retorna null si no existe. */
export const getRoleById = async (roleId) => {
  if (!roleId) return null;
  const snap = await getDoc(doc(db, ROLES_COLLECTION, roleId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

/** Crea un rol nuevo. El id se genera del label (slug). */
export const createRole = async ({ label, description = '', views = [] }) => {
  const cleanLabel = (label || '').trim();
  if (!cleanLabel) throw new Error('El nombre del rol es requerido.');

  const id = slugifyRoleId(cleanLabel);
  const existing = await getRoleById(id);
  if (existing) throw new Error(`Ya existe un rol con el identificador "${id}".`);

  const now = Timestamp.now();
  const payload = {
    label: cleanLabel,
    description: (description || '').trim(),
    views: sanitizeViews(views),
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, ROLES_COLLECTION, id), payload);
  return { id, ...payload };
};

/** Actualiza label/description/views de un rol. */
export const updateRole = async (roleId, { label, description, views }) => {
  if (!roleId) throw new Error('roleId requerido.');
  const payload = { updatedAt: Timestamp.now() };
  if (label !== undefined) {
    const cleanLabel = (label || '').trim();
    if (!cleanLabel) throw new Error('El nombre del rol no puede estar vacío.');
    payload.label = cleanLabel;
  }
  if (description !== undefined) payload.description = (description || '').trim();
  if (views !== undefined) payload.views = sanitizeViews(views);
  await updateDoc(doc(db, ROLES_COLLECTION, roleId), payload);
};

/** Elimina un rol (bloquea roles del sistema). */
export const deleteRole = async (roleId) => {
  if (!roleId) throw new Error('roleId requerido.');
  const role = await getRoleById(roleId);
  if (role?.isSystem) throw new Error('Los roles del sistema no se pueden eliminar.');
  await deleteDoc(doc(db, ROLES_COLLECTION, roleId));
};

/** Cambia el rol de un usuario (users/{uid}.role). Solo admin (regla Firestore). */
export const updateUserRole = async (uid, newRoleId) => {
  if (!uid) throw new Error('uid requerido.');
  if (!newRoleId) throw new Error('El nuevo rol es requerido.');
  // Validar que el rol exista (o sea el fallback conocido)
  const role = await getRoleById(newRoleId);
  const knownFallback = Object.keys(FALLBACK_ROLE_VIEWS).includes(newRoleId);
  if (!role && !knownFallback) {
    throw new Error(`El rol "${newRoleId}" no existe.`);
  }
  await updateDoc(doc(db, 'users', uid), { role: newRoleId });
};

// ── Seed ─────────────────────────────────────────────────────────────

const DEFAULT_ROLE_DEFS = [
  {
    id: 'admin',
    label: 'Administrador',
    description: 'Acceso total, incluyendo administración de roles.',
    views: FALLBACK_ROLE_VIEWS.admin,
  },
  {
    id: 'gate_manager',
    label: 'Encargado del Portón',
    description: 'Controles del portón, utilidades y sus propios pagos.',
    views: FALLBACK_ROLE_VIEWS.gate_manager,
  },
  {
    id: 'resident',
    label: 'Residente',
    description: 'Sus pagos, área común y desglose financiero.',
    views: FALLBACK_ROLE_VIEWS.resident,
  },
  {
    id: 'resident_beta',
    label: 'Residente Beta',
    description: 'Igual que residente (para pruebas).',
    views: FALLBACK_ROLE_VIEWS.resident_beta,
  },
];

/**
 * Crea los roles del sistema si no existen. No sobrescribe los existentes
 * (para no pisar personalizaciones), solo asegura `isSystem: true` y que
 * incluyan la vista /roles en admin.
 * Retorna la lista de ids creados.
 */
export const seedDefaultRoles = async () => {
  const created = [];
  for (const def of DEFAULT_ROLE_DEFS) {
    const existing = await getRoleById(def.id);
    if (!existing) {
      const now = Timestamp.now();
      await setDoc(doc(db, ROLES_COLLECTION, def.id), {
        label: def.label,
        description: def.description,
        views: sanitizeViews(def.views),
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      });
      created.push(def.id);
    } else if (def.id === 'admin' && !existing.views?.includes('/roles')) {
      // Migración: asegurar que admin vea el nuevo apartado
      await updateDoc(doc(db, ROLES_COLLECTION, def.id), {
        views: sanitizeViews([...(existing.views || []), '/roles']),
        updatedAt: Timestamp.now(),
      });
    }
  }
  return created;
};

/** Lista de vistas disponibles para el formulario (label + path). */
export const getAvailableViews = () => APP_VIEWS;
