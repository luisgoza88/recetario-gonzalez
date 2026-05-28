-- =====================================================
-- Hardening: fijar search_path en funciones de public (CVE-2018-1058)
-- =====================================================
-- Los advisors de Supabase detectaron 29 funciones con search_path mutable,
-- incluyendo helpers críticas de RLS (is_household_member, has_household_role,
-- check_user_permission, etc.). Sin search_path fijo, un objeto malicioso en
-- otro schema del search_path podría secuestrar la resolución de nombres.
-- Fijar `search_path = public` no cambia comportamiento (toda la app vive en
-- public) y cierra el vector.
-- =====================================================
ALTER FUNCTION public.check_rate_limit(p_key text, p_limit integer, p_window_ms integer) SET search_path = public;
ALTER FUNCTION public.check_user_permission(p_household_id uuid, p_permission text) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_rate_limits() SET search_path = public;
ALTER FUNCTION public.cleanup_old_conversations() SET search_path = public;
ALTER FUNCTION public.complete_ai_audit_log(p_log_id uuid, p_status text, p_result jsonb, p_previous_state jsonb, p_new_state jsonb, p_affected_tables text[], p_affected_record_ids uuid[], p_error_message text) SET search_path = public;
ALTER FUNCTION public.create_ai_audit_log(p_household_id uuid, p_user_id uuid, p_session_id uuid, p_function_name text, p_parameters jsonb, p_risk_level integer) SET search_path = public;
ALTER FUNCTION public.create_ai_proposal(p_household_id uuid, p_user_id uuid, p_session_id uuid, p_summary text, p_risk_level integer, p_actions jsonb) SET search_path = public;
ALTER FUNCTION public.create_default_categories(p_household_id uuid) SET search_path = public;
ALTER FUNCTION public.create_household_ai_trust() SET search_path = public;
ALTER FUNCTION public.create_invitation(p_household_id uuid, p_role text, p_suggested_name text, p_max_uses integer, p_expires_in_days integer) SET search_path = public;
ALTER FUNCTION public.expire_old_proposals() SET search_path = public;
ALTER FUNCTION public.generate_daily_tasks(target_date date) SET search_path = public;
ALTER FUNCTION public.generate_daily_tasks(target_date date, p_household_id uuid) SET search_path = public;
ALTER FUNCTION public.generate_invitation_code() SET search_path = public;
ALTER FUNCTION public.get_current_household_id() SET search_path = public;
ALTER FUNCTION public.get_cycle_week(target_date date) SET search_path = public;
ALTER FUNCTION public.get_function_risk_config(p_function_name text) SET search_path = public;
ALTER FUNCTION public.get_my_memberships() SET search_path = public;
ALTER FUNCTION public.get_user_household_id() SET search_path = public;
ALTER FUNCTION public.has_household_role(p_household_id uuid, p_roles text[]) SET search_path = public;
ALTER FUNCTION public.is_household_member(p_household_id uuid) SET search_path = public;
ALTER FUNCTION public.prevent_legacy_schedule_writes() SET search_path = public;
ALTER FUNCTION public.rollback_ai_action(p_log_id uuid, p_rolled_back_by uuid, p_reason text) SET search_path = public;
ALTER FUNCTION public.update_ai_tables_updated_at() SET search_path = public;
ALTER FUNCTION public.update_employee_scores_updated_at() SET search_path = public;
ALTER FUNCTION public.update_learned_durations_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.use_invitation_code(p_code text) SET search_path = public;
ALTER FUNCTION public.user_has_household_access(check_household_id uuid) SET search_path = public;
