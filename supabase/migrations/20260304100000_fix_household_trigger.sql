-- Migration: Fix household creation trigger
-- Fecha: 2026-03-04
-- Problema: on_household_created usa AFTER INSERT pero intenta modificar NEW.owner_id
-- En AFTER triggers, NEW es read-only, por lo que owner_id nunca se establecia.
-- Solucion: Cambiar a BEFORE INSERT trigger para que NEW.owner_id se establezca antes del INSERT.

-- Recrear la funcion (ahora con SET search_path para seguridad)
CREATE OR REPLACE FUNCTION handle_new_household()
RETURNS TRIGGER AS $$
BEGIN
    -- Si hay un usuario autenticado, hacerlo admin del hogar
    IF auth.uid() IS NOT NULL THEN
        -- En BEFORE trigger, podemos modificar NEW antes de que se inserte
        NEW.owner_id := auth.uid();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recrear trigger como BEFORE INSERT (en vez de AFTER INSERT)
DROP TRIGGER IF EXISTS on_household_created ON households;
CREATE TRIGGER on_household_created
    BEFORE INSERT ON households
    FOR EACH ROW EXECUTE FUNCTION handle_new_household();

-- Crear un trigger separado AFTER INSERT para la membresía admin
-- (no se puede insertar en otra tabla dentro de BEFORE INSERT del mismo row)
CREATE OR REPLACE FUNCTION create_household_admin_membership()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO household_memberships (user_id, household_id, role)
        VALUES (auth.uid(), NEW.id, 'admin');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_household_created_membership ON households;
CREATE TRIGGER on_household_created_membership
    AFTER INSERT ON households
    FOR EACH ROW EXECUTE FUNCTION create_household_admin_membership();

-- Comentar la separacion
COMMENT ON FUNCTION handle_new_household() IS 'BEFORE INSERT: establece owner_id del household';
COMMENT ON FUNCTION create_household_admin_membership() IS 'AFTER INSERT: crea membresia admin para el creador';
