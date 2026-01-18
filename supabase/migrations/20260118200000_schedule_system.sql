-- =====================================================
-- SISTEMA DE PROGRAMACIÓN DE HORARIOS
-- Familia González - Enero 2026
-- =====================================================

-- Tabla de empleados del sistema de horarios
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('interior', 'exterior', 'ambos')),
  phone TEXT,
  email TEXT,
  active BOOLEAN DEFAULT TRUE,
  work_days INT[] DEFAULT ARRAY[1,2,3,4,5,6], -- días de la semana que trabaja
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);

-- RLS para employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on employees" ON employees FOR ALL USING (true);

-- Tabla de plantillas de horario (cronograma maestro de 4 semanas)
CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 4),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo, 1=lunes, etc.
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  task_name TEXT NOT NULL,
  task_description TEXT,
  is_special BOOLEAN DEFAULT FALSE, -- Tareas especiales (★)
  category TEXT NOT NULL, -- cocina, limpieza, lavanderia, perros, piscina, jardin, etc.
  space_id UUID, -- Referencia opcional a espacio (sin FK por ahora)
  order_index INT DEFAULT 0, -- Para ordenar las tareas del día
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_schedule_templates_employee ON schedule_templates(employee_id);
CREATE INDEX idx_schedule_templates_week_day ON schedule_templates(week_number, day_of_week);

-- Tabla de instancias de tareas diarias (generadas desde las plantillas)
CREATE TABLE IF NOT EXISTS daily_task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  template_id UUID REFERENCES schedule_templates(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL, -- Copiado de template para histórico
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  category TEXT NOT NULL,
  is_special BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas comunes
CREATE INDEX idx_daily_tasks_date ON daily_task_instances(date);
CREATE INDEX idx_daily_tasks_employee_date ON daily_task_instances(employee_id, date);
CREATE INDEX idx_daily_tasks_status ON daily_task_instances(status);

-- Tabla para configuración del ciclo de semanas
CREATE TABLE IF NOT EXISTS schedule_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_start_date DATE NOT NULL, -- Fecha de inicio del ciclo (primer lunes de semana 1)
  cycle_weeks INT NOT NULL DEFAULT 4, -- Número de semanas en el ciclo
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración inicial (ciclo empieza el 6 de enero 2025, 4 semanas)
INSERT INTO schedule_config (cycle_start_date, cycle_weeks, is_active)
VALUES ('2025-01-06', 4, TRUE)
ON CONFLICT DO NOTHING;

-- Función para calcular qué semana del ciclo es una fecha dada
CREATE OR REPLACE FUNCTION get_cycle_week(target_date DATE)
RETURNS INT AS $$
DECLARE
  config_record RECORD;
  days_diff INT;
  week_num INT;
BEGIN
  SELECT * INTO config_record FROM schedule_config WHERE is_active = TRUE LIMIT 1;

  IF config_record IS NULL THEN
    RETURN 1;
  END IF;

  days_diff := target_date - config_record.cycle_start_date;

  IF days_diff < 0 THEN
    RETURN 1;
  END IF;

  week_num := ((days_diff / 7) % config_record.cycle_weeks) + 1;

  RETURN week_num;
END;
$$ LANGUAGE plpgsql;

-- Función para generar las tareas de un día específico
CREATE OR REPLACE FUNCTION generate_daily_tasks(target_date DATE)
RETURNS INT AS $$
DECLARE
  week_num INT;
  day_num INT;
  tasks_created INT := 0;
  template RECORD;
BEGIN
  -- Obtener número de semana y día
  week_num := get_cycle_week(target_date);
  day_num := EXTRACT(DOW FROM target_date)::INT;

  -- No generar si ya existen tareas para ese día
  IF EXISTS (SELECT 1 FROM daily_task_instances WHERE date = target_date LIMIT 1) THEN
    RETURN 0;
  END IF;

  -- Crear instancias desde las plantillas
  FOR template IN
    SELECT * FROM schedule_templates
    WHERE week_number = week_num AND day_of_week = day_num
    ORDER BY order_index, time_start
  LOOP
    INSERT INTO daily_task_instances (
      date, template_id, employee_id, task_name,
      time_start, time_end, category, is_special, status
    ) VALUES (
      target_date, template.id, template.employee_id, template.task_name,
      template.time_start, template.time_end, template.category, template.is_special, 'pending'
    );
    tasks_created := tasks_created + 1;
  END LOOP;

  RETURN tasks_created;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_config ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (por ahora)
CREATE POLICY "Allow all on schedule_templates" ON schedule_templates FOR ALL USING (true);
CREATE POLICY "Allow all on daily_task_instances" ON daily_task_instances FOR ALL USING (true);
CREATE POLICY "Allow all on schedule_config" ON schedule_config FOR ALL USING (true);

-- Vista útil para dashboard
CREATE OR REPLACE VIEW today_tasks_summary AS
SELECT
  e.name as employee_name,
  e.id as employee_id,
  COUNT(*) FILTER (WHERE dti.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE dti.status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE dti.status = 'pending') as pending,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE dti.status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as progress_percent
FROM daily_task_instances dti
JOIN employees e ON dti.employee_id = e.id
WHERE dti.date = CURRENT_DATE
GROUP BY e.id, e.name;

COMMENT ON TABLE schedule_templates IS 'Plantillas de horario - cronograma maestro de 4 semanas';
COMMENT ON TABLE daily_task_instances IS 'Instancias de tareas generadas para cada día';
COMMENT ON TABLE schedule_config IS 'Configuración del ciclo de programación';
