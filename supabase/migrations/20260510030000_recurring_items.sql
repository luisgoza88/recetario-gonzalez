-- Tabla para tracking de patrones de compra
CREATE TABLE IF NOT EXISTS purchase_patterns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  item_name text NOT NULL,
  avg_frequency_days int, -- cada cuantos dias se compra en promedio
  last_purchase_date date,
  total_purchases int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (household_id, item_id)
);

CREATE INDEX idx_patterns_household ON purchase_patterns(household_id);
CREATE INDEX idx_patterns_due ON purchase_patterns(household_id, last_purchase_date);

ALTER TABLE purchase_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patterns_select" ON purchase_patterns
  FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "patterns_insert" ON purchase_patterns
  FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY "patterns_update" ON purchase_patterns
  FOR UPDATE USING (is_household_member(household_id));

-- Función que recalcula la frecuencia cuando hay nueva compra
CREATE OR REPLACE FUNCTION upsert_purchase_pattern(
  p_household_id uuid,
  p_item_id text,
  p_item_name text,
  p_purchase_date date
)
RETURNS void AS $$
DECLARE
  existing_record purchase_patterns%ROWTYPE;
  new_freq int;
BEGIN
  SELECT * INTO existing_record FROM purchase_patterns
    WHERE household_id = p_household_id AND item_id = p_item_id;

  IF existing_record IS NULL THEN
    INSERT INTO purchase_patterns (household_id, item_id, item_name, last_purchase_date, total_purchases)
    VALUES (p_household_id, p_item_id, p_item_name, p_purchase_date, 1);
  ELSE
    -- Calcular nueva frecuencia: promedio movil entre la actual y la nueva diferencia
    IF existing_record.last_purchase_date IS NOT NULL THEN
      new_freq := COALESCE(existing_record.avg_frequency_days, 7) * 0.7
                + EXTRACT(EPOCH FROM (p_purchase_date - existing_record.last_purchase_date)) / 86400 * 0.3;
    ELSE
      new_freq := COALESCE(existing_record.avg_frequency_days, 7);
    END IF;

    UPDATE purchase_patterns SET
      avg_frequency_days = new_freq,
      last_purchase_date = p_purchase_date,
      total_purchases = total_purchases + 1,
      updated_at = now()
    WHERE id = existing_record.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
