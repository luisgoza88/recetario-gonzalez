'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type {
  UserProfile,
  HouseholdMembership,
  Household,
  Permission,
  UserRole,
  DEFAULT_PERMISSIONS
} from '@/types';

// =====================================================
// Tipos del Contexto
// =====================================================

interface AuthContextType {
  // Estado de autenticación
  user: UserProfile | null;
  supabaseUser: User | null;
  session: Session | null;
  memberships: HouseholdMembership[];
  currentHousehold: Household | null;
  currentMembership: HouseholdMembership | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Acciones de autenticación
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;

  // Gestión de hogares
  switchHousehold: (householdId: string) => void;
  refreshMemberships: () => Promise<void>;

  // Permisos
  hasPermission: (permission: Permission) => boolean;
  isAdmin: () => boolean;
  isEmployee: () => boolean;
  isFamily: () => boolean;
  getRole: () => UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =====================================================
// Hook personalizado
// =====================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

// Hook para verificar si estamos autenticados (sin throw)
export function useOptionalAuth() {
  return useContext(AuthContext);
}

// =====================================================
// Permisos por defecto según rol
// =====================================================

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_menu', 'view_shopping_list', 'view_tasks', 'view_inventory',
    'complete_tasks', 'update_inventory', 'check_in',
    'edit_menu', 'edit_recipes', 'edit_shopping_list',
    'manage_employees', 'manage_spaces', 'manage_tasks',
    'manage_members', 'manage_invitations', 'delete_data'
  ],
  familia: [
    'view_menu', 'view_shopping_list', 'view_tasks', 'view_inventory',
    'edit_menu', 'edit_recipes', 'edit_shopping_list'
  ],
  empleado: [
    'view_menu', 'view_shopping_list', 'view_tasks', 'view_inventory',
    'complete_tasks', 'update_inventory', 'check_in'
  ]
};

