# 🎯 Platform Targets Verification Guide

## Status: Ready for Testing

**Date:** 2025-12-22
**Purpose:** Verify all platform targets work correctly

---

## ✅ Platform Target Configuration

| Platform | Button Attribute | Target LUFS | Limiter Threshold |
|----------|------------------|-------------|-------------------|
| **Spotify** | `data-platform="spotify"` | -14 LUFS | -2.0 dB |
| **YouTube** | `data-platform="youtube"` | -13 LUFS | -2.0 dB |
| **Apple Music** | `data-platform="apple"` | -16 LUFS | -2.5 dB |
| **Tidal** | `data-platform="tidal"` | -14 LUFS | -2.0 dB |

---

## 🧪 How to Test Each Platform

### Test Setup:
1. **Hard refresh** browser (Cmd+Shift+R or Ctrl+Shift+R)
2. **Open console** (F12 or Cmd+Option+I)
3. **Clear console**
4. **Load an audio file** (should be around -20 LUFS or quieter)

---

### Test 1: Spotify (-14 LUFS)

**Steps:**
1. Click "**Spotify**" platform button
2. Check console for: `🎯 User selected platform: spotify → Target: -14 LUFS`
3. Click "**AI AUTO MASTER**"
4. Check console for:
   ```
   🔍 DETECTING PROBLEMS...
      Current LUFS: -20.0
      Platform Target: -14
      Checking if -20 < -14.5 = true
      ✅ LOW_LEVEL problem detected! Shortfall: 6.0 dB
   ```
5. Check mastering report shows:
   ```
   ✓ Loudness: -20.0 LUFS → -14.0 LUFS
   ```

**Expected Result:**
- ✅ Console shows target: -14 LUFS
- ✅ Report shows: -20.0 → -14.0 LUFS
- ✅ Audio is boosted by +6 dB

---

### Test 2: YouTube (-13 LUFS)

**Steps:**
1. **Reload audio file** (to reset to -20 LUFS)
2. Click "**YouTube**" platform button
3. Check console for: `🎯 User selected platform: youtube → Target: -13 LUFS`
4. Click "**AI AUTO MASTER**"
5. Check console for:
   ```
   🔍 DETECTING PROBLEMS...
      Current LUFS: -20.0
      Platform Target: -13
      Checking if -20 < -13.5 = true
      ✅ LOW_LEVEL problem detected! Shortfall: 7.0 dB
   ```
6. Check mastering report shows:
   ```
   ✓ Loudness: -20.0 LUFS → -13.0 LUFS
   ```

**Expected Result:**
- ✅ Console shows target: -13 LUFS
- ✅ Report shows: -20.0 → -13.0 LUFS
- ✅ Audio is boosted by +7 dB (louder than Spotify)

---

### Test 3: Apple Music (-16 LUFS)

**Steps:**
1. **Reload audio file** (to reset to -20 LUFS)
2. Click "**Apple Music**" platform button
3. Check console for: `🎯 User selected platform: apple → Target: -16 LUFS`
4. Click "**AI AUTO MASTER**"
5. Check console for:
   ```
   🔍 DETECTING PROBLEMS...
      Current LUFS: -20.0
      Platform Target: -16
      Checking if -20 < -16.5 = true
      ✅ LOW_LEVEL problem detected! Shortfall: 4.0 dB
   ```
6. Check mastering report shows:
   ```
   ✓ Loudness: -20.0 LUFS → -16.0 LUFS
   ```

**Expected Result:**
- ✅ Console shows target: -16 LUFS
- ✅ Report shows: -20.0 → -16.0 LUFS
- ✅ Audio is boosted by +4 dB (quieter than Spotify, more dynamic)

---

### Test 4: Tidal (-14 LUFS)

**Steps:**
1. **Reload audio file** (to reset to -20 LUFS)
2. Click "**Tidal**" platform button
3. Check console for: `🎯 User selected platform: tidal → Target: -14 LUFS`
4. Click "**AI AUTO MASTER**"
5. Check console for:
   ```
   🔍 DETECTING PROBLEMS...
      Current LUFS: -20.0
      Platform Target: -14
      Checking if -20 < -14.5 = true
      ✅ LOW_LEVEL problem detected! Shortfall: 6.0 dB
   ```
6. Check mastering report shows:
   ```
   ✓ Loudness: -20.0 LUFS → -14.0 LUFS
   ```

**Expected Result:**
- ✅ Console shows target: -14 LUFS
- ✅ Report shows: -20.0 → -14.0 LUFS
- ✅ Audio is boosted by +6 dB (same as Spotify)

---

## 🐛 If a Platform Doesn't Work

### Problem: Console shows wrong target

**Example:**
```
🎯 User selected platform: youtube → Target: -14 LUFS  ← WRONG! Should be -13
```

**Solution:** The switch statement isn't matching. Check if:
1. Button has correct `data-platform` attribute
2. `.toLowerCase()` is being applied correctly
3. Case statement matches the attribute value

---

### Problem: Console shows no platform selected

