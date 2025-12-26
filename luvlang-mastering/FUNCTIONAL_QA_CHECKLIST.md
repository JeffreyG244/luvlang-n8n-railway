# FUNCTIONAL QA TESTING CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Purpose
This checklist ensures ALL user-facing features are functionally tested, not just code-reviewed.
Every item must be manually verified in a browser before marking as production-ready.

**Last Updated:** December 26, 2025
**Status:** Active Testing Protocol

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 1: FILE UPLOAD & LOADING (CRITICAL)

### Audio File Upload
- [ ] Click upload area opens file picker
- [ ] Drag & drop audio file works
- [ ] WAV files load successfully
- [ ] MP3 files load successfully
- [ ] M4A files load successfully
- [ ] FLAC files load successfully
- [ ] File name displays correctly
- [ ] Waveform visualizes after upload
- [ ] Spectrum analyzer starts updating
- [ ] Console shows no errors during upload
- [ ] Large files (>50MB) load without timeout
- [ ] Invalid file types show error message

### Reference Track Upload
- [ ] **"Load Reference" button exists and is visible**
- [ ] **Click opens file picker**
- [ ] **Reference file loads without errors**
- [ ] **Reference LUFS displays correctly**
- [ ] **Reference DR displays correctly**
- [ ] **"Apply Match" button becomes enabled**
- [ ] **Console shows successful analysis**
- [ ] **ReferenceTrackMatcher is defined (check console: `window.referenceTrackMatcher`)**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 2: PLAYBACK CONTROLS

### Transport Controls
- [ ] Play button starts playback
- [ ] Pause button pauses playback
- [ ] Stop button stops and resets to start
- [ ] Playback position updates in real-time
- [ ] Waveform position indicator moves
- [ ] Click on waveform seeks to position
- [ ] Volume slider controls output level
- [ ] Playback works after processing

### Looping & A/B
- [ ] Loop button enables loop playback
- [ ] Loop region selection works
- [ ] A/B comparison button exists
- [ ] A/B toggles between processed/unprocessed
- [ ] A/B switch is seamless (no clicks)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 3: AI AUTO-MASTER (CRITICAL)

### AI Processing
- [ ] "AI Auto-Master" button exists
- [ ] Button is disabled before audio loads
- [ ] Button enables after audio uploads
- [ ] Click triggers processing
- [ ] Progress indicator shows during processing
- [ ] Processing completes without errors
- [ ] EQ sliders update automatically
- [ ] Compression settings apply
- [ ] LUFS target is reached
- [ ] True-peak stays below -1.0 dBTP
- [ ] Console shows AI decisions
- [ ] Processed audio sounds louder/clearer
- [ ] Multiple clicks don't cause crashes

### Platform/Genre Selection
- [ ] Platform dropdown has options (Spotify, Apple Music, YouTube, etc.)
- [ ] Genre dropdown has options (Pop, Rock, EDM, Hip-Hop, etc.)
- [ ] Changing platform updates target LUFS
- [ ] Changing genre updates EQ curve
- [ ] Selected values persist during session

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 4: MANUAL EQ CONTROLS

### 7-Band Parametric EQ
- [ ] All 7 sliders are visible (40Hz, 120Hz, 350Hz, 1kHz, 3.5kHz, 8kHz, 14kHz)
- [ ] Dragging sliders updates values
- [ ] Values display in real-time
- [ ] EQ curve visualizes on spectrum
- [ ] Audio changes when sliders move
- [ ] Bypass button disables EQ
- [ ] Reset button returns to 0dB
- [ ] Extreme values don't cause clipping
- [ ] EQ responds to reference matching

### EQ Curve Visualization
- [ ] EQ curve overlays on spectrum
- [ ] Curve updates when sliders move
- [ ] Curve is color-coded (visible)
- [ ] Peaks/notches are accurate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 5: DYNAMICS PROCESSING

### Compressor
- [ ] Compressor threshold slider works
- [ ] Ratio slider works
- [ ] Attack/Release sliders work
- [ ] Makeup gain applies automatically
- [ ] GR (Gain Reduction) meter shows compression
- [ ] Bypass button disables compressor
- [ ] Audio sounds more consistent when enabled

