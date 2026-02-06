-- ============================================
-- LUVLANG API DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- API USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    company VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- API KEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for display (lm_xxxx...)
    name VARCHAR(100) DEFAULT 'Default Key',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Permissions
    scopes TEXT[] DEFAULT ARRAY['read', 'write'],

    UNIQUE(key_hash)
);

-- Index for fast API key lookups
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = TRUE;

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,

    -- Tier: free, pro, studio, enterprise
    tier VARCHAR(20) NOT NULL DEFAULT 'free',

    -- Stripe integration
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),

    -- Billing
    status VARCHAR(20) DEFAULT 'active', -- active, canceled, past_due, trialing
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- ============================================
-- USAGE TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,

    -- Time period (monthly)
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Counters
    requests_count INTEGER DEFAULT 0,
    audio_bytes_processed BIGINT DEFAULT 0,
    tracks_mastered INTEGER DEFAULT 0,
    batch_jobs INTEGER DEFAULT 0,

    -- Breakdown by endpoint
    analyze_count INTEGER DEFAULT 0,
    master_count INTEGER DEFAULT 0,
    auto_master_count INTEGER DEFAULT 0,
    export_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, period_start)
);

-- Index for usage lookups
CREATE INDEX idx_api_usage_user_period ON api_usage(user_id, period_start);

-- ============================================
-- REQUEST LOGS TABLE (for analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS api_request_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,

    -- Request details
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,

    -- File info (if applicable)
    file_size_bytes BIGINT,
    file_type VARCHAR(50),

    -- Metadata
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for log queries (auto-delete old logs)
CREATE INDEX idx_api_logs_created ON api_request_logs(created_at);

-- ============================================
-- TIER LIMITS (Reference table)
-- ============================================
CREATE TABLE IF NOT EXISTS tier_limits (
    tier VARCHAR(20) PRIMARY KEY,
    requests_per_month INTEGER,
    audio_mb_per_month INTEGER,
    max_file_size_mb INTEGER,
    batch_size INTEGER,
    features JSONB,
    price_monthly_cents INTEGER,
    price_yearly_cents INTEGER
);

-- Insert tier data
INSERT INTO tier_limits (tier, requests_per_month, audio_mb_per_month, max_file_size_mb, batch_size, features, price_monthly_cents, price_yearly_cents)
VALUES
    ('free', 100, 500, 50, 1, '{"analyze": true, "master": true, "autoMaster": false, "batch": false, "priority": false}', 0, 0),
    ('pro', 1000, 5000, 200, 10, '{"analyze": true, "master": true, "autoMaster": true, "batch": true, "priority": false}', 2900, 29000),
    ('studio', 10000, 50000, 500, 50, '{"analyze": true, "master": true, "autoMaster": true, "batch": true, "priority": true}', 9900, 99000),
    ('enterprise', -1, -1, 500, -1, '{"analyze": true, "master": true, "autoMaster": true, "batch": true, "priority": true, "dedicated": true}', 49900, 499000)
ON CONFLICT (tier) DO UPDATE SET
    requests_per_month = EXCLUDED.requests_per_month,
    audio_mb_per_month = EXCLUDED.audio_mb_per_month,
    features = EXCLUDED.features;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_api_users_updated_at BEFORE UPDATE ON api_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_subscriptions_updated_at BEFORE UPDATE ON api_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_usage_updated_at BEFORE UPDATE ON api_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_api_usage(
    p_user_id UUID,
    p_api_key_id UUID,
    p_endpoint VARCHAR,
    p_bytes BIGINT DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    -- Get current month period
    v_period_start := DATE_TRUNC('month', CURRENT_DATE);
    v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- Insert or update usage record
    INSERT INTO api_usage (user_id, api_key_id, period_start, period_end, requests_count, audio_bytes_processed)
    VALUES (p_user_id, p_api_key_id, v_period_start, v_period_end, 1, p_bytes)
    ON CONFLICT (user_id, period_start)
    DO UPDATE SET
        requests_count = api_usage.requests_count + 1,
        audio_bytes_processed = api_usage.audio_bytes_processed + p_bytes,
        analyze_count = CASE WHEN p_endpoint = 'analyze' THEN api_usage.analyze_count + 1 ELSE api_usage.analyze_count END,
        master_count = CASE WHEN p_endpoint = 'master' THEN api_usage.master_count + 1 ELSE api_usage.master_count END,
        auto_master_count = CASE WHEN p_endpoint = 'auto_master' THEN api_usage.auto_master_count + 1 ELSE api_usage.auto_master_count END,
        export_count = CASE WHEN p_endpoint = 'export' THEN api_usage.export_count + 1 ELSE api_usage.export_count END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE api_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Policies (users can only see their own data)
CREATE POLICY "Users can view own data" ON api_users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own keys" ON api_keys
    FOR ALL USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view own subscription" ON api_subscriptions
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view own usage" ON api_usage
    FOR SELECT USING (user_id::text = auth.uid()::text);

-- ============================================
-- CLEANUP JOB (run via pg_cron or external)
-- ============================================

-- Delete logs older than 90 days
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-old-logs', '0 3 * * *',
--     $$DELETE FROM api_request_logs WHERE created_at < NOW() - INTERVAL '90 days'$$);
