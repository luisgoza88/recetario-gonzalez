-- =====================================================
-- MIGRACIÓN: AI Command Center
-- Fecha: 2026-01-19
-- Descripción: Tablas para el sistema de IA conversacional
--              con propuestas, audit logging y rollback
-- =====================================================

-- =====================================================
-- 1. TABLA: ai_audit_log
-- Registra TODAS las acciones ejecutadas por la IA
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Información de la sesión
  session_id UUID NOT NULL,
  conversation_id UUID,

  -- Información de la acción
  action_type TEXT NOT NULL, -- 'query', 'mutation', 'bulk_mutation'
  function_name TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',

  -- Estado para rollback
  previous_state JSONB, -- Estado antes de la acción (para poder deshacer)
  new_state JSONB, -- Estado después de la acción
  affected_tables TEXT[], -- ['inventory', 'day_menu', etc.]
  affected_record_ids UUID[], -- IDs de registros modificados

  -- Resultado
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'rolled_back'
  result JSONB,
  error_message TEXT,

  -- Contexto de riesgo
  risk_level INTEGER NOT NULL DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=critical
  required_confirmation BOOLEAN DEFAULT FALSE,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,

  -- Rollback info
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES auth.users(id),
  rollback_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ,

  -- Índices para búsqueda rápida
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back')),
  CONSTRAINT valid_risk_level CHECK (risk_level BETWEEN 1 AND 4)
);

-- Índices para ai_audit_log
CREATE INDEX idx_ai_audit_household ON ai_audit_log(household_id);
CREATE INDEX idx_ai_audit_session ON ai_audit_log(session_id);
CREATE INDEX idx_ai_audit_status ON ai_audit_log(status);
CREATE INDEX idx_ai_audit_created ON ai_audit_log(created_at DESC);
CREATE INDEX idx_ai_audit_function ON ai_audit_log(function_name);

-- =====================================================
-- 2. TABLA: ai_action_queue
-- Cola de propuestas pendientes de aprobación
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Identificación de la propuesta
  proposal_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  conversation_id UUID,

  -- Contenido de la propuesta
  summary TEXT NOT NULL, -- "Reorganizar menú de la semana"
  risk_level INTEGER NOT NULL DEFAULT 2,
  actions JSONB NOT NULL DEFAULT '[]', -- Array de acciones propuestas

  -- Impacto estimado
  tables_affected TEXT[] DEFAULT '{}',
  records_affected INTEGER DEFAULT 0,

  -- Estado
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired', 'partially_approved'

  -- Decisión del usuario
  approved_actions UUID[], -- IDs de acciones aprobadas (para aprobación parcial)
  rejected_actions UUID[], -- IDs de acciones rechazadas
  decision_by UUID REFERENCES auth.users(id),
  decision_at TIMESTAMPTZ,
  decision_notes TEXT,

  -- Ejecución
  execution_started_at TIMESTAMPTZ,
  execution_completed_at TIMESTAMPTZ,
  execution_result JSONB,
  audit_log_ids UUID[], -- Referencias a ai_audit_log para cada acción ejecutada

  -- Expiración
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_queue_status CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'partially_approved', 'executing', 'completed', 'failed'))
);

-- Índices para ai_action_queue
CREATE INDEX idx_ai_queue_household ON ai_action_queue(household_id);
CREATE INDEX idx_ai_queue_status ON ai_action_queue(status);
CREATE INDEX idx_ai_queue_expires ON ai_action_queue(expires_at);
CREATE INDEX idx_ai_queue_proposal ON ai_action_queue(proposal_id);

-- =====================================================
-- 3. TABLA: household_ai_trust
-- Trust score y configuración de IA por hogar
-- =====================================================
CREATE TABLE IF NOT EXISTS household_ai_trust (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL UNIQUE REFERENCES households(id) ON DELETE CASCADE,

  -- Trust metrics
  trust_level INTEGER NOT NULL DEFAULT 1, -- 1-5, donde 5 es máxima confianza
  successful_actions INTEGER DEFAULT 0,
  failed_actions INTEGER DEFAULT 0,
  rolled_back_actions INTEGER DEFAULT 0,

  -- Configuración de auto-aprobación
  auto_approve_level INTEGER DEFAULT 1, -- Máximo nivel de riesgo que se auto-aprueba

  -- Límites personalizados
  max_actions_per_minute INTEGER DEFAULT 10,
  max_critical_actions_per_day INTEGER DEFAULT 5,
  max_items_per_bulk_operation INTEGER DEFAULT 50,

  -- Historial de incidentes
  last_incident_at TIMESTAMPTZ,
  incident_count INTEGER DEFAULT 0,

  -- Preferencias
  require_confirmation_always BOOLEAN DEFAULT FALSE,
  allow_bulk_operations BOOLEAN DEFAULT TRUE,
  allow_destructive_actions BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_trust_level CHECK (trust_level BETWEEN 1 AND 5),
  CONSTRAINT valid_auto_approve_level CHECK (auto_approve_level BETWEEN 1 AND 4)
);

