-- =====================================================
-- Migration: Moods + Region columns para recipes
-- Fecha: 2026-05-09
-- Permite categorizacion para variedad de menu y filtrado
-- =====================================================

-- TASK 1: Agregar columnas a recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS moods text[] DEFAULT '{}';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'medio' CHECK (difficulty IN ('facil', 'medio', 'avanzado'));
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS estimated_cost integer; -- COP
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS calories_per_serving integer;

COMMENT ON COLUMN recipes.moods IS 'Array de moods: nutritivo, saludable, antojo, tradicional, rapido, economico';
COMMENT ON COLUMN recipes.region IS 'Region colombiana: andina, caribe, pacifica, orinoquia, amazonia, insular, internacional';
COMMENT ON COLUMN recipes.difficulty IS 'Nivel: facil, medio, avanzado';

-- TASK 2: Indices GIN para arrays + B-tree para region
CREATE INDEX IF NOT EXISTS idx_recipes_moods ON recipes USING GIN(moods);
CREATE INDEX IF NOT EXISTS idx_recipes_region ON recipes(region);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_calories ON recipes(calories_per_serving);

-- TASK 3: Tabla mood_history para que la IA aprenda patrones del hogar
CREATE TABLE IF NOT EXISTS household_mood_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  recipe_id text REFERENCES recipes(id) ON DELETE CASCADE,
  mood text NOT NULL,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  feedback_score integer CHECK (feedback_score BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mood_history_household ON household_mood_history(household_id);
CREATE INDEX IF NOT EXISTS idx_mood_history_household_mood ON household_mood_history(household_id, mood);
CREATE INDEX IF NOT EXISTS idx_mood_history_household_dow ON household_mood_history(household_id, day_of_week);

ALTER TABLE household_mood_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_mood_history_select" ON household_mood_history
  FOR SELECT USING (is_household_member(household_id));

CREATE POLICY "household_mood_history_insert" ON household_mood_history
  FOR INSERT WITH CHECK (is_household_member(household_id));

-- TASK 4: Tabla recipe_image_cache para evitar regenerar imagenes
CREATE TABLE IF NOT EXISTS recipe_image_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_name_hash text NOT NULL UNIQUE, -- normalizado: lowercase + sin tildes
  recipe_name text NOT NULL,
  image_url text NOT NULL,
  source text NOT NULL CHECK (source IN ('pexels', 'unsplash', 'imagen3', 'manual')),
  attribution text, -- Para Pexels/Unsplash: nombre del autor
  attribution_url text, -- Link al original
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_image_cache_hash ON recipe_image_cache(recipe_name_hash);

ALTER TABLE recipe_image_cache ENABLE ROW LEVEL SECURITY;

-- Lectura publica (las imagenes son recursos compartidos)
CREATE POLICY "recipe_image_cache_select" ON recipe_image_cache
  FOR SELECT USING (true);

-- Solo service_role escribe
CREATE POLICY "recipe_image_cache_insert" ON recipe_image_cache
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "recipe_image_cache_update" ON recipe_image_cache
  FOR UPDATE USING (auth.role() = 'service_role');
