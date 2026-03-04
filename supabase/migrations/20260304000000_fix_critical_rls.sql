-- =====================================================
-- MIGRACION: Fix Critical RLS Policy Issues
-- Fecha: 2026-03-04
-- Descripcion:
--   1. Reemplazar politicas RLS permisivas (FOR ALL USING auth.uid() IS NOT NULL)
--      con filtrado basado en household_id usando is_household_member()
--   2. Eliminar politicas peligrosas con USING (TRUE) en ai_action_queue y ai_audit_log
--   3. Agregar SET search_path = public a TODAS las funciones SECURITY DEFINER
--      para prevenir ataques de search_path hijacking (CVE-2018-1058)
-- =====================================================


-- =====================================================
-- 1. FIX: generated_menus RLS
-- ANTES: FOR ALL USING (auth.uid() IS NOT NULL) - cualquier usuario autenticado
--        podia ver/editar menus de CUALQUIER hogar
-- DESPUES: Filtrado por household_id con is_household_member()
-- =====================================================

DROP POLICY IF EXISTS "Users can view their household menus" ON generated_menus;

CREATE POLICY "Users can view their household menus" ON generated_menus
  FOR SELECT USING (is_household_member(household_id));

CREATE POLICY "Users can insert their household menus" ON generated_menus
  FOR INSERT WITH CHECK (is_household_member(household_id));

CREATE POLICY "Users can update their household menus" ON generated_menus
  FOR UPDATE USING (is_household_member(household_id));

CREATE POLICY "Users can delete their household menus" ON generated_menus
  FOR DELETE USING (is_household_member(household_id));


-- =====================================================
-- 2. FIX: daily_completions RLS
-- ANTES: FOR ALL USING (auth.uid() IS NOT NULL) - misma vulnerabilidad
-- DESPUES: Filtrado por household_id
-- =====================================================

DROP POLICY IF EXISTS "Users can manage daily completions" ON daily_completions;

CREATE POLICY "Users can view daily completions" ON daily_completions
  FOR SELECT USING (is_household_member(household_id));

CREATE POLICY "Users can insert daily completions" ON daily_completions
  FOR INSERT WITH CHECK (is_household_member(household_id));

CREATE POLICY "Users can update daily completions" ON daily_completions
  FOR UPDATE USING (is_household_member(household_id));

CREATE POLICY "Users can delete daily completions" ON daily_completions
  FOR DELETE USING (is_household_member(household_id));


-- =====================================================
-- 3. FIX: ai_action_queue RLS
-- ANTES: FOR ALL USING (TRUE) - CUALQUIER usuario (incluso anonimo)
--        podia leer/escribir/borrar propuestas de IA
-- DESPUES: Eliminar la politica peligrosa. Las escrituras deben
--          hacerse via funciones SECURITY DEFINER (create_ai_proposal, etc.)
-- =====================================================

DROP POLICY IF EXISTS "System can manage proposals" ON ai_action_queue;
-- La politica "Users can view their household proposals" ya existe
-- y filtra correctamente por household_id via household_memberships


-- =====================================================
-- 4. FIX: price_history y shopping_lists RLS
-- ANTES: FOR ALL USING (auth.uid() IS NOT NULL) - misma vulnerabilidad
-- DESPUES: Filtrado por household_id
-- =====================================================

DROP POLICY IF EXISTS "Users can manage price history" ON price_history;

CREATE POLICY "Users can view price history" ON price_history
  FOR SELECT USING (is_household_member(household_id));

CREATE POLICY "Users can insert price history" ON price_history
  FOR INSERT WITH CHECK (is_household_member(household_id));

DROP POLICY IF EXISTS "Users can manage shopping lists" ON shopping_lists;

CREATE POLICY "Users can view shopping lists" ON shopping_lists
  FOR SELECT USING (is_household_member(household_id));

CREATE POLICY "Users can insert shopping lists" ON shopping_lists
  FOR INSERT WITH CHECK (is_household_member(household_id));

