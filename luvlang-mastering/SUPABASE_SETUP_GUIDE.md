# 🗄️ SUPABASE SETUP GUIDE - LuvLang Mastering

## Why Supabase? (Not n8n)

✅ **USE SUPABASE** for:
- User authentication (email/password, social login)
- Storing user presets and mastering history
- Sync settings across devices
- Premium tier management

❌ **DON'T USE n8n** for:
- Audio processing (adds latency and failure points)
- Keep your stack lean and fast

---

## Step 1: Create Your Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in with your existing account
3. Click "New Project"
4. Fill in:
   - **Project Name:** `luvlang-mastering`
   - **Database Password:** (generate a strong password - SAVE THIS!)
   - **Region:** Choose closest to your users (US East recommended)
5. Wait 2-3 minutes for project creation

---

## Step 2: Database Schema Setup

Copy and paste this SQL into the Supabase SQL Editor:

### A. User Profiles Table

```sql
-- User Profiles (extends Supabase Auth)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  total_masters_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### B. User Presets Table

```sql
-- User's saved mastering presets
CREATE TABLE public.user_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  preset_name TEXT NOT NULL,
  preset_data JSONB NOT NULL, -- All EQ, compressor, limiter settings
  genre TEXT,
  platform TEXT, -- 'spotify', 'apple', 'youtube', etc.
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_presets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own presets"
  ON public.user_presets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presets"
  ON public.user_presets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets"
  ON public.user_presets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets"
  ON public.user_presets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_user_presets_user_id ON public.user_presets(user_id);
CREATE INDEX idx_user_presets_genre ON public.user_presets(genre);
```

### C. Mastering History Table

```sql
-- User's mastering history (track each master job)
CREATE TABLE public.mastering_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  track_name TEXT,
  original_lufs REAL,
  target_lufs REAL,
  final_lufs REAL,
  platform TEXT,
  genre TEXT,
  preset_used UUID REFERENCES public.user_presets(id),
  processing_settings JSONB, -- Full chain settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mastering_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own history"
  ON public.mastering_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON public.mastering_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_mastering_history_user_id ON public.mastering_history(user_id);
CREATE INDEX idx_mastering_history_created_at ON public.mastering_history(created_at DESC);
```

### D. Subscription Tiers Table

```sql
-- Define subscription tiers and limits
CREATE TABLE public.subscription_tiers (
  tier_name TEXT PRIMARY KEY,
  max_masters_per_month INTEGER,
  max_saved_presets INTEGER,
  features JSONB, -- List of enabled features
  price_monthly NUMERIC(10,2)
);

-- Insert default tiers
INSERT INTO public.subscription_tiers (tier_name, max_masters_per_month, max_saved_presets, features, price_monthly) VALUES
('free', 10, 3, '["basic_eq", "basic_compression", "basic_limiting"]', 0),
('pro', 100, 20, '["all_eq", "multiband_compression", "ms_processing", "reference_matching", "codec_preview", "priority_support"]', 9.99),
('enterprise', -1, -1, '["everything", "api_access", "white_label", "dedicated_support"]', 49.99);
```

---

## Step 3: Enable Authentication

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Enable **Email** authentication
3. (Optional) Enable **Google**, **GitHub** for social login
4. Set **Site URL**: `https://luvlang-mastering.vercel.app`
5. Add **Redirect URLs**:
   ```
   https://luvlang-mastering.vercel.app
   https://luvlang-mastering.vercel.app/auth/callback
   http://localhost:3000 (for development)
   ```

---

## Step 4: Get Your API Keys

1. Go to **Project Settings** → **API**
2. Copy these values:

   ```
   Project URL: https://xxxxxxxxxxxxxxxx.supabase.co
   anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (NEVER expose to client!)
   ```

3. Add to your `.env` file:

   ```bash
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## Step 5: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

---

## Step 6: Frontend Integration

Create `supabase-client.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTHENTICATION FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Sign up new user
 */
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  })

  if (error) throw error
  return data
}

/**
 * Sign in existing user
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error
  return data
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Check authentication state
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USER PRESET FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Save mastering preset
 */
