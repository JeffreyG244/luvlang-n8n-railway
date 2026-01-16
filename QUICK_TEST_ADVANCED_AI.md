# 🧪 QUICK TEST GUIDE - Advanced AI Mastering Engine

**Status:** Ready to test!
**File:** `advanced_ai_master.py`

---

## ⚡ Quick Test (2 minutes)

### 1. Make sure you have the required libraries:

```bash
pip3 install librosa soundfile scipy numpy
```

### 2. Test with any audio file:

```bash
# Basic analysis (no reference)
python3 advanced_ai_master.py test_audio.wav

# Advanced analysis (with reference)
python3 advanced_ai_master.py my_song.wav --reference pro_track.wav
```

---

## 📂 What You'll Get

### Output File: `advanced_analysis.json`

Contains:
- **31-band spectrum** (dB levels for every frequency)
- **True LUFS** (integrated, short-term, LRA)
- **Resonances** (problem frequencies to cut)
- **Transients** (attack time, punchiness)
- **Harmonics** (THD, warmth vs harshness)
- **Spectral Tilt** (brightness character)
- **Reference Matching** (if reference provided):
  - EQ suggestions
  - Loudness adjustment
  - Stereo width adjustment
  - Dynamics comparison

---

## 🎯 Example Test

### Test with your current mastered track:

```bash
# If you have a mastered track in luvlang-mastering folder
python3 advanced_ai_master.py "mastered_output.wav"
```

### Expected output in terminal:

```
🎵 Loading input track: mastered_output.wav

================================================================================
🚀 ADVANCED AI MASTERING ENGINE
================================================================================

📊 Running 31-band frequency analysis...

================================================================================
🚀 RUNNING COMPLETE ADVANCED AI ANALYSIS
================================================================================

📢 Integrated LUFS: -14.2 LUFS

🔍 Detecting resonances and problem frequencies...
✅ No significant resonances detected

🥁 Analyzing transients and rhythmic character...
  Average transient strength: 0.482
  Average attack time: 8.32 ms
  Transient consistency: 0.85
  Character: Punchy (medium attack)

🎸 Analyzing harmonic content and distortion...
  THD estimate: 3.82%
  Harmonic character: Warm analog character (rich harmonics)

🌈 Analyzing spectral tilt (brightness)...
  Spectral tilt: -2.1 dB/decade
  Character: Warm (gentle roll-off)

================================================================================
✅ Analysis complete! Results saved to: advanced_analysis.json
================================================================================
```

---

## 🎯 Test with Reference Track

### Get a professional reference:

1. Download a professional track (e.g., from Spotify, Apple Music)
2. Convert to WAV if needed
3. Run comparison:

```bash
python3 advanced_ai_master.py "my_song.wav" --reference "The_Weeknd_Blinding_Lights.wav"
```

### Expected output:

```
🎯 REFERENCE TRACK ANALYSIS
================================================================================

📊 SPECTRAL COMPARISON (31 bands):

   250 Hz: Your track:  -8.2 dB | Reference: -5.7 dB | → Boost 2.5 dB
  1000 Hz: Your track: -12.5 dB | Reference: -14.3 dB | → Cut 1.8 dB
  3150 Hz: Your track: -18.1 dB | Reference: -14.9 dB | → Boost 3.2 dB
  5000 Hz: Your track: -22.4 dB | Reference: -19.8 dB | → Boost 2.6 dB

📢 LOUDNESS COMPARISON:

  Your LUFS:      -18.2 LUFS
  Reference LUFS: -14.1 LUFS
  → Increase gain: 4.1 dB

🎧 STEREO WIDTH COMPARISON:

  Your width:      0.62
  Reference width: 0.78
  → Widen stereo: 16%

⚡ DYNAMICS COMPARISON:

  Your crest factor:      8.2 dB
  Reference crest factor: 7.1 dB
  → Increase compression (reduce dynamics by 1.1 dB)
```

