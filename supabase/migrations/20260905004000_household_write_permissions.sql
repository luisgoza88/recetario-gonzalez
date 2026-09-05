BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

CREATE OR REPLACE FUNCTION public.enforce_household_write_permission()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE target uuid; required_permission text := TG_ARGV[0];
BEGIN
  target := CASE WHEN TG_OP = 'DELETE' THEN OLD.household_id ELSE NEW.household_id END;
  IF auth.role() = 'service_role' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_TABLE_NAME = 'scheduled_tasks' AND TG_OP = 'UPDATE'
    AND (to_jsonb(NEW) - ARRAY['status','completed_at','completed_by','notes','updated_at']) =
        (to_jsonb(OLD) - ARRAY['status','completed_at','completed_by','notes','updated_at']) THEN
    required_permission := 'complete_tasks';
  END IF;
  IF NOT check_user_permission(target, required_permission) THEN
    RAISE EXCEPTION 'Missing household permission: %', required_permission USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER recipes_write_permission BEFORE INSERT OR UPDATE OR DELETE ON recipes
  FOR EACH ROW EXECUTE FUNCTION enforce_household_write_permission('edit_recipes');
CREATE TRIGGER menu_write_permission BEFORE INSERT OR UPDATE OR DELETE ON day_menu
  FOR EACH ROW EXECUTE FUNCTION enforce_household_write_permission('edit_menu');
CREATE TRIGGER generated_menu_write_permission BEFORE INSERT OR UPDATE OR DELETE ON generated_menus
  FOR EACH ROW EXECUTE FUNCTION enforce_household_write_permission('edit_menu');
CREATE TRIGGER inventory_write_permission BEFORE INSERT OR UPDATE OR DELETE ON inventory
  FOR EACH ROW EXECUTE FUNCTION enforce_household_write_permission('update_inventory');
CREATE TRIGGER checklist_write_permission BEFORE INSERT OR UPDATE OR DELETE ON market_checklist
  FOR EACH ROW EXECUTE FUNCTION enforce_household_write_permission('edit_shopping_list');
CREATE TRIGGER market_write_permission BEFORE INSERT OR UPDATE OR DELETE ON market_items
  FOR EACH ROW EXECUTE FUNCTION enforce_household_write_permission('edit_shopping_list');
CREATE TRIGGER shopping_write_permission BEFORE INSERT OR UPDATE OR DELETE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION enforce_household_write_permission('edit_shopping_list');
CREATE TRIGGER spaces_write_permission BEFORE INSERT OR UPDATE OR DELETE ON spaces
  FOR EACH ROW EXECUTE FUNCTION enforce_household_write_permission('manage_spaces');
CREATE TRIGGER employees_write_permission BEFORE INSERT OR UPDATE OR DELETE ON home_employees
  FOR EACH ROW EXECUTE FUNCTION enforce_household_write_permission('manage_employees');
CREATE TRIGGER task_templates_write_permission BEFORE INSERT OR UPDATE OR DELETE ON task_templates
  FOR EACH ROW EXECUTE FUNCTION enforce_household_write_permission('manage_tasks');
CREATE TRIGGER tasks_write_permission BEFORE INSERT OR UPDATE OR DELETE ON scheduled_tasks
  FOR EACH ROW EXECUTE FUNCTION enforce_household_write_permission('manage_tasks');

COMMIT;