-- =====================================================
-- 4. TABLA: ai_function_registry
-- Registro de funciones de IA con su clasificación de riesgo
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_function_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  function_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'query', 'action_recipe', 'action_inventory', 'action_home', 'action_destructive'

  -- Clasificación de riesgo
  risk_level INTEGER NOT NULL DEFAULT 1,
  requires_confirmation BOOLEAN DEFAULT FALSE,
  is_reversible BOOLEAN DEFAULT TRUE,

  -- Descripción
  description TEXT,
  description_es TEXT,

  -- Configuración
  is_enabled BOOLEAN DEFAULT TRUE,
  rate_limit_per_minute INTEGER DEFAULT 60,

  -- Auditoría
  should_log BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_function_risk CHECK (risk_level BETWEEN 1 AND 4),
  CONSTRAINT valid_category CHECK (category IN ('query', 'action_recipe', 'action_inventory', 'action_home', 'action_destructive', 'action_bulk'))
);

-- =====================================================
-- 5. INSERTAR FUNCIONES CON CLASIFICACIÓN DE RIESGO
-- =====================================================

INSERT INTO ai_function_registry (function_name, category, risk_level, requires_confirmation, is_reversible, description, description_es) VALUES
-- NIVEL 1 - AUTO (Consultas - sin confirmación)
('get_today_menu', 'query', 1, FALSE, TRUE, 'Get today''s menu', 'Obtener menú de hoy'),
('get_week_menu', 'query', 1, FALSE, TRUE, 'Get weekly menu', 'Obtener menú semanal'),
('get_recipe_details', 'query', 1, FALSE, TRUE, 'Get recipe details', 'Obtener detalles de receta'),
('search_recipes', 'query', 1, FALSE, TRUE, 'Search recipes', 'Buscar recetas'),
('get_inventory', 'query', 1, FALSE, TRUE, 'Get current inventory', 'Obtener inventario actual'),
('get_shopping_list', 'query', 1, FALSE, TRUE, 'Get shopping list', 'Obtener lista de compras'),
('get_missing_ingredients', 'query', 1, FALSE, TRUE, 'Get missing ingredients', 'Obtener ingredientes faltantes'),
('suggest_recipe', 'query', 1, FALSE, TRUE, 'Suggest recipe based on inventory', 'Sugerir receta basada en inventario'),
('get_today_tasks', 'query', 1, FALSE, TRUE, 'Get today''s tasks', 'Obtener tareas de hoy'),
('get_employee_schedule', 'query', 1, FALSE, TRUE, 'Get employee schedule', 'Obtener horario de empleado'),
('get_tasks_summary', 'query', 1, FALSE, TRUE, 'Get tasks summary', 'Obtener resumen de tareas'),
('get_weekly_report', 'query', 1, FALSE, TRUE, 'Get weekly report', 'Obtener reporte semanal'),
('get_low_inventory_alerts', 'query', 1, FALSE, TRUE, 'Get low inventory alerts', 'Obtener alertas de inventario bajo'),
('get_upcoming_meals', 'query', 1, FALSE, TRUE, 'Get upcoming meals', 'Obtener próximas comidas'),
('get_current_date_info', 'query', 1, FALSE, TRUE, 'Get current date info', 'Obtener info de fecha actual'),
('calculate_portions', 'query', 1, FALSE, TRUE, 'Calculate portions', 'Calcular porciones'),
('get_preparation_tips', 'query', 1, FALSE, TRUE, 'Get preparation tips', 'Obtener consejos de preparación'),
('smart_shopping_list', 'query', 1, FALSE, TRUE, 'Generate smart shopping list', 'Generar lista de compras inteligente'),
-- Nuevas consultas de espacios y empleados
('list_spaces', 'query', 1, FALSE, TRUE, 'List all spaces', 'Listar todos los espacios'),
('get_space_details', 'query', 1, FALSE, TRUE, 'Get space details', 'Obtener detalles de espacio'),
('list_employees', 'query', 1, FALSE, TRUE, 'List all employees', 'Listar todos los empleados'),
('get_employee_details', 'query', 1, FALSE, TRUE, 'Get employee details', 'Obtener detalles de empleado'),

