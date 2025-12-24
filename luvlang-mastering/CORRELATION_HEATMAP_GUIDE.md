# 🎨 CORRELATION HEATMAP - Elite Feature Guide

## What is it?

The **Frequency-Domain Phase Correlation Heatmap** is a TOP 1% mastering feature found only in:
- **iZotope Ozone 11** (Insight Module) - $399
- **Nugen MasterCheck Pro** - $249
- **SSL Fusion** (hardware) - $2,999

## What Does It Show?

Unlike a traditional phase correlation meter that shows **overall** phase relationship, this shows phase correlation **per frequency band**. This means you can see exactly which frequencies will collapse when your mix is played back in mono.

## Why Does This Matter?

### 1. **Streaming Platforms Use Mono**
- Apple Music downmixes to mono on HomePod
- Spotify downmixes for bluetooth speakers
- TikTok/Instagram use mono on mobile
- If your stereo width is created by phase tricks, it will **disappear** in mono

### 2. **Radio & Broadcast**
- FM radio is mono
- AM radio is mono
- Many voice assistants (Alexa, Siri) play mono
- Your track must survive mono playback

### 3. **Club Systems**
- Many club systems sum to mono in certain areas
- Phase-based width can cause frequency cancellation
- Your bass might vanish in the center of the room

## How to Read the Heatmap

### Color Legend

| Color | Correlation | Meaning | Action |
|-------|-------------|---------|--------|
| 🟢 **GREEN** | +0.7 to +1.0 | Perfect phase coherence - **Mono safe** | No action needed |
| 🟡 **YELLOW** | +0.3 to +0.7 | Moderate phase issues - Some mono loss | Check stereo width effects |
| 🔴 **RED** | 0.0 to +0.3 | Severe problems - Major mono collapse | **Fix immediately** |
| 🟣 **MAGENTA** | -0.5 to 0.0 | Negative correlation - Partial inversion | **Critical issue** |
| 🔵 **BLUE** | -1.0 to -0.5 | Extreme inversion - Total cancellation | **Emergency fix needed** |

### Visual Layout

```
High Freq (20kHz) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ NOW

Mid Freq  (1kHz)  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Low Freq  (20Hz)  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  ← PAST            TIME            NOW →
```

- **Y-Axis (Vertical)**: Frequency (20Hz at bottom, 20kHz at top)
- **X-Axis (Horizontal)**: Time (scrolls right to left, ~3.3 seconds visible)
- **White line at right edge**: Current moment ("NOW")

## Common Problems & Fixes

### ❌ Problem 1: Red/Magenta in Bass (20-200Hz)
**Cause**: Out-of-phase bass frequencies (common with stereo bass synths or wide bass processing)

**Fix**:
1. Click "M/S" button in Premium tier
2. Check "Mid" solo - bass should be centered
3. If bass is in "Side" channel, it will cancel in mono
4. Re-route bass to "Mid" only

### ❌ Problem 2: Yellow in Vocal Range (500Hz-4kHz)
**Cause**: Stereo widening plugins on vocals, room reverb with too much stereo width

**Fix**:
1. Reduce stereo width on vocal effects
2. Keep vocal dry signal 100% mono
3. Apply width only to reverb/delay tails

### ❌ Problem 3: Red in High-Mids (2-8kHz)
**Cause**: Stereo imaging plugins, phase-based enhancers, improper panning

**Fix**:
1. Reduce "Stereo Width" slider in Advanced/Premium tiers
2. Check EQ - some equalizers can cause phase shifts
3. Avoid excessive multiband stereo widening

### ❌ Problem 4: Blue Anywhere
**Cause**: One channel inverted (cable wired backwards, plugin error, or intentional phase trick)

**Fix**:
1. **CRITICAL**: Fix immediately - this will cause total frequency cancellation
2. Click "Reset" to remove all processing
3. Re-upload your audio file
4. If problem persists, your source file has inverted phase

## Real-World Use Cases

### ✅ Example 1: Electronic Music (Deep House)
**Goal**: Wide synths, solid mono-compatible bass

**What to Look For**:
- Bass (20-150Hz): Should be **solid green**
- Kick (50-100Hz): Should be **solid green**
- Synths (200Hz-5kHz): Can be **yellow/light green** (acceptable width)
- Hi-hats (8-15kHz): **Green or yellow** is fine

### ✅ Example 2: Podcast/Spoken Word
**Goal**: Perfect mono compatibility (often played on phone speakers)

**What to Look For**:
- Voice range (150Hz-4kHz): Must be **100% green**
- Any yellow/red indicates room reverb is too wide
- All frequencies should be green for broadcast safety

### ✅ Example 3: Rock/Pop Mix
**Goal**: Wide guitars, centered vocals, punchy mono-compatible drums

**What to Look For**:
- Vocals (500Hz-3kHz): **Solid green** in center
- Guitars (200Hz-5kHz): **Yellow is OK** (stereo width)
- Bass guitar (40-250Hz): **Must be green**
- Snare (150-800Hz): **Should be green** (centered)

## Pro Tips

### 1. **A/B Test with Mono Button**
- Use the "MONO" button in your mastering suite
- Compare heatmap **before** and **after** clicking mono
- Green areas should stay visible in mono
- Red/blue areas will disappear or change drastically

### 2. **Check Streaming Platform Compatibility**
- Spotify normalizes to -14 LUFS and downmixes to mono on small speakers
- Apple Music uses -16 LUFS
- If your heatmap shows lots of yellow/red, your track will sound thin on streaming

### 3. **Use Reference Tracks**
- Load a professionally mastered reference track
- Watch its correlation heatmap
- Notice how bass is always green, mids are mostly green, highs can be yellow
- Match this pattern

### 4. **Fix Before Limiting**
- Correlation problems should be fixed **before** the limiter
- Once you've limited to -0.1 dB, phase issues are baked in
- Use this heatmap while adjusting EQ and stereo width

## Technical Details (For Engineers)

### Algorithm
- **FFT Size**: 32,768 points (high frequency resolution)
- **Frequency Bands**: 20 logarithmic bands (20Hz - 20kHz)
- **Correlation Method**: Pearson coefficient per band
- **Time History**: 200 frames (~3.3 seconds at 60 fps)
- **Update Rate**: Real-time (60 fps)

### Calculation
For each frequency band:
1. Split L/R channels into time-domain samples
2. Weight samples by magnitude in that frequency band
3. Calculate Pearson correlation: `r = Σ(L·R) / sqrt(Σ(L²)·Σ(R²))`
4. Map correlation to color: `-1.0` (blue) → `0.0` (red) → `+1.0` (green)

### Interpretation
- **+1.0**: Perfect correlation (mono or identical L/R)
- **0.0**: Uncorrelated (pure stereo information)
- **-1.0**: Inverted phase (L = -R, complete cancellation in mono)

## Keyboard Shortcuts

- **M**: Toggle mono monitoring (check if heatmap predictions match reality)
- **R**: Reset all processing (clear phase issues)
- **Space**: Play/Pause (watch heatmap in real-time)

## Related Features

- **Phase Correlation Goniometer**: Shows overall L/R phase relationship (above this heatmap)
- **Stereo Width Control**: Adjust stereo width per band (Advanced/Premium tiers)
- **M/S Processing**: Fix phase issues by adjusting Mid/Side balance (Premium tier)

---

**This feature alone justifies professional mastering software pricing. You now have the same diagnostic tool as $2,999 hardware consoles.**