---

## 📊 Reading the JSON Output

```bash
# View results
cat advanced_analysis.json

# Pretty print
python3 -m json.tool advanced_analysis.json
```

### JSON structure:

```json
{
  "spectrum_31_band": {
    "band_db_levels": {
      "20": -45.2,
      "250": -8.2,
      "1000": -12.5,
      ...
    }
  },
  "lufs": {
    "integrated_lufs": -14.2,
    "short_term_lufs": -13.8,
    "loudness_range_lu": 6.5
  },
  "resonances": [
    {
      "frequency": 2847.3,
      "peak_db": 8.2,
      "q_factor": 4.1,
      "suggested_cut_db": 5.7
    }
  ],
  "transients": {
    "avg_attack_ms": 8.32,
    "character": "Punchy (medium attack)"
  },
  "harmonics": {
    "thd": 0.0382,
    "character": "Warm analog character"
  },
  "spectral_tilt": {
    "tilt_db_per_decade": -2.1,
    "character": "Warm (gentle roll-off)"
  },
  "reference_matching": {
    "eq_suggestions": [
      {
        "frequency": 250,
        "adjustment_db": 2.5,
        "action": "Boost"
      }
    ],
    "lufs_adjustment": 4.1,
    "stereo_width_adjustment": 0.16
  }
}
```

---

## ✅ What to Check

### 1. **LUFS Level**
- Target: -14 LUFS (Spotify/YouTube)
- Target: -16 LUFS (Apple Music)
- Target: -11 LUFS (SoundCloud/competitive)

### 2. **Resonances**
- Should be 0-2 resonances max
- If > 3 resonances: track needs EQ cleanup

### 3. **Transient Character**
- EDM/Hip-Hop: Attack < 8ms (punchy)
- Pop: Attack 8-12ms (balanced)
- Acoustic: Attack > 12ms (smooth)

### 4. **Harmonic Distortion**
- < 1%: Very clean (digital)
- 1-5%: Warm (analog)
- > 5%: Saturated (may be too much)

### 5. **Spectral Tilt**
- Bright genres: > 0 dB/decade
- Balanced: -1 to +1 dB/decade
- Warm genres: < -1 dB/decade

---

## 🚀 Next Steps After Testing

### If analysis looks good:
✅ You're ready to integrate with frontend
✅ Add "Analyze with Reference" button
✅ Display results in beautiful UI

### If you find issues:
1. Check if libraries are installed correctly
2. Make sure audio files are valid WAV format
3. Check sample rate (44.1kHz or 48kHz recommended)

---

## 🎛️ Apply Results Manually

### Use the suggestions in LuvLang frontend:

1. **Open luvlang_ultra_simple_frontend.html**
2. **Load your track**
3. **Apply suggested EQ moves:**
   - Example: "250 Hz → Boost 2.5 dB"
   - Use the 7-band parametric EQ sliders
4. **Adjust compression** based on dynamics comparison
5. **Apply limiting** to reach target LUFS
6. **Run analysis again** to verify improvements

---

## 💡 Pro Tips

### Get the best results:
- Use professional reference tracks in same genre
- Compare to multiple references (not just one)
- Focus on biggest differences first (> 3dB)
- Re-analyze after each adjustment
- Iterate until spectrum matches

### Common scenarios:

**"Your LUFS: -18.2, Reference: -14.1"**
→ Your track is too quiet, increase limiting

**"Found 5 resonances"**
→ Use suggested EQ cuts to remove harshness

**"Your width: 0.4, Reference: 0.8"**
→ Track is too narrow, widen stereo field

**"Attack time: 15ms (smooth)"**
→ For EDM, use transient shaper to increase punch

---

**Status:** ✅ Ready to test!
**Documentation:** See `ADVANCED_AI_FEATURES_IMPLEMENTED.md` for full details

---

**Last Updated:** 2025-12-01
