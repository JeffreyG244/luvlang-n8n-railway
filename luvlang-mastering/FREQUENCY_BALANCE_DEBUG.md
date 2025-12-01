# 🔧 FREQUENCY BALANCE DEBUGGING GUIDE

## Issue: Frequency Balance Bars Not Working

### What Should Be Happening:

The 7 frequency balance bars should animate in real-time showing the energy in each frequency band:
- **Sub** (20-60 Hz)
- **Bass** (60-250 Hz)
- **Low Mid** (250-500 Hz)
- **Mid** (500-2000 Hz)
- **High Mid** (2000-6000 Hz)
- **High** (6000-12000 Hz)
- **Air** (12000-20000 Hz)

### Diagnostic Steps:

#### 1. Check Browser Console
1. Open the frontend in your browser
2. Press **F12** (Windows) or **Cmd+Option+I** (Mac) to open Developer Tools
3. Go to the **Console** tab
4. Upload an audio file
5. Look for these messages:

**Expected messages:**
```
✅ Media source created from audio element
✅ Audio graph connected
✅ Starting visualization...
🎵 Visualization started - FFT size: 4096 Bins: 2048
```

**If you see errors:**
- Look for any red error messages
- Common issues:
  - "AudioContext was not allowed to start"
  - "Failed to create media element source"
  - "Cannot read property 'style' of null"

#### 2. Check Audio is Playing
- After uploading a file, is audio playing?
- Can you hear the track?
- Is the play/pause button responding?

**If audio is not playing:**
- Click the play button manually
- Check browser audio permissions
- Try refreshing the page (Cmd+Shift+R or Ctrl+Shift+R)

#### 3. Check Elements Exist in DOM
In the Console tab, type:
```javascript
document.getElementById('eqSub')
document.getElementById('eqBass')
document.getElementById('eqLowMid')
document.getElementById('eqMid')
document.getElementById('eqHighMid')
document.getElementById('eqHigh')
document.getElementById('eqAir')
```

**Expected:** Each command should return an HTML element like:
```html
<div class="eq-bar" style="height: 50%;" id="eqSub"></div>
```

**If you get null:** The HTML structure is broken

#### 4. Check Analyser is Working
In the Console tab, type:
```javascript
analyser
```

**Expected:** Should return an AnalyserNode object

**If undefined:** The Web Audio setup failed

#### 5. Manual Test
In the Console tab, try manually setting bar heights:
```javascript
document.getElementById('eqBass').style.height = '80%';
document.getElementById('eqMid').style.height = '60%';
document.getElementById('eqHigh').style.height = '90%';
```

**Expected:** Bars should change height immediately

**If bars don't move:** CSS or DOM issue

#### 6. Check Frequency Data
In the Console tab, enable debug logging:
```javascript
// Watch for the occasional frequency level logs
// You should see output like:
📊 Frequency levels: {
  sub: 45.2,
  bass: 78.5,
  lowMid: 62.3,
  mid: 85.1,
  highMid: 71.2,
  high: 54.8,
  air: 32.1
}
```

**If all values are 0 or near 0:** Audio is not reaching the analyser

---

## Common Issues & Fixes:

### Issue 1: AudioContext Suspended
**Symptoms:** Bars don't move, no frequency data

**Fix:**
```javascript
// In Console, type:
audioContext.resume()
```

Then play the audio again.

### Issue 2: Source Node Already Created
**Symptoms:** Error message about media element source

**Fix:** Refresh the page (Cmd+Shift+R / Ctrl+Shift+R)

### Issue 3: Browser Autoplay Policy
**Symptoms:** Audio doesn't start, no visualization

**Fix:**
1. Click anywhere on the page first
2. Then upload and play audio
3. Or manually click the play button after upload

### Issue 4: Wrong Audio Context State
**Symptoms:** Everything looks connected but no visualization

**Check state:**
```javascript
// In Console:
audioContext.state
```

**Expected:** "running"
**If "suspended":** Run `audioContext.resume()`
**If "closed":** Refresh page

### Issue 5: CSS Display Issue
**Symptoms:** Bars exist but aren't visible

