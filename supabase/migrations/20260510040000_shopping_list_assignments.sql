-- Agregar campo "assigned_to" a items de shopping_list
-- shopping_lists.items es jsonb. Mantenemos compatibilidad agregando assigned_to en cada item.

-- Crear tabla auxiliar para tracking
CREATE TABLE IF NOT EXISTS shopping_list_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shopping_list_id uuid NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE (shopping_list_id, user_id, item_id)
);

CREATE INDEX idx_assignments_list ON shopping_list_assignments(shopping_list_id);
CREATE INDEX idx_assignments_user ON shopping_list_assignments(user_id);

ALTER TABLE shopping_list_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_select" ON shopping_list_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shopping_lists sl
      WHERE sl.id = shopping_list_id AND is_household_member(sl.household_id)
    )
  );

CREATE POLICY "assignments_insert" ON shopping_list_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists sl
      WHERE sl.id = shopping_list_id AND is_household_member(sl.household_id)
    )
  );

CREATE POLICY "assignments_delete" ON shopping_list_assignments
  FOR DELETE USING (user_id = auth.uid());
