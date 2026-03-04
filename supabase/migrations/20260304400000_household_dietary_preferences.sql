-- Migration: Add dietary preferences to households
-- This stores restrictions, allergies, preferences, and avoided ingredients per household.

ALTER TABLE households ADD COLUMN IF NOT EXISTS dietary_preferences JSONB DEFAULT '{
  "restrictions": [],
  "allergies": [],
  "preferences": [],
  "avoid_ingredients": []
}'::jsonb;

COMMENT ON COLUMN households.dietary_preferences IS 'Preferencias y restricciones dietéticas del hogar';

-- restrictions: "vegetariano", "vegano", "sin-gluten", "sin-lactosa", "halal", "kosher"
-- allergies: "maní", "nueces", "mariscos", "huevos", "soya", "lácteos", "trigo" + custom
-- preferences: "bajo-carbohidrato", "alto-proteina", "bajo-sodio", "bajo-azucar", "keto", "paleo"
-- avoid_ingredients: free text array of specific ingredients to avoid
