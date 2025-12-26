/* ═══════════════════════════════════════════════════════════════════════════
   VISUALIZATION DIAGNOSTIC & FORCE FIX
   Run this in browser console to check and fix visualization issues
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('🔍 VISUALIZATION DIAGNOSTIC STARTING...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ═══ CHECK 1: Canvas Elements ═══
console.log('\n📊 CHECK 1: Canvas Elements');

const canvases = {
    spectrum: document.getElementById('spectrumCanvas'),
    leftMeter: document.getElementById('leftMeterCanvas'),
    rightMeter: document.getElementById('rightMeterCanvas'),
    goniometer: document.getElementById('goniometerCanvas'),
    correlationHeatmap: document.getElementById('correlationHeatmapCanvas'),
    correlationLegend: document.getElementById('correlationLegendCanvas'),
    waveform: document.getElementById('waveformCanvasStatic')
};

let allFound = true;
for (const [name, canvas] of Object.entries(canvases)) {
    if (canvas) {
        const computed = window.getComputedStyle(canvas);
        const visible = computed.display !== 'none' && computed.visibility !== 'hidden' && computed.opacity !== '0';
        const dims = `${canvas.width}x${canvas.height} (${canvas.offsetWidth}x${canvas.offsetHeight} displayed)`;

        console.log(`✅ ${name}: Found - ${dims} - Visible: ${visible}`);

        if (!visible) {
            console.warn(`   ⚠️ ${name} is HIDDEN by CSS!`);
            allFound = false;
        }
    } else {
        console.error(`❌ ${name}: NOT FOUND`);
        allFound = false;
    }
}

if (allFound) {
    console.log('✅ All canvases found and visible');
} else {
    console.error('❌ Some canvases are missing or hidden');
}

// ═══ CHECK 2: Visualization Functions ═══
console.log('\n🎨 CHECK 2: Visualization Functions');

const functions = {
    'drawProfessionalSpectrum': window.drawProfessionalSpectrum,
    'drawStereoMeter': window.drawStereoMeter,
    'drawGoniometer': window.drawGoniometer,
    'drawCorrelationHeatmap': window.drawCorrelationHeatmap,
    'WebGLSpectrum': window.WebGLSpectrum,
    'refreshVisualizations': window.refreshVisualizations
};

for (const [name, func] of Object.entries(functions)) {
    if (func) {
        console.log(`✅ ${name}: Available`);
    } else {
        console.error(`❌ ${name}: NOT FOUND`);
    }
}

// ═══ CHECK 3: Parent Containers ═══
console.log('\n📦 CHECK 3: Parent Containers');

const panels = document.querySelectorAll('.viz-panel');
console.log(`Found ${panels.length} visualization panels`);

panels.forEach((panel, i) => {
    const computed = window.getComputedStyle(panel);
    const title = panel.querySelector('.panel-title')?.textContent || 'Unknown';
    const visible = computed.display !== 'none' && computed.visibility !== 'hidden';

    console.log(`Panel ${i + 1}: "${title}" - Visible: ${visible}`);

    if (!visible) {
        console.warn(`   ⚠️ Panel is HIDDEN!`);
    }
});

// ═══ FIX 1: Force Refresh Visualizations ═══
console.log('\n🔧 FIX 1: Force Refresh Visualizations');

if (window.refreshVisualizations) {
    console.log('Running refreshVisualizations()...');
    window.refreshVisualizations();
    console.log('✅ Refresh complete');
} else {
    console.error('❌ refreshVisualizations() not available');
}

// ═══ FIX 2: Force Draw All Meters ═══
console.log('\n🔧 FIX 2: Force Draw All Meters');

// Draw left meter
if (canvases.leftMeter && window.drawStereoMeter) {
    console.log('Drawing left meter...');
    try {
        const ctx = canvases.leftMeter.getContext('2d');
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, canvases.leftMeter.width, canvases.leftMeter.height);
        console.log('✅ Left meter forced to RED (visible if working)');
    } catch (e) {
        console.error('❌ Failed to draw left meter:', e);
    }
}

// Draw right meter
if (canvases.rightMeter) {
    console.log('Drawing right meter...');
    try {
        const ctx = canvases.rightMeter.getContext('2d');
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(0, 0, canvases.rightMeter.width, canvases.rightMeter.height);
        console.log('✅ Right meter forced to GREEN (visible if working)');
    } catch (e) {
        console.error('❌ Failed to draw right meter:', e);
    }
}

// Draw goniometer
if (canvases.goniometer) {
    console.log('Drawing goniometer...');
    try {
        const ctx = canvases.goniometer.getContext('2d');
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(0, 0, canvases.goniometer.width, canvases.goniometer.height);

        // Draw white circle in center to confirm
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(75, 75, 60, 0, Math.PI * 2);
        ctx.stroke();

        console.log('✅ Goniometer forced to BLUE with white circle (visible if working)');
    } catch (e) {
        console.error('❌ Failed to draw goniometer:', e);
    }
}

// ═══ FIX 3: Force CSS Visibility ═══
console.log('\n🔧 FIX 3: Force CSS Visibility');

// Force all viz panels visible
panels.forEach((panel, i) => {
    panel.style.display = 'block';
    panel.style.visibility = 'visible';
    panel.style.opacity = '1';
    console.log(`✅ Panel ${i + 1} forced visible`);
});

// Force all canvases visible
for (const [name, canvas] of Object.entries(canvases)) {
    if (canvas) {
        canvas.style.display = 'block';
        canvas.style.visibility = 'visible';
        canvas.style.opacity = '1';
        console.log(`✅ ${name} canvas forced visible`);
    }
}

// ═══ SUMMARY ═══
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 DIAGNOSTIC SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\nExpected Results:');
console.log('- Left meter should show RED');
console.log('- Right meter should show GREEN');
console.log('- Goniometer should show BLUE with white circle');
console.log('- All panels should be visible');

console.log('\nIf you still see blank/black canvases:');
console.log('1. The canvas might be rendering at 0x0 size (check offsetWidth/offsetHeight above)');
console.log('2. Another script might be clearing the canvases after this runs');
console.log('3. The parent container might have height: 0');

console.log('\nNext Steps:');
console.log('- Take a screenshot showing the current state');
console.log('- Copy the console output above');
console.log('- Share both with me so I can diagnose further');

console.log('\n✅ DIAGNOSTIC COMPLETE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
