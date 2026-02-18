-- Add category and metadata columns to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time integer;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cook_time integer;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS thermomix_compatible boolean DEFAULT false;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_thermomix ON recipes(thermomix_compatible);
CREATE INDEX IF NOT EXISTS idx_recipes_source ON recipes(source);
