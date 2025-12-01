# LuvLang Supabase Setup Guide

## ⚠️ Issues Found

Your Supabase project needs to be configured before testing. Here's what needs to be set up:

### ❌ Missing Components:
1. **Storage Buckets**: `luvlang-uploads` and `luvlang-mastered` need to be created
2. **Database Table**: `mastering_jobs` table schema doesn't match requirements
3. **Permissions**: Row-Level Security policies need adjustment

---

## 🔧 Setup Instructions

### Step 1: Go to Supabase Dashboard

1. Open https://supabase.com/dashboard
2. Navigate to your project: `giwujaxwcrwtqfxbbacb`

---

### Step 2: Create Storage Buckets

1. Click **Storage** in the left sidebar
2. Click **New bucket**
3. Create bucket: `luvlang-uploads`
   - Name: `luvlang-uploads`
   - Public: ✅ **Yes** (checked)
   - Click **Save**
4. Create bucket: `luvlang-mastered`
   - Name: `luvlang-mastered`
   - Public: ✅ **Yes** (checked)
   - Click **Save**

---

### Step 3: Create Database Table

1. Click **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste this SQL and click **Run**:

```sql
-- Drop existing table if it has wrong schema
DROP TABLE IF EXISTS mastering_jobs CASCADE;

-- Create the mastering_jobs table with correct schema
CREATE TABLE mastering_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending',
  platform TEXT DEFAULT 'spotify',
  input_file TEXT NOT NULL,
  output_wav_url TEXT,
  output_mp3_url TEXT,
  params JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_mastering_jobs_status ON mastering_jobs(status);
CREATE INDEX idx_mastering_jobs_job_id ON mastering_jobs(job_id);

-- Enable Row Level Security
ALTER TABLE mastering_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for testing)
CREATE POLICY "Allow all operations" ON mastering_jobs
  FOR ALL USING (true) WITH CHECK (true);
```

---

### Step 4: Set Storage Policies

1. Go to **Storage** > **Policies**
2. For **luvlang-uploads** bucket:
   - Click **New Policy**
   - Choose **For full customization**
   - Policy name: `Allow all uploads`
   - Target roles: `public`
   - Policy definition - SELECT:
     ```sql
     (bucket_id = 'luvlang-uploads'::text)
     ```
   - Click **Save**
   - Repeat for INSERT, UPDATE, DELETE operations

3. For **luvlang-mastered** bucket:
   - Same process as above
   - Policy definition:
     ```sql
     (bucket_id = 'luvlang-mastered'::text)
     ```

---

## ✅ Verification

After completing the setup, run this to verify:

```bash
cd /tmp
node verify_supabase_setup.mjs
```

You should see:
- ✅ mastering_jobs table exists and accessible
- ✅ luvlang-uploads bucket exists
- ✅ luvlang-mastered bucket exists
- ✅ Write permissions OK
- ✅ Storage upload OK

---

## 🚀 After Setup

Once everything is green, you can start testing:

1. **Service is already running**: The Python watcher is monitoring Supabase
2. **Frontend is open**: Use the HTML interface in your browser
3. **Test the workflow**: Upload a track and master it!

---

## 📝 Current Configuration

- **Supabase URL**: `https://giwujaxwcrwtqfxbbacb.supabase.co`
- **Anon Key**: Configured in scripts ✅
- **Upload Webhook**: `https://jg1222.app.n8n.cloud/webhook/luvlang-upload`
- **Status Webhook**: `https://jg1222.app.n8n.cloud/webhook/cc42ebb7-b010-434a-aee6-56942a6a68e3/luvlang-status/:jobId`
