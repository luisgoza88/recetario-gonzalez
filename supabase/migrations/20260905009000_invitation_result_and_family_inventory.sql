BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
-- Match the text return contract even when the production role column is varchar.
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
    
    RETURN QUERY SELECT true, v_membership_id, v_invitation.household_id, v_invitation.role::text, NULL::TEXT;
END;
$$;
-- Buying groceries also updates stock for family members.
CREATE OR REPLACE FUNCTION public.check_user_permission(p_household_id uuid, p_permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_role user_role;
    v_permissions JSONB;
BEGIN
    -- Obtener rol y permisos del usuario
    SELECT role, permissions INTO v_role, v_permissions
    FROM household_memberships
    WHERE user_id = auth.uid()
    AND household_id = p_household_id
    AND is_active = true;
    
    IF v_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Admin tiene todos los permisos
    IF v_role = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Verificar permiso específico en JSONB
    IF v_permissions IS NOT NULL AND (v_permissions->>p_permission)::boolean = true THEN
        RETURN true;
    END IF;
    
    -- Permisos por defecto según rol
    CASE v_role
        WHEN 'familia' THEN
            RETURN p_permission IN (
                'view_menu', 'view_shopping_list', 'view_inventory',
                'edit_menu', 'edit_recipes', 'edit_shopping_list', 'update_inventory'
            );
        WHEN 'empleado' THEN
            RETURN p_permission IN (
                'view_menu', 'view_shopping_list', 'view_tasks', 'view_inventory',
                'complete_tasks', 'update_inventory', 'check_in'
            );
        ELSE
            RETURN false;
    END CASE;
END;
$function$
;
COMMIT;