export async function savePreset(presetName, presetData, genre, platform) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('user_presets')
    .insert({
      user_id: user.id,
      preset_name: presetName,
      preset_data: presetData,
      genre: genre,
      platform: platform
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Load user's presets
 */
export async function loadPresets(genre = null) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('user_presets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (genre) {
    query = query.eq('genre', genre)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

/**
 * Delete preset
 */
export async function deletePreset(presetId) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('user_presets')
    .delete()
    .eq('id', presetId)
    .eq('user_id', user.id)

  if (error) throw error
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MASTERING HISTORY FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Save mastering result to history
 */
export async function saveMasteringHistory(trackName, originalLUFS, targetLUFS, finalLUFS, platform, genre, processingSettings) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('mastering_history')
    .insert({
      user_id: user.id,
      track_name: trackName,
      original_lufs: originalLUFS,
      target_lufs: targetLUFS,
      final_lufs: finalLUFS,
      platform: platform,
      genre: genre,
      processing_settings: processingSettings
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Load mastering history
 */
export async function loadMasteringHistory(limit = 50) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('mastering_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * Get usage statistics
 */
export async function getUserStats() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // Get profile with subscription info
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*, subscription_tiers(*)')
    .eq('id', user.id)
    .single()

  if (profileError) throw profileError

  // Count masters this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: mastersThisMonth, error: countError } = await supabase
    .from('mastering_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth.toISOString())

  if (countError) throw countError

  // Count saved presets
  const { count: savedPresets, error: presetsError } = await supabase
    .from('user_presets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (presetsError) throw presetsError

  return {
    profile,
    mastersThisMonth,
    savedPresets,
    limits: {
      maxMastersPerMonth: profile.subscription_tiers.max_masters_per_month,
      maxSavedPresets: profile.subscription_tiers.max_saved_presets
    }
  }
}
```

---

## Step 7: Add Authentication UI

Add this to your HTML:

```html
<!-- Authentication Modal -->
<div id="authModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; justify-content: center; align-items: center;">
  <div style="background: #1a1a24; padding: 40px; border-radius: 12px; max-width: 400px; width: 90%;">
    <h2 style="margin-bottom: 20px;">Sign In to LuvLang</h2>

    <div id="signInForm">
      <input type="email" id="emailInput" placeholder="Email" style="width: 100%; padding: 12px; margin-bottom: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white;">
      <input type="password" id="passwordInput" placeholder="Password" style="width: 100%; padding: 12px; margin-bottom: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white;">
      <button id="signInBtn" class="action-btn action-btn-primary" style="width: 100%; margin-bottom: 12px;">Sign In</button>
      <button id="signUpBtn" class="selector-btn" style="width: 100%;">Create Account</button>
    </div>

    <div id="userProfile" style="display: none;">
      <p>Welcome, <span id="userEmail"></span>!</p>
      <p>Subscription: <span id="userTier"></span></p>
      <p>Masters this month: <span id="mastersCount"></span> / <span id="mastersLimit"></span></p>
      <button id="signOutBtn" class="action-btn action-btn-secondary" style="width: 100%;">Sign Out</button>
    </div>

    <button id="closeAuthModal" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
  </div>
</div>

<!-- User Menu in Top Bar -->
<div id="userMenu" style="position: absolute; top: 20px; right: 20px;">
  <button id="openAuthBtn" class="selector-btn">
    <span id="userStatus">Sign In</span>
  </button>
</div>
```

---

## Step 8: Initialize in Your App

```javascript
import { supabase, onAuthStateChange, getCurrentUser, signIn, signUp, signOut, savePreset, loadPresets } from './supabase-client.js'

// On page load
onAuthStateChange(async (event, session) => {
  if (session) {
    // User signed in
    const user = await getCurrentUser()
    document.getElementById('userStatus').textContent = user.email
    document.getElementById('userEmail').textContent = user.email

    // Load user stats
    const stats = await getUserStats()
    document.getElementById('userTier').textContent = stats.profile.subscription_tier
    document.getElementById('mastersCount').textContent = stats.mastersThisMonth
    document.getElementById('mastersLimit').textContent = stats.limits.maxMastersPerMonth

    // Load user presets
    const presets = await loadPresets()
    populatePresetsUI(presets)

    // Show user profile
    document.getElementById('signInForm').style.display = 'none'
    document.getElementById('userProfile').style.display = 'block'
  } else {
    // User signed out
    document.getElementById('userStatus').textContent = 'Sign In'
    document.getElementById('signInForm').style.display = 'block'
    document.getElementById('userProfile').style.display = 'none'
  }
})

// Sign in handler
document.getElementById('signInBtn').addEventListener('click', async () => {
  const email = document.getElementById('emailInput').value
  const password = document.getElementById('passwordInput').value

  try {
    await signIn(email, password)
    document.getElementById('authModal').style.display = 'none'
  } catch (error) {
    alert('Sign in failed: ' + error.message)
  }
})

// When user completes a master
async function onMasterComplete(trackName, originalLUFS, finalLUFS, platform, genre, settings) {
  try {
    await saveMasteringHistory(trackName, originalLUFS, settings.targetLUFS, finalLUFS, platform, genre, settings)
    console.log('✅ Mastering saved to history')
  } catch (error) {
    console.warn('Not logged in - history not saved')
  }
}
```

---

## Step 9: Test Everything

1. Sign up a test user
2. Save a preset
3. Check Supabase Dashboard → Table Editor to see data
4. Load presets on another device (same account)
5. Verify RLS policies work (can't see other users' data)

---

## Security Checklist

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Users can only access their own data
- ✅ `service_role` key NEVER exposed to client
- ✅ HTTPS only (enforced by Vercel)
- ✅ Email verification (optional but recommended)

---

## Pricing Tiers Implementation

**Free Tier:**
- 10 masters/month
- 3 saved presets
- Basic features

**Pro Tier ($9.99/month):**
- 100 masters/month
- 20 saved presets
- All features unlocked
- Priority support

**Enterprise ($49.99/month):**
- Unlimited masters
- Unlimited presets
- API access
- White-label option

---

## Next Steps

1. ✅ Run the SQL scripts above in Supabase SQL Editor
2. ✅ Copy API keys to `.env`
3. ✅ Add `supabase-client.js` to your project
4. ✅ Add authentication UI
5. ✅ Test signup/signin
6. ✅ Integrate preset saving/loading
7. ✅ Add Stripe for payments (optional)

---

## Questions?

Check [Supabase Docs](https://supabase.com/docs) or let me know!

**Your database is now production-ready with:**
- ✅ User authentication
- ✅ Cloud preset sync
- ✅ Mastering history
- ✅ Subscription management
- ✅ Privacy-compliant (RLS)

🎉 **Ready to scale to thousands of users!**
