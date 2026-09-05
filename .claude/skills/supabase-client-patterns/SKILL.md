---
name: supabase-client-patterns
description: "Supabase clients en recetario-app: cuando usar createBrowserClient (cookies) vs createClient (localStorage) vs createServerClient. Singleton pattern para evitar Multiple GoTrueClient warnings y race conditions de auth. .single() vs .maybeSingle() decision tree. Trim defensivo en env vars."
globs:
  - "src/lib/supabase/**"
  - "src/contexts/AuthContext.tsx"
  - "src/lib/**/*-service.ts"
  - "src/lib/**/*-learning.ts"
  - "src/lib/menu-tasks-integration.ts"
---

# Clientes Supabase

- Datos domésticos en servidor: `createHouseholdClient()` en `src/lib/supabase/server.ts`.
- Identidad/membresías: `createAuthenticatedClient()` con cookies; no mezclar todas las membresías para elegir un hogar.
- Navegador: cliente único `src/lib/supabase/client.ts`, que mantiene cookies SSR y contexto de hogar.
- Service role: solo operaciones administrativas justificadas en servidor; nunca como solución a un error RLS. Compartir público lee exclusivamente un token activo de `recipe_shares`, sin buscar nombres en recetas privadas.

Revisar `{ data, error }` de cada consulta o usar `.throwOnError()`. No mostrar éxito cuando falla una escritura. En upserts, verificar la clave real (por ejemplo `item_id`) y la pertenencia de las relaciones. `household-fetch.ts` agrega el hogar al transporte, pero no sustituye RLS, permisos ni las restricciones SQL.

Tipos en `src/types/database.types.ts`; cambios persistentes mediante migraciones nuevas y pruebas. Nunca imprimir claves del entorno.
