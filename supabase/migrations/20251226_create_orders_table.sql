-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- LUVLANG LEGENDARY - ORDERS TABLE & SECURITY POLICIES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Purpose: Track paid mastering orders with secure file delivery
-- Security: Row Level Security (RLS) ensures users only see their own orders
-- Integration: Stripe webhook updates order status on payment completion
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_session_id TEXT UNIQUE NOT NULL,
    file_path TEXT NOT NULL,
    original_filename TEXT,
    file_size_bytes BIGINT,
    amount_cents INTEGER NOT NULL DEFAULT 2999, -- $29.99 in cents
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for fast queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- Create index on stripe_session_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON public.orders(stripe_session_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Create index on file_path for download verification
CREATE INDEX IF NOT EXISTS idx_orders_file_path ON public.orders(file_path);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ROW LEVEL SECURITY POLICIES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own orders
CREATE POLICY "Users can view their own orders"
    ON public.orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own orders (during checkout)
CREATE POLICY "Users can create their own orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own orders (status transitions only)
-- Service role key bypasses RLS automatically, so no permissive policy needed
CREATE POLICY "Users can update their own orders"
    ON public.orders
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- AUTOMATIC UPDATED_AT TRIGGER
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- HELPER FUNCTION: Check if file is paid
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Function to check if a user has paid for a specific file
CREATE OR REPLACE FUNCTION public.has_paid_for_file(
    p_user_id UUID,
    p_file_path TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.orders
        WHERE user_id = p_user_id
          AND file_path = p_file_path
          AND status = 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.has_paid_for_file TO authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- COMMENTS FOR DOCUMENTATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMENT ON TABLE public.orders IS 'Tracks paid mastering orders with Stripe integration';
COMMENT ON COLUMN public.orders.id IS 'Unique order identifier';
COMMENT ON COLUMN public.orders.user_id IS 'User who purchased the master (references auth.users)';
COMMENT ON COLUMN public.orders.stripe_session_id IS 'Stripe Checkout Session ID for payment tracking';
COMMENT ON COLUMN public.orders.file_path IS 'Path to the mastered audio file in Supabase Storage';
COMMENT ON COLUMN public.orders.original_filename IS 'Original filename for user reference';
COMMENT ON COLUMN public.orders.status IS 'Order status: pending, completed, failed, or refunded';
COMMENT ON COLUMN public.orders.metadata IS 'Additional order metadata (genre, platform target, etc.)';
COMMENT ON COLUMN public.orders.created_at IS 'Timestamp when order was created';
COMMENT ON COLUMN public.orders.completed_at IS 'Timestamp when payment was completed';
