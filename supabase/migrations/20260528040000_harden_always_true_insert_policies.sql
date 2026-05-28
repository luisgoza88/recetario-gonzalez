-- =====================================================
-- Hardening: policies INSERT/UPDATE con WITH CHECK(true) (advisors Supabase)
-- =====================================================
-- En RLS las policies permisivas se OR-ean: un `true` anula a las seguras.
-- Las escrituras legítimas van por triggers SECURITY DEFINER / service-role
-- (que bypasean RLS) o por el auto-insert de signup (auth.uid() = id), así que
-- cerrar el acceso del cliente no rompe flujos.
-- =====================================================

-- ---- Grupo A: existe policy segura al lado -> DROP de la redundante abierta ----
DROP POLICY IF EXISTS "Service can insert AI logs" ON ai_audit_log;
DROP POLICY IF EXISTS "Allow public insert ai_context" ON ai_context;
DROP POLICY IF EXISTS "Allow public insert ai_conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Public insert budgets" ON budgets;
DROP POLICY IF EXISTS "Admins can create invitations" ON household_invitations;
DROP POLICY IF EXISTS "market_items_insert" ON market_items;
DROP POLICY IF EXISTS "Public insert price_history" ON price_history;
DROP POLICY IF EXISTS "Public insert purchases" ON purchases;
DROP POLICY IF EXISTS "Allow public insert" ON substitution_history;

-- ---- Grupo B: la abierta era la única -> reemplazar por chequeo sano ----
DROP POLICY IF EXISTS "households_insert_policy" ON households;
CREATE POLICY "households_insert_authenticated" ON households
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "users_insert_policy" ON users;
CREATE POLICY "users_insert_self" ON users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
CREATE POLICY "user_profiles_insert_self" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow public insert to image_library" ON image_library;
CREATE POLICY "image_library_insert_authenticated" ON image_library
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "service_role_update_last_used" ON push_subscriptions;
CREATE POLICY "push_subscriptions_update_own" ON push_subscriptions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
