# 🔍 VISUALIZATION DEBUG GUIDE

## Quick Diagnostic Steps

### Step 1: Pull Latest Code

```bash
git pull
```

### Step 2: Open the Page in Browser

Open `luvlang_LEGENDARY_COMPLETE.html` in your browser (Chrome/Edge recommended).

### Step 3: Open Browser Console

Press `F12` or:
- **Mac**: `Cmd + Option + J`
- **Windows/Linux**: `Ctrl + Shift + J`

### Step 4: Run Diagnostic Script

In the console, paste and run:

```javascript
// Load and run diagnostic
fetch('VISUALIZATION_DIAGNOSTIC.js')
    .then(r => r.text())
    .then(code => eval(code));
```

OR manually run the diagnostic by copying the entire content of `VISUALIZATION_DIAGNOSTIC.js` and pasting it into the console.

### Step 5: Check Results

The diagnostic will:

1. ✅ **Check if all canvas elements exist**
   - Shows dimensions and visibility status

2. ✅ **Check if visualization functions are loaded**
   - Confirms all drawing functions are available

3. ✅ **Force draw test colors on meters**
   - Left meter → RED
   - Right meter → GREEN
   - Goniometer → BLUE with white circle

4. ✅ **Force CSS visibility on all panels**

### Expected Results

After running the diagnostic, you should see:
- **Left meter**: Solid RED rectangle
- **Right meter**: Solid GREEN rectangle
- **Goniometer**: Solid BLUE square with white circle in center

If you see these colors, the canvases ARE rendering - the issue is with the drawing functions.

If you DON'T see these colors, there's a CSS or layout issue preventing the canvases from displaying.

### Step 6: Take Screenshots

Take 2 screenshots:
1. **The browser window** showing the page with the test colors
2. **The console output** showing the diagnostic results

### Step 7: Share Results

Send me:
1. Both screenshots
2. Any error messages from the console (red text)
3. The canvas dimensions from the console output

---

## Common Issues and Fixes

### Issue 1: "None of my graphs work"

**Possible Causes:**
- Canvases exist but have 0x0 size (CSS issue)
- Canvases are hidden by CSS (opacity/visibility/display)
- Drawing functions aren't being called
- Another script is clearing canvases after drawing

**Fix:**
Run the diagnostic - it will force visibility and draw test colors.

---

### Issue 2: "Layout is completely different"

**Possible Causes:**
- Grid layout changed
- Sections removed during duplicate cleanup
- CSS grid/flex properties changed

**Fix:**
Describe what layout you want:
- Where should the EQ be? (Left sidebar, right sidebar, or below visualizations?)
- Where should the visualizations be? (Center column, full width?)
- What sections are missing?

---

### Issue 3: Stereo meters showing title but no meters

**Possible Causes:**
- Parent div height is too small
- Canvas dimensions are 60x150 but displaying at 0x0
- Drawing function not being called for these specific canvases

**Fix:**
The diagnostic will show the actual canvas dimensions in the console.

---

## Manual Refresh

If the diagnostic shows everything is loaded correctly, try manually refreshing the visualizations:

```javascript
// In browser console
window.refreshVisualizations();
```

This will force redraw all idle states.

---

## Next Steps After Diagnostic

Based on the diagnostic results, I'll be able to:

1. **Fix CSS issues** if canvases have 0x0 size
2. **Fix drawing functions** if canvases exist but aren't rendering
3. **Fix layout** if structure needs reorganization
4. **Fix initialization timing** if functions aren't loaded

**The diagnostic will tell us exactly what's broken!**

---

## Quick Command Reference

```javascript
// Check if visualizations loaded
window.refreshVisualizations

// Manually refresh all visualizations
window.refreshVisualizations()

// Check if WebGL spectrum is ready
window.WebGLSpectrum?.isReady()

// Check canvas dimensions
const canvas = document.getElementById('leftMeterCanvas');
console.log(canvas.width, canvas.height, canvas.offsetWidth, canvas.offsetHeight);

// Force a canvas to show red (test if visible)
const ctx = document.getElementById('leftMeterCanvas').getContext('2d');
ctx.fillStyle = '#ff0000';
ctx.fillRect(0, 0, 60, 150);
```

---

## Files Updated

✅ **VISUALIZATION_FIX.js** - Idle state rendering system
✅ **VISUALIZATION_DIAGNOSTIC.js** - Debug and force-fix script
✅ **luvlang_LEGENDARY_COMPLETE.html** - Main HTML file

**Last Update:** Commit 68086d2
**Status:** Awaiting diagnostic results

---

## Contact

Once you run the diagnostic and share the results, I'll be able to pinpoint the exact issue and create a targeted fix.

Looking forward to seeing the diagnostic output! 🎯
