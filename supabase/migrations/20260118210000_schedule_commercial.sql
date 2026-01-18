-- =====================================================
-- SISTEMA DE HORARIOS - VERSIÓN COMERCIAL
-- Ajustes para multi-tenancy y configuración por hogar
-- =====================================================

-- 1. Tabla de categorías de tareas configurables por hogar
CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📋',
  color TEXT DEFAULT 'gray', -- blue, green, red, yellow, purple, etc.
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_categories_household ON task_categories(household_id);

-- 2. Actualizar schedule_templates para usar home_employees y household_id
-- Primero agregamos las nuevas columnas
ALTER TABLE schedule_templates
ADD COLUMN IF NOT EXISTS household_id UUID,
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL;

-- 3. Actualizar daily_task_instances para incluir household_id
ALTER TABLE daily_task_instances
ADD COLUMN IF NOT EXISTS household_id UUID,
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL;

-- 4. Actualizar schedule_config para incluir household_id
ALTER TABLE schedule_config
ADD COLUMN IF NOT EXISTS household_id UUID;

-- 5. Crear índices para household_id
CREATE INDEX IF NOT EXISTS idx_schedule_templates_household ON schedule_templates(household_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_household ON daily_task_instances(household_id);
CREATE INDEX IF NOT EXISTS idx_schedule_config_household ON schedule_config(household_id);

-- 6. Insertar categorías predeterminadas (se copiarán a cada hogar nuevo)
-- Esta función crea las categorías default para un hogar
CREATE OR REPLACE FUNCTION create_default_categories(p_household_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO task_categories (household_id, name, icon, color, is_default, sort_order) VALUES
    (p_household_id, 'Cocina', '🍳', 'orange', TRUE, 1),
    (p_household_id, 'Limpieza', '🧹', 'blue', TRUE, 2),
    (p_household_id, 'Lavandería', '👕', 'purple', TRUE, 3),
    (p_household_id, 'Jardín', '🌿', 'green', TRUE, 4),
    (p_household_id, 'Mantenimiento', '🔧', 'slate', TRUE, 5),
    (p_household_id, 'Mascotas', '🐕', 'amber', TRUE, 6),
    (p_household_id, 'Administración', '📋', 'gray', TRUE, 7),
    (p_household_id, 'Piscina', '🏊', 'cyan', TRUE, 8),
    (p_household_id, 'Vehículos', '🚗', 'red', TRUE, 9),
    (p_household_id, 'Compras', '🛒', 'emerald', TRUE, 10),
    (p_household_id, 'General', '📌', 'gray', TRUE, 99)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 7. Actualizar función generate_daily_tasks para incluir household_id
CREATE OR REPLACE FUNCTION generate_daily_tasks(target_date DATE, p_household_id UUID DEFAULT NULL)
RETURNS INT AS $$
DECLARE
  week_num INT;
  day_num INT;
  tasks_created INT := 0;
  template RECORD;
  config_record RECORD;
BEGIN
  -- Obtener configuración del hogar o la activa
  IF p_household_id IS NOT NULL THEN
    SELECT * INTO config_record FROM schedule_config
    WHERE household_id = p_household_id AND is_active = TRUE LIMIT 1;
  ELSE
    SELECT * INTO config_record FROM schedule_config WHERE is_active = TRUE LIMIT 1;
  END IF;

  IF config_record IS NULL THEN
    week_num := 1;
  ELSE
    week_num := get_cycle_week(target_date);
  END IF;

  day_num := EXTRACT(DOW FROM target_date)::INT;

  -- No generar si ya existen tareas para ese día y hogar
  IF p_household_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM daily_task_instances WHERE date = target_date AND household_id = p_household_id LIMIT 1) THEN
      RETURN 0;
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM daily_task_instances WHERE date = target_date LIMIT 1) THEN
      RETURN 0;
    END IF;
  END IF;

  -- Crear instancias desde las plantillas
  FOR template IN
    SELECT * FROM schedule_templates
    WHERE week_number = week_num
      AND day_of_week = day_num
      AND (p_household_id IS NULL OR household_id = p_household_id)
    ORDER BY order_index, time_start
  LOOP
    INSERT INTO daily_task_instances (
      date, template_id, employee_id, task_name,
      time_start, time_end, category, is_special, status,
      household_id, category_id
    ) VALUES (
      target_date, template.id, template.employee_id, template.task_name,
      template.time_start, template.time_end, template.category, template.is_special, 'pending',
      template.household_id, template.category_id
    );
    tasks_created := tasks_created + 1;
  END LOOP;

  RETURN tasks_created;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS para task_categories
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on task_categories" ON task_categories FOR ALL USING (true);

-- 9. Vista actualizada para dashboard por hogar
DROP VIEW IF EXISTS today_tasks_summary;
CREATE VIEW today_tasks_summary AS
SELECT
  dti.household_id,
  e.name as employee_name,
  e.id as employee_id,
  COUNT(*) FILTER (WHERE dti.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE dti.status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE dti.status = 'pending') as pending,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE dti.status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as progress_percent
FROM daily_task_instances dti
LEFT JOIN home_employees e ON dti.employee_id = e.id
WHERE dti.date = CURRENT_DATE
GROUP BY dti.household_id, e.id, e.name;

COMMENT ON TABLE task_categories IS 'Categorías de tareas configurables por hogar';
