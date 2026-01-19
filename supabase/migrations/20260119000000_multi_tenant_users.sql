-- Migración: Sistema Multi-Tenant con Usuarios y Roles
-- Fecha: 2025-01-19
-- Descripción: Implementa autenticación, perfiles de usuario, membresías e invitaciones

-- =====================================================
-- TABLA: user_profiles
-- Extiende auth.users con datos de la aplicación
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    preferred_language TEXT DEFAULT 'es',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- RLS para user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Usuarios solo pueden ver/editar su propio perfil
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trigger para crear perfil automáticamente cuando se registra un usuario
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger solo si no existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TIPO ENUM: user_role
-- Roles disponibles en el sistema
-- =====================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'empleado', 'familia');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLA: household_memberships
-- Vincula usuarios a hogares con roles específicos
-- =====================================================
CREATE TABLE IF NOT EXISTS household_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'familia',
    -- Permisos granulares (override de rol si necesario)
    permissions JSONB DEFAULT '{}'::jsonb,
    -- Metadatos
    display_name TEXT, -- Nombre a mostrar en este hogar (ej: "María la empleada")
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID REFERENCES user_profiles(id),
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Un usuario solo puede tener una membresía por hogar
    UNIQUE(user_id, household_id)
);

-- Índices para household_memberships
CREATE INDEX IF NOT EXISTS idx_memberships_user ON household_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_household ON household_memberships(household_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON household_memberships(role);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON household_memberships(is_active) WHERE is_active = true;

-- RLS para household_memberships
ALTER TABLE household_memberships ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver membresías de hogares donde son miembros
CREATE POLICY "Members can view memberships in their households" ON household_memberships
    FOR SELECT USING (
        household_id IN (
            SELECT hm.household_id FROM household_memberships hm
            WHERE hm.user_id = auth.uid() AND hm.is_active = true
        )
    );

-- Solo admins pueden insertar/actualizar/eliminar membresías
CREATE POLICY "Admins can manage memberships" ON household_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM household_memberships hm
            WHERE hm.household_id = household_memberships.household_id
            AND hm.user_id = auth.uid()
            AND hm.role = 'admin'
            AND hm.is_active = true
        )
    );

-- Usuarios pueden ver su propia membresía
CREATE POLICY "Users can view own membership" ON household_memberships
    FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- TABLA: household_invitations
-- Códigos de invitación para unirse a hogares
-- =====================================================
CREATE TABLE IF NOT EXISTS household_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    -- Código único de 8 caracteres
    code TEXT NOT NULL UNIQUE,
    -- Rol que tendrá el invitado
    role user_role NOT NULL DEFAULT 'familia',
    -- Email específico (opcional - si se pone, solo ese email puede usar el código)
    email TEXT,
    -- Nombre sugerido para el invitado
    suggested_name TEXT,
    -- Límites
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    -- Estado
    is_active BOOLEAN DEFAULT true,
    -- Tracking de uso
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES user_profiles(id),
    -- Quién creó la invitación
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para household_invitations
CREATE INDEX IF NOT EXISTS idx_invitations_code ON household_invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_household ON household_invitations(household_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON household_invitations(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_active ON household_invitations(is_active, expires_at) WHERE is_active = true;

-- RLS para household_invitations
ALTER TABLE household_invitations ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver y gestionar invitaciones de sus hogares
CREATE POLICY "Admins can manage invitations" ON household_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM household_memberships hm
            WHERE hm.household_id = household_invitations.household_id
            AND hm.user_id = auth.uid()
            AND hm.role = 'admin'
            AND hm.is_active = true
        )
    );

