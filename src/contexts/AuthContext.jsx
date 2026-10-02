import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup,
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import { FALLBACK_ROLE_VIEWS } from '../config/views';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [roleConfig, setRoleConfig] = useState(null);
  const [roleViews, setRoleViews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserData(null);
      setRoleConfig(null);
      setRoleViews([]);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  };

  // Load user data from Firestore (+ role permissions from `roles/{role}`)
  const loadUserData = async (uid) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);

        // Cargar permisos dinámicos del rol (colección `roles`).
        // Fallback al mapa local si el doc aún no existe (migración).
        try {
          const roleId = data.role || 'resident';
          const roleSnap = await getDoc(doc(db, 'roles', roleId));
          if (roleSnap.exists()) {
            const cfg = { id: roleSnap.id, ...roleSnap.data() };
            setRoleConfig(cfg);
            setRoleViews(Array.isArray(cfg.views) ? cfg.views : []);
            return { ...data, roleViews: cfg.views || [] };
          }
        } catch (roleError) {
          console.warn('No se pudo cargar el rol dinámico, usando fallback:', roleError);
        }
        const fallback = FALLBACK_ROLE_VIEWS[data.role] || FALLBACK_ROLE_VIEWS.resident;
        setRoleConfig(null);
        setRoleViews(fallback);
        return { ...data, roleViews: fallback };
      }
      return null;
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
      return null;
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (currentUser) {
      await loadUserData(currentUser.uid);
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await loadUserData(user.uid);
      } else {
        setUserData(null);
        setRoleConfig(null);
        setRoleViews([]);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    roleConfig,
    roleViews,
    loading,
    signInWithGoogle,
    signOut,
    refreshUserData,
    // Helper: ¿el usuario actual puede ver esta ruta?
    // Admin siempre tiene acceso total (compatibilidad + bootstrap).
    hasAccess: (path) => {
      if (userData?.role === 'admin') return true;
      return roleViews.includes(path);
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
