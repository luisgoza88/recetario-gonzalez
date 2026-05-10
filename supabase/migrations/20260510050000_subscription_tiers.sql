CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'family');

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE UNIQUE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trial')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subs_select" ON subscriptions FOR SELECT
  USING (is_household_member(household_id));

-- Si no existe registro para un household, se considera free
-- (no insertamos automáticamente)

-- Función helper
CREATE OR REPLACE FUNCTION get_household_tier(p_household_id uuid)
RETURNS subscription_tier AS $$
DECLARE
  v_tier subscription_tier;
BEGIN
  SELECT tier INTO v_tier FROM subscriptions
    WHERE household_id = p_household_id AND status IN ('active', 'trial');
  RETURN COALESCE(v_tier, 'free'::subscription_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