### Limiter
- [ ] Limiter ceiling slider works (default -1.0 dBTP)
- [ ] True-peak meter never exceeds ceiling
- [ ] Limiter prevents clipping
- [ ] Release slider affects pumping
- [ ] Bypass button disables limiter
- [ ] Console shows true-peak values

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 6: STEREO IMAGING

### Width Controls
- [ ] Stereo width slider exists
- [ ] Dragging slider widens/narrows stereo
- [ ] 0% = mono, 100% = normal, 200% = wide
- [ ] Mono bass toggle works (<120Hz)
- [ ] Phase correlation meter updates
- [ ] Excessive width shows warning

### Phase Correlation Meter
- [ ] Meter displays -1 to +1 range
- [ ] Needle moves in real-time
- [ ] Green zone (+0.7 to +1.0)
- [ ] Yellow zone (+0.3 to +0.7)
- [ ] Red zone (negative = phase issues)
- [ ] Mono bass improves correlation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 7: LOUDNESS METERING (CRITICAL)

### LUFS Meter
- [ ] Integrated LUFS displays
- [ ] Short-term LUFS updates in real-time
- [ ] Momentary LUFS updates rapidly
- [ ] Target LUFS shows platform goal
- [ ] Meter matches platform selection
- [ ] Values are accurate (not backwards!)
- [ ] Louder audio shows higher LUFS (less negative)

### True Peak Meter
- [ ] True-peak displays in dBTP
- [ ] Updates in real-time during playback
- [ ] 4x oversampling catches inter-sample peaks
- [ ] Never exceeds -1.0 dBTP after limiting
- [ ] Red warning if exceeded

### Dynamic Range (LRA)
- [ ] LRA displays in dB
- [ ] Updates during playback
- [ ] Typical values: 4-15 dB
- [ ] Heavy compression lowers LRA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 8: VISUALIZATIONS

### Spectrum Analyzer
- [ ] Spectrum displays frequency content
- [ ] Updates at 60fps (smooth)
- [ ] Color-coded by intensity
- [ ] Bass (low) on left, treble (high) on right
- [ ] EQ curve overlays correctly
- [ ] No flickering or stuttering

### Waveform Display
- [ ] Waveform shows audio amplitude
- [ ] Stereo channels visible (L/R)
- [ ] Zoom in/out works
- [ ] Playhead moves during playback
- [ ] Click to seek works
- [ ] Processed audio updates waveform

### Phase Correlation Heatmap
- [ ] Heatmap displays frequency vs correlation
- [ ] Color-coded (green = good, red = bad)
- [ ] Updates in real-time
- [ ] Matches phase meter readings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 9: REFERENCE TRACK MATCHING (CRITICAL FIX AREA)

### Loading Reference
- [ ] **Script file loaded: `reference-track-matching.js`**
- [ ] **Class exists: `typeof ReferenceTrackMatcher !== 'undefined'`**
- [ ] **Instance exists: `window.referenceTrackMatcher` is defined**
- [ ] Load Reference button opens file picker
- [ ] Reference file uploads successfully
- [ ] Reference analysis completes
- [ ] LUFS value displays
- [ ] Dynamic range displays
- [ ] Spectral data captured

### Applying Match
- [ ] "Apply Match" button enables after analysis
- [ ] Match strength slider works (0-100%)
- [ ] Click applies spectral matching
- [ ] 31-band matching updates EQ sliders
- [ ] 70% damping factor prevents extremes
- [ ] ±5.0 dB safety limits enforced
- [ ] Audio tonality matches reference
- [ ] Console shows applied adjustments
- [ ] LUFS moves toward reference target

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 10: ADVANCED FEATURES

### Spectral De-noiser
- [ ] De-noiser toggle button works
- [ ] Hiss reduction slider works
- [ ] Hum reduction slider works
- [ ] Click removal slider works
- [ ] Threshold slider works
- [ ] Learn noise profile button works
- [ ] Noise reduction is audible
- [ ] Doesn't remove too much signal

### Harmonic Exciter
- [ ] Exciter toggle works
- [ ] Amount slider works
- [ ] Frequency slider works
- [ ] Adds brightness/warmth
- [ ] Doesn't cause distortion

### Phone Speaker Preview
- [ ] Preview button exists
- [ ] Click applies phone emulation
- [ ] Audio sounds "tinny" (correct)
- [ ] Toggle off returns to normal
- [ ] Helps identify mix issues

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 11: EXPORT FUNCTIONALITY (CRITICAL)

