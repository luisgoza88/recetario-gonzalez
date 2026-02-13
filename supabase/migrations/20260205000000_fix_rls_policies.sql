-- =====================================================
-- FASE 1A: Corregir políticas RLS permisivas
-- Reemplazar FOR ALL USING (true) con políticas
-- basadas en household_memberships
-- =====================================================

-- Helper function: check if user is a member of a household
CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_memberships
    WHERE user_id = auth.uid()
      AND household_id = p_household_id
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user has a specific role in a household
CREATE OR REPLACE FUNCTION public.has_household_role(p_household_id UUID, p_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_memberships
    WHERE user_id = auth.uid()
      AND household_id = p_household_id
      AND is_active = true
      AND role::text = ANY(p_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- =====================================================
-- 1. employee_checkins (has household_id)
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on employee_checkins" ON employee_checkins;

CREATE POLICY "household_members_select_employee_checkins"
  ON employee_checkins FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "household_workers_insert_employee_checkins"
  ON employee_checkins FOR INSERT
  WITH CHECK (has_household_role(household_id, ARRAY['admin', 'empleado']));

CREATE POLICY "household_workers_update_employee_checkins"
  ON employee_checkins FOR UPDATE
  USING (has_household_role(household_id, ARRAY['admin', 'empleado']));

CREATE POLICY "household_admins_delete_employee_checkins"
  ON employee_checkins FOR DELETE
  USING (has_household_role(household_id, ARRAY['admin']));


-- =====================================================
-- 2. cleaning_history (has household_id)
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on cleaning_history" ON cleaning_history;

CREATE POLICY "household_members_select_cleaning_history"
  ON cleaning_history FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "household_workers_insert_cleaning_history"
  ON cleaning_history FOR INSERT
  WITH CHECK (has_household_role(household_id, ARRAY['admin', 'empleado']));

CREATE POLICY "household_workers_update_cleaning_history"
  ON cleaning_history FOR UPDATE
  USING (has_household_role(household_id, ARRAY['admin', 'empleado']));

CREATE POLICY "household_admins_delete_cleaning_history"
  ON cleaning_history FOR DELETE
  USING (has_household_role(household_id, ARRAY['admin']));


-- =====================================================
-- 3. cleaning_ratings (has household_id)
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on cleaning_ratings" ON cleaning_ratings;

CREATE POLICY "household_members_select_cleaning_ratings"
  ON cleaning_ratings FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "household_members_insert_cleaning_ratings"
  ON cleaning_ratings FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "household_members_update_cleaning_ratings"
  ON cleaning_ratings FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "household_admins_delete_cleaning_ratings"
  ON cleaning_ratings FOR DELETE
  USING (has_household_role(household_id, ARRAY['admin']));


-- =====================================================
-- 4. cleaning_supplies (has household_id)
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on cleaning_supplies" ON cleaning_supplies;

CREATE POLICY "household_members_select_cleaning_supplies"
  ON cleaning_supplies FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "household_workers_insert_cleaning_supplies"
  ON cleaning_supplies FOR INSERT
  WITH CHECK (has_household_role(household_id, ARRAY['admin', 'empleado']));

CREATE POLICY "household_workers_update_cleaning_supplies"
  ON cleaning_supplies FOR UPDATE
  USING (has_household_role(household_id, ARRAY['admin', 'empleado']));

CREATE POLICY "household_admins_delete_cleaning_supplies"
  ON cleaning_supplies FOR DELETE
  USING (has_household_role(household_id, ARRAY['admin']));


-- =====================================================
-- 5. inspection_reports (has household_id)
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on inspection_reports" ON inspection_reports;

CREATE POLICY "household_members_select_inspection_reports"
  ON inspection_reports FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "household_workers_insert_inspection_reports"
  ON inspection_reports FOR INSERT
  WITH CHECK (has_household_role(household_id, ARRAY['admin', 'empleado']));

CREATE POLICY "household_workers_update_inspection_reports"
  ON inspection_reports FOR UPDATE
  USING (has_household_role(household_id, ARRAY['admin', 'empleado']));

CREATE POLICY "household_admins_delete_inspection_reports"
  ON inspection_reports FOR DELETE
  USING (has_household_role(household_id, ARRAY['admin']));


-- =====================================================
-- 6. quick_routine_logs (has household_id)
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on quick_routine_logs" ON quick_routine_logs;

CREATE POLICY "household_members_select_quick_routine_logs"
  ON quick_routine_logs FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "household_workers_insert_quick_routine_logs"
  ON quick_routine_logs FOR INSERT
  WITH CHECK (has_household_role(household_id, ARRAY['admin', 'empleado']));

CREATE POLICY "household_workers_update_quick_routine_logs"
  ON quick_routine_logs FOR UPDATE
  USING (has_household_role(household_id, ARRAY['admin', 'empleado']));

CREATE POLICY "household_admins_delete_quick_routine_logs"
  ON quick_routine_logs FOR DELETE
  USING (has_household_role(household_id, ARRAY['admin']));


-- =====================================================
-- 7. employees (NO household_id — legacy table)
-- Add household_id column, then apply RLS
-- =====================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);

DROP POLICY IF EXISTS "Allow all on employees" ON employees;

-- Employees without household_id are accessible to all authenticated users (legacy data)
-- Employees with household_id are scoped to household members
CREATE POLICY "household_members_select_employees"
  ON employees FOR SELECT
  USING (
    household_id IS NULL
    OR is_household_member(household_id)
  );

CREATE POLICY "household_admins_insert_employees"
  ON employees FOR INSERT
  WITH CHECK (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin'])
  );

CREATE POLICY "household_admins_update_employees"
  ON employees FOR UPDATE
  USING (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin'])
  );

CREATE POLICY "household_admins_delete_employees"
  ON employees FOR DELETE
  USING (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin'])
  );


-- =====================================================
-- 8. schedule_templates (household_id added by migration 20260118210000)
-- =====================================================
DROP POLICY IF EXISTS "Allow all on schedule_templates" ON schedule_templates;

CREATE POLICY "household_members_select_schedule_templates"
  ON schedule_templates FOR SELECT
  USING (
    household_id IS NULL
    OR is_household_member(household_id)
  );

CREATE POLICY "household_admins_insert_schedule_templates"
  ON schedule_templates FOR INSERT
  WITH CHECK (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin'])
  );

CREATE POLICY "household_admins_update_schedule_templates"
  ON schedule_templates FOR UPDATE
  USING (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin'])
  );

CREATE POLICY "household_admins_delete_schedule_templates"
  ON schedule_templates FOR DELETE
  USING (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin'])
  );


-- =====================================================
-- 9. daily_task_instances (household_id added by migration 20260118210000)
-- =====================================================
DROP POLICY IF EXISTS "Allow all on daily_task_instances" ON daily_task_instances;

CREATE POLICY "household_members_select_daily_task_instances"
  ON daily_task_instances FOR SELECT
  USING (
    household_id IS NULL
    OR is_household_member(household_id)
  );

CREATE POLICY "household_workers_insert_daily_task_instances"
  ON daily_task_instances FOR INSERT
  WITH CHECK (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin', 'empleado'])
  );

CREATE POLICY "household_workers_update_daily_task_instances"
  ON daily_task_instances FOR UPDATE
  USING (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin', 'empleado'])
  );

CREATE POLICY "household_admins_delete_daily_task_instances"
  ON daily_task_instances FOR DELETE
  USING (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin'])
  );


-- =====================================================
-- 10. schedule_config (household_id added by migration 20260118210000)
-- =====================================================
DROP POLICY IF EXISTS "Allow all on schedule_config" ON schedule_config;

CREATE POLICY "household_members_select_schedule_config"
  ON schedule_config FOR SELECT
  USING (
    household_id IS NULL
    OR is_household_member(household_id)
  );

CREATE POLICY "household_admins_insert_schedule_config"
  ON schedule_config FOR INSERT
  WITH CHECK (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin'])
  );

CREATE POLICY "household_admins_update_schedule_config"
  ON schedule_config FOR UPDATE
  USING (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin'])
  );

CREATE POLICY "household_admins_delete_schedule_config"
  ON schedule_config FOR DELETE
  USING (
    household_id IS NULL
    OR has_household_role(household_id, ARRAY['admin'])
  );


-- =====================================================
-- 11. task_categories (has household_id)
-- =====================================================
DROP POLICY IF EXISTS "Allow all on task_categories" ON task_categories;

CREATE POLICY "household_members_select_task_categories"
  ON task_categories FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "household_admins_insert_task_categories"
  ON task_categories FOR INSERT
  WITH CHECK (has_household_role(household_id, ARRAY['admin']));

CREATE POLICY "household_admins_update_task_categories"
  ON task_categories FOR UPDATE
  USING (has_household_role(household_id, ARRAY['admin']));

CREATE POLICY "household_admins_delete_task_categories"
  ON task_categories FOR DELETE
  USING (has_household_role(household_id, ARRAY['admin']));


-- =====================================================
-- 12. employee_space_assignments (NO household_id)
-- Join through home_employees → spaces → household
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on employee_space_assignments" ON employee_space_assignments;

-- Access scoped through the employee's household
CREATE POLICY "household_members_select_employee_space_assignments"
  ON employee_space_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM home_employees he
      WHERE he.id = employee_space_assignments.employee_id
        AND is_household_member(he.household_id)
    )
  );

