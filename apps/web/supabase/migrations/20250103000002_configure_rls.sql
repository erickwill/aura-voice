-- Comprehensive RLS Configuration
-- Drop existing policies and recreate with proper permissions

-- ============================================
-- API TOKENS
-- Users can fully manage their own tokens
-- ============================================
DROP POLICY IF EXISTS "Users can manage own api_tokens" ON "api_tokens";

CREATE POLICY "Users can select own api_tokens" ON "api_tokens"
	FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own api_tokens" ON "api_tokens"
	FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own api_tokens" ON "api_tokens"
	FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own api_tokens" ON "api_tokens"
	FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================
-- DEVICE CODES
-- Complex flow: CLI creates codes (unauthenticated), user confirms (authenticated)
-- All operations go through service role, so we allow service role bypass
-- Users can only see their confirmed codes
-- ============================================
DROP POLICY IF EXISTS "Users can view own device_codes" ON "device_codes";

-- Users can only see device codes they've confirmed
CREATE POLICY "Users can view own confirmed device_codes" ON "device_codes"
	FOR SELECT USING (auth.uid()::text = user_id AND confirmed_at IS NOT NULL);

-- Authenticated users can confirm device codes (update to set their user_id)
CREATE POLICY "Users can confirm device_codes" ON "device_codes"
	FOR UPDATE USING (
		-- Code must not be expired
		expires_at > now()
		-- Code must not already be confirmed
		AND confirmed_at IS NULL
	)
	WITH CHECK (
		-- User can only set their own user_id
		auth.uid()::text = user_id
	);

-- ============================================
-- SUBSCRIPTIONS
-- Users can only read their own subscription
-- All writes done by service role (Stripe webhooks)
-- ============================================
DROP POLICY IF EXISTS "Users can view own subscription" ON "subscriptions";

CREATE POLICY "Users can view own subscription" ON "subscriptions"
	FOR SELECT USING (auth.uid()::text = user_id);

-- ============================================
-- USAGE
-- Users can only read their own usage records
-- All writes done by service role (API tracking)
-- ============================================
DROP POLICY IF EXISTS "Users can view own usage" ON "usage";

CREATE POLICY "Users can view own usage" ON "usage"
	FOR SELECT USING (auth.uid()::text = user_id);

-- ============================================
-- USAGE LIMITS
-- Users can only read their own limits
-- All writes done by service role
-- ============================================
DROP POLICY IF EXISTS "Users can view own usage_limits" ON "usage_limits";

CREATE POLICY "Users can view own usage_limits" ON "usage_limits"
	FOR SELECT USING (auth.uid()::text = user_id);

-- ============================================
-- USERS
-- Already configured in previous migration, but let's ensure completeness
-- ============================================

-- Allow users to insert their own record (for edge cases where trigger doesn't fire)
DROP POLICY IF EXISTS "Users can insert own record" ON "users";
CREATE POLICY "Users can insert own record" ON "users"
	FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- SERVICE ROLE BYPASS NOTE
-- ============================================
-- The service_role key bypasses RLS entirely.
-- Backend operations (device code creation, usage tracking, subscription updates)
-- should use the service_role key via createClient with serviceRoleKey.
--
-- The anon key respects RLS, so client-side operations are properly restricted.
