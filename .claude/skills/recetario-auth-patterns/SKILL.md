---
name: recetario-auth-patterns
description: "Auth multi-tenant: middleware, AuthContext, roles admin/familia/empleado, 16 permisos, RoleGate, invitaciones."
globs:
  - "src/middleware.ts"
  - "src/contexts/AuthContext.tsx"
  - "src/components/auth/**"
  - "src/lib/invitation-service.ts"
---

# Autenticación del recetario

La sesión usa cookies de `@supabase/ssr`. `src/proxy.ts` verifica `auth.getUser()` y sobrescribe `x-user-id` en los encabezados de la **solicitud**, no de la respuesta. `requireAuth` solo se usa en APIs protegidas por ese proxy.

Para datos del hogar, usar `createHouseholdClient()` de `src/lib/supabase/server.ts`; valida la membresía activa y limita las consultas al hogar seleccionado. El navegador usa el cliente de `src/lib/supabase/client.ts`. `household-fetch.ts` delimita datos; RLS y las restricciones de la base siguen siendo la autorización efectiva.

`AuthContext` selecciona hogares y `HouseholdProvider` sincroniza el estado. Mantener claves de consulta y almacenamiento separadas por sesión/hogar. Roles: admin, familia, empleado. Consultar `check_user_permission` y los componentes RoleGate; una pantalla oculta no autoriza un endpoint.

Los enlaces de login/registro preservan `redirect` con `safeRedirect`. La confirmación intercambia el código en `/auth/callback`. Las invitaciones usan `/join?code=...` y deben validar una vez sin reiniciar el efecto por cambios de estado.