-- Cualquier usuario autenticado puede ver una invitación por su código (para validar)
CREATE POLICY "Users can validate invitation codes" ON household_invitations
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================================================
-- Agregar owner_id a households (si no existe)
-- =====================================================
DO $$ BEGIN
    ALTER TABLE households ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES user_profiles(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- =====================================================
-- FUNCIÓN: Generar código de invitación único
-- =====================================================
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sin I, O, 0, 1 para evitar confusión
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Crear invitación con código único
-- =====================================================
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
    -- Generar código único
    LOOP
        v_code := generate_invitation_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM household_invitations WHERE code = v_code);
    END LOOP;

    -- Crear invitación
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Usar código de invitación
-- =====================================================
CREATE OR REPLACE FUNCTION use_invitation_code(p_code TEXT)
RETURNS household_memberships AS $$
DECLARE
    v_invitation household_invitations;
    v_membership household_memberships;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Verificar que el usuario está autenticado
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Buscar y validar invitación
    SELECT * INTO v_invitation
    FROM household_invitations
    WHERE code = UPPER(p_code)
    AND is_active = true
    AND (expires_at > NOW())
    AND (current_uses < max_uses)
    AND (email IS NULL OR email = (SELECT email FROM user_profiles WHERE id = v_user_id))
    FOR UPDATE;

    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Código de invitación inválido, expirado o ya usado';
    END IF;

    -- Verificar que el usuario no sea ya miembro
    IF EXISTS (
        SELECT 1 FROM household_memberships
        WHERE user_id = v_user_id AND household_id = v_invitation.household_id
    ) THEN
        RAISE EXCEPTION 'Ya eres miembro de este hogar';
    END IF;

    -- Crear membresía
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

    -- Actualizar invitación
    UPDATE household_invitations
    SET current_uses = current_uses + 1,
        used_at = NOW(),
        used_by = v_user_id,
        is_active = CASE WHEN current_uses + 1 >= max_uses THEN false ELSE true END
    WHERE id = v_invitation.id;

    RETURN v_membership;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Obtener membresías del usuario actual
-- =====================================================
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Verificar permisos del usuario
-- =====================================================
CREATE OR REPLACE FUNCTION check_user_permission(
    p_household_id UUID,
    p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_membership household_memberships;
    v_has_permission BOOLEAN := false;
BEGIN
    -- Obtener membresía
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

    -- Verificar permisos por defecto según rol
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

        -- Permisos de gestión (solo admin)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ACTUALIZAR RLS DE TABLAS EXISTENTES
-- Para que respeten el sistema de membresías
-- =====================================================

-- Actualizar políticas de households
DROP POLICY IF EXISTS "Allow all operations on households" ON households;

CREATE POLICY "Users can view their households" ON households
    FOR SELECT USING (
        id IN (
            SELECT household_id FROM household_memberships
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Admins can update their households" ON households
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM household_memberships
            WHERE household_id = households.id
            AND user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

CREATE POLICY "Users can create households" ON households
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- TRIGGER: Crear membresía admin al crear hogar
-- =====================================================
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_household_created ON households;
CREATE TRIGGER on_household_created
    AFTER INSERT ON households
    FOR EACH ROW EXECUTE FUNCTION handle_new_household();

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE user_profiles IS 'Perfiles de usuario extendidos de auth.users';
COMMENT ON TABLE household_memberships IS 'Vinculación de usuarios a hogares con roles';
COMMENT ON TABLE household_invitations IS 'Códigos de invitación para unirse a hogares';
COMMENT ON COLUMN household_memberships.role IS 'admin: control total, empleado: tareas, familia: menú y compras';
COMMENT ON COLUMN household_invitations.code IS 'Código único de 8 caracteres alfanuméricos';

-- =====================================================
-- POLÍTICA TEMPORAL: Acceso público durante migración
-- IMPORTANTE: Remover en producción con auth completa
-- =====================================================
-- CREATE POLICY "Temporary public access" ON user_profiles FOR ALL USING (true);
-- CREATE POLICY "Temporary public access" ON household_memberships FOR ALL USING (true);
-- CREATE POLICY "Temporary public access" ON household_invitations FOR ALL USING (true);
