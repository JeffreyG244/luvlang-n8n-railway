-- Fix the mastering_jobs table schema

-- Drop the existing table completely
DROP TABLE IF EXISTS mastering_jobs CASCADE;

-- Create the correct table schema
CREATE TABLE mastering_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Enable Row Level Security
ALTER TABLE mastering_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for testing)
CREATE POLICY "Allow all operations" ON mastering_jobs
  FOR ALL USING (true) WITH CHECK (true);

-- Verify the table was created
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'mastering_jobs';
