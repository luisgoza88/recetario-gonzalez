-- =====================================================
-- Migration: Cerrar fugas cross-tenant detectadas en auditoria (2026-05-28)
-- =====================================================
-- 1. daily_completions: SELECT/INSERT volvieron a `auth.uid() IS NOT NULL`
--    en la migracion 20260508000000, deshaciendo el aislamiento por hogar
--    que existia desde 20260304000000. Cualquier usuario autenticado podia
--    leer/insertar completions (notas, fotos, tareas) de TODOS los hogares.
-- 2. recipe_favorites: la policy SELECT referencia `status = 'active'`, pero
--    la columna real en household_memberships es `is_active`. La policy lanza
--    "column status does not exist" en runtime -> nadie ve favoritos del hogar.
-- 3. decide_ai_proposal: funcion SECURITY DEFINER que NO valida que el
--    aprobador (p_decision_by) pertenezca al hogar de la propuesta. Permite
--    aprobar/ejecutar propuestas de otros hogares (bypass de RLS).
-- =====================================================

-- -----------------------------------------------------
-- FIX 1: Restaurar aislamiento por hogar en daily_completions
-- -----------------------------------------------------
DROP POLICY IF EXISTS "daily_completions_select" ON daily_completions;
CREATE POLICY "daily_completions_select" ON daily_completions
  FOR SELECT
  USING (is_household_member(household_id));

DROP POLICY IF EXISTS "daily_completions_insert" ON daily_completions;
CREATE POLICY "daily_completions_insert" ON daily_completions
  FOR INSERT
  WITH CHECK (is_household_member(household_id));

-- UPDATE/DELETE ya quedaron correctamente scopeados en 20260508000000
-- (employee_id = auth.uid() / dueno o admin), no se tocan.

-- -----------------------------------------------------
-- FIX 2: Corregir policy de recipe_favorites (status -> is_household_member)
-- -----------------------------------------------------
DROP POLICY IF EXISTS "users_view_own_favorites" ON recipe_favorites;
CREATE POLICY "users_view_own_favorites" ON recipe_favorites
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND is_household_member(household_id))
  );

-- -----------------------------------------------------
-- FIX 3: Validar que el aprobador pertenezca al hogar de la propuesta
-- -----------------------------------------------------
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
SET search_path = public
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

  -- Verificar que quien decide sea miembro activo del hogar de la propuesta
  -- (la funcion es SECURITY DEFINER y bypassa RLS, por eso hay que validar aqui)
  IF NOT EXISTS (
    SELECT 1 FROM household_memberships
    WHERE user_id = p_decision_by
      AND household_id = v_queue.household_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User % is not an active member of household % for proposal %',
      p_decision_by, v_queue.household_id, p_proposal_id;
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