-- NIVEL 2 - EXECUTE + UNDO (Acciones simples reversibles)
('add_to_shopping_list', 'action_inventory', 2, FALSE, TRUE, 'Add item to shopping list', 'Agregar item a lista de compras'),
('mark_shopping_item', 'action_inventory', 2, FALSE, TRUE, 'Mark shopping item', 'Marcar item de compras'),
('complete_task', 'action_home', 2, FALSE, TRUE, 'Complete a task', 'Completar una tarea'),
('add_quick_task', 'action_home', 2, FALSE, TRUE, 'Add quick task', 'Agregar tarea rápida'),

-- NIVEL 3 - CONFIRM (Requiere confirmación explícita)
('swap_menu_recipe', 'action_recipe', 3, TRUE, TRUE, 'Swap menu recipe', 'Cambiar receta del menú'),
('update_inventory', 'action_inventory', 3, TRUE, TRUE, 'Update inventory quantity', 'Actualizar cantidad de inventario'),
('add_missing_to_shopping', 'action_inventory', 3, TRUE, TRUE, 'Add missing ingredients to shopping', 'Agregar faltantes a compras'),
('create_space', 'action_home', 3, TRUE, TRUE, 'Create new space', 'Crear nuevo espacio'),
('update_space', 'action_home', 3, TRUE, TRUE, 'Update space', 'Actualizar espacio'),
('create_employee', 'action_home', 3, TRUE, TRUE, 'Create new employee', 'Crear nuevo empleado'),
('update_employee', 'action_home', 3, TRUE, TRUE, 'Update employee', 'Actualizar empleado'),
('assign_task_to_employee', 'action_home', 3, TRUE, TRUE, 'Assign task to employee', 'Asignar tarea a empleado'),
('create_recurring_task', 'action_home', 3, TRUE, TRUE, 'Create recurring task', 'Crear tarea recurrente'),
('create_recipe', 'action_recipe', 3, TRUE, TRUE, 'Create new recipe', 'Crear nueva receta'),
('update_recipe', 'action_recipe', 3, TRUE, TRUE, 'Update recipe', 'Actualizar receta'),
-- Tareas avanzadas
('list_task_templates', 'query', 1, FALSE, TRUE, 'List task templates', 'Listar plantillas de tareas'),
('create_task_template', 'action_home', 3, TRUE, TRUE, 'Create task template', 'Crear plantilla de tarea'),
('update_task_template', 'action_home', 3, TRUE, TRUE, 'Update task template', 'Actualizar plantilla de tarea'),
('reschedule_task', 'action_home', 3, TRUE, TRUE, 'Reschedule task', 'Reprogramar tarea'),
('generate_tasks_for_date', 'action_home', 2, FALSE, TRUE, 'Generate tasks for date', 'Generar tareas para fecha'),

-- NIVEL 4 - CRITICAL (Multi-step + confirmación detallada)
('execute_multi_step_task', 'action_bulk', 4, TRUE, TRUE, 'Execute multi-step task', 'Ejecutar tarea multi-paso'),
('delete_recipe', 'action_destructive', 4, TRUE, FALSE, 'Delete recipe', 'Eliminar receta'),
('delete_space', 'action_destructive', 4, TRUE, FALSE, 'Delete space', 'Eliminar espacio'),
('delete_employee', 'action_destructive', 4, TRUE, FALSE, 'Delete employee', 'Eliminar empleado'),
('delete_task_template', 'action_destructive', 4, TRUE, FALSE, 'Delete task template', 'Eliminar plantilla de tarea'),
('bulk_update_menu', 'action_bulk', 4, TRUE, TRUE, 'Bulk update menu', 'Actualizar menú masivamente'),
('bulk_update_inventory', 'action_bulk', 4, TRUE, TRUE, 'Bulk update inventory', 'Actualizar inventario masivamente'),
('clear_shopping_list', 'action_destructive', 4, TRUE, FALSE, 'Clear shopping list', 'Limpiar lista de compras'),
('scan_receipt_items', 'action_home', 2, FALSE, TRUE, 'Scan receipt items', 'Escanear items de recibo'),
('reset_inventory_to_default', 'action_destructive', 4, TRUE, FALSE, 'Reset inventory to default', 'Restablecer inventario a valores predeterminados')

