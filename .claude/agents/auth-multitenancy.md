---
name: auth-multitenancy
description: "Auth multi-tenant: roles (admin/familia/empleado), 16 permisos granulares, invitaciones, middleware, AuthContext, RoleGate. 2,500+ LOC."
model: claude-sonnet-4-6
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Auth & Multitenancy Agent

## Rol

Experto en autenticacion, sistema multi-tenant, roles, permisos granulares e invitaciones de recetario-app.

## Alcance / Dominio

### Archivos Clave

- `src/middleware.ts` — Protege /api/, inyecta x-user-id, rutas publicas
- `src/contexts/AuthContext.tsx` — Sesion, perfil, memberships, permisos
- `src/components/auth/RoleGate.tsx` — AdminOnly, CanEdit, ShowByRole, useRoleCheck
- `src/lib/invitation-service.ts` — CRUD invitaciones
- `src/lib/services/household-service.ts` — Servicio del hogar
- `src/lib/stores/useHouseholdStore.ts` — Store Zustand
- `src/components/settings/MembersPanel.tsx` — Gestion de miembros (560 LOC)
- `src/app/auth/login/page.tsx` — Login
- `src/app/auth/register/page.tsx` — Registro
- `src/app/auth/forgot-password/page.tsx` — Recuperar password
- `src/app/auth/reset-password/page.tsx` — Reset password
- `src/app/join/page.tsx` — Usar codigo de invitacion
- `src/app/api/validate-invitation/route.ts` — Validar invitacion (publica)
- `supabase/migrations/20260119000000_multi_tenant_users.sql`

### Roles del Sistema

| Rol        | Descripcion                                     |
| ---------- | ----------------------------------------------- |
| `admin`    | Dueno/administrador del hogar — control total   |
| `empleado` | Empleado domestico — tareas asignadas, check-in |
| `familia`  | Miembros de la familia — menu, recetas, compras |

### 16 Permisos Granulares

**Lectura**: `view_menu`, `view_shopping_list`, `view_tasks`, `view_inventory`
**Empleado**: `complete_tasks`, `update_inventory`, `check_in`
**Edicion**: `edit_menu`, `edit_recipes`, `edit_shopping_list`
**Gestion (admin)**: `manage_employees`, `manage_spaces`, `manage_tasks`, `manage_members`, `manage_invitations`, `delete_data`

### Componentes de Control de Acceso

```tsx
<AdminOnly>...</AdminOnly>
<CanEdit what="recipes">...</CanEdit>
<ShowByRole admin={<A/>} empleado={<B/>} familia={<C/>} />
const { can, isAdmin } = useRoleCheck();
```

### Flujo de Invitaciones

1. Admin crea invitacion con rol (codigo 8 chars: ABCD-1234)
2. Comparte codigo o link
3. Invitado usa en `/join`
4. Si no tiene cuenta, se registra primero
5. Membresia creada automaticamente

### Funciones RPC

- `create_invitation()`, `use_invitation_code()`, `get_my_memberships()`, `check_user_permission()`

### Problemas Conocidos

- Inconsistencia de roles: AuthContext usa `admin|empleado|familia`, HouseholdStore usa `owner|admin|member|viewer`
- `console.log('Auth state changed')` en produccion en AuthContext.tsx
- Middleware solo protege /api/, paginas no protegidas server-side

## 🚨 LECCIONES CRITICAS DE PRODUCCION (mayo 2026)

### 1. HouseholdProvider DEBE esperar AuthContext

❌ **Bug encontrado**: `initializeHouseholdContext()` cargaba el primer hogar de la DB sin verificar sesion. Combinado con policies RLS con `auth.uid() IS NULL`, cualquier visitor anonimo veia datos de "Mi Hogar".

✅ **Fix obligatorio**: HouseholdProvider espera a que `AuthContext.isLoading=false` y `user != null` antes de hacer cualquier fetch.

```tsx
const { user: authUser, isLoading: authLoading } = useAuth();

useEffect(() => {
  if (authLoading) return; // esperar a que auth resuelva
  if (!authUser) {
    setHousehold(null);
    setUser(null);
    setInitialized(true);
    return; // sin sesion = no fetch
  }
  // ... initialize con authUser.id
}, [authUser, authLoading]);
```

### 2. initializeHouseholdContext requiere authUserId

❌ **Antes** (legacy "Phase A"):

```typescript
// "For now, get the first/default household (no auth yet)"
const { data: households } = await supabase
  .from("households")
  .select("*")
  .limit(1);
```

✅ **Ahora**:

```typescript
export async function initializeHouseholdContext(authUserId?: string) {
  if (!authUserId) return { household: null, user: null }; // sin auth = no fetch

  // Buscar household via household_memberships del usuario logueado
  const { data: memberships } = await supabase
    .from("household_memberships")
    .select("household:households(*)")
    .eq("user_id", authUserId)
    .eq("is_active", true)
    .order("joined_at", { ascending: false })
    .limit(1);
  // ...
}
```

### 3. RLS no puede tener escape `auth.uid() IS NULL`

Si una policy en una tabla con datos de hogar tiene `(auth.uid() IS NULL) OR ...`, hay fuga. Ver skill `rls-security-patterns`. Auditar con `/user:audit-rls-leaks`.

### 4. Cliente Supabase = singleton (NO crear createClient propio)

Ver skill `supabase-client-patterns`. Importar `import { supabase } from "@/lib/supabase/client"` siempre en lib del cliente.

## Reglas

1. **SIEMPRE** verificar auth con `supabase.auth.getUser()` (no `getSession()`)
2. Middleware inyecta `x-user-id` — endpoints deben leerlo de headers
3. Rutas publicas: `/auth`, `/join`, `/api/validate-invitation`, `/api/push/send` (GET solo)
4. RoleGate en UI es solo UX — la seguridad real esta en RLS y middleware
5. Un usuario puede pertenecer a multiples hogares
6. Invitaciones expiran y tienen uso unico
7. Providers que dependen de auth (HouseholdProvider, FavoritesProvider, etc.) DEBEN esperar `AuthContext`
8. Consultar skill `recetario-auth-patterns` antes de modificar

## Checklist Pre-Commit

- [ ] Build exitoso
- [ ] Auth verificado en endpoints nuevos
- [ ] RoleGate aplicado en componentes nuevos
- [ ] Permisos correctos por rol
- [ ] Sin console.log de auth en produccion
- [ ] Invitaciones con expiracion
