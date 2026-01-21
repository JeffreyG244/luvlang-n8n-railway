-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- API KEY SYSTEM SCHEMA FOR LUVLANG MASTERING
-- Enables developers to access the mastering API programmatically
-- Run this SQL in your Supabase SQL Editor after the main schema
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: API KEYS
-- Stores developer API keys for programmatic access
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Key identification
    name TEXT NOT NULL,                           -- User-friendly name (e.g., "Production App")
    key_prefix TEXT NOT NULL,                     -- First 8 chars of key for identification (e.g., "lm_live_")
    key_hash TEXT NOT NULL,                       -- SHA-256 hash of the full key (never store plain key)

    -- Permissions & Limits
    tier_access TEXT DEFAULT 'instant',           -- Highest tier this key can access: instant, precision, legendary
    rate_limit INTEGER DEFAULT 60,                -- Requests per minute
    monthly_quota INTEGER DEFAULT 100,            -- Max API calls per month (null = unlimited)
    monthly_usage INTEGER DEFAULT 0,              -- Current month's usage count

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,         -- Optional expiration date

    -- Metadata
    allowed_origins TEXT[],                       -- CORS: allowed domains (empty = all)
    allowed_ips TEXT[],                           -- IP whitelist (empty = all)
    metadata JSONB DEFAULT '{}'::jsonb,          -- Custom metadata

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own API keys"
    ON public.api_keys
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
    ON public.api_keys
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
    ON public.api_keys
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
    ON public.api_keys
    FOR DELETE
    USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: API KEY USAGE LOGS
-- Tracks API key usage for analytics and billing
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.api_key_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Request details
    endpoint TEXT NOT NULL,                       -- API endpoint called
    method TEXT NOT NULL,                         -- HTTP method
    status_code INTEGER,                          -- Response status code
    response_time_ms INTEGER,                     -- Response time in milliseconds

    -- Request metadata
    ip_address TEXT,
    user_agent TEXT,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,

    -- Billing
    credits_used INTEGER DEFAULT 1,               -- API credits consumed

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy (users can only view their own usage)
CREATE POLICY "Users can view their own API usage"
    ON public.api_key_usage
    FOR SELECT
    USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INDEXES FOR PERFORMANCE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- API keys indexes
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_key_prefix_idx ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON public.api_keys(is_active) WHERE is_active = true;

-- Usage logs indexes
CREATE INDEX IF NOT EXISTS api_key_usage_api_key_id_idx ON public.api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS api_key_usage_created_at_idx ON public.api_key_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS api_key_usage_user_id_month_idx ON public.api_key_usage(user_id, created_at);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FUNCTIONS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for api_keys
CREATE TRIGGER update_api_keys_timestamp
    BEFORE UPDATE ON public.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_api_keys_updated_at();

-- Function to increment monthly usage
CREATE OR REPLACE FUNCTION increment_api_key_usage(key_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.api_keys
    SET
        monthly_usage = monthly_usage + 1,
        last_used_at = NOW()
    WHERE id = key_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly usage (run via cron job on 1st of month)
CREATE OR REPLACE FUNCTION reset_monthly_api_usage()
RETURNS void AS $$
BEGIN
    UPDATE public.api_keys
    SET monthly_usage = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to validate API key and check limits
CREATE OR REPLACE FUNCTION validate_api_key(key_hash_input TEXT)
RETURNS TABLE (
    key_id UUID,
    user_id UUID,
    tier_access TEXT,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    api_key_record RECORD;
BEGIN
    -- Find the API key
    SELECT * INTO api_key_record
    FROM public.api_keys
    WHERE api_keys.key_hash = key_hash_input;

    -- Key not found
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            NULL::UUID,
            NULL::UUID,
            NULL::TEXT,
            false,
            'Invalid API key'::TEXT;
        RETURN;
    END IF;

    -- Key is inactive
    IF NOT api_key_record.is_active THEN
        RETURN QUERY SELECT
            api_key_record.id,
            api_key_record.user_id,
            api_key_record.tier_access,
            false,
            'API key is inactive'::TEXT;
        RETURN;
    END IF;

    -- Key has expired
    IF api_key_record.expires_at IS NOT NULL AND api_key_record.expires_at < NOW() THEN
        RETURN QUERY SELECT
            api_key_record.id,
            api_key_record.user_id,
            api_key_record.tier_access,
            false,
            'API key has expired'::TEXT;
        RETURN;
    END IF;

    -- Monthly quota exceeded
    IF api_key_record.monthly_quota IS NOT NULL
       AND api_key_record.monthly_usage >= api_key_record.monthly_quota THEN
        RETURN QUERY SELECT
            api_key_record.id,
            api_key_record.user_id,
            api_key_record.tier_access,
            false,
            'Monthly quota exceeded'::TEXT;
        RETURN;
    END IF;

    -- Key is valid
    RETURN QUERY SELECT
        api_key_record.id,
        api_key_record.user_id,
        api_key_record.tier_access,
        true,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VIEWS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- View: API keys with usage summary (for dashboard)
CREATE OR REPLACE VIEW api_keys_summary AS
SELECT
    ak.id,
    ak.user_id,
    ak.name,
    ak.key_prefix,
    ak.tier_access,
    ak.rate_limit,
    ak.monthly_quota,
    ak.monthly_usage,
    ak.is_active,
    ak.last_used_at,
    ak.expires_at,
    ak.created_at,
    CASE
        WHEN ak.monthly_quota IS NULL THEN 100
        ELSE ROUND((ak.monthly_usage::NUMERIC / ak.monthly_quota::NUMERIC) * 100, 1)
    END as usage_percentage,
    (
        SELECT COUNT(*)
        FROM public.api_key_usage aku
        WHERE aku.api_key_id = ak.id
        AND aku.created_at >= NOW() - INTERVAL '24 hours'
    ) as requests_24h
FROM public.api_keys ak;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SAMPLE DATA (Optional - for testing)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Uncomment to add test data:
-- INSERT INTO public.api_keys (user_id, name, key_prefix, key_hash, tier_access)
-- VALUES ('YOUR_USER_ID_HERE', 'Test Key', 'lm_test_', 'HASH_HERE', 'instant');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SCHEMA COMPLETE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Verify tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('api_keys', 'api_key_usage');
