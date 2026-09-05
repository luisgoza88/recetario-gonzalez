---
name: rls-security-patterns
description: "RLS (Row-Level Security) en Supabase: anti-patrones que causan recursion infinita o fugas a anon, helpers SECURITY DEFINER seguros (is_household_member, has_household_role), auditoria con anon key. CRITICO antes de tocar cualquier policy."
globs:
  - "supabase/migrations/**/*.sql"
  - "src/**/*RLS*"
  - "src/lib/services/household-service.ts"
---

# Aislamiento y permisos

La identidad proviene de `auth.uid()`; una función SECURITY DEFINER no puede confiar en un `p_user_id` enviado por el cliente. Validar membresía activa, recurso objetivo, permiso y actor. Mantener `search_path` fijo y retirar ejecución a PUBLIC/anon cuando corresponda.

Una membresía en dos hogares no permite enlazar registros de ambos: verificar relaciones de inventario/productos, menú/recetas, tareas/personas/espacios. Las migraciones de septiembre de 2026 agregan controles de relaciones, permisos y ejecución única de propuestas.

Usar las pruebas aisladas `audit-migrations.test.ts` y `household-fetch.test.ts`. `verify:rls` es lectura por defecto y falla si falta configuración; un error de red, una tabla inexistente o HTTP 500 no demuestran aislamiento. Las sondas de escritura solo van a una base aislada configurada expresamente. No confundir pruebas locales con verificación de producción.
