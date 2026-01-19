-- Intelligence System Cache Tables
-- These tables cache learned data for faster access and analytics

-- 1. Learned Task Durations Cache
-- Stores computed average durations for each task to avoid recalculating
CREATE TABLE IF NOT EXISTS learned_task_durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES space_tasks(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  estimated_minutes INT NOT NULL DEFAULT 30,
  learned_minutes INT NOT NULL DEFAULT 30,
  sample_count INT NOT NULL DEFAULT 0,
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')) DEFAULT 'low',
  last_computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint on task + space
  UNIQUE(task_id, space_id)
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
CREATE INDEX IF NOT EXISTS idx_learned_durations_task ON learned_task_durations(task_id);
CREATE INDEX IF NOT EXISTS idx_learned_durations_space ON learned_task_durations(space_id);
CREATE INDEX IF NOT EXISTS idx_employee_scores_employee ON employee_performance_scores(employee_id);
CREATE INDEX IF NOT EXISTS idx_predictions_household ON workload_predictions_log(household_id);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON workload_predictions_log(prediction_date);

-- Enable RLS
ALTER TABLE learned_task_durations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_predictions_log ENABLE ROW LEVEL SECURITY;

-- Permissive policies (adjust based on auth needs)
CREATE POLICY "Allow all operations on learned_task_durations"
  ON learned_task_durations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on employee_performance_scores"
  ON employee_performance_scores FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on workload_predictions_log"
  ON workload_predictions_log FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at on learned_task_durations
CREATE OR REPLACE FUNCTION update_learned_durations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER employee_performance_scores_updated_at
  BEFORE UPDATE ON employee_performance_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_scores_updated_at();

-- Add actual_minutes column to scheduled_tasks if it doesn't exist
-- This is where we store the real time taken to complete a task
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
COMMENT ON TABLE learned_task_durations IS 'Cache of learned task durations computed from historical completion data';
COMMENT ON TABLE employee_performance_scores IS 'Cache of employee performance scores computed from task completion history';
COMMENT ON TABLE workload_predictions_log IS 'Log of workload predictions for tracking and analysis';
