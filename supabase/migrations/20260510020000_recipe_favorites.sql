-- Migration: Sistema de favoritos de recetas
-- Sprint 6 - Usuarios pueden guardar recetas favoritas

CREATE TABLE IF NOT EXISTS recipe_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  recipe_id text NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON recipe_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_household ON recipe_favorites(household_id);

ALTER TABLE recipe_favorites ENABLE ROW LEVEL SECURITY;

-- Politica de lectura: el propio usuario o miembros del hogar
CREATE POLICY "users_view_own_favorites" ON recipe_favorites
  FOR SELECT USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND household_id IN (
      SELECT household_id FROM household_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    ))
  );

-- Politica de escritura: solo el propio usuario
CREATE POLICY "users_manage_own_favorites" ON recipe_favorites
  FOR ALL USING (user_id = auth.uid());
