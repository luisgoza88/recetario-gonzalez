BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

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
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() OR NOT EXISTS (
    SELECT 1 FROM household_memberships WHERE household_id = p_household_id AND user_id = auth.uid() AND is_active
  ) THEN RAISE EXCEPTION 'Invalid audit actor' USING ERRCODE = '42501'; END IF;
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


-- 6h. complete_ai_audit_log() - from 20260119200000_ai_command_center.sql
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
SET search_path = public
AS $$
DECLARE v_log ai_audit_log%ROWTYPE;
BEGIN
  SELECT * INTO v_log FROM ai_audit_log WHERE id = p_log_id FOR UPDATE;
  IF NOT FOUND OR v_log.status <> 'pending' THEN RETURN FALSE; END IF;
  IF auth.uid() IS NULL OR v_log.user_id IS DISTINCT FROM auth.uid() OR NOT EXISTS (
    SELECT 1 FROM household_memberships WHERE household_id = v_log.household_id AND user_id = auth.uid() AND is_active
  ) THEN RAISE EXCEPTION 'Invalid audit actor' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('completed', 'failed') THEN RETURN FALSE; END IF;
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



CREATE OR REPLACE FUNCTION public.rollback_ai_action(p_log_id uuid, p_rolled_back_by uuid, p_reason text DEFAULT 'User requested rollback')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE entry ai_audit_log%ROWTYPE; target_table text; previous jsonb; expected jsonb; current_row jsonb;
  assignment text; changed int;
BEGIN
  SELECT * INTO entry FROM ai_audit_log WHERE id = p_log_id FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_rolled_back_by THEN
    RETURN jsonb_build_object('success',false,'error','Acción no disponible');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM household_memberships WHERE household_id = entry.household_id AND user_id = auth.uid() AND is_active) THEN
    RETURN jsonb_build_object('success',false,'error','No perteneces al hogar');
  END IF;
  target_table := CASE entry.function_name
    WHEN 'swap_menu_recipe' THEN 'day_menu' WHEN 'update_inventory' THEN 'inventory'
    WHEN 'mark_shopping_item' THEN 'market_checklist' WHEN 'update_recipe' THEN 'recipes'
    WHEN 'update_space' THEN 'spaces' WHEN 'update_employee' THEN 'home_employees'
    WHEN 'complete_task' THEN 'scheduled_tasks' ELSE NULL END;
  previous := entry.previous_state->target_table;
  expected := entry.new_state->target_table;
  IF entry.status <> 'completed' OR target_table IS NULL OR previous->>'id' IS NULL OR expected->>'id' IS NULL
    OR previous->>'household_id' IS DISTINCT FROM entry.household_id::text THEN
    RETURN jsonb_build_object('success',false,'error','Esta acción no tiene un estado completo para deshacerla');
  END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id::text=$1 AND household_id=$2 FOR UPDATE', target_table)
    INTO current_row USING previous->>'id', entry.household_id;
  IF current_row IS NULL THEN RETURN jsonb_build_object('success',false,'error','El registro ya no existe'); END IF;
  SELECT jsonb_object_agg(k,v) INTO expected FROM jsonb_each(expected) x(k,v) WHERE current_row ? k;
  IF NOT current_row @> expected THEN
    RETURN jsonb_build_object('success',false,'error','El registro cambió después de la acción; no se sobrescribió');
  END IF;
  SELECT string_agg(format('%I = restored.%I', a.attname, a.attname), ', ') INTO assignment
    FROM pg_attribute a WHERE a.attrelid = format('public.%I',target_table)::regclass
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = ''
      AND a.attname NOT IN ('id','household_id') AND previous ? a.attname;
  IF assignment IS NULL THEN RETURN jsonb_build_object('success',false,'error','Sin campos restaurables'); END IF;
  EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I, $1) restored WHERE t.id::text=$2 AND t.household_id=$3', target_table, assignment, target_table)
    USING previous, previous->>'id', entry.household_id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'Rollback did not restore exactly one record'; END IF;
  UPDATE ai_audit_log SET status='rolled_back', rolled_back_by=auth.uid(), rolled_back_at=now(), rollback_reason=p_reason WHERE id=p_log_id;
  RETURN jsonb_build_object('success',true,'function_name',entry.function_name,'previous_state',entry.previous_state);
END;
$$;
REVOKE ALL ON FUNCTION public.create_ai_audit_log(uuid,uuid,uuid,text,jsonb,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_ai_audit_log(uuid,text,jsonb,jsonb,jsonb,text[],uuid[],text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rollback_ai_action(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_ai_audit_log(uuid,uuid,uuid,text,jsonb,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ai_audit_log(uuid,text,jsonb,jsonb,jsonb,text[],uuid[],text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_ai_action(uuid,uuid,text) TO authenticated;

COMMIT;