### Export WAV
- [ ] Export button exists
- [ ] Click triggers export process
- [ ] **Progress bar displays during rendering**
- [ ] **Progress updates 0-100%**
- [ ] **beforeunload prevents navigation**
- [ ] **Triangular dither applied (TPDF)**
- [ ] **Tail-trim removes silence (-90dB)**
- [ ] **Metadata injected (RIFF/INFO)**
- [ ] File downloads automatically
- [ ] Filename is descriptive
- [ ] WAV is 24-bit or 16-bit
- [ ] Exported audio matches preview
- [ ] No clicks/pops at start/end
- [ ] LUFS matches target in exported file
- [ ] True-peak stays below -1.0 dBTP

### Export Validation
- [ ] Open exported WAV in DAW (Pro Tools, Logic, etc.)
- [ ] Verify metadata shows "Mastered by Luvlang AI"
- [ ] Measure LUFS (should match display)
- [ ] Measure true-peak (should be ≤ -1.0 dBTP)
- [ ] Check for silence at start/end (should be trimmed)
- [ ] Listen for dither noise floor (should be smooth, not grainy)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 12: PRESETS & SAVING

### Preset System
- [ ] Preset dropdown has genre presets
- [ ] Selecting preset updates all settings
- [ ] Save preset button works
- [ ] Load preset button works
- [ ] Presets persist across sessions
- [ ] Delete preset button works

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 13: ERROR HANDLING

### User Errors
- [ ] Upload invalid file type shows error
- [ ] Upload corrupted audio shows error
- [ ] Process without audio shows alert
- [ ] Export without audio shows alert
- [ ] Errors don't crash the page
- [ ] Error messages are user-friendly

### Browser Console
- [ ] **No errors in console on page load**
- [ ] **No errors during audio upload**
- [ ] **No errors during AI processing**
- [ ] **No errors during export**
- [ ] Warnings are minimal and expected
- [ ] All scripts load successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 14: PERFORMANCE

### UI Responsiveness
- [ ] 60fps maintained during playback
- [ ] Glassmorphism doesn't lag
- [ ] Spectrum analyzer is smooth
- [ ] Meter updates don't stutter
- [ ] No freezing during WASM processing
- [ ] Multiple operations don't slow down page

### Memory Management
- [ ] Upload/process 10 files consecutively
- [ ] Memory doesn't grow excessively
- [ ] No memory leaks in DevTools
- [ ] Page remains responsive after heavy use

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 15: CROSS-BROWSER TESTING

### Browser Compatibility
- [ ] Chrome (latest) - all features work
- [ ] Firefox (latest) - all features work
- [ ] Safari (latest) - all features work
- [ ] Edge (latest) - all features work
- [ ] Mobile Safari (iOS) - core features work
- [ ] Mobile Chrome (Android) - core features work

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 16: UI STRUCTURE & DUPLICATION CHECK (CRITICAL)

### **MANDATORY Before Every Commit**

This section prevents duplicate UI elements from being added back after cleanup.

### Genre Selectors
- [ ] Only ONE "Genre" or "Genre Preset" selector visible
- [ ] Genre selector has descriptions (e.g., "Hip-Hop (Sub + Presence)")
- [ ] No duplicate genre button grids
- [ ] Count: `grep -c "<!-- GENRE SELECTOR -->" luvlang_LEGENDARY_COMPLETE.html` should return **1**

### EQ Sections
- [ ] Only ONE 7-Band Parametric EQ section visible
- [ ] EQ section has SUB, BASS, LOW MID, MID, HIGH MID, HIGH, AIR bands
- [ ] No "Stereo Field Editor" section (should be removed)
- [ ] No "Spectral De-noiser" section (should be removed)
- [ ] Count: `grep -c '<div class="eq-section"' luvlang_LEGENDARY_COMPLETE.html` should return **1**

### Platform Selectors
- [ ] Only ONE platform selector visible
- [ ] Platform selector has Spotify, YouTube, Apple Music, Tidal
- [ ] LUFS targets display correctly (-14, -14, -16, -14)
- [ ] Count: `grep -c "<!-- PLATFORM SELECTOR -->" luvlang_LEGENDARY_COMPLETE.html` should return **1**

