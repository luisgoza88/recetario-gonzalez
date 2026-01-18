-- Migración: Tablas para gestión del hogar mejorada
-- Fecha: 2025-01-18

-- =====================================================
-- TABLA: employee_checkins
-- Control de asistencia de empleados
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES home_employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TEXT NOT NULL,
    check_out_time TEXT,
    total_hours DECIMAL(4,1),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para employee_checkins
CREATE INDEX IF NOT EXISTS idx_employee_checkins_household ON employee_checkins(household_id);
CREATE INDEX IF NOT EXISTS idx_employee_checkins_employee ON employee_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_checkins_date ON employee_checkins(date);

-- RLS para employee_checkins
ALTER TABLE employee_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on employee_checkins" ON employee_checkins FOR ALL USING (true);

-- =====================================================
-- TABLA: cleaning_history
-- Historial de limpiezas realizadas
-- =====================================================
CREATE TABLE IF NOT EXISTS cleaning_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    employee_id UUID REFERENCES home_employees(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actual_minutes INTEGER,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para cleaning_history
CREATE INDEX IF NOT EXISTS idx_cleaning_history_household ON cleaning_history(household_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_history_space ON cleaning_history(space_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_history_completed ON cleaning_history(completed_at);

-- RLS para cleaning_history
ALTER TABLE cleaning_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on cleaning_history" ON cleaning_history FOR ALL USING (true);

-- =====================================================
-- TABLA: cleaning_ratings
-- Calificaciones detalladas de limpieza
-- =====================================================
CREATE TABLE IF NOT EXISTS cleaning_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES home_employees(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    issues TEXT[], -- Array de problemas encontrados
    notes TEXT,
    rated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para cleaning_ratings
CREATE INDEX IF NOT EXISTS idx_cleaning_ratings_household ON cleaning_ratings(household_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_ratings_task ON cleaning_ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_ratings_employee ON cleaning_ratings(employee_id);

-- RLS para cleaning_ratings
ALTER TABLE cleaning_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on cleaning_ratings" ON cleaning_ratings FOR ALL USING (true);

-- =====================================================
-- TABLA: cleaning_supplies
-- Inventario de productos de limpieza
-- =====================================================
CREATE TABLE IF NOT EXISTS cleaning_supplies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'cleaning',
    current_quantity DECIMAL(10,2) DEFAULT 0,
    min_quantity DECIMAL(10,2) DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'unidades',
    notes TEXT,
    last_restocked TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para cleaning_supplies
CREATE INDEX IF NOT EXISTS idx_cleaning_supplies_household ON cleaning_supplies(household_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_supplies_category ON cleaning_supplies(category);

-- RLS para cleaning_supplies
ALTER TABLE cleaning_supplies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on cleaning_supplies" ON cleaning_supplies FOR ALL USING (true);

-- =====================================================
-- TABLA: inspection_reports
-- Reportes de inspección con checklist
-- =====================================================
CREATE TABLE IF NOT EXISTS inspection_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    task_id UUID REFERENCES scheduled_tasks(id) ON DELETE SET NULL,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES home_employees(id) ON DELETE SET NULL,
    checklist JSONB NOT NULL, -- Array de items con status
    general_notes TEXT,
    photos TEXT[], -- Array de URLs o base64 de fotos
    issues_found INTEGER DEFAULT 0,
    passed BOOLEAN DEFAULT true,
    inspected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para inspection_reports
CREATE INDEX IF NOT EXISTS idx_inspection_reports_household ON inspection_reports(household_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_space ON inspection_reports(space_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_date ON inspection_reports(inspected_at);

-- RLS para inspection_reports
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on inspection_reports" ON inspection_reports FOR ALL USING (true);

-- =====================================================
-- TABLA: quick_routine_logs
-- Registro de rutinas rápidas ejecutadas
-- =====================================================
CREATE TABLE IF NOT EXISTS quick_routine_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    routine_id TEXT NOT NULL,
    routine_name TEXT NOT NULL,
    items_completed INTEGER DEFAULT 0,
    total_items INTEGER NOT NULL,
    time_taken INTEGER, -- en segundos
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para quick_routine_logs
CREATE INDEX IF NOT EXISTS idx_quick_routine_logs_household ON quick_routine_logs(household_id);

-- RLS para quick_routine_logs
ALTER TABLE quick_routine_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on quick_routine_logs" ON quick_routine_logs FOR ALL USING (true);

-- =====================================================
-- COMENTARIOS EN TABLAS
-- =====================================================
COMMENT ON TABLE employee_checkins IS 'Control de entrada/salida de empleados del hogar';
COMMENT ON TABLE cleaning_history IS 'Historial de limpiezas completadas por espacio';
COMMENT ON TABLE cleaning_ratings IS 'Calificaciones y feedback de tareas de limpieza';
COMMENT ON TABLE cleaning_supplies IS 'Inventario de productos de limpieza del hogar';
COMMENT ON TABLE inspection_reports IS 'Reportes de inspección con checklist y fotos';
COMMENT ON TABLE quick_routine_logs IS 'Registro de rutinas rápidas ejecutadas';