// =====================================================
// Provider
// =====================================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<HouseholdMembership[]>([]);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar perfil de usuario
  const loadUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error cargando perfil:', error);
        return null;
      }

      return data as UserProfile;
    } catch (err) {
      console.error('Error cargando perfil:', err);
      return null;
    }
  }, []);

  // Cargar membresías del usuario
  const loadMemberships = useCallback(async (userId: string): Promise<HouseholdMembership[]> => {
    try {
      const { data, error } = await supabase
        .from('household_memberships')
        .select(`
          *,
          household:households(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false });

      if (error) {
        console.error('Error cargando membresías:', error);
        return [];
      }

      return (data || []) as HouseholdMembership[];
    } catch (err) {
      console.error('Error cargando membresías:', err);
      return [];
    }
  }, []);

  // Refrescar membresías
  const refreshMemberships = useCallback(async () => {
    if (!supabaseUser) return;

    const loadedMemberships = await loadMemberships(supabaseUser.id);
    setMemberships(loadedMemberships);

    // Si el hogar actual ya no está en las membresías, cambiar al primero
    if (currentHouseholdId) {
      const stillMember = loadedMemberships.some(m => m.household_id === currentHouseholdId);
      if (!stillMember && loadedMemberships.length > 0) {
        setCurrentHouseholdId(loadedMemberships[0].household_id);
        localStorage.setItem('currentHouseholdId', loadedMemberships[0].household_id);
      }
    }
  }, [supabaseUser, currentHouseholdId, loadMemberships]);

  // Inicializar sesión
  useEffect(() => {
    const initSession = async () => {
      try {
        // Obtener sesión actual
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession?.user) {
          setSession(currentSession);
          setSupabaseUser(currentSession.user);

          // Cargar perfil y membresías
          const [profile, userMemberships] = await Promise.all([
            loadUserProfile(currentSession.user.id),
            loadMemberships(currentSession.user.id)
          ]);

          setUser(profile);
          setMemberships(userMemberships);

          // Restaurar hogar seleccionado o usar el primero
          const savedHouseholdId = localStorage.getItem('currentHouseholdId');
          if (savedHouseholdId && userMemberships.some(m => m.household_id === savedHouseholdId)) {
            setCurrentHouseholdId(savedHouseholdId);
          } else if (userMemberships.length > 0) {
            setCurrentHouseholdId(userMemberships[0].household_id);
            localStorage.setItem('currentHouseholdId', userMemberships[0].household_id);
          }
        }
      } catch (err) {
        console.error('Error inicializando sesión:', err);
        setError('Error al inicializar la sesión');
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' && newSession?.user) {
          setSession(newSession);
          setSupabaseUser(newSession.user);

          const [profile, userMemberships] = await Promise.all([
            loadUserProfile(newSession.user.id),
            loadMemberships(newSession.user.id)
          ]);

          setUser(profile);
          setMemberships(userMemberships);

          if (userMemberships.length > 0) {
            const savedHouseholdId = localStorage.getItem('currentHouseholdId');
            if (savedHouseholdId && userMemberships.some(m => m.household_id === savedHouseholdId)) {
              setCurrentHouseholdId(savedHouseholdId);
            } else {
              setCurrentHouseholdId(userMemberships[0].household_id);
              localStorage.setItem('currentHouseholdId', userMemberships[0].household_id);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setSupabaseUser(null);
          setUser(null);
          setMemberships([]);
          setCurrentHouseholdId(null);
          localStorage.removeItem('currentHouseholdId');
        }

        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile, loadMemberships]);

  // Calcular hogar y membresía actuales
  const currentMembership = memberships.find(m => m.household_id === currentHouseholdId) || null;
  const currentHousehold = currentMembership?.household || null;

  // =====================================================
  // Acciones de autenticación
  // =====================================================

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setError(null);
      setIsLoading(true);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message);
        return { error: signInError.message };
      }

      return {};
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      return { error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error?: string }> => {
    try {
      setError(null);
      setIsLoading(true);

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return { error: signUpError.message };
      }

      return {};
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrarse';
      setError(message);
      return { error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      localStorage.removeItem('currentHouseholdId');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar email';
      return { error: message };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar contraseña';
      return { error: message };
    }
  };

  // =====================================================
  // Gestión de hogares
  // =====================================================

  const switchHousehold = (householdId: string) => {
    const membership = memberships.find(m => m.household_id === householdId);
    if (membership) {
      setCurrentHouseholdId(householdId);
      localStorage.setItem('currentHouseholdId', householdId);
    }
  };

  // =====================================================
  // Verificación de permisos
  // =====================================================

  const getRole = (): UserRole | null => {
    return currentMembership?.role || null;
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!currentMembership) return false;

    // Verificar permisos personalizados primero
    if (currentMembership.permissions && permission in currentMembership.permissions) {
      return currentMembership.permissions[permission];
    }

    // Usar permisos por defecto del rol
    const rolePermissions = ROLE_PERMISSIONS[currentMembership.role] || [];
    return rolePermissions.includes(permission);
  };

  const isAdmin = (): boolean => currentMembership?.role === 'admin';
  const isEmployee = (): boolean => currentMembership?.role === 'empleado';
  const isFamily = (): boolean => currentMembership?.role === 'familia';

  // =====================================================
  // Valor del contexto
  // =====================================================

  const value: AuthContextType = {
    user,
    supabaseUser,
    session,
    memberships,
    currentHousehold,
    currentMembership,
    isLoading,
    isAuthenticated: !!supabaseUser,
    error,

    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,

    switchHousehold,
    refreshMemberships,

    hasPermission,
    isAdmin,
    isEmployee,
    isFamily,
    getRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// Componente de protección de rutas
// =====================================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredRole?: UserRole | UserRole[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  fallback
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, getRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirigir a login o mostrar fallback
    if (fallback) return <>{fallback}</>;
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return null;
  }

  // Verificar permiso específico
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback ? <>{fallback}</> : (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Acceso denegado</h2>
          <p className="text-gray-600 mt-2">No tienes permiso para ver esta página</p>
        </div>
      </div>
    );
  }

  // Verificar rol requerido
  if (requiredRole) {
    const currentRole = getRole();
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return fallback ? <>{fallback}</> : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800">Acceso denegado</h2>
            <p className="text-gray-600 mt-2">Tu rol no tiene acceso a esta sección</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// =====================================================
// Hook para verificar permisos en componentes
// =====================================================

export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

export function useRole(): UserRole | null {
  const { getRole } = useAuth();
  return getRole();
}
