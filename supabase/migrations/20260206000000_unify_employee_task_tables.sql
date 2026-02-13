-- ================================================================
-- MIGRATION: Unify duplicate employee and task systems
--
-- BEFORE: Two parallel systems existed:
--   Legacy: employees + schedule_templates + daily_task_instances
--   New:    home_employees + task_templates + scheduled_tasks
--
-- AFTER: Only home_employees + task_templates + scheduled_tasks
--   Legacy tables are preserved but deprecated (no new writes)
-- ================================================================

-- ============================================
-- 1. Ensure task_templates table exists
--    (TypeScript types reference it, but it may not exist as a table)
-- ============================================
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'semanal'
    CHECK (frequency IN ('diaria', 'semanal', 'quincenal', 'mensual', 'trimestral', 'personalizada')),
  frequency_days INTEGER,
  estimated_minutes INTEGER DEFAULT 30,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('alta', 'normal', 'baja')),
  category TEXT,
  assigned_employee_id UUID REFERENCES home_employees(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for task_templates
CREATE INDEX IF NOT EXISTS idx_task_templates_household ON task_templates(household_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_space ON task_templates(space_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_employee ON task_templates(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_active ON task_templates(household_id, is_active);

-- ============================================
-- 2. Ensure scheduled_tasks table exists
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  task_template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES home_employees(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'en_progreso', 'completada', 'omitida')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  actual_minutes INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for scheduled_tasks
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_household ON scheduled_tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_date ON scheduled_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_employee ON scheduled_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status ON scheduled_tasks(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_household_date ON scheduled_tasks(household_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_household_status ON scheduled_tasks(household_id, status);

-- ============================================
-- 3. Add email field to home_employees if missing
--    (Legacy employees table had email, new one didn't)
-- ============================================
ALTER TABLE home_employees ADD COLUMN IF NOT EXISTS email TEXT;

-- ============================================
-- 4. Migrate data from legacy employees → home_employees
--    (Only employees not already in home_employees by name)
-- ============================================
INSERT INTO home_employees (household_id, name, zone, phone, active, work_days, email, created_at)
SELECT
  e.household_id,
  e.name,
  e.zone,
  e.phone,
  e.active,
  CASE
    WHEN e.work_days IS NOT NULL THEN
      ARRAY(SELECT CASE d
        WHEN 1 THEN 'lunes' WHEN 2 THEN 'martes' WHEN 3 THEN 'miércoles'
        WHEN 4 THEN 'jueves' WHEN 5 THEN 'viernes' WHEN 6 THEN 'sábado'
        WHEN 0 THEN 'domingo' ELSE d::TEXT END
      FROM unnest(e.work_days) AS d)
    ELSE ARRAY[]::TEXT[]
  END,
  e.email,
  e.created_at
FROM employees e
WHERE e.household_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM home_employees he
    WHERE he.household_id = e.household_id
      AND LOWER(he.name) = LOWER(e.name)
  );

-- ============================================
-- 5. Migrate schedule_templates → task_templates
--    (Map legacy employee_id to home_employees)
-- ============================================
INSERT INTO task_templates (household_id, name, description, frequency, estimated_minutes, priority, category, assigned_employee_id, is_active, created_at)
SELECT
  st.household_id,
  st.task_name,
  st.task_description,
  'semanal',  -- Legacy used week_number cycle, flatten to weekly
  EXTRACT(EPOCH FROM (st.time_end - st.time_start)) / 60,
  'normal',
  st.category,
  he.id, -- Map to home_employees by name
  true,
  st.created_at
FROM schedule_templates st
LEFT JOIN employees e ON st.employee_id = e.id
LEFT JOIN home_employees he ON he.household_id = st.household_id AND LOWER(he.name) = LOWER(e.name)
WHERE st.household_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM task_templates tt
    WHERE tt.household_id = st.household_id
      AND LOWER(tt.name) = LOWER(st.task_name)
      AND tt.assigned_employee_id = he.id
  );

-- ============================================
-- 6. Migrate daily_task_instances → scheduled_tasks
--    (Map legacy employee_id to home_employees)
-- ============================================
INSERT INTO scheduled_tasks (household_id, employee_id, scheduled_date, status, started_at, completed_at, notes, created_at)
SELECT
  dti.household_id,
  he.id, -- Map to home_employees by name
  dti.date,
  CASE dti.status
    WHEN 'pending' THEN 'pendiente'
    WHEN 'in_progress' THEN 'en_progreso'
    WHEN 'completed' THEN 'completada'
    WHEN 'skipped' THEN 'omitida'
    ELSE 'pendiente'
  END,
  dti.started_at,
  dti.completed_at,
  dti.notes,
  dti.created_at
FROM daily_task_instances dti
LEFT JOIN employees e ON dti.employee_id = e.id
LEFT JOIN home_employees he ON he.household_id = dti.household_id AND LOWER(he.name) = LOWER(e.name)
WHERE dti.household_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM scheduled_tasks st
    WHERE st.household_id = dti.household_id
      AND st.scheduled_date = dti.date
      AND st.employee_id = he.id
      AND st.created_at = dti.created_at
  );

-- ============================================
-- 7. RLS Policies for task_templates
-- ============================================
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_templates_select" ON task_templates;
CREATE POLICY "task_templates_select" ON task_templates
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_memberships WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "task_templates_insert" ON task_templates;
CREATE POLICY "task_templates_insert" ON task_templates
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_memberships WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "task_templates_update" ON task_templates;
CREATE POLICY "task_templates_update" ON task_templates
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM household_memberships WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "task_templates_delete" ON task_templates;
CREATE POLICY "task_templates_delete" ON task_templates
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM household_memberships
      WHERE user_id = auth.uid() AND is_active = true AND role = 'admin'
    )
    OR
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.owner_id = auth.uid())
  );

-- Service role bypass for task_templates
DROP POLICY IF EXISTS "task_templates_service_role" ON task_templates;
CREATE POLICY "task_templates_service_role" ON task_templates
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 8. RLS Policies for scheduled_tasks (if missing)
-- ============================================
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scheduled_tasks_service_role" ON scheduled_tasks;
CREATE POLICY "scheduled_tasks_service_role" ON scheduled_tasks
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "scheduled_tasks_select" ON scheduled_tasks;
CREATE POLICY "scheduled_tasks_select" ON scheduled_tasks
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_memberships WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "scheduled_tasks_insert" ON scheduled_tasks;
CREATE POLICY "scheduled_tasks_insert" ON scheduled_tasks
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_memberships WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "scheduled_tasks_update" ON scheduled_tasks;
CREATE POLICY "scheduled_tasks_update" ON scheduled_tasks
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM household_memberships WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "scheduled_tasks_delete" ON scheduled_tasks;
CREATE POLICY "scheduled_tasks_delete" ON scheduled_tasks
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM household_memberships
      WHERE user_id = auth.uid() AND is_active = true AND role = 'admin'
    )
    OR
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.owner_id = auth.uid())
  );

-- ============================================
-- 9. Add comments marking legacy tables as deprecated
-- ============================================
COMMENT ON TABLE employees IS 'DEPRECATED: Use home_employees instead. Kept for historical data.';
COMMENT ON TABLE schedule_templates IS 'DEPRECATED: Use task_templates instead. Kept for historical data.';
COMMENT ON TABLE daily_task_instances IS 'DEPRECATED: Use scheduled_tasks instead. Kept for historical data.';

-- ============================================
-- 10. Updated auto-timestamp trigger for new tables
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_templates_updated_at ON task_templates;
CREATE TRIGGER task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
