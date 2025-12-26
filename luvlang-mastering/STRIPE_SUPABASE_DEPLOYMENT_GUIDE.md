# LUVLANG LEGENDARY - STRIPE & SUPABASE PAYMENT SYSTEM
## Complete Deployment Guide

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Status:** Production-Ready Payment & File Delivery System
**Security:** Zero-trust architecture with signed URLs and JWT verification
**Price:** $29.99 per master (Stripe Checkout)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Files Created](#files-created)
3. [Supabase Setup](#supabase-setup)
4. [Stripe Setup](#stripe-setup)
5. [Edge Functions Deployment](#edge-functions-deployment)
6. [Frontend Integration](#frontend-integration)
7. [Testing](#testing)
8. [Security Checklist](#security-checklist)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

```
User Action → Frontend → Edge Function → Stripe → Webhook → Database → Signed URL → Download
```

### Flow:

1. **User clicks "Buy Master"**
   - Frontend checks if already paid (orders table)
   - If not, calls `create-checkout` Edge Function

2. **Create Checkout (Edge Function)**
   - Verifies JWT
   - Creates Stripe Checkout Session ($29.99)
   - Creates order record (status: 'pending')
   - Redirects user to Stripe

3. **User Pays on Stripe**
   - Stripe processes payment
   - Sends webhook to `stripe-webhook` Edge Function

4. **Webhook Handler (Edge Function)**
   - Verifies Stripe signature (critical security)
   - Updates order status to 'completed'

5. **User Downloads**
   - Frontend checks order status
   - Generates 60-second signed URL from Supabase Storage
   - Downloads mastered WAV file

### Security Features:

- ✅ JWT verification on checkout
- ✅ Stripe webhook signature verification
- ✅ Row Level Security (RLS) on orders table
- ✅ Time-limited signed URLs (60 seconds)
- ✅ Service role key never exposed to frontend
- ✅ User can only see their own orders

---

## 📦 Files Created

### 1. Database Migration
```
supabase/migrations/20251226_create_orders_table.sql
```
- Creates `orders` table with RLS policies
- Indexes for fast queries
- Helper function `has_paid_for_file()`

### 2. Edge Functions
```
supabase/functions/create-checkout/index.ts
supabase/functions/stripe-webhook/index.ts
```
- Deno/TypeScript functions
- Globally distributed (fast worldwide)
- Stripe SDK integration

### 3. Frontend Integration
```
STRIPE_PAYMENT_INTEGRATION.js
PAYMENT_UI_COMPONENT.html
```
- `downloadMaster()` function
- Payment UI with glassmorphism
- Loading states and error handling

### 4. Updated Configuration
```
supabase-client.js
```
- Correct Supabase URL and anon key
- Global `window.supabase` exposure

---

## ⚙️ Supabase Setup

### Step 1: Run Database Migration

1. **Go to Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/tzskjzkolyiwhijslqmq
   ```

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New query"

3. **Paste Migration SQL**
   - Copy contents of `supabase/migrations/20251226_create_orders_table.sql`
   - Paste into SQL editor
   - Click "Run"

4. **Verify Tables Created**
   - Go to "Table Editor"
   - Should see `orders` table
   - Click on table to verify columns

5. **Test RLS Policies**
   ```sql
   -- Test query (should return empty - good!)
   SELECT * FROM orders;

   -- Test function
   SELECT has_paid_for_file(
       'your-user-id'::uuid,
       'test/file/path.wav'
   );
   ```

### Step 2: Create Storage Bucket

1. **Go to Storage**
   - Click "Storage" in left sidebar
   - Click "+ New bucket"

2. **Create "masters" Bucket**
   - Name: `masters`
   - Public: **NO** (keep private!)
   - File size limit: 100 MB
   - Allowed MIME types: `audio/wav, audio/x-wav`

3. **Set Storage Policies**
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Users can upload their own masters"
   ON storage.objects FOR INSERT
   WITH CHECK (
       bucket_id = 'masters' AND
       auth.uid()::text = (storage.foldername(name))[1]
   );

   -- Allow users to read their own files
   CREATE POLICY "Users can read their own masters"
   ON storage.objects FOR SELECT
   USING (
       bucket_id = 'masters' AND
       auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

### Step 3: Configure Edge Function Secrets

1. **Go to Project Settings**
   - Click gear icon (⚙️) in left sidebar
   - Navigate to "Edge Functions"

2. **Add Secrets**
   ```
   STRIPE_SECRET_KEY=sk_live_... (get from Stripe Dashboard)
   STRIPE_WEBHOOK_SECRET=whsec_... (get from Stripe Webhooks)
   ```

   **How to add:**
   - Click "+ New secret"
   - Name: `STRIPE_SECRET_KEY`
   - Value: Your Stripe secret key
   - Repeat for `STRIPE_WEBHOOK_SECRET`

---

## 💳 Stripe Setup

### Step 1: Create Stripe Account

1. **Sign up for Stripe**
   ```
   https://dashboard.stripe.com/register
   ```

2. **Activate your account**
   - Complete business details
   - Add bank account for payouts
   - Verify identity (if required)

### Step 2: Get API Keys

1. **Get Secret Key**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy "Secret key" (starts with `sk_test_` for test mode)
   - **For production:** Use `sk_live_...` key

2. **Add to Supabase Secrets**
   - Add as `STRIPE_SECRET_KEY` (see Supabase Step 3 above)

### Step 3: Configure Webhook

1. **Add Webhook Endpoint**
   - Go to https://dashboard.stripe.com/test/webhooks
   - Click "+ Add endpoint"
   - URL: `https://tzskjzkolyiwhijslqmq.supabase.co/functions/v1/stripe-webhook`
   - Description: "Luvlang payment completion"

2. **Select Events**
   - ✅ `checkout.session.completed`
   - ✅ `checkout.session.expired`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`

3. **Get Webhook Secret**
   - After creating webhook, click "Reveal" under "Signing secret"
   - Copy the secret (starts with `whsec_...`)
   - Add to Supabase as `STRIPE_WEBHOOK_SECRET`

4. **Test Webhook**
   - Click "Send test webhook"
   - Select `checkout.session.completed`
   - Should see success (200) response

---

## 🚀 Edge Functions Deployment

### Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to Project**
   ```bash
   cd /Users/jeffreygraves/luvlang-mastering
   supabase link --project-ref tzskjzkolyiwhijslqmq
   ```

4. **Deploy Functions**
   ```bash
   # Deploy create-checkout function
   supabase functions deploy create-checkout

   # Deploy stripe-webhook function
   supabase functions deploy stripe-webhook
   ```

5. **Verify Deployment**
   ```bash
   supabase functions list
   ```

   Should show:
   ```
   create-checkout (deployed)
   stripe-webhook (deployed)
   ```

### Option 2: Manual Deployment via Dashboard

1. **Go to Edge Functions**
   - Supabase Dashboard → Edge Functions
   - Click "+ New function"

2. **Create "create-checkout"**
   - Name: `create-checkout`
   - Paste code from `supabase/functions/create-checkout/index.ts`
   - Click "Deploy"

3. **Create "stripe-webhook"**
   - Repeat for webhook function
   - Paste code from `supabase/functions/stripe-webhook/index.ts`

4. **Test Functions**
   ```bash
   curl -X POST \
     'https://tzskjzkolyiwhijslqmq.supabase.co/functions/v1/create-checkout' \
     -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
     -H 'Content-Type: application/json' \
     -d '{"file_path": "test/file.wav"}'
   ```

---

## 💻 Frontend Integration

### Step 1: Add Supabase CDN Script

Add to `luvlang_LEGENDARY_COMPLETE.html` **BEFORE** closing `</head>` tag:

```html
<!-- Supabase Client Library -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### Step 2: Add Payment Scripts

Add **BEFORE** closing `</body>` tag:

```html
<!-- Supabase Client -->
<script src="supabase-client.js"></script>

<!-- Stripe Payment Integration -->
<script src="STRIPE_PAYMENT_INTEGRATION.js"></script>

<!-- Initialize Supabase on page load -->
<script>
    window.addEventListener('DOMContentLoaded', async () => {
        await initializeSupabase();
        console.log('✅ Supabase initialized');
    });
</script>
```

### Step 3: Add Payment UI

Replace your existing Export section with the code from:
```
PAYMENT_UI_COMPONENT.html
```

This adds:
- 💎 Buy Master button ($29.99)
- ⬇️ Download button (for paid files)
- 🔒 Payment status badge
- Loading states

### Step 4: Update Export Button

Change your existing export button to be a **demo/preview** export:

```html
<button class="export-btn" id="exportBtn">
    Export Preview (Demo Quality)
</button>
```

This way:
- **Export Preview** = Free, watermarked or lower quality
- **Buy Master** = $29.99, broadcast-quality WAV

---

## 🧪 Testing

### Test Mode (Recommended First)

1. **Use Stripe Test Mode**
   - Test API keys start with `sk_test_...`
   - Test webhooks start with `whsec_test_...`

2. **Test Card Numbers**
   ```
   Success: 4242 4242 4242 4242
   Declined: 4000 0000 0000 0002
   Requires Auth: 4000 0027 6000 3184

   Any future date for expiry
   Any 3 digits for CVC
   Any ZIP code
   ```

3. **Test Payment Flow**
   - Upload audio
   - Click "AI Auto-Master"
   - Click "Buy Professional Master"
   - Use test card `4242 4242 4242 4242`
   - Complete payment
   - Should redirect back with success
   - Should see "Download Your Master" button
   - Click download → signed URL should work

4. **Verify in Stripe Dashboard**
   - Go to https://dashboard.stripe.com/test/payments
   - Should see successful payment
   - Go to Webhooks → Events
   - Should see `checkout.session.completed` event

5. **Verify in Supabase**
   ```sql
   SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
   ```
   Should show order with status = 'completed'

### Production Mode

1. **Switch to Live Keys**
   - Update `STRIPE_SECRET_KEY` to `sk_live_...`
   - Update `STRIPE_WEBHOOK_SECRET` to `whsec_...` (live)

2. **Update Webhook URL**
   - In Stripe Dashboard (live mode)
   - Add webhook: `https://tzskjzkolyiwhijslqmq.supabase.co/functions/v1/stripe-webhook`

3. **Test with Real Card**
   - Use your own card
   - Test small amount first
   - Verify payout goes to your bank

---

## 🔒 Security Checklist

Before going live, verify:

### ✅ Secrets Configuration
- [ ] `STRIPE_SECRET_KEY` stored in Supabase Edge Function secrets (NOT in code)
- [ ] `STRIPE_WEBHOOK_SECRET` stored in Supabase Edge Function secrets (NOT in code)
- [ ] No API keys hardcoded in frontend files
- [ ] `.env` files added to `.gitignore`

### ✅ Stripe Configuration
- [ ] Webhook signature verification enabled
- [ ] Webhook URL uses HTTPS
- [ ] Webhook events properly filtered
- [ ] Test mode webhooks separate from live mode

### ✅ Supabase Configuration
- [ ] RLS enabled on `orders` table
- [ ] RLS policies tested (users can only see own orders)
- [ ] Storage bucket is PRIVATE (not public)
- [ ] Storage policies allow only user uploads
- [ ] Service role key never exposed to frontend

### ✅ Frontend Security
- [ ] Only anon key used in frontend (not service role key)
- [ ] JWT verified on every Edge Function call
- [ ] Signed URLs expire in 60 seconds
- [ ] No file paths in localStorage (security risk)

### ✅ Edge Functions
- [ ] Webhook signature verified before processing
- [ ] JWT verified before creating checkout
- [ ] Error messages don't leak sensitive info
- [ ] CORS headers properly configured

---

## 🐛 Troubleshooting

### Issue: "Missing authorization header"

**Cause:** User not logged in
**Fix:** Show auth modal, prompt to sign in

### Issue: "Webhook signature verification failed"

**Causes:**
1. Wrong `STRIPE_WEBHOOK_SECRET`
2. Webhook URL mismatch
3. Raw body not preserved

**Fix:**
```bash
# Verify webhook secret in Supabase
supabase secrets list

# Re-add webhook secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### Issue: "Failed to create signed URL"

**Causes:**
1. File doesn't exist in storage
2. Storage bucket is public (should be private)
3. RLS policy blocking access

**Fix:**
```sql
-- Check if file exists
SELECT * FROM storage.objects WHERE bucket_id = 'masters';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

### Issue: Order stays "pending" after payment

**Causes:**
1. Webhook not firing
2. Webhook signature failing
3. Order not found by session_id

**Fix:**
1. Check Stripe Dashboard → Webhooks → Events
2. Check Edge Function logs
3. Manually update order:
   ```sql
   UPDATE orders
   SET status = 'completed', completed_at = NOW()
   WHERE stripe_session_id = 'cs_test_...';
   ```

### Issue: "Already purchased" but can't download

**Cause:** Signed URL generation failing

**Fix:**
```javascript
// Test signed URL generation
const { data, error } = await supabase.storage
    .from('masters')
    .createSignedUrl('user-id/file.wav', 60);

console.log('Signed URL:', data.signedUrl);
console.log('Error:', error);
```

---

## 📊 Monitoring & Analytics

### Track Payment Metrics

```sql
-- Total revenue
SELECT SUM(amount_cents) / 100 as total_revenue_usd
FROM orders
WHERE status = 'completed';

-- Conversion rate
SELECT
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'completed')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) as conversion_rate_percent
FROM orders;

-- Revenue by day
SELECT
    DATE(completed_at) as date,
    COUNT(*) as orders,
    SUM(amount_cents) / 100 as revenue_usd
FROM orders
WHERE status = 'completed'
GROUP BY DATE(completed_at)
ORDER BY date DESC
LIMIT 30;
```

---

## 🎯 Next Steps

After deployment:

1. **Test thoroughly** in test mode
2. **Switch to live mode** when ready
3. **Monitor Stripe Dashboard** for payments
4. **Monitor Supabase Dashboard** for orders
5. **Set up email notifications** (optional)
6. **Add refund handling** (optional)
7. **Implement download limits** (optional)

---

## 📞 Support

### Stripe Support
- Dashboard: https://dashboard.stripe.com
- Docs: https://stripe.com/docs
- Test cards: https://stripe.com/docs/testing

### Supabase Support
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com

---

**Status:** ✅ Production-Ready Payment System
**Security:** 🔒 Zero-trust architecture
**Performance:** ⚡ Globally distributed Edge Functions
**Reliability:** 💪 Stripe + Supabase infrastructure

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
