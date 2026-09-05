BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

-- One transaction: a failed space/employee insert must not mark setup complete.
CREATE OR REPLACE FUNCTION public.complete_household_onboarding(p_household_id uuid, p_config jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid := p_household_id; item jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF length(trim(p_config->>'name')) NOT BETWEEN 1 AND 100
    OR (p_config->>'members_count')::int NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Invalid household configuration';
  END IF;
  IF target IS NULL THEN
    INSERT INTO households(name, slug, owner_name, setup_completed)
      VALUES(trim(p_config->>'name'), 'hogar-' || gen_random_uuid(), '', false) RETURNING id INTO target;
    -- Production does not have the legacy auto-membership trigger.
    INSERT INTO household_memberships(user_id, household_id, role, is_active)
      VALUES(auth.uid(), target, 'admin', true) ON CONFLICT DO NOTHING;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM household_memberships WHERE household_id = target
      AND user_id = auth.uid() AND is_active AND role = 'admin') THEN
    RAISE EXCEPTION 'Household admin required' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM households WHERE id = target FOR UPDATE;
  IF (SELECT setup_completed FROM households WHERE id = target) THEN RETURN target; END IF;
  UPDATE households SET name = trim(p_config->>'name'), settings = coalesce(settings, '{}'::jsonb) || p_config,
    dietary_preferences = coalesce(dietary_preferences, '{}'::jsonb) || jsonb_build_object(
      'restrictions', p_config->'restrictions', 'allergies', p_config->'allergies'),
    cooking_profile = coalesce(cooking_profile, '{}'::jsonb) || jsonb_build_object(
      'family_size', (p_config->>'members_count')::int, 'family_name', p_config->>'name',
      'cooking_style', p_config->>'cuisine_template')
    WHERE id = target;
  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_config->'spaces', '[]'::jsonb)) LOOP
    INSERT INTO spaces(household_id, custom_name, category) VALUES(target, item->>'name', item->>'category');
  END LOOP;
  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_config->'employees', '[]'::jsonb)) LOOP
    INSERT INTO home_employees(household_id, name, role, work_days)
      VALUES(target, item->>'name', item->>'role', (jsonb_populate_record(NULL::home_employees, jsonb_build_object('work_days', coalesce(item->'workDays', '[]'::jsonb)))).work_days);
  END LOOP;
  UPDATE households SET setup_completed = true, updated_at = now() WHERE id = target;
  RETURN target;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_household_onboarding(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_household_onboarding(uuid,jsonb) TO authenticated;

COMMIT;
