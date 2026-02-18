-- =====================================================
-- DAILY COMPLETIONS TABLE
-- Tracks daily task/meal completions by employees (Modo Yolima)
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_completions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES households(id),
  employee_id uuid REFERENCES auth.users(id),
  completion_date date NOT NULL,
  meals_completed jsonb DEFAULT '{}',        -- { breakfast: true, lunch: true, dinner: false }
  tasks_completed text[] DEFAULT '{}',       -- Array of completed task names
  preparations_completed text[] DEFAULT '{}', -- Array of completed preparation names
  photo_urls text[] DEFAULT '{}',            -- Array of uploaded photo URLs
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_daily_completions_date ON daily_completions(completion_date);
CREATE INDEX idx_daily_completions_employee ON daily_completions(employee_id);
CREATE INDEX idx_daily_completions_household ON daily_completions(household_id);

-- RLS
ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;

-- Employees can manage their own completions, admins can see all
CREATE POLICY "Users can manage daily completions"
  ON daily_completions
  FOR ALL
  USING (auth.uid() IS NOT NULL);
