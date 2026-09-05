BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

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
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_decision_by THEN
    RAISE EXCEPTION 'Invalid decision actor' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'partially_approved') THEN RETURN FALSE; END IF;
  -- Obtener la propuesta
  SELECT * INTO v_queue FROM ai_action_queue WHERE proposal_id = p_proposal_id FOR UPDATE;

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

  IF v_queue.status <> 'pending' THEN RETURN FALSE; END IF;

  -- Verificar que no haya expirado
  IF v_queue.expires_at < NOW() THEN
    UPDATE ai_action_queue SET status = 'expired' WHERE proposal_id = p_proposal_id;
    RETURN FALSE;
  END IF;

  -- Extraer todos los IDs de acciones
  SELECT array_agg((action->>'id')::UUID)
  INTO v_all_action_ids
  FROM jsonb_array_elements(v_queue.actions) AS action;

  IF p_decision = 'partially_approved' AND (coalesce(array_length(p_approved_action_ids, 1), 0) = 0
    OR NOT p_approved_action_ids <@ v_all_action_ids) THEN RETURN FALSE; END IF;

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

REVOKE ALL ON FUNCTION public.decide_ai_proposal(uuid,text,uuid,uuid[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_ai_proposal(uuid,text,uuid,uuid[],text) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_ai_proposal(p_proposal_id uuid, p_household_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE claimed uuid;
BEGIN
  UPDATE ai_action_queue SET status = 'executing', execution_started_at = now()
  WHERE proposal_id = p_proposal_id AND household_id = p_household_id
    AND status IN ('approved', 'partially_approved') AND expires_at > now()
  RETURNING proposal_id INTO claimed;
  RETURN claimed IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_ai_proposal(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_ai_proposal(uuid,uuid) TO authenticated;

ALTER TABLE ai_action_queue DROP CONSTRAINT IF EXISTS valid_queue_status;
ALTER TABLE ai_action_queue ADD CONSTRAINT valid_queue_status CHECK (status IN (
  'pending','approved','rejected','expired','partially_approved','executing','completed','failed','rolled_back'
)) NOT VALID;
COMMIT;

-- Validate after releasing the stronger lock used to replace the constraint.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE ai_action_queue VALIDATE CONSTRAINT valid_queue_status;

COMMIT;
