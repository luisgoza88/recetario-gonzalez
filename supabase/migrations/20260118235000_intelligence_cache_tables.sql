-- Intelligence System Cache Tables
-- These tables cache learned data for faster access and analytics
--
-- NOTA (Mayo 2026): esta migracion fue reescrita para usar los nombres
-- correctos de tablas en produccion. Las queries originales referenciaban
-- `space_tasks` y `schedule_tasks` que NO existen — los nombres correctos
-- son `task_templates` y `scheduled_tasks`.

-- 1. Learned Task Durations Cache
-- Stores computed average durations for each task to avoid recalculating
CREATE TABLE IF NOT EXISTS learned_task_durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  estimated_minutes INT NOT NULL DEFAULT 30,
  learned_minutes INT NOT NULL DEFAULT 30,
  sample_count INT NOT NULL DEFAULT 0,
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')) DEFAULT 'low',
  last_computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint on task + space
  UNIQUE(task_template_id, space_id)
);

-- 2. Employee Performance Scores Cache
-- Stores computed performance scores to avoid recalculating
CREATE TABLE IF NOT EXISTS employee_performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES home_employees(id) ON DELETE CASCADE,
  overall_score INT NOT NULL DEFAULT 50 CHECK (overall_score >= 0 AND overall_score <= 100),
  avg_rating DECIMAL(3,2) DEFAULT 0,
  speed_score INT DEFAULT 50 CHECK (speed_score >= 0 AND speed_score <= 100),
  reliability_score INT DEFAULT 50 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  consistency_score INT DEFAULT 50 CHECK (consistency_score >= 0 AND consistency_score <= 100),
  total_tasks_completed INT DEFAULT 0,
  total_minutes_worked INT DEFAULT 0,
  last_computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One score record per employee
  UNIQUE(employee_id)
);

-- 3. Workload Predictions Log
-- Stores historical predictions for analysis
CREATE TABLE IF NOT EXISTS workload_predictions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('overload', 'underload', 'imbalance', 'bottleneck')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  affected_employee_id UUID REFERENCES home_employees(id) ON DELETE SET NULL,
  suggested_action TEXT,
  was_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_learned_durations_task ON learned_task_durations(task_template_id);
CREATE INDEX IF NOT EXISTS idx_learned_durations_space ON learned_task_durations(space_id);
CREATE INDEX IF NOT EXISTS idx_employee_scores_employee ON employee_performance_scores(employee_id);
CREATE INDEX IF NOT EXISTS idx_predictions_household ON workload_predictions_log(household_id);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON workload_predictions_log(prediction_date);

-- Enable RLS
ALTER TABLE learned_task_durations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_predictions_log ENABLE ROW LEVEL SECURITY;

-- Policies basadas en household membership (siguiendo el skill rls-security-patterns).
-- Para learned_task_durations: el acceso depende del household del space.
DROP POLICY IF EXISTS "household_member_read_learned_durations" ON learned_task_durations;
CREATE POLICY "household_member_read_learned_durations"
  ON learned_task_durations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = learned_task_durations.space_id
        AND is_household_member(s.household_id)
    )
  );

DROP POLICY IF EXISTS "household_member_write_learned_durations" ON learned_task_durations;
CREATE POLICY "household_member_write_learned_durations"
  ON learned_task_durations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = learned_task_durations.space_id
        AND is_household_member(s.household_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = learned_task_durations.space_id
        AND is_household_member(s.household_id)
    )
  );

-- Para employee_performance_scores: acceso depende del household del empleado.
DROP POLICY IF EXISTS "household_member_read_employee_scores" ON employee_performance_scores;
CREATE POLICY "household_member_read_employee_scores"
  ON employee_performance_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM home_employees e
      WHERE e.id = employee_performance_scores.employee_id
        AND is_household_member(e.household_id)
    )
  );

DROP POLICY IF EXISTS "household_member_write_employee_scores" ON employee_performance_scores;
CREATE POLICY "household_member_write_employee_scores"
  ON employee_performance_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM home_employees e
      WHERE e.id = employee_performance_scores.employee_id
        AND is_household_member(e.household_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM home_employees e
      WHERE e.id = employee_performance_scores.employee_id
        AND is_household_member(e.household_id)
    )
  );

-- Para workload_predictions_log: acceso directo via household_id.
DROP POLICY IF EXISTS "household_member_read_predictions" ON workload_predictions_log;
CREATE POLICY "household_member_read_predictions"
  ON workload_predictions_log FOR SELECT
  USING (is_household_member(household_id));

DROP POLICY IF EXISTS "household_member_write_predictions" ON workload_predictions_log;
CREATE POLICY "household_member_write_predictions"
  ON workload_predictions_log FOR ALL
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- Trigger for updated_at on learned_task_durations
CREATE OR REPLACE FUNCTION update_learned_durations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS learned_task_durations_updated_at ON learned_task_durations;
CREATE TRIGGER learned_task_durations_updated_at
  BEFORE UPDATE ON learned_task_durations
  FOR EACH ROW
  EXECUTE FUNCTION update_learned_durations_updated_at();

-- Trigger for updated_at on employee_performance_scores
CREATE OR REPLACE FUNCTION update_employee_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employee_performance_scores_updated_at ON employee_performance_scores;
CREATE TRIGGER employee_performance_scores_updated_at
  BEFORE UPDATE ON employee_performance_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_scores_updated_at();

-- Add actual_minutes y rating a scheduled_tasks si faltan
-- (Necesarios para calcular learned durations y performance scores)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_tasks' AND column_name = 'actual_minutes') THEN
    ALTER TABLE scheduled_tasks ADD COLUMN actual_minutes INT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_tasks' AND column_name = 'rating') THEN
    ALTER TABLE scheduled_tasks ADD COLUMN rating INT CHECK (rating >= 1 AND rating <= 5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_tasks' AND column_name = 'completed_at') THEN
    ALTER TABLE scheduled_tasks ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Comments
COMMENT ON TABLE learned_task_durations IS 'Cache of learned task durations computed from historical completion data. References task_templates (not space_tasks).';
COMMENT ON TABLE employee_performance_scores IS 'Cache of employee performance scores computed from task completion history';
COMMENT ON TABLE workload_predictions_log IS 'Log of workload predictions for tracking and analysis';
