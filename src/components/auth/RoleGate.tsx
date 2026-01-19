'use client';

import { useAuth } from '@/contexts/AuthContext';
import type { UserRole, Permission } from '@/types';

// =====================================================
// RoleGate - Renderiza contenido basado en rol
// =====================================================

interface RoleGateProps {
  children: React.ReactNode;
  /** Roles permitidos para ver el contenido */
  allowedRoles?: UserRole | UserRole[];
  /** Permiso requerido para ver el contenido */
  requiredPermission?: Permission;
  /** Contenido alternativo si no tiene acceso */
  fallback?: React.ReactNode;
  /** Si true, no muestra nada en lugar del fallback */
  hideOnDenied?: boolean;
}

export function RoleGate({
  children,
  allowedRoles,
  requiredPermission,
  fallback = null,
  hideOnDenied = false
}: RoleGateProps) {
  const { isAuthenticated, getRole, hasPermission, isLoading } = useAuth();

  // Mientras carga, no mostrar nada
  if (isLoading) {
    return null;
  }

  // Si no esta autenticado
  if (!isAuthenticated) {
    return hideOnDenied ? null : <>{fallback}</>;
  }

  // Verificar rol
  if (allowedRoles) {
    const currentRole = getRole();
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!currentRole || !roles.includes(currentRole)) {
      return hideOnDenied ? null : <>{fallback}</>;
    }
  }

  // Verificar permiso
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return hideOnDenied ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}

// =====================================================
// AdminOnly - Solo para administradores
// =====================================================

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminOnly({ children, fallback }: AdminOnlyProps) {
  return (
    <RoleGate allowedRoles="admin" fallback={fallback} hideOnDenied={!fallback}>
      {children}
    </RoleGate>
  );
}

// =====================================================
// EmployeeOnly - Solo para empleados
// =====================================================

interface EmployeeOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function EmployeeOnly({ children, fallback }: EmployeeOnlyProps) {
  return (
    <RoleGate allowedRoles="empleado" fallback={fallback} hideOnDenied={!fallback}>
      {children}
    </RoleGate>
  );
}

// =====================================================
// FamilyOnly - Solo para familia
// =====================================================

interface FamilyOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FamilyOnly({ children, fallback }: FamilyOnlyProps) {
  return (
    <RoleGate allowedRoles="familia" fallback={fallback} hideOnDenied={!fallback}>
      {children}
    </RoleGate>
  );
}

// =====================================================
// NotEmployee - Para todos excepto empleados
// =====================================================

interface NotEmployeeProps {
  children: React.ReactNode;
}

export function NotEmployee({ children }: NotEmployeeProps) {
  return (
    <RoleGate allowedRoles={['admin', 'familia']} hideOnDenied>
      {children}
    </RoleGate>
  );
}

// =====================================================
// CanManage - Para quienes pueden gestionar
// =====================================================

interface CanManageProps {
  children: React.ReactNode;
  /** Tipo de gestion requerida */
  what: 'employees' | 'spaces' | 'tasks' | 'members' | 'invitations';
  fallback?: React.ReactNode;
}

export function CanManage({ children, what, fallback }: CanManageProps) {
  const permissionMap: Record<string, Permission> = {
    employees: 'manage_employees',
    spaces: 'manage_spaces',
    tasks: 'manage_tasks',
    members: 'manage_members',
    invitations: 'manage_invitations'
  };

  return (
    <RoleGate
      requiredPermission={permissionMap[what]}
      fallback={fallback}
      hideOnDenied={!fallback}
    >
      {children}
    </RoleGate>
  );
}

// =====================================================
// CanEdit - Para quienes pueden editar contenido
// =====================================================

interface CanEditProps {
  children: React.ReactNode;
  /** Tipo de contenido */
  what: 'menu' | 'recipes' | 'shopping_list';
  fallback?: React.ReactNode;
}

export function CanEdit({ children, what, fallback }: CanEditProps) {
  const permissionMap: Record<string, Permission> = {
    menu: 'edit_menu',
    recipes: 'edit_recipes',
    shopping_list: 'edit_shopping_list'
  };

  return (
    <RoleGate
      requiredPermission={permissionMap[what]}
      fallback={fallback}
      hideOnDenied={!fallback}
    >
      {children}
    </RoleGate>
  );
}

// =====================================================
// ShowByRole - Muestra contenido diferente por rol
// =====================================================

interface ShowByRoleProps {
  admin?: React.ReactNode;
  empleado?: React.ReactNode;
  familia?: React.ReactNode;
  default?: React.ReactNode;
}

export function ShowByRole({ admin, empleado, familia, default: defaultContent }: ShowByRoleProps) {
  const { isAuthenticated, getRole, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <>{defaultContent}</>;

  const role = getRole();

  switch (role) {
    case 'admin':
      return <>{admin ?? defaultContent}</>;
    case 'empleado':
      return <>{empleado ?? defaultContent}</>;
    case 'familia':
      return <>{familia ?? defaultContent}</>;
    default:
      return <>{defaultContent}</>;
  }
}

// =====================================================
// RequireAuth - Requiere autenticacion
// =====================================================

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function RequireAuth({ children, fallback, redirectTo = '/auth/login' }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Redirigir
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
    return null;
  }

  return <>{children}</>;
}

// =====================================================
// Hook para verificar roles facilmente
// =====================================================

export function useRoleCheck() {
  const { isAuthenticated, getRole, hasPermission, isAdmin, isEmployee, isFamily } = useAuth();

  return {
    isAuthenticated,
    role: getRole(),
    isAdmin: isAdmin(),
    isEmployee: isEmployee(),
    isFamily: isFamily(),
    hasPermission,
    can: {
      viewMenu: hasPermission('view_menu'),
      viewTasks: hasPermission('view_tasks'),
      viewShoppingList: hasPermission('view_shopping_list'),
      editMenu: hasPermission('edit_menu'),
      editRecipes: hasPermission('edit_recipes'),
      editShoppingList: hasPermission('edit_shopping_list'),
      completeTasks: hasPermission('complete_tasks'),
      manageEmployees: hasPermission('manage_employees'),
      manageSpaces: hasPermission('manage_spaces'),
      manageTasks: hasPermission('manage_tasks'),
      manageMembers: hasPermission('manage_members'),
      manageInvitations: hasPermission('manage_invitations')
    }
  };
}
