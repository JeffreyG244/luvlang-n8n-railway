-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 001: Idempotent webhook purchases + atomic API key usage counter
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add stripe_event_id column to purchases table for webhook idempotency.
--    Duplicate Stripe webhook deliveries will upsert instead of double-inserting.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchases' AND column_name = 'stripe_event_id'
    ) THEN
        ALTER TABLE purchases ADD COLUMN stripe_event_id TEXT;
    END IF;
END $$;

-- Create unique index (allows NULLs — only enforces uniqueness on non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_stripe_event_id
    ON purchases (stripe_event_id)
    WHERE stripe_event_id IS NOT NULL;

-- 2. Atomic API key usage increment function.
--    Called via Supabase RPC: POST /rest/v1/rpc/increment_api_key_usage
--    Eliminates the read-then-write race condition where two concurrent requests
--    could both read the same monthly_usage value and lose one increment.
CREATE OR REPLACE FUNCTION increment_api_key_usage(key_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result RECORD;
BEGIN
    UPDATE api_keys
    SET monthly_usage = monthly_usage + 1,
        last_used_at = NOW()
    WHERE id = key_id
    RETURNING id, monthly_usage, monthly_quota
    INTO result;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Key not found');
    END IF;

    RETURN json_build_object(
        'success', true,
        'monthly_usage', result.monthly_usage,
        'monthly_quota', result.monthly_quota
    );
END;
$$;

-- Grant execute permission to the service role (used by serverless functions)
GRANT EXECUTE ON FUNCTION increment_api_key_usage(UUID) TO service_role;