### EQ Preset Dropdown
- [ ] EQ preset dropdown exists (`<select id="eqPresetSelect">`)
- [ ] Dropdown has 6 options (Hip-Hop, Pop, EDM, Rock, Jazz, Neutral)
- [ ] Dropdown is wired up to applyGenrePreset() function
- [ ] Check: `grep -c 'id="eqPresetSelect"' luvlang_LEGENDARY_COMPLETE.html` should return **1**

### Visual Inspection
- [ ] Open page in browser
- [ ] Scroll through entire page
- [ ] Look for sections that appear twice
- [ ] Count how many times you see:
  - Genre selectors (should be 1)
  - EQ fader sections (should be 1)
  - Platform selectors (should be 1)

### Automated Check Script
```bash
#!/bin/bash
echo "🔍 UI Duplication Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Genre Selectors: $(grep -c '<!-- GENRE SELECTOR -->' luvlang_LEGENDARY_COMPLETE.html) (should be 1)"
echo "EQ Sections: $(grep -c '<div class="eq-section"' luvlang_LEGENDARY_COMPLETE.html) (should be 1)"
echo "Platform Selectors: $(grep -c '<!-- PLATFORM SELECTOR -->' luvlang_LEGENDARY_COMPLETE.html) (should be 1)"
echo "EQ Preset Dropdown: $(grep -c 'id="eqPresetSelect"' luvlang_LEGENDARY_COMPLETE.html) (should be 1)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

Save this as `check-duplicates.sh` and run before every commit.

### What Went Wrong (December 26, 2025 - SECOND TIME)

**Issue:** After user explicitly said "make sure we dont have any duplicates," I still missed:
- 2 Genre selectors (one without descriptions, one with)
- 3 EQ-like sections (Stereo Field Editor, Spectral De-noiser, Professional EQ)
- Missing EQ Preset dropdown

**Root Cause:**
1. Previously removed Stereo Field Editor in commit 1022b8b
2. I reintroduced it when adding production features
3. Never checked git history for previous removals
4. No automated duplication detection
5. No visual verification of UI structure

**Fix Applied:**
- Removed Stereo Field Editor (105 lines)
- Removed Spectral De-noiser (72 lines)
- Removed first Genre selector (12 lines)
- Added EQ Preset dropdown
- Created DUPLICATION_REMOVAL_PLAN.md to document what was removed and why

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## TESTING PROTOCOL

### Before Each Release:

1. **Open Browser DevTools Console**
   - Check for script loading errors
   - Verify all classes are defined:
     ```javascript
     console.log('ReferenceTrackMatcher:', typeof ReferenceTrackMatcher);
     console.log('Instance:', window.referenceTrackMatcher);
     console.log('StereoFieldEditor:', typeof StereoFieldEditor);
     console.log('SpectralDenoiser:', typeof SpectralDenoiser);
     ```

2. **Test Critical User Path (5 minutes)**
   - Upload audio file
   - Click AI Auto-Master
   - Upload reference track
   - Apply reference match
   - Export WAV
   - Verify exported file

3. **Check Console for Errors**
   - No red errors allowed
   - Yellow warnings acceptable if documented

4. **Test Edge Cases**
   - Large files (>100MB)
   - Very short files (<1 second)
   - Mono files
   - High sample rate files (96kHz, 192kHz)
   - 32-bit float files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## WHAT WENT WRONG (December 26, 2025)

**Issue:** Reference track uploads completely non-functional

**Root Cause:**
- `reference-track-matching.js` not loaded in HTML
- ReferenceTrackMatcher class undefined
- Code tried to instantiate undefined class
- Error only visible when user clicked button

**Why Code Review Missed It:**
- ✅ Code quality was good
- ✅ Algorithms were correct
- ✅ Memory management was safe
- ❌ **But actual functionality was never tested**

**Lesson Learned:**
- Code review ≠ Functional testing
- Must click every button and verify it works
- Console must be checked for errors
- User path must be tested end-to-end

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## MANDATORY BEFORE PRODUCTION RELEASE

**You must be able to answer YES to all these:**

1. Did you open the page in a browser?
2. Did you click every button at least once?
3. Did you check the console for errors?
4. Did you upload a file and process it?
5. Did you export the result and listen to it?
6. Did you test reference track matching?
7. Did you verify all meters update?
8. Did you test on at least 2 browsers?

**If any answer is NO, the release is NOT ready.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Last Updated: December 26, 2025
Status: Active - Use this checklist for every release
