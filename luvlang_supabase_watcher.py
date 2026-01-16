#!/usr/bin/env python3
"""
LuvLang Audio Mastering - Supabase Watcher
Monitors Supabase for new uploads, processes them, uploads results
"""

import os
import sys
import time
import json
import tempfile
import subprocess
from pathlib import Path
from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://jzclawsctaczhgvfpssx.supabase.co"
SUPABASE_KEY = "sb_publishable_9Bf4Bt5Y91aGdpFfYs7Zrg_mozxhGDA"  # Get from Supabase dashboard

# Bucket names
INPUT_BUCKET = "luvlang-uploads"
OUTPUT_BUCKET = "luvlang-mastered"

# Local scripts
SCRIPT_DIR = Path.home() / "luvlang-mastering"
ANALYZE_SCRIPT = SCRIPT_DIR / "analyze_audio.py"
MASTER_SCRIPT = SCRIPT_DIR / "master_audio_ultimate.py"
AUTO_MASTER_AI_SCRIPT = SCRIPT_DIR / "auto_master_ai.py"

class LuvLangProcessor:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def watch_and_process(self):
        """Main loop - watch for new jobs and process them"""
        print("🎵 LuvLang Audio Mastering Service Started")
        print(f"📁 Watching bucket: {INPUT_BUCKET}")
        print(f"📤 Output bucket: {OUTPUT_BUCKET}")
        print(f"🔧 Scripts directory: {SCRIPT_DIR}")
        print("-" * 60)

        processed_jobs = set()

        while True:
            try:
                # Get pending jobs from database
                response = self.supabase.table('mastering_jobs') \
                    .select('*') \
                    .eq('status', 'pending') \
                    .execute()

                for job in response.data:
                    job_id = job['id']

                    if job_id in processed_jobs:
                        continue

                    print(f"\n🎯 Processing job: {job_id}")
                    processed_jobs.add(job_id)

                    # Update status to processing
                    self.supabase.table('mastering_jobs') \
                        .update({'status': 'processing'}) \
                        .eq('id', job_id) \
                        .execute()

                    # Process the job
                    success = self.process_job(job)

                    # Update final status
                    if success:
                        self.supabase.table('mastering_jobs') \
                            .update({'status': 'completed'}) \
                            .eq('id', job_id) \
                            .execute()
                        print(f"✅ Job {job_id} completed successfully")
                    else:
                        self.supabase.table('mastering_jobs') \
                            .update({'status': 'failed'}) \
                            .eq('id', job_id) \
                            .execute()
                        print(f"❌ Job {job_id} failed")

                # Sleep before checking again
                time.sleep(5)

            except KeyboardInterrupt:
                print("\n\n🛑 Shutting down gracefully...")
                break
            except Exception as e:
                print(f"⚠️  Error in main loop: {e}")
                time.sleep(10)

    def process_job(self, job):
        """Process a single mastering job"""
        try:
            job_id = job['id']
            platform = job.get('platform', 'spotify')
            params = job.get('params', {})
            input_filename = job.get('input_file')
            auto_master = params.get('auto_master', False)

            # Create temp directory for this job
            with tempfile.TemporaryDirectory() as tmpdir:
                tmpdir = Path(tmpdir)

                # Download input file from Supabase
                print(f"📥 Downloading input file: {input_filename}")
                input_path = tmpdir / f"{job_id}_input.wav"

                response = self.supabase.storage.from_(INPUT_BUCKET).download(input_filename)
                with open(input_path, 'wb') as f:
                    f.write(response)

                # Analyze audio
                print(f"🔍 Analyzing audio...")
                analysis_path = tmpdir / f"{job_id}_analysis.json"

                analyze_cmd = [
                    "python3",
                    str(ANALYZE_SCRIPT),
                    str(input_path),
                    str(analysis_path)
                ]

                subprocess.run(analyze_cmd, check=True)

                # If AUTO MASTER AI is requested, get intelligent parameters
                ai_explanation = None
                if auto_master:
                    print(f"🤖 Running AUTO MASTER AI...")
                    ai_result_path = tmpdir / f"{job_id}_ai_result.json"

                    ai_cmd = [
                        "python3",
                        str(AUTO_MASTER_AI_SCRIPT),
                        str(input_path)
                    ]

                    # Run AI and capture output
                    result = subprocess.run(ai_cmd, capture_output=True, text=True)

                    # Parse AI output (last line should be JSON)
                    try:
                        import json
                        ai_output = json.loads(result.stdout.strip().split('\n')[-1])
                        ai_params = ai_output['mastering_params']
                        ai_explanation = ai_output['explanation']

                        # Override params with AI decisions
                        platform = ai_params.get('platform', platform)
                        params = {
                            'bass': ai_params.get('bass', 0),
                            'mids': ai_params.get('mids', 0),
                            'highs': ai_params.get('highs', 0),
                            'width': ai_params.get('width', 100),
                            'compression': ai_params.get('compression', 5),
                            'warmth': ai_params.get('warmth', 20),
                            'loudness': ai_params.get('loudness', -14)
                        }

                        print(f"✅ AI Analysis Complete!")
                        print(f"   Genre: {ai_explanation['genre']['detected']}")
                        print(f"   Confidence: {ai_explanation['confidence']['percentage']}%")
                        print(f"   Platform: {ai_explanation['platform']['selected']}")

                    except Exception as e:
                        print(f"⚠️  AI parsing error (using defaults): {e}")
                        auto_master = False

                # Master audio
                print(f"🎚️  Mastering audio for {platform}...")
                output_wav = tmpdir / f"{job_id}_mastered.wav"

                master_cmd = [
                    "python3",
                    str(MASTER_SCRIPT),
                    str(input_path),
                    str(output_wav),
                    "--platform", platform,
                    "--analysis", str(analysis_path),
                    "--bass", str(params.get('bass', 0)),
                    "--mids", str(params.get('mids', 0)),
                    "--highs", str(params.get('highs', 0)),
                    "--width", str(params.get('width', 100)),
                    "--compression", str(params.get('compression', 5)),
                    "--warmth", str(params.get('warmth', 20)),
                    "--loudness", str(params.get('loudness', -14))
                ]

                subprocess.run(master_cmd, check=True)

                # Convert to MP3
                print(f"🎵 Converting to MP3...")
                output_mp3 = tmpdir / f"{job_id}_mastered.mp3"

                ffmpeg_cmd = [
                    "ffmpeg",
                    "-i", str(output_wav),
                    "-b:a", "320k",
                    "-q:a", "0",
                    "-y",
                    str(output_mp3)
                ]

                subprocess.run(ffmpeg_cmd, check=True, capture_output=True)

                # Upload both WAV and MP3 to Supabase
                print(f"📤 Uploading mastered files...")

                # Upload WAV
                with open(output_wav, 'rb') as f:
                    wav_data = f.read()
                    self.supabase.storage.from_(OUTPUT_BUCKET).upload(
                        f"{job_id}_mastered.wav",
                        wav_data,
                        {"content-type": "audio/wav"}
                    )

                # Upload MP3
                with open(output_mp3, 'rb') as f:
                    mp3_data = f.read()
                    self.supabase.storage.from_(OUTPUT_BUCKET).upload(
                        f"{job_id}_mastered.mp3",
                        mp3_data,
                        {"content-type": "audio/mpeg"}
                    )

                # Update job with download URLs
                wav_url = f"{SUPABASE_URL}/storage/v1/object/public/{OUTPUT_BUCKET}/{job_id}_mastered.wav"
                mp3_url = f"{SUPABASE_URL}/storage/v1/object/public/{OUTPUT_BUCKET}/{job_id}_mastered.mp3"

                update_data = {
                    'output_wav_url': wav_url,
                    'output_mp3_url': mp3_url
                }

                # Include AI explanation if AUTO MASTER was used
                if ai_explanation:
                    update_data['ai_explanation'] = ai_explanation

                self.supabase.table('mastering_jobs') \
                    .update(update_data) \
                    .eq('id', job_id) \
                    .execute()

                print(f"✨ Mastering complete!")
                print(f"   WAV: {wav_url}")
                print(f"   MP3: {mp3_url}")

                return True

        except Exception as e:
            print(f"❌ Error processing job: {e}")
            import traceback
            traceback.print_exc()
            return False

def main():
    print("=" * 60)
    print("🎵 LUVLANG AUDIO MASTERING SERVICE")
    print("=" * 60)
    print()

    # Check if scripts exist
    if not ANALYZE_SCRIPT.exists():
        print(f"❌ ERROR: analyze_audio.py not found at {ANALYZE_SCRIPT}")
        sys.exit(1)

    if not MASTER_SCRIPT.exists():
        print(f"❌ ERROR: master_audio_ultimate.py not found at {MASTER_SCRIPT}")
        sys.exit(1)

    # Check if FFmpeg is installed
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except:
        print("❌ ERROR: FFmpeg not found. Install with: brew install ffmpeg")
        sys.exit(1)

    print("✅ All dependencies found")
    print()

    # Start processor
    processor = LuvLangProcessor()
    processor.watch_and_process()

if __name__ == "__main__":
    main()
