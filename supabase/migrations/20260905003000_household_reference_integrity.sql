BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

-- Protect relationships even when one user belongs to both households.
CREATE OR REPLACE FUNCTION public.enforce_household_references()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE relation text; column_name text; referenced_id text; target_household uuid; i int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.household_id IS DISTINCT FROM OLD.household_id THEN
    RAISE EXCEPTION 'Household ownership cannot change' USING ERRCODE = '42501';
  END IF;
  IF NEW.household_id IS NULL THEN
    RAISE EXCEPTION 'Household is required' USING ERRCODE = '23514';
  END IF;
  i := 0;
  WHILE i < TG_NARGS LOOP
    column_name := TG_ARGV[i]; relation := TG_ARGV[i+1];
    referenced_id := to_jsonb(NEW)->>column_name;
    IF referenced_id IS NOT NULL THEN
      EXECUTE format('SELECT household_id FROM public.%I WHERE id::text = $1', relation)
        INTO target_household USING referenced_id;
      IF target_household IS DISTINCT FROM NEW.household_id THEN
        RAISE EXCEPTION 'Reference % belongs to another household', column_name USING ERRCODE = '23514';
      END IF;
    END IF;
    i := i + 2;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_household_integrity BEFORE INSERT OR UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION enforce_household_references('item_id','market_items');
CREATE TRIGGER checklist_household_integrity BEFORE INSERT OR UPDATE ON market_checklist
  FOR EACH ROW EXECUTE FUNCTION enforce_household_references('item_id','market_items');
CREATE TRIGGER day_menu_household_integrity BEFORE INSERT OR UPDATE ON day_menu
  FOR EACH ROW EXECUTE FUNCTION enforce_household_references('breakfast_id','recipes','lunch_id','recipes','dinner_id','recipes');
CREATE TRIGGER shopping_list_household_integrity BEFORE INSERT OR UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION enforce_household_references('menu_id','generated_menus');
CREATE TRIGGER scheduled_task_household_integrity BEFORE INSERT OR UPDATE ON scheduled_tasks
  FOR EACH ROW EXECUTE FUNCTION enforce_household_references('employee_id','home_employees','space_id','spaces','task_template_id','task_templates');

COMMIT;