CREATE POLICY "household_admins_insert_employee_space_assignments"
  ON employee_space_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM home_employees he
      WHERE he.id = employee_space_assignments.employee_id
        AND has_household_role(he.household_id, ARRAY['admin'])
    )
  );

CREATE POLICY "household_admins_update_employee_space_assignments"
  ON employee_space_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM home_employees he
      WHERE he.id = employee_space_assignments.employee_id
        AND has_household_role(he.household_id, ARRAY['admin'])
    )
  );

CREATE POLICY "household_admins_delete_employee_space_assignments"
  ON employee_space_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM home_employees he
      WHERE he.id = employee_space_assignments.employee_id
        AND has_household_role(he.household_id, ARRAY['admin'])
    )
  );


-- =====================================================
-- 13. learned_task_durations (NO household_id)
-- Join through spaces → household
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on learned_task_durations" ON learned_task_durations;

CREATE POLICY "household_members_select_learned_task_durations"
  ON learned_task_durations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = learned_task_durations.space_id
        AND is_household_member(s.household_id)
    )
  );

CREATE POLICY "household_workers_insert_learned_task_durations"
  ON learned_task_durations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = learned_task_durations.space_id
        AND has_household_role(s.household_id, ARRAY['admin', 'empleado'])
    )
  );

CREATE POLICY "household_workers_update_learned_task_durations"
  ON learned_task_durations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = learned_task_durations.space_id
        AND has_household_role(s.household_id, ARRAY['admin', 'empleado'])
    )
  );

