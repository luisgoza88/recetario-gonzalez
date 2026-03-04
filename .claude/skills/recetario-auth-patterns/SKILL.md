---
name: recetario-auth-patterns
description: "Auth multi-tenant: middleware, AuthContext, roles admin/familia/empleado, 16 permisos, RoleGate, invitaciones."
globs:
  - "src/middleware.ts"
  - "src/contexts/AuthContext.tsx"
  - "src/components/auth/**"
  - "src/lib/invitation-service.ts"
---

# Recetario Auth Patterns

## Middleware (`src/middleware.ts`)

```typescript
// Protege SOLO /api/ routes
// Rutas publicas: /auth, /join, /api/validate-invitation
export async function middleware(request: NextRequest) {
  if (isPublicRoute(request.nextUrl.pathname)) return NextResponse.next();

  const supabase = createMiddlewareClient({ req: request });
  const {
    data: { user },
  } = await supabase.auth.getUser(); // MAS SEGURO que getSession()

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Inyectar user ID en headers para API routes
  const response = NextResponse.next();
  response.headers.set("x-user-id", user.id);
  return response;
}
```

## Roles y Permisos

### 3 Roles

| Rol        | Descripcion                               |
| ---------- | ----------------------------------------- |
| `admin`    | Dueno del hogar — control total           |
| `empleado` | Empleado domestico — tareas, check-in     |
| `familia`  | Miembro familiar — menu, recetas, compras |

### 16 Permisos Granulares

```typescript
type Permission =
  // Lectura
  | "view_menu"
  | "view_shopping_list"
  | "view_tasks"
  | "view_inventory"
  // Empleado
  | "complete_tasks"
  | "update_inventory"
  | "check_in"
  // Edicion
  | "edit_menu"
  | "edit_recipes"
  | "edit_shopping_list"
  // Gestion (admin only)
  | "manage_employees"
  | "manage_spaces"
  | "manage_tasks"
  | "manage_members"
  | "manage_invitations"
  | "delete_data";
```

## RoleGate Components (`src/components/auth/RoleGate.tsx`)

```tsx
// Solo admin
<AdminOnly>
  <DangerousButton />
</AdminOnly>

// Verificar permiso especifico
<CanEdit what="recipes">
  <EditRecipeButton />
</CanEdit>

// Contenido por rol
<ShowByRole
  admin={<AdminDashboard />}
  empleado={<EmployeeTasks />}
  familia={<FamilyMenu />}
/>

// Hook para logica
const { can, isAdmin, role } = useRoleCheck();
if (can.manageEmployees) { /* ... */ }
```

## Patron Auth en API Routes

```typescript
export async function POST(request: NextRequest) {
  // 1. Obtener user ID del middleware
  const userId = request.headers.get("x-user-id");
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Crear cliente Supabase con auth
  const supabase = createRouteHandlerClient({ cookies });

  // 3. Verificar permisos si necesario
  const { data: hasPermission } = await supabase.rpc("check_user_permission", {
    p_user_id: userId,
    p_household_id: householdId,
    p_permission: "edit_recipes",
  });
  if (!hasPermission)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 4. Logica del endpoint...
}
```

## Flujo de Invitaciones

1. Admin crea invitacion: `createInvitation(householdId, role)` → codigo `ABCD-1234`
2. Compartir codigo o link `/join?code=ABCD-1234`
3. Invitado va a `/join`, ingresa codigo
4. Si no tiene cuenta → `/auth/register` → vuelve a `/join`
5. `useInvitationCode(code, userId)` → membresia creada

## Problemas Conocidos

1. **Inconsistencia de roles**: AuthContext usa `admin|empleado|familia`, HouseholdStore usa `owner|admin|member|viewer`
2. **console.log** en AuthContext.tsx en produccion
3. Middleware solo protege `/api/` — paginas no verifican auth server-side
4. `/api/daily-completion` NO usa middleware (sin auth)
