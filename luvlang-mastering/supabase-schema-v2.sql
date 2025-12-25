-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SUPABASE DATABASE SCHEMA V2 FOR LUVLANG MASTERING
-- Updated for per-song pricing model: Basic ($9.99), Advanced ($19.99), Professional ($29.99)
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
-- TABLE 2: MASTERING TIERS
-- Defines the 3 mastering tiers and their features
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.mastering_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT UNIQUE NOT NULL,
    tier_slug TEXT UNIQUE NOT NULL,
    price_per_song REAL NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (public read)
ALTER TABLE public.mastering_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policy for mastering_tiers (everyone can read)
CREATE POLICY "Anyone can view mastering tiers"
    ON public.mastering_tiers
    FOR SELECT
    TO authenticated, anon
    USING (is_active = true);

-- Insert the 3 mastering tiers
INSERT INTO public.mastering_tiers (tier_name, tier_slug, price_per_song, features, display_order) VALUES
    (
        'INSTANT',
        'instant',
        9.99,
        '{
            "tagline": "Professional AI Mastering in 60 Seconds",
            "features": [
                "AI-powered loudness normalization (99%+ LUFS accuracy)",
                "Platform presets (Spotify, Apple Music, YouTube, Tidal)",
                "7-band professional EQ",
                "Dynamic compression & true peak limiting",
                "Stereo WAV export (24-bit, 44.1kHz)",
                "Instant delivery (60 seconds)"
            ],
            "capabilities": {
                "basic_mastering": true,
                "platform_presets": true,
                "eq_bands": 7,
                "export_formats": ["WAV"],
                "transient_detection": false,
                "noise_removal": false,
                "stereo_editor": false,
                "stem_mastering": false,
                "reference_matching": false,
                "mastering_report": false
            }
        }'::jsonb,
        1
    ),
    (
        'PRECISION',
        'precision',
        19.99,
        '{
            "tagline": "Advanced AI + Manual Control",
            "features": [
                "Everything in INSTANT, plus:",
                "Real-time transient detection (drum optimization)",
                "AI spectral noise removal (4 noise types)",
                "7-band stereo field editor (frequency-specific width)",
                "Interactive waveform editing (DAW-like precision)",
                "Multi-format export (WAV, MP3 320kbps, FLAC)",
                "5 custom preset saves",
                "Session history (90 days)"
            ],
            "capabilities": {
                "basic_mastering": true,
                "platform_presets": true,
                "eq_bands": 7,
                "export_formats": ["WAV", "MP3", "FLAC"],
                "transient_detection": true,
                "noise_removal": true,
                "stereo_editor": true,
                "stem_mastering": false,
                "reference_matching": false,
                "mastering_report": false,
                "max_presets": 5,
                "history_days": 90
            }
        }'::jsonb,
        2
    ),
    (
        'LEGENDARY',
        'legendary',
        29.99,
        '{
            "tagline": "Studio-Grade Mastering Suite",
            "features": [
                "Everything in PRECISION, plus:",
                "Stem mastering (up to 5 stems)",
                "Reference track matching (analyze commercial releases)",
                "Advanced spectral repair (surgical frequency removal)",
                "Offline true peak analysis (broadcast-safe)",
                "Unlimited custom presets",
                "Session history (365 days)",
                "Downloadable mastering report (before/after analysis)",
                "Priority processing & support"
            ],
            "capabilities": {
                "basic_mastering": true,
                "platform_presets": true,
                "eq_bands": 7,
                "export_formats": ["WAV", "MP3", "FLAC", "AIFF"],
                "transient_detection": true,
                "noise_removal": true,
                "stereo_editor": true,
                "stem_mastering": true,
                "reference_matching": true,
                "mastering_report": true,
                "max_presets": 999,
                "history_days": 365,
                "priority_support": true
            }
        }'::jsonb,
        3
    )
ON CONFLICT (tier_slug) DO UPDATE SET
    price_per_song = EXCLUDED.price_per_song,
    features = EXCLUDED.features;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 3: PURCHASES (Per-Song Transactions)
-- Tracks individual song purchases and payments
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES public.mastering_tiers(id),
    tier_slug TEXT NOT NULL,
    amount_paid REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_provider TEXT DEFAULT 'stripe',
    payment_id TEXT, -- Stripe payment intent ID
    payment_status TEXT DEFAULT 'pending', -- pending, succeeded, failed, refunded
    original_filename TEXT,
    processed_filename TEXT,
    download_url TEXT,
    download_expires_at TIMESTAMP WITH TIME ZONE,
    processing_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Track LUFS measurements
    target_lufs REAL,
    final_lufs REAL,
    true_peak REAL
);

-- Enable Row Level Security
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchases
CREATE POLICY "Users can view their own purchases"
    ON public.purchases
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases"
    ON public.purchases
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchases"
    ON public.purchases
    FOR UPDATE
    USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 4: USER PRESETS