**Example:**
```
(No platform message appears)
Platform Target: -14  ← Always default
```

**Solution:** Button click handler isn't working. Check if:
1. Button has the `active` class applied when clicked
2. Event listener is attached to the button
3. `selectedPlatformBtn` is being found by the query selector

---

### Problem: Report shows -20.0 → -20.0 LUFS

**Example:**
```
✓ Loudness: -20.0 LUFS → -20.0 LUFS  ← No change!
```

**Solution:** The `low_level` problem isn't being detected. Check console for:
```
🔍 DETECTING PROBLEMS...
   Current LUFS: -20.0
   Platform Target: -14
   Checking if -20 < -14.5 = true
```

If `Platform Target` is `undefined` or `NaN`, the fix I made didn't load properly. Hard refresh again.

---

## 📊 Console Debug Output Reference

### When Loading Audio:
```
📂 Loaded: your_track.wav
🎯 User selected platform: spotify → Target: -14 LUFS
```

### When Analyzing:
```
🔍 DETECTING PROBLEMS...
   Current LUFS: -20.0
   Platform Target: -14
   Checking if -20 < -14.5 = true
   ✅ LOW_LEVEL problem detected! Shortfall: 6.0 dB
```

### When Applying AI Master:
```
🔧 APPLYING PROFESSIONAL BROADCAST MASTERING...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FIXED: Low level - Boosted by +6.0dB to reach -14 LUFS (spotify target)
   Using makeupGain (before limiter) to protect peaks at -1.0 dBTP
📊 LUFS Calculation: -20.0 + 6.0 dB (makeupGain) = -14.0 LUFS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 BEFORE Mastering: -20.0 LUFS
📊 AFTER Mastering: -14.0 LUFS
🎯 Target: -14 LUFS
✅ Change: +6.0 dB
```

---

## 🎯 Quick Reference Table

### Expected Gain Adjustments (from -20 LUFS starting point):

| Platform | Target LUFS | Gain Applied | Final LUFS | Loudness Level |
|----------|-------------|--------------|------------|----------------|
| **Spotify** | -14 LUFS | +6.0 dB | -14.0 LUFS | Commercial |
| **YouTube** | -13 LUFS | +7.0 dB | -13.0 LUFS | Loud (YouTube standard) |
| **Apple Music** | -16 LUFS | +4.0 dB | -16.0 LUFS | Quieter, More Dynamic |
| **Tidal** | -14 LUFS | +6.0 dB | -14.0 LUFS | Commercial (same as Spotify) |

---

## 🎧 Listening Test

After mastering with each platform, you should hear:

1. **YouTube (-13 LUFS):** Loudest, most aggressive (competitive with commercial releases)
2. **Spotify/Tidal (-14 LUFS):** Commercial loudness, punchy
3. **Apple Music (-16 LUFS):** Quieter, more headroom, more dynamic (Apple's preference)

The differences are subtle but important for platform optimization.

---

## ✅ Verification Checklist

Use this checklist to verify all platforms work:

- [ ] **Spotify** → Console shows `-14 LUFS` target
- [ ] **Spotify** → Report shows `-20.0 → -14.0 LUFS`
- [ ] **YouTube** → Console shows `-13 LUFS` target
- [ ] **YouTube** → Report shows `-20.0 → -13.0 LUFS`
- [ ] **Apple Music** → Console shows `-16 LUFS` target
- [ ] **Apple Music** → Report shows `-20.0 → -16.0 LUFS`
- [ ] **Tidal** → Console shows `-14 LUFS` target
- [ ] **Tidal** → Report shows `-20.0 → -14.0 LUFS`
- [ ] All platforms apply correct gain adjustment
- [ ] All platforms show debug messages in console
- [ ] No error alerts appear

---

## 📝 Code Reference

### Platform Target Mapping (Lines 2308-2324)

```javascript
switch(userSelectedPlatform.toLowerCase()) {
    case 'spotify':
        platformTarget = -14;
        break;
    case 'apple':
        platformTarget = -16;
        break;
    case 'youtube':
        platformTarget = -13;
        break;
    case 'tidal':
        platformTarget = -14;
        break;
    default:
        platformTarget = -14;
}
```

### Platform Selector Buttons (Lines 1095-1106)

```html
<div class="selector-btn active" data-platform="spotify">
    <div>Spotify</div>
    <div style="font-size: 0.65rem; opacity: 0.6; margin-top: 2px;">-14 LUFS</div>
</div>
<div class="selector-btn" data-platform="youtube">
    <div>YouTube</div>
    <div style="font-size: 0.65rem; opacity: 0.6; margin-top: 2px;">-13 LUFS</div>
</div>
<div class="selector-btn" data-platform="apple">
    <div>Apple Music</div>
    <div style="font-size: 0.65rem; opacity: 0.6; margin-top: 2px;">-16 LUFS</div>
</div>
```

---

**Test Date:** 2025-12-22
**Status:** Ready for verification
**Expected Result:** All platforms apply correct LUFS targets

**If all tests pass, your platform targeting system is working perfectly!** 🎉