ON CONFLICT (function_name) DO UPDATE SET
  category = EXCLUDED.category,
  risk_level = EXCLUDED.risk_level,
  requires_confirmation = EXCLUDED.requires_confirmation,
  is_reversible = EXCLUDED.is_reversible,
  description = EXCLUDED.description,
  description_es = EXCLUDED.description_es,
  updated_at = NOW();

-- =====================================================
-- 6. FUNCIONES RPC
-- =====================================================

-- Función para crear entrada de audit log
CREATE OR REPLACE FUNCTION create_ai_audit_log(
  p_household_id UUID,
  p_user_id UUID,
  p_session_id UUID,
  p_function_name TEXT,
  p_parameters JSONB DEFAULT '{}',
  p_risk_level INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO ai_audit_log (
    household_id, user_id, session_id, function_name, parameters,
    risk_level, action_type, status
  )
  VALUES (
    p_household_id, p_user_id, p_session_id, p_function_name, p_parameters,
    p_risk_level,
    CASE WHEN p_risk_level = 1 THEN 'query' ELSE 'mutation' END,
    'pending'
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Función para completar entrada de audit log
CREATE OR REPLACE FUNCTION complete_ai_audit_log(
  p_log_id UUID,
  p_status TEXT,
  p_result JSONB DEFAULT NULL,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_affected_tables TEXT[] DEFAULT NULL,
  p_affected_record_ids UUID[] DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_audit_log
  SET
    status = p_status,
    result = p_result,
    previous_state = p_previous_state,
    new_state = p_new_state,
    affected_tables = p_affected_tables,
    affected_record_ids = p_affected_record_ids,
    error_message = p_error_message,
    executed_at = NOW()
  WHERE id = p_log_id;

  -- Actualizar trust score si aplica
  IF p_status = 'completed' THEN
    UPDATE household_ai_trust
    SET successful_actions = successful_actions + 1,
        updated_at = NOW()
    WHERE household_id = (SELECT household_id FROM ai_audit_log WHERE id = p_log_id);
  ELSIF p_status = 'failed' THEN
    UPDATE household_ai_trust
    SET failed_actions = failed_actions + 1,
        last_incident_at = NOW(),
        incident_count = incident_count + 1,
        updated_at = NOW()
    WHERE household_id = (SELECT household_id FROM ai_audit_log WHERE id = p_log_id);
  END IF;

  RETURN TRUE;
END;
$$;

-- Función para hacer rollback de una acción
CREATE OR REPLACE FUNCTION rollback_ai_action(
  p_log_id UUID,
  p_rolled_back_by UUID,
  p_reason TEXT DEFAULT 'User requested rollback'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log ai_audit_log%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Obtener el log
  SELECT * INTO v_log FROM ai_audit_log WHERE id = p_log_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Log not found');
  END IF;

  IF v_log.status = 'rolled_back' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Already rolled back');
  END IF;

  IF v_log.previous_state IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'No previous state available');
  END IF;

  -- Marcar como rolled back
  UPDATE ai_audit_log
  SET
    status = 'rolled_back',
    rolled_back_at = NOW(),
    rolled_back_by = p_rolled_back_by,
    rollback_reason = p_reason
  WHERE id = p_log_id;

  -- Actualizar trust score
  UPDATE household_ai_trust
  SET rolled_back_actions = rolled_back_actions + 1,
      updated_at = NOW()
  WHERE household_id = v_log.household_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'previous_state', v_log.previous_state,
    'function_name', v_log.function_name,
    'affected_tables', v_log.affected_tables
  );
END;
$$;

-- Función para crear una propuesta
CREATE OR REPLACE FUNCTION create_ai_proposal(
  p_household_id UUID,
  p_user_id UUID,
  p_session_id UUID,
  p_summary TEXT,
  p_risk_level INTEGER,
  p_actions JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proposal_id UUID;
BEGIN
  INSERT INTO ai_action_queue (
    household_id, user_id, session_id, summary, risk_level, actions
  )
  VALUES (
    p_household_id, p_user_id, p_session_id, p_summary, p_risk_level, p_actions
  )
  RETURNING proposal_id INTO v_proposal_id;

  RETURN v_proposal_id;
END;
$$;

-- Función para aprobar/rechazar propuesta
CREATE OR REPLACE FUNCTION decide_ai_proposal(
  p_proposal_id UUID,
  p_decision TEXT, -- 'approved', 'rejected', 'partially_approved'
  p_decision_by UUID,
  p_approved_action_ids UUID[] DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue ai_action_queue%ROWTYPE;
  v_all_action_ids UUID[];
BEGIN
  -- Obtener la propuesta
  SELECT * INTO v_queue FROM ai_action_queue WHERE proposal_id = p_proposal_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Verificar que no haya expirado
  IF v_queue.expires_at < NOW() THEN
    UPDATE ai_action_queue SET status = 'expired' WHERE proposal_id = p_proposal_id;
    RETURN FALSE;
  END IF;

  -- Extraer todos los IDs de acciones
  SELECT array_agg((action->>'id')::UUID)
  INTO v_all_action_ids
  FROM jsonb_array_elements(v_queue.actions) AS action;

  -- Actualizar según la decisión
  IF p_decision = 'approved' THEN
    UPDATE ai_action_queue
    SET
      status = 'approved',
      approved_actions = v_all_action_ids,
      decision_by = p_decision_by,
      decision_at = NOW(),
      decision_notes = p_notes,
      updated_at = NOW()
    WHERE proposal_id = p_proposal_id;
  ELSIF p_decision = 'rejected' THEN
    UPDATE ai_action_queue
    SET
      status = 'rejected',
      rejected_actions = v_all_action_ids,
      decision_by = p_decision_by,
      decision_at = NOW(),
      decision_notes = p_notes,
      updated_at = NOW()
    WHERE proposal_id = p_proposal_id;
  ELSIF p_decision = 'partially_approved' THEN
    UPDATE ai_action_queue
    SET
      status = 'partially_approved',
      approved_actions = p_approved_action_ids,
      rejected_actions = ARRAY(
        SELECT unnest(v_all_action_ids)
        EXCEPT
        SELECT unnest(p_approved_action_ids)
      ),
      decision_by = p_decision_by,
      decision_at = NOW(),
      decision_notes = p_notes,
      updated_at = NOW()
    WHERE proposal_id = p_proposal_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Función para obtener configuración de riesgo de una función
CREATE OR REPLACE FUNCTION get_function_risk_config(p_function_name TEXT)
RETURNS TABLE (
  risk_level INTEGER,
  requires_confirmation BOOLEAN,
  is_reversible BOOLEAN,
  category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fr.risk_level,
    fr.requires_confirmation,
    fr.is_reversible,
    fr.category
  FROM ai_function_registry fr
  WHERE fr.function_name = p_function_name
  AND fr.is_enabled = TRUE;
END;
$$;

-- Función para expirar propuestas antiguas (llamar periódicamente)
CREATE OR REPLACE FUNCTION expire_old_proposals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE ai_action_queue
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_ai_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_action_queue_updated_at
  BEFORE UPDATE ON ai_action_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_tables_updated_at();

CREATE TRIGGER trigger_household_ai_trust_updated_at
  BEFORE UPDATE ON household_ai_trust
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_tables_updated_at();

-- Trigger para crear trust record cuando se crea un household
CREATE OR REPLACE FUNCTION create_household_ai_trust()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO household_ai_trust (household_id)
  VALUES (NEW.id)
  ON CONFLICT (household_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_household_ai_trust
  AFTER INSERT ON households
  FOR EACH ROW
  EXECUTE FUNCTION create_household_ai_trust();

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_ai_trust ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_function_registry ENABLE ROW LEVEL SECURITY;

-- Políticas para ai_audit_log
CREATE POLICY "Users can view their household audit logs"
  ON ai_audit_log FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "System can insert audit logs"
  ON ai_audit_log FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "System can update audit logs"
  ON ai_audit_log FOR UPDATE
  USING (TRUE);

-- Políticas para ai_action_queue
CREATE POLICY "Users can view their household proposals"
  ON ai_action_queue FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "System can manage proposals"
  ON ai_action_queue FOR ALL
  USING (TRUE);

-- Políticas para household_ai_trust
CREATE POLICY "Users can view their household trust"
  ON household_ai_trust FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Admins can update their household trust"
  ON household_ai_trust FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE AND role = 'admin'
    )
  );

-- Políticas para ai_function_registry (solo lectura para todos)
CREATE POLICY "Anyone can view function registry"
  ON ai_function_registry FOR SELECT
  USING (TRUE);

-- =====================================================
-- 9. CREAR TRUST RECORDS PARA HOUSEHOLDS EXISTENTES
-- =====================================================

INSERT INTO household_ai_trust (household_id)
SELECT id FROM households
ON CONFLICT (household_id) DO NOTHING;

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