CREATE POLICY "Users can update shopping lists" ON shopping_lists
  FOR UPDATE USING (is_household_member(household_id));

CREATE POLICY "Users can delete shopping lists" ON shopping_lists
  FOR DELETE USING (is_household_member(household_id));


-- =====================================================
-- 5. FIX: ai_audit_log policies
-- ANTES: INSERT WITH CHECK (TRUE) y UPDATE USING (TRUE) permitian
--        a cualquier usuario escribir/modificar logs de auditoria
-- DESPUES: Los audit logs solo se escriben via funciones SECURITY DEFINER
--          (create_ai_audit_log, complete_ai_audit_log)
-- =====================================================

DROP POLICY IF EXISTS "System can insert audit logs" ON ai_audit_log;
DROP POLICY IF EXISTS "System can update audit logs" ON ai_audit_log;
-- La politica "Users can view their household audit logs" ya existe
-- y filtra correctamente por household_id via household_memberships


-- =====================================================
-- 6. FIX: Agregar SET search_path = public a TODAS las funciones
--    SECURITY DEFINER para prevenir search_path hijacking
--
--    Sin SET search_path, un atacante podria crear un schema malicioso
--    con funciones del mismo nombre (ej: auth.uid()) que se ejecutarian
--    con los privilegios elevados de SECURITY DEFINER
-- =====================================================

-- 6a. handle_new_user() - from 20260119000000_multi_tenant_users.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6b. create_invitation() - from 20260119000000_multi_tenant_users.sql
CREATE OR REPLACE FUNCTION create_invitation(
    p_household_id UUID,
    p_role user_role,
    p_email TEXT DEFAULT NULL,
    p_suggested_name TEXT DEFAULT NULL,
    p_max_uses INTEGER DEFAULT 1,
    p_expires_in_days INTEGER DEFAULT 7
)
RETURNS household_invitations AS $$
DECLARE
    v_code TEXT;
    v_invitation household_invitations;
BEGIN
    -- Generar codigo unico
    LOOP
        v_code := generate_invitation_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM household_invitations WHERE code = v_code);
    END LOOP;

    -- Crear invitacion
    INSERT INTO household_invitations (
        household_id, code, role, email, suggested_name,
        max_uses, expires_at, created_by
    ) VALUES (
        p_household_id, v_code, p_role, p_email, p_suggested_name,
        p_max_uses, NOW() + (p_expires_in_days || ' days')::interval, auth.uid()
    )
    RETURNING * INTO v_invitation;

    RETURN v_invitation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6c. use_invitation_code() - from 20260119000000_multi_tenant_users.sql
CREATE OR REPLACE FUNCTION use_invitation_code(p_code TEXT)
RETURNS household_memberships AS $$
DECLARE
    v_invitation household_invitations;
    v_membership household_memberships;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Verificar que el usuario esta autenticado
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Buscar y validar invitacion
    SELECT * INTO v_invitation
    FROM household_invitations
    WHERE code = UPPER(p_code)
    AND is_active = true
    AND (expires_at > NOW())
    AND (current_uses < max_uses)
    AND (email IS NULL OR email = (SELECT email FROM user_profiles WHERE id = v_user_id))
    FOR UPDATE;

    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Codigo de invitacion invalido, expirado o ya usado';
    END IF;

    -- Verificar que el usuario no sea ya miembro
    IF EXISTS (
        SELECT 1 FROM household_memberships
        WHERE user_id = v_user_id AND household_id = v_invitation.household_id
    ) THEN
        RAISE EXCEPTION 'Ya eres miembro de este hogar';
    END IF;

    -- Crear membresia
    INSERT INTO household_memberships (
        user_id, household_id, role, display_name, invited_by
    ) VALUES (
        v_user_id,
        v_invitation.household_id,
        v_invitation.role,
        v_invitation.suggested_name,
        v_invitation.created_by
    )
    RETURNING * INTO v_membership;

    -- Actualizar invitacion
    UPDATE household_invitations
    SET current_uses = current_uses + 1,
        used_at = NOW(),
        used_by = v_user_id,
        is_active = CASE WHEN current_uses + 1 >= max_uses THEN false ELSE true END
    WHERE id = v_invitation.id;

    RETURN v_membership;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6d. get_my_memberships() - from 20260119000000_multi_tenant_users.sql
