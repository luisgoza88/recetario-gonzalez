BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM household_memberships WHERE user_id = auth.uid()
    AND household_id = p_household_id AND is_active = true);
$$;

-- Restrictive policies AND the membership boundary with every legacy permissive policy.
DO $$ DECLARE target text; BEGIN
  FOREACH target IN ARRAY ARRAY['adjustment_suggestions','ai_action_queue','ai_audit_log','ai_context','ai_conversations','budgets','cleaning_supplies','daily_completions','daily_task_instances','day_menu','employee_checkins','employees','generated_menus','home_employees','household_ai_trust','household_mood_history','inspection_reports','inventory','market_checklist','market_items','meal_feedback','preparations','price_history','purchase_patterns','purchases','quick_routine_logs','recipe_favorites','recipe_shares','recipes','schedule_config','schedule_templates','scheduled_tasks','shopping_lists','spaces','substitution_history','task_templates','workload_predictions_log','household_invitations'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
      AND table_name=target AND column_name='household_id') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',target);
      EXECUTE format('CREATE POLICY household_boundary ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (public.is_household_member(household_id)) WITH CHECK (public.is_household_member(household_id))',target);
    END IF;
  END LOOP;
END $$;

-- Creating one's own membership must never grant access to an arbitrary household.
CREATE POLICY membership_insert_boundary ON household_memberships AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (check_user_permission(household_id,'manage_members'));
CREATE POLICY membership_update_boundary ON household_memberships AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (check_user_permission(household_id,'manage_members')) WITH CHECK (check_user_permission(household_id,'manage_members'));
CREATE POLICY membership_delete_boundary ON household_memberships AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (check_user_permission(household_id,'manage_members'));

CREATE OR REPLACE FUNCTION public.create_ai_proposal(p_household_id uuid,p_user_id uuid,p_session_id uuid,p_summary text,p_risk_level integer,p_actions jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id OR NOT is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'Invalid proposal actor or household' USING ERRCODE='42501';
  END IF;
  INSERT INTO ai_action_queue(household_id,user_id,session_id,summary,risk_level,actions)
    VALUES(p_household_id,auth.uid(),p_session_id,p_summary,p_risk_level,p_actions) RETURNING proposal_id INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_ai_proposal(uuid,uuid,uuid,text,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_ai_proposal(uuid,uuid,uuid,text,integer,jsonb) TO authenticated;

ALTER TABLE public.household_invitations ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.use_invitation_code(p_code text) RETURNS TABLE(success boolean, membership_id uuid, household_id uuid, role text, error text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID;
    v_membership_id UUID;
    v_display_name TEXT;
BEGIN
    -- Obtener usuario actual
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, 'Usuario no autenticado'::TEXT;
        RETURN;
    END IF;
    
    -- Buscar invitación
    SELECT * INTO v_invitation
    FROM household_invitations
    WHERE UPPER(code) = UPPER(p_code)
    OR UPPER(token) = UPPER(p_code)
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    
    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, 'Código de invitación no válido'::TEXT;
        RETURN;
    END IF;
    
    -- Verificar expiración
    IF NOT v_invitation.is_active OR v_invitation.expires_at < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, 'La invitación ha expirado'::TEXT;
        RETURN;
    END IF;
    
    -- Verificar usos (si max_uses existe)
    IF v_invitation.max_uses IS NOT NULL AND v_invitation.current_uses >= v_invitation.max_uses THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, 'La invitación ya fue utilizada'::TEXT;
        RETURN;
    END IF;
    
    -- Verificar si ya es miembro
    IF EXISTS (
        SELECT 1 FROM household_memberships 
        WHERE user_id = v_user_id 
        AND household_memberships.household_id = v_invitation.household_id
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, 'Ya eres miembro de este hogar'::TEXT;
        RETURN;
    END IF;
    
    -- Obtener nombre para mostrar
    SELECT COALESCE(v_invitation.suggested_name, full_name) INTO v_display_name
    FROM user_profiles WHERE id = v_user_id;
    
    -- Crear membresía
    INSERT INTO household_memberships (
        user_id, household_id, role, display_name, is_active, invited_by
    ) VALUES (
        v_user_id, v_invitation.household_id, 
        COALESCE(v_invitation.role, 'familia')::user_role,
        v_display_name, true, v_invitation.invited_by
    )
    RETURNING id INTO v_membership_id;
    
    -- Actualizar invitación
    UPDATE household_invitations 
    SET current_uses = COALESCE(current_uses, 0) + 1,
        used_at = NOW(),
        accepted_at = NOW()
    WHERE id = v_invitation.id;
    
    RETURN QUERY SELECT true, v_membership_id, v_invitation.household_id, v_invitation.role, NULL::TEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.use_invitation_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.use_invitation_code(text) TO authenticated;
COMMIT;
