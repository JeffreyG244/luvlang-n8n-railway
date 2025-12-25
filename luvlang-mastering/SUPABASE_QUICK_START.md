# 🚀 SUPABASE QUICK START GUIDE
## Get Your Database Up and Running in 10 Minutes

---

## STEP 1: Create Supabase Project (2 minutes)

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign in with GitHub (or create account)
4. Click "New Project"
5. Fill in:
   - **Name:** luvlang-mastering
   - **Database Password:** (Generate strong password - SAVE THIS!)
   - **Region:** Choose closest to your users
6. Click "Create new project"
7. Wait 1-2 minutes for project to initialize

---

## STEP 2: Run Database Schema (3 minutes)

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click "New query"
3. Open `/Users/jeffreygraves/luvlang-mastering/supabase-schema.sql`
4. Copy ALL the SQL code
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Cmd+Enter)
7. Verify success: You should see:
   ```
   table_name              | column_count
   ------------------------|--------------
   mastering_history       | 8
   subscription_tiers      | 6
   user_presets            | 8
   user_profiles           | 5
   ```

### What This Created:
- ✅ 4 database tables
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ 3 default subscription tiers (free, pro, legendary)
- ✅ Auto-update triggers

---

## STEP 3: Get Your API Keys (1 minute)

1. In Supabase dashboard, click **Settings** (bottom left)
2. Click **API** (left sidebar)
3. Copy these two values:

   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **Anon/Public Key (anon, public):**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. Save these somewhere safe (you'll need them in Step 4)

---

## STEP 4: Configure Supabase Client (2 minutes)

1. Open `/Users/jeffreygraves/luvlang-mastering/supabase-client.js`

2. Find lines 7-8:
   ```javascript
   const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   ```

3. Replace with your actual values:
   ```javascript
   const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```

4. Save the file

---

## STEP 5: Add Supabase to HTML (2 minutes)

Open `/Users/jeffreygraves/luvlang-mastering/luvlang_LEGENDARY_COMPLETE.html`

Find the script tags section (around line 2154) and add these TWO lines:

```html
<!-- LEGENDARY PRODUCTION FIXES -->
<script src="transient-detector-worklet.js"></script>
<script src="transient-integration.js"></script>
<script src="offline-analysis-engine.js"></script>
<script src="interactive-waveform.js"></script>

<!-- ADD THESE TWO LINES: -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-client.js"></script>

<!-- MAIN JAVASCRIPT -->
<script>
```

---

## STEP 6: Initialize Supabase on Page Load

In the same HTML file, find the initialization section (around line 2200) and add:

```javascript
// Initialize audio context
audioContext = new (window.AudioContext || window.webkitAudioContext)();

// ADD THIS LINE:
initializeSupabase(); // Initialize Supabase client

// Continue with existing code...
```

---

## STEP 7: Add User Authentication UI (Optional)

If you want sign-in/sign-up buttons, add this HTML somewhere in your UI:

```html
<div id="authButtons" style="position: fixed; top: 20px; right: 20px;">
    <button id="signInBtn" onclick="showSignInModal()">Sign In</button>
    <button id="signUpBtn" onclick="showSignUpModal()">Sign Up</button>

    <div id="userMenu" style="display: none;">
        <span id="userEmail"></span>
        <button onclick="signOut()">Sign Out</button>
    </div>
</div>

<!-- Sign In Modal -->
<div id="signInModal" style="display: none;">
    <h2>Sign In</h2>
    <input type="email" id="signInEmail" placeholder="Email" />
    <input type="password" id="signInPassword" placeholder="Password" />
    <button onclick="handleSignIn()">Sign In</button>
    <button onclick="closeSignInModal()">Cancel</button>
</div>

<!-- Sign Up Modal -->
<div id="signUpModal" style="display: none;">
    <h2>Sign Up</h2>
    <input type="text" id="signUpName" placeholder="Display Name" />
    <input type="email" id="signUpEmail" placeholder="Email" />
    <input type="password" id="signUpPassword" placeholder="Password" />
    <button onclick="handleSignUp()">Sign Up</button>
    <button onclick="closeSignUpModal()">Cancel</button>
</div>
```

Add these JavaScript functions:

```javascript
function showSignInModal() {
    document.getElementById('signInModal').style.display = 'block';
}

function closeSignInModal() {
    document.getElementById('signInModal').style.display = 'none';
}

function showSignUpModal() {
    document.getElementById('signUpModal').style.display = 'block';
}

function closeSignUpModal() {
    document.getElementById('signUpModal').style.display = 'none';
}

async function handleSignIn() {
    const email = document.getElementById('signInEmail').value;
    const password = document.getElementById('signInPassword').value;

    const result = await signIn(email, password);

    if (result.success) {
        alert('Signed in successfully!');
        closeSignInModal();
    } else {
        alert('Sign in failed: ' + result.error);
    }
}

async function handleSignUp() {
    const name = document.getElementById('signUpName').value;
    const email = document.getElementById('signUpEmail').value;
    const password = document.getElementById('signUpPassword').value;

    const result = await signUp(email, password, name);

    if (result.success) {
        alert('Signed up successfully! Check your email to confirm.');
        closeSignUpModal();
    } else {
        alert('Sign up failed: ' + result.error);
    }
}
```

---

## STEP 8: Test Supabase Integration

1. Open browser console (F12)
2. Navigate to https://luvlang-mastering.vercel.app
3. Check console for:
   ```
   ✅ Supabase client initialized
   👤 No active session
   ```

4. Try signing up:
   - Click "Sign Up"
   - Enter email and password
   - Check console for: `✅ Sign up successful`
   - Check Supabase dashboard → Authentication → Users (should see new user)

5. Try saving a preset:
   - Sign in
   - Adjust EQ/compressor settings
   - Call: `savePreset('My Preset', { eq: {...}, compressor: {...} })`
   - Check Supabase dashboard → Table Editor → user_presets (should see new row)

---

## STEP 9: Deploy to Vercel

After confirming everything works locally:

```bash
cd /Users/jeffreygraves/luvlang-mastering

# Copy supabase-client.js to git root (for Vercel deployment)
cd /Users/jeffreygraves
cp luvlang-mastering/supabase-client.js .

# Commit changes
git add luvlang_LEGENDARY_COMPLETE.html supabase-client.js
git commit -m "feat: Integrate Supabase authentication and cloud sync

Added Supabase for:
✅ User authentication (sign up/sign in)
✅ Cloud preset saving/loading
✅ Mastering session history
✅ Subscription tier management

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to GitHub (triggers Vercel deployment)
git push origin main
```

Wait 30-60 seconds for Vercel to deploy, then test live site.

---

## USAGE EXAMPLES

### Save a Preset
```javascript
const presetData = {
    eq: {
        sub: eqSubFilter.gain.value,
        bass: eqBassFilter.gain.value,
        lowmid: eqLowMidFilter.gain.value,
        mid: eqMidFilter.gain.value,
        highmid: eqHighMidFilter.gain.value,
        high: eqHighFilter.gain.value,
        air: eqAirFilter.gain.value
    },
    compressor: {
        threshold: compressor.threshold.value,
        ratio: compressor.ratio.value,
        attack: compressor.attack.value,
        release: compressor.release.value
    },
    limiter: {
        threshold: limiter.threshold.value
    },
    targetLUFS: platformTarget
};

await savePreset('My Awesome Preset', presetData);
```

### Load Presets
```javascript
const result = await loadPresets();

if (result.success) {
    console.log('Your presets:', result.presets);

    // Display in UI
    result.presets.forEach(preset => {
        console.log(`- ${preset.preset_name} (created ${preset.created_at})`);
    });
}
```

### Save Mastering Session to History
```javascript
const sessionData = {
    filename: audioFileName,
    platform: 'spotify',
    targetLUFS: -14.0,
    finalLUFS: -13.98,
    truePeak: -1.2,
    settings: {
        eq: {...},
        compressor: {...},
        limiter: {...}
    }
};

await saveMasteringHistory(sessionData);
```

### Check User Subscription
```javascript
const subscription = await getUserSubscription();

console.log('Current tier:', subscription.tier);
console.log('Max presets:', subscription.limits.presets);
console.log('History retention:', subscription.limits.historyDays, 'days');

if (subscription.tier === 'free') {
    // Show upgrade prompt
}
```

---

## SUBSCRIPTION TIERS (Pre-configured)

| Feature | Free | Pro ($9.99/mo) | Legendary ($29.99/mo) |
|---------|------|----------------|----------------------|
| Max Presets | 3 | 50 | 999 |
| History Retention | 7 days | 90 days | 365 days |
| Basic Mastering | ✅ | ✅ | ✅ |
| Platform Presets | ✅ | ✅ | ✅ |
| 7-Band EQ | ✅ | ✅ | ✅ |
| Stem Mastering | ❌ | ✅ | ✅ |
| Spectral Repair | ❌ | ✅ | ✅ |
| Unlimited Downloads | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |
| Custom Presets | ❌ | ❌ | ✅ |
| API Access | ❌ | ❌ | ✅ |

---

## TROUBLESHOOTING

### "Supabase client failed to initialize"
- Check that you updated `SUPABASE_URL` and `SUPABASE_ANON_KEY` in supabase-client.js
- Verify the Supabase CDN script is loaded before supabase-client.js
- Check browser console for CORS errors

### "Row Level Security policy violation"
- User must be signed in to save presets/history
- Check that RLS policies were created (run schema SQL again if needed)
- Verify `auth.uid()` matches the user_id in the table

### "Table does not exist"
- Run the supabase-schema.sql again in SQL Editor
- Verify you're connected to the correct Supabase project
- Check Table Editor to confirm tables are created

### Sign up email not arriving
- Check Supabase Auth settings → Email Templates
- For development, check Supabase Auth → Users (user will be created even without email confirmation)
- For production, configure email provider (Supabase → Settings → Auth → Email)

---

## WHAT'S NEXT?

### Immediate:
1. Test sign up/sign in flow
2. Test saving and loading presets
3. Test mastering history

### Optional Enhancements:
1. Add social auth (Google, GitHub) in Supabase Auth settings
2. Customize email templates in Supabase
3. Add payment integration (Stripe) for Pro/Legendary tiers
4. Create user dashboard to view history and manage presets
5. Add preset sharing (public presets table)

---

## SUPPORT

### Supabase Resources:
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- Status: https://status.supabase.com

### Project Files:
- Schema SQL: `/Users/jeffreygraves/luvlang-mastering/supabase-schema.sql`
- Client JS: `/Users/jeffreygraves/luvlang-mastering/supabase-client.js`
- Full Guide: `/Users/jeffreygraves/luvlang-mastering/SUPABASE_SETUP_GUIDE.md`

---

🎉 **You're all set! Your mastering platform now has cloud sync and user accounts!**
