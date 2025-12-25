-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SUPABASE DATABASE SCHEMA FOR LUVLANG MASTERING
-- Run this SQL in your Supabase SQL Editor
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 1: USER PROFILES
-- Stores extended user information beyond Supabase Auth
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    subscription_tier TEXT DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 2: USER PRESETS
-- Stores saved EQ/compressor/limiter presets
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.user_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preset_name TEXT NOT NULL,
    eq_settings JSONB DEFAULT '{}'::jsonb,
    compressor_settings JSONB DEFAULT '{}'::jsonb,
    limiter_settings JSONB DEFAULT '{}'::jsonb,
    target_lufs REAL DEFAULT -14.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, preset_name) -- Prevent duplicate preset names per user
);

-- Enable Row Level Security
ALTER TABLE public.user_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_presets
CREATE POLICY "Users can view their own presets"
    ON public.user_presets
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets"
    ON public.user_presets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
    ON public.user_presets
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
    ON public.user_presets
    FOR DELETE
    USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 3: MASTERING HISTORY
-- Stores history of mastering sessions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.mastering_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    target_platform TEXT DEFAULT 'spotify',
    target_lufs REAL DEFAULT -14.0,
    final_lufs REAL,
    true_peak REAL,
    processing_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.mastering_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mastering_history
CREATE POLICY "Users can view their own history"
    ON public.mastering_history
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
    ON public.mastering_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history"
    ON public.mastering_history
    FOR DELETE
    USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 4: SUBSCRIPTION TIERS
-- Defines subscription tier limits and features
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT UNIQUE NOT NULL,
    max_presets INTEGER DEFAULT 3,
    history_retention_days INTEGER DEFAULT 7,
    features JSONB DEFAULT '[]'::jsonb,
    price_monthly REAL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (public read)
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policy for subscription_tiers (everyone can read)
CREATE POLICY "Anyone can view subscription tiers"
    ON public.subscription_tiers
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Insert default subscription tiers
INSERT INTO public.subscription_tiers (tier_name, max_presets, history_retention_days, features, price_monthly) VALUES
    ('free', 3, 7, '["basic_mastering", "platform_presets", "7_band_eq"]'::jsonb, 0.0),
    ('pro', 50, 90, '["basic_mastering", "platform_presets", "7_band_eq", "stem_mastering", "spectral_repair", "unlimited_downloads"]'::jsonb, 9.99),
    ('legendary', 999, 365, '["basic_mastering", "platform_presets", "7_band_eq", "stem_mastering", "spectral_repair", "unlimited_downloads", "priority_support", "custom_presets", "api_access"]'::jsonb, 29.99)
ON CONFLICT (tier_name) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FUNCTIONS AND TRIGGERS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_presets
CREATE TRIGGER update_user_presets_updated_at
    BEFORE UPDATE ON public.user_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INDEXES FOR PERFORMANCE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- user_presets indexes
CREATE INDEX IF NOT EXISTS user_presets_user_id_idx ON public.user_presets(user_id);
CREATE INDEX IF NOT EXISTS user_presets_created_at_idx ON public.user_presets(created_at DESC);

-- mastering_history indexes
CREATE INDEX IF NOT EXISTS mastering_history_user_id_idx ON public.mastering_history(user_id);
CREATE INDEX IF NOT EXISTS mastering_history_created_at_idx ON public.mastering_history(created_at DESC);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SCHEMA COMPLETE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Verify tables were created
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'user_presets', 'mastering_history', 'subscription_tiers')
ORDER BY table_name;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- NEXT STEPS:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Get your Supabase project URL and anon key
-- 3. Update supabase-client.js with your credentials
-- 4. Add supabase-client.js script tag to HTML
-- 5. Call initializeSupabase() on page load
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