CREATE OR REPLACE FUNCTION get_my_memberships()
RETURNS TABLE (
    membership_id UUID,
    household_id UUID,
    household_name TEXT,
    role user_role,
    display_name TEXT,
    is_active BOOLEAN,
    joined_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        hm.id,
        hm.household_id,
        h.name,
        hm.role,
        hm.display_name,
        hm.is_active,
        hm.joined_at
    FROM household_memberships hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = auth.uid()
    ORDER BY hm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6e. check_user_permission() - from 20260119000000_multi_tenant_users.sql
CREATE OR REPLACE FUNCTION check_user_permission(
    p_household_id UUID,
    p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_membership household_memberships;
    v_has_permission BOOLEAN := false;
BEGIN
    -- Obtener membresia
    SELECT * INTO v_membership
    FROM household_memberships
    WHERE user_id = auth.uid()
    AND household_id = p_household_id
    AND is_active = true;

    IF v_membership IS NULL THEN
        RETURN false;
    END IF;

    -- Admin tiene todos los permisos
    IF v_membership.role = 'admin' THEN
        RETURN true;
    END IF;

    -- Verificar permisos por defecto segun rol
    CASE p_permission
        -- Permisos de lectura
        WHEN 'view_menu' THEN
            v_has_permission := v_membership.role IN ('admin', 'familia', 'empleado');
        WHEN 'view_shopping_list' THEN
            v_has_permission := v_membership.role IN ('admin', 'familia', 'empleado');
        WHEN 'view_tasks' THEN
            v_has_permission := v_membership.role IN ('admin', 'familia', 'empleado');

        -- Permisos de empleado
        WHEN 'complete_tasks' THEN
            v_has_permission := v_membership.role IN ('admin', 'empleado');
        WHEN 'update_inventory' THEN
            v_has_permission := v_membership.role IN ('admin', 'empleado');

        -- Permisos de escritura (solo admin y familia)
        WHEN 'edit_menu' THEN
            v_has_permission := v_membership.role IN ('admin', 'familia');
        WHEN 'edit_recipes' THEN
            v_has_permission := v_membership.role IN ('admin', 'familia');
        WHEN 'edit_shopping_list' THEN
            v_has_permission := v_membership.role IN ('admin', 'familia');

        -- Permisos de gestion (solo admin)
        WHEN 'manage_employees' THEN
            v_has_permission := v_membership.role = 'admin';
        WHEN 'manage_spaces' THEN
            v_has_permission := v_membership.role = 'admin';
        WHEN 'manage_tasks' THEN
            v_has_permission := v_membership.role = 'admin';
        WHEN 'manage_members' THEN
            v_has_permission := v_membership.role = 'admin';
        WHEN 'manage_invitations' THEN
            v_has_permission := v_membership.role = 'admin';
        WHEN 'delete_data' THEN
            v_has_permission := v_membership.role = 'admin';

        ELSE
            v_has_permission := false;
    END CASE;

    -- Verificar override en permisos personalizados
    IF v_membership.permissions ? p_permission THEN
        v_has_permission := (v_membership.permissions->>p_permission)::boolean;
    END IF;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6f. handle_new_household() - from 20260119000000_multi_tenant_users.sql
CREATE OR REPLACE FUNCTION handle_new_household()
RETURNS TRIGGER AS $$
BEGIN
    -- Si hay un usuario autenticado, hacerlo admin del hogar
    IF auth.uid() IS NOT NULL THEN
        NEW.owner_id := auth.uid();

        INSERT INTO household_memberships (user_id, household_id, role)
        VALUES (auth.uid(), NEW.id, 'admin');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6g. create_ai_audit_log() - from 20260119200000_ai_command_center.sql
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


-- 6i. rollback_ai_action() - from 20260119200000_ai_command_center.sql
CREATE OR REPLACE FUNCTION rollback_ai_action(
  p_log_id UUID,
  p_rolled_back_by UUID,
  p_reason TEXT DEFAULT 'User requested rollback'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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


-- 6j. create_ai_proposal() - from 20260119200000_ai_command_center.sql
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
SET search_path = public
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


-- 6k. decide_ai_proposal() - from 20260119200000_ai_command_center.sql
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

  -- Verificar que no haya expirado
  IF v_queue.expires_at < NOW() THEN
    UPDATE ai_action_queue SET status = 'expired' WHERE proposal_id = p_proposal_id;
    RETURN FALSE;
  END IF;

  -- Extraer todos los IDs de acciones
  SELECT array_agg((action->>'id')::UUID)
  INTO v_all_action_ids
  FROM jsonb_array_elements(v_queue.actions) AS action;

  -- Actualizar segun la decision
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


-- 6l. get_function_risk_config() - from 20260119200000_ai_command_center.sql
CREATE OR REPLACE FUNCTION get_function_risk_config(p_function_name TEXT)
RETURNS TABLE (
  risk_level INTEGER,
  requires_confirmation BOOLEAN,
  is_reversible BOOLEAN,
  category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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


-- 6m. expire_old_proposals() - from 20260119200000_ai_command_center.sql
CREATE OR REPLACE FUNCTION expire_old_proposals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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


-- 6n. is_household_member() - from 20260205000000_fix_rls_policies.sql
CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_memberships
    WHERE user_id = auth.uid()
      AND household_id = p_household_id
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;


-- 6o. has_household_role() - from 20260205000000_fix_rls_policies.sql
CREATE OR REPLACE FUNCTION public.has_household_role(p_household_id UUID, p_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_memberships
    WHERE user_id = auth.uid()
      AND household_id = p_household_id
      AND is_active = true
      AND role::text = ANY(p_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;


-- 6p. check_rate_limit() - from 20260205100000_rate_limits_table.sql
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_ms INTEGER
) RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_entry RECORD;
BEGIN
  -- Intentar obtener la entrada existente
  SELECT * INTO v_entry FROM rate_limits WHERE key = p_key FOR UPDATE;

  IF v_entry IS NULL THEN
    -- No existe: crear nueva entrada
    INSERT INTO rate_limits (key, count, window_start, window_ms)
    VALUES (p_key, 1, v_now, p_window_ms)
    ON CONFLICT (key) DO UPDATE
      SET count = 1, window_start = v_now, window_ms = p_window_ms;

    RETURN QUERY SELECT true, 1, v_now + (p_window_ms || ' milliseconds')::interval;
    RETURN;
  END IF;

  -- Verificar si la ventana expiro
  IF v_now > v_entry.window_start + (v_entry.window_ms || ' milliseconds')::interval THEN
    -- Ventana expirada: reiniciar
    UPDATE rate_limits
    SET count = 1, window_start = v_now, window_ms = p_window_ms
    WHERE key = p_key;

    RETURN QUERY SELECT true, 1, v_now + (p_window_ms || ' milliseconds')::interval;
    RETURN;
  END IF;

  -- Ventana activa: verificar limite
  IF v_entry.count >= p_limit THEN
    -- Limite excedido
    RETURN QUERY SELECT false, v_entry.count,
      v_entry.window_start + (v_entry.window_ms || ' milliseconds')::interval;
    RETURN;
  END IF;

  -- Incrementar contador
  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;

  RETURN QUERY SELECT true, v_entry.count + 1,
    v_entry.window_start + (v_entry.window_ms || ' milliseconds')::interval;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6q. cleanup_expired_rate_limits() - from 20260205100000_rate_limits_table.sql
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE now() > window_start + (window_ms || ' milliseconds')::interval;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- =====================================================
-- FIN DE LA MIGRACION
-- =====================================================
