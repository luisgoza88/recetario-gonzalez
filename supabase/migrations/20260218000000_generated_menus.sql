-- =====================================================
-- GENERATED MENUS TABLE
-- Stores AI-generated weekly menus for households
-- =====================================================

CREATE TABLE IF NOT EXISTS generated_menus (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES households(id),
  week_start_date date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'archived')),
  menu_data jsonb NOT NULL, -- Array of { dayNumber, dayName, date, meals: { breakfast, lunch, dinner } }
  generated_by text DEFAULT 'ai',
  approved_at timestamptz,
  approved_by uuid,
  feedback_summary jsonb, -- Summary of feedback for the week
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_generated_menus_household ON generated_menus(household_id);
CREATE INDEX idx_generated_menus_week ON generated_menus(week_start_date);
CREATE INDEX idx_generated_menus_status ON generated_menus(status);

-- RLS
ALTER TABLE generated_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their household menus"
  ON generated_menus
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- MEAL FEEDBACK ENHANCEMENTS
-- Add star_rating and would_repeat columns
-- =====================================================

-- Add star rating (1-5) to meal_feedback if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_feedback' AND column_name = 'star_rating'
  ) THEN
    ALTER TABLE meal_feedback ADD COLUMN star_rating integer CHECK (star_rating >= 1 AND star_rating <= 5);
  END IF;
END $$;

-- Add would_repeat boolean to meal_feedback if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_feedback' AND column_name = 'would_repeat'
  ) THEN
    ALTER TABLE meal_feedback ADD COLUMN would_repeat boolean;
  END IF;
END $$;

-- Add source column to meal_feedback to track if it's from generated menu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_feedback' AND column_name = 'source'
  ) THEN
    ALTER TABLE meal_feedback ADD COLUMN source text DEFAULT 'static' CHECK (source IN ('static', 'generated'));
  END IF;
END $$;
