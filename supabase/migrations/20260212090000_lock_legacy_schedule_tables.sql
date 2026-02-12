-- =====================================================
-- FASE 3: Lock legacy schedule tables as read-only
--
-- Goal:
--   Keep historical data queryable while preventing any new writes to
--   deprecated tables that were replaced by the unified schema:
--   - employees            -> home_employees
--   - schedule_templates   -> task_templates
--   - daily_task_instances -> scheduled_tasks
--   - schedule_config      -> task_templates frequency/generation logic
-- =====================================================

-- =====================================================
-- 1) Remove legacy write policies (defense-in-depth with RLS)
-- =====================================================

-- employees
DROP POLICY IF EXISTS "household_admins_insert_employees" ON employees;
DROP POLICY IF EXISTS "household_admins_update_employees" ON employees;
DROP POLICY IF EXISTS "household_admins_delete_employees" ON employees;

-- schedule_templates
DROP POLICY IF EXISTS "household_admins_insert_schedule_templates" ON schedule_templates;
DROP POLICY IF EXISTS "household_admins_update_schedule_templates" ON schedule_templates;
DROP POLICY IF EXISTS "household_admins_delete_schedule_templates" ON schedule_templates;

-- daily_task_instances
DROP POLICY IF EXISTS "household_workers_insert_daily_task_instances" ON daily_task_instances;
DROP POLICY IF EXISTS "household_workers_update_daily_task_instances" ON daily_task_instances;
DROP POLICY IF EXISTS "household_admins_delete_daily_task_instances" ON daily_task_instances;

-- schedule_config
DROP POLICY IF EXISTS "household_admins_insert_schedule_config" ON schedule_config;
DROP POLICY IF EXISTS "household_admins_update_schedule_config" ON schedule_config;
DROP POLICY IF EXISTS "household_admins_delete_schedule_config" ON schedule_config;

-- =====================================================
-- 2) Hard block any writes, including service-role writes
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_legacy_schedule_writes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Table "%" is deprecated and read-only. Use unified schedule tables.',
    TG_TABLE_NAME
    USING
      ERRCODE = '55000',
      DETAIL = 'Legacy schedule system was replaced in migration 20260206000000_unify_employee_task_tables.sql',
      HINT = CASE TG_TABLE_NAME
        WHEN 'employees' THEN 'Write to "home_employees" instead.'
        WHEN 'schedule_templates' THEN 'Write to "task_templates" instead.'
        WHEN 'daily_task_instances' THEN 'Write to "scheduled_tasks" instead.'
        WHEN 'schedule_config' THEN 'Use task_templates frequency + app task generation logic.'
        ELSE 'Use unified schedule tables.'
      END;
END;
$$;

DROP TRIGGER IF EXISTS block_legacy_employees_writes ON employees;
CREATE TRIGGER block_legacy_employees_writes
  BEFORE INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION prevent_legacy_schedule_writes();

DROP TRIGGER IF EXISTS block_legacy_schedule_templates_writes ON schedule_templates;
CREATE TRIGGER block_legacy_schedule_templates_writes
  BEFORE INSERT OR UPDATE OR DELETE ON schedule_templates
  FOR EACH ROW
  EXECUTE FUNCTION prevent_legacy_schedule_writes();

DROP TRIGGER IF EXISTS block_legacy_daily_task_instances_writes ON daily_task_instances;
CREATE TRIGGER block_legacy_daily_task_instances_writes
  BEFORE INSERT OR UPDATE OR DELETE ON daily_task_instances
  FOR EACH ROW
  EXECUTE FUNCTION prevent_legacy_schedule_writes();

DROP TRIGGER IF EXISTS block_legacy_schedule_config_writes ON schedule_config;
CREATE TRIGGER block_legacy_schedule_config_writes
  BEFORE INSERT OR UPDATE OR DELETE ON schedule_config
  FOR EACH ROW
  EXECUTE FUNCTION prevent_legacy_schedule_writes();

COMMENT ON FUNCTION prevent_legacy_schedule_writes() IS
  'Blocks writes to deprecated schedule tables to avoid divergence with unified schema.';
