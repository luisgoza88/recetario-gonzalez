-- Employee Space Assignments
-- Allows flexible assignment of employees to spaces regardless of their primary zone
-- An interior employee can be assigned to exterior spaces and vice versa

CREATE TABLE IF NOT EXISTS employee_space_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES home_employees(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  can_substitute BOOLEAN DEFAULT true,
  priority_order INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure unique employee-space combinations
  UNIQUE(employee_id, space_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_space_employee ON employee_space_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_space_space ON employee_space_assignments(space_id);
CREATE INDEX IF NOT EXISTS idx_employee_space_primary ON employee_space_assignments(is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE employee_space_assignments ENABLE ROW LEVEL SECURITY;

-- Permissive policy (adjust based on your auth needs)
CREATE POLICY "Allow all operations on employee_space_assignments"
  ON employee_space_assignments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_employee_space_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_space_assignments_updated_at
  BEFORE UPDATE ON employee_space_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_space_updated_at();

-- Add phone and notes columns to home_employees if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'home_employees' AND column_name = 'phone') THEN
    ALTER TABLE home_employees ADD COLUMN phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'home_employees' AND column_name = 'notes') THEN
    ALTER TABLE home_employees ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Comment on table
COMMENT ON TABLE employee_space_assignments IS 'Flexible assignment of employees to spaces, allowing cross-zone assignments (interior employees can handle exterior spaces and vice versa)';
COMMENT ON COLUMN employee_space_assignments.is_primary IS 'Whether this is the employees primary space';
COMMENT ON COLUMN employee_space_assignments.can_substitute IS 'Whether employee can cover for others in this space';
COMMENT ON COLUMN employee_space_assignments.priority_order IS 'Order of preference when assigning tasks (lower = higher priority)';
