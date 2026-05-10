-- Push subscriptions table para Web Push Notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- Indices para queries eficientes
CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subs_created ON push_subscriptions(created_at DESC);

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "users_view_own_subs" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own subscriptions
CREATE POLICY "users_insert_own_subs" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own subscriptions
CREATE POLICY "users_delete_own_subs" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Service role can update last_used_at (para tracking de actividad)
CREATE POLICY "service_role_update_last_used" ON push_subscriptions
  FOR UPDATE USING (true)
  WITH CHECK (true);