CREATE POLICY "household_admins_delete_learned_task_durations"
  ON learned_task_durations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = learned_task_durations.space_id
        AND has_household_role(s.household_id, ARRAY['admin'])
    )
  );


-- =====================================================
-- 14. employee_performance_scores (NO household_id)
-- Join through home_employees → household
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on employee_performance_scores" ON employee_performance_scores;

CREATE POLICY "household_members_select_employee_performance_scores"
  ON employee_performance_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM home_employees he
      WHERE he.id = employee_performance_scores.employee_id
        AND is_household_member(he.household_id)
    )
  );

CREATE POLICY "household_workers_insert_employee_performance_scores"
  ON employee_performance_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM home_employees he
      WHERE he.id = employee_performance_scores.employee_id
        AND has_household_role(he.household_id, ARRAY['admin', 'empleado'])
    )
  );

CREATE POLICY "household_workers_update_employee_performance_scores"
  ON employee_performance_scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM home_employees he
      WHERE he.id = employee_performance_scores.employee_id
        AND has_household_role(he.household_id, ARRAY['admin', 'empleado'])
    )
  );

CREATE POLICY "household_admins_delete_employee_performance_scores"
  ON employee_performance_scores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM home_employees he
      WHERE he.id = employee_performance_scores.employee_id
        AND has_household_role(he.household_id, ARRAY['admin'])
    )
  );


-- =====================================================
-- 15. workload_predictions_log (has household_id)
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on workload_predictions_log" ON workload_predictions_log;

CREATE POLICY "household_members_select_workload_predictions_log"
  ON workload_predictions_log FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "system_insert_workload_predictions_log"
  ON workload_predictions_log FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "household_admins_update_workload_predictions_log"
  ON workload_predictions_log FOR UPDATE
  USING (has_household_role(household_id, ARRAY['admin']));

CREATE POLICY "household_admins_delete_workload_predictions_log"
  ON workload_predictions_log FOR DELETE
  USING (has_household_role(household_id, ARRAY['admin']));


-- =====================================================
-- 16. recipes (4 permissive policies from migration 20260119100000)
-- Recipes are shared data — authenticated users can read,
-- household members can create/edit, admins can delete
-- =====================================================
DROP POLICY IF EXISTS "Allow insert on recipes" ON recipes;
DROP POLICY IF EXISTS "Allow select on recipes" ON recipes;
DROP POLICY IF EXISTS "Allow update on recipes" ON recipes;
DROP POLICY IF EXISTS "Allow delete on recipes" ON recipes;

-- Any authenticated user can view recipes
CREATE POLICY "authenticated_select_recipes"
  ON recipes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Any authenticated user with at least one household membership can insert
CREATE POLICY "members_insert_recipes"
  ON recipes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin', 'familia')
    )
  );

-- Any authenticated user with at least one household membership can update
CREATE POLICY "members_update_recipes"
  ON recipes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin', 'familia')
    )
  );

-- Only admins can delete recipes
CREATE POLICY "admins_delete_recipes"
  ON recipes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role = 'admin'
    )
  );


-- =====================================================
-- Index for RLS performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_household_memberships_rls
  ON household_memberships(user_id, household_id, is_active);
