-- 20260706001000_lockdown_anon_reads.sql
-- P0 SEGURIDAD (fase 2 de 2): revocar LECTURA del rol `anon`.
--
-- Complementa 20260706000000_lockdown_anon_writes. Cierra la fuga de LECTURA:
-- como `anon` (anon key público) se podían leer las 59 tablas, incluyendo
-- ai_conversations (chats de IA del hogar), household_memberships/invitations,
-- user_profiles y subscriptions.
--
-- El app real lee como rol `authenticated` (sesión en cookies) — `authenticated`
-- conserva SELECT en las 59 tablas. Cambios de código que acompañan esta migración:
--   * `/` (page.tsx) ahora redirige a /auth/login si no hay sesión (no consulta como anon).
--   * `/r/[slug]` (share público) migrado a service-role (server-only).
--
-- NOTA DE DESPLIEGUE: aplicar junto con el deploy del código anterior. Sin el
-- código nuevo, un visitante sin sesión en `/` ve la app vacía (sin fuga) en vez
-- del redirect limpio. Los usuarios autenticados no se ven afectados.

revoke select on all tables in schema public from anon;

alter default privileges in schema public revoke select on tables from anon;
