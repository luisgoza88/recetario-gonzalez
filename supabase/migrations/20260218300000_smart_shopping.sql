-- Tabla de precios históricos
CREATE TABLE IF NOT EXISTS price_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES households(id),
  item_name text NOT NULL,
  price numeric(10,2) NOT NULL,
  store text, -- 'Éxito', 'D1', 'Jumbo', 'Carulla', 'Otro'
  quantity text, -- '1 kg', '500g', 'unidad'
  recorded_at timestamptz DEFAULT now(),
  receipt_photo_url text
);

CREATE INDEX idx_price_history_item ON price_history(item_name);
CREATE INDEX idx_price_history_store ON price_history(store);
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage price history" ON price_history FOR ALL USING (auth.uid() IS NOT NULL);

-- Tabla de listas de compras semanales generadas
CREATE TABLE IF NOT EXISTS shopping_lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES households(id),
  week_start_date date NOT NULL,
  menu_id uuid REFERENCES generated_menus(id),
  items jsonb NOT NULL DEFAULT '[]', -- Array de { name, quantity, category, estimatedPrice, store, checked }
  total_estimated numeric(10,2),
  total_actual numeric(10,2),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_shopping_lists_week ON shopping_lists(week_start_date);
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage shopping lists" ON shopping_lists FOR ALL USING (auth.uid() IS NOT NULL);

-- Agregar columnas a market_items si no existen
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS avg_price numeric(10,2);
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS preferred_store text;
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS last_purchase_date date;
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS purchase_frequency_days integer;
