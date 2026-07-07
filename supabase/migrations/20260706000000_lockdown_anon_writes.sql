-- 20260706000000_lockdown_anon_writes.sql
-- P0 SEGURIDAD (fase 1 de 2): revocar ESCRITURA del rol `anon`.
--
-- El anon key viaja PÚBLICO en el bundle del browser y las llamadas directas a
-- Supabase (PostgREST) NO pasan por el middleware de Next. El rol `anon` tenía
-- INSERT/UPDATE/DELETE sobre las 59 tablas de `public`, y muchas políticas RLS
-- incluían la rama `auth.uid() IS NULL OR ...` que para anon (uid siempre NULL)
-- es siempre TRUE. Verificado en runtime: como `anon` se podía INSERTAR en `recipes`.
-- Vector de escalada: household_memberships (auto-admin), household_invitations,
-- ai_function_registry (qué ejecuta la IA), household_ai_trust (saltar aprobación).
--
-- El app real NUNCA escribe como anon: el browser client usa sesión en cookies
-- (rol `authenticated`) y las rutas server usan `service_role`. El onboarding
-- (households/spaces/home_employees) corre post-login (authenticated).
--
-- Fase 2 (aparte): revocar tambien SELECT de anon + gate de login en `/` +
-- /r/[slug] a service_role, para cerrar la fuga de LECTURA sin romper el share público.

-- Revocar escritura de anon en todas las tablas/vistas actuales de public.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon;

-- Blindar tablas futuras: anon no recibe escritura por defecto.
alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;

-- No se tocan grants de `authenticated` ni `service_role`.