**Check CSS:**
```javascript
// In Console:
const bar = document.getElementById('eqBass');
console.log(bar.style.height);
console.log(window.getComputedStyle(bar).height);
console.log(window.getComputedStyle(bar).display);
```

**Expected:**
- height: "75%" or similar
- computed height: "Xpx"
- display: "block" or not "none"

---

## Quick Fix Script:

Copy and paste this into the browser Console to diagnose:

```javascript
console.log('🔍 FREQUENCY BALANCE DIAGNOSTIC');
console.log('================================');

// Check Audio Context
console.log('AudioContext exists:', !!audioContext);
console.log('AudioContext state:', audioContext ? audioContext.state : 'N/A');

// Check Analyser
console.log('Analyser exists:', !!analyser);
console.log('Analyser FFT size:', analyser ? analyser.fftSize : 'N/A');

// Check DOM Elements
const elements = ['eqSub', 'eqBass', 'eqLowMid', 'eqMid', 'eqHighMid', 'eqHigh', 'eqAir'];
console.log('DOM Elements:');
elements.forEach(id => {
    const el = document.getElementById(id);
    console.log(`  ${id}:`, el ? '✅ EXISTS' : '❌ MISSING', el ? `height=${el.style.height}` : '');
});

// Check Audio Element
console.log('Audio element:', !!originalAudio);
console.log('Audio paused:', originalAudio ? originalAudio.paused : 'N/A');
console.log('Audio current time:', originalAudio ? originalAudio.currentTime : 'N/A');
console.log('Audio duration:', originalAudio ? originalAudio.duration : 'N/A');

// Check Source Node
console.log('Source node exists:', !!sourceNode);

// Check if visualization is running
if (analyser) {
    const testData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(testData);
    const sum = testData.reduce((a, b) => a + b, 0);
    console.log('Analyser getting data:', sum > 0 ? '✅ YES' : '❌ NO (sum=' + sum + ')');
}

console.log('================================');
console.log('Copy this output and share for help!');
```

---

## Advanced Debugging:

### Force Visualization Restart:

```javascript
// Stop current visualization
if (audioContext) {
    audioContext.close();
}

// Reload the page
location.reload();
```

### Test with Manual Data:

```javascript
// Inject test data to see if bars can move
function testBars() {
    document.getElementById('eqSub').style.height = (20 + Math.random() * 50) + '%';
    document.getElementById('eqBass').style.height = (30 + Math.random() * 50) + '%';
    document.getElementById('eqLowMid').style.height = (25 + Math.random() * 50) + '%';
    document.getElementById('eqMid').style.height = (35 + Math.random() * 50) + '%';
    document.getElementById('eqHighMid').style.height = (30 + Math.random() * 50) + '%';
    document.getElementById('eqHigh').style.height = (25 + Math.random() * 50) + '%';
    document.getElementById('eqAir').style.height = (15 + Math.random() * 50) + '%';
}

// Run test animation
setInterval(testBars, 100);
```

**Expected:** Bars should animate randomly

**If bars move:** The visualization code is the problem (not DOM/CSS)
**If bars don't move:** DOM or CSS issue

---

## Expected Behavior:

When working correctly:

1. **Upload audio file** → Bars show static heights (50%, 75%, etc.)
2. **Audio starts playing** → Bars should immediately start animating
3. **Bars respond to music** →
   - Bass-heavy parts = tall Bass/Sub bars
   - Vocals/guitars = tall Mid/High-Mid bars
   - Cymbals/hi-hats = tall High/Air bars
4. **Smooth animation** → 60 FPS, no stuttering
5. **Responsive** → Changes with EQ slider adjustments

---

## Report Back:

When reporting the issue, please provide:

1. **Browser:** Chrome / Firefox / Safari / Edge (version?)
2. **OS:** Mac / Windows / Linux
3. **Console errors:** Any red error messages
4. **Diagnostic output:** Results from the diagnostic script above
5. **What you see:** Do bars show at all? Are they stuck? Moving but wrong?
6. **Audio playback:** Is audio actually playing?

---

**Last Updated:** 2025-11-27
**Status:** Awaiting diagnostic info