-- Stores saved EQ/compressor/limiter presets (tier-based limits)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.user_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preset_name TEXT NOT NULL,
    eq_settings JSONB DEFAULT '{}'::jsonb,
    compressor_settings JSONB DEFAULT '{}'::jsonb,
    limiter_settings JSONB DEFAULT '{}'::jsonb,
    stereo_settings JSONB DEFAULT '{}'::jsonb,
    target_lufs REAL DEFAULT -14.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, preset_name)
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
-- TABLE 5: MASTERING SESSIONS
-- Tracks all mastering sessions (purchased and unpurchased)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.mastering_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous sessions
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
    original_filename TEXT NOT NULL,
    target_platform TEXT DEFAULT 'spotify',
    target_lufs REAL DEFAULT -14.0,
    final_lufs REAL,
    true_peak REAL,
    dynamic_range REAL,
    processing_settings JSONB DEFAULT '{}'::jsonb,
    is_purchased BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.mastering_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mastering_sessions
CREATE POLICY "Users can view their own sessions"
    ON public.mastering_sessions
    FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert sessions"
    ON public.mastering_sessions
    FOR INSERT
    WITH CHECK (true); -- Allow anonymous users to create sessions

CREATE POLICY "Users can update their own sessions"
    ON public.mastering_sessions
    FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

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

-- Function to check if user has reached preset limit based on their tier
CREATE OR REPLACE FUNCTION check_preset_limit()
RETURNS TRIGGER AS $$
DECLARE
    preset_count INTEGER;
    max_presets INTEGER;
    highest_tier JSONB;
BEGIN
    -- Count existing presets for this user
    SELECT COUNT(*) INTO preset_count
    FROM public.user_presets
    WHERE user_id = NEW.user_id;

    -- Get the highest tier the user has purchased
    SELECT t.features->'capabilities' INTO highest_tier
    FROM public.purchases p
    JOIN public.mastering_tiers t ON p.tier_id = t.id
    WHERE p.user_id = NEW.user_id
    AND p.payment_status = 'succeeded'
    ORDER BY t.price_per_song DESC
    LIMIT 1;

    -- If no purchases, limit to 0 (or allow 1 free preset for demos)
    IF highest_tier IS NULL THEN
        max_presets := 1; -- Allow 1 free preset for trial
    ELSE
        max_presets := COALESCE((highest_tier->>'max_presets')::INTEGER, 1);
    END IF;

    -- Check if limit exceeded
    IF preset_count >= max_presets THEN
        RAISE EXCEPTION 'Preset limit reached. Maximum % presets allowed for your tier.', max_presets;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce preset limits
CREATE TRIGGER enforce_preset_limit
    BEFORE INSERT ON public.user_presets
    FOR EACH ROW
    EXECUTE FUNCTION check_preset_limit();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INDEXES FOR PERFORMANCE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- purchases indexes
CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_created_at_idx ON public.purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS purchases_payment_status_idx ON public.purchases(payment_status);
CREATE INDEX IF NOT EXISTS purchases_payment_id_idx ON public.purchases(payment_id);

-- user_presets indexes
CREATE INDEX IF NOT EXISTS user_presets_user_id_idx ON public.user_presets(user_id);
CREATE INDEX IF NOT EXISTS user_presets_created_at_idx ON public.user_presets(created_at DESC);

-- mastering_sessions indexes
CREATE INDEX IF NOT EXISTS mastering_sessions_user_id_idx ON public.mastering_sessions(user_id);
CREATE INDEX IF NOT EXISTS mastering_sessions_created_at_idx ON public.mastering_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS mastering_sessions_purchase_id_idx ON public.mastering_sessions(purchase_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VIEWS FOR EASY QUERYING
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- View to get user's highest purchased tier
CREATE OR REPLACE VIEW user_tier_access AS
SELECT
    p.user_id,
    t.tier_name,
    t.tier_slug,
    t.price_per_song,
    t.features,
    MAX(t.price_per_song) OVER (PARTITION BY p.user_id) as highest_tier_price
FROM public.purchases p
JOIN public.mastering_tiers t ON p.tier_id = t.id
WHERE p.payment_status = 'succeeded';

-- View to get purchase history with tier details
CREATE OR REPLACE VIEW purchase_history AS
SELECT
    p.id,
    p.user_id,
    p.tier_slug,
    t.tier_name,
    p.amount_paid,
    p.currency,
    p.payment_status,
    p.original_filename,
    p.target_lufs,
    p.final_lufs,
    p.true_peak,
    p.created_at,
    p.completed_at
FROM public.purchases p
JOIN public.mastering_tiers t ON p.tier_id = t.id
ORDER BY p.created_at DESC;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SCHEMA COMPLETE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Verify tables were created
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'mastering_tiers', 'purchases', 'user_presets', 'mastering_sessions')
ORDER BY table_name;

-- Display the 3 tiers
SELECT tier_name, tier_slug, price_per_song, display_order
FROM public.mastering_tiers
ORDER BY display_order;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- NEXT STEPS:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Set up Stripe account and get API keys
-- 3. Integrate Stripe Checkout in the frontend
-- 4. Add tier-based feature gating to the mastering app
-- 5. Implement download flow that requires payment
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
