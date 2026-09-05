BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE public.recipe_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  recipe_id text NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
ALTER TABLE public.recipe_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY recipe_shares_members ON public.recipe_shares FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM household_memberships m WHERE m.household_id = recipe_shares.household_id AND m.user_id = auth.uid() AND m.is_active))
  WITH CHECK (EXISTS (SELECT 1 FROM household_memberships m WHERE m.household_id = recipe_shares.household_id AND m.user_id = auth.uid() AND m.is_active));
REVOKE ALL ON public.recipe_shares FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_shares TO authenticated;
-- New empty table created in this transaction; concurrent creation is unnecessary.
-- squawk-ignore require-concurrent-index-creation
CREATE INDEX recipe_shares_household_idx ON public.recipe_shares(household_id);

COMMIT;
