/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DEBUG VISUALIZATIONS - Comprehensive Status Check

   Run this in browser console to diagnose visualization issues:

   Copy/paste into console:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

(function() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 VISUALIZATION DEBUG REPORT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. AUDIO CONTEXT & ANALYZERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('1. AUDIO CONTEXT & ANALYZERS');
    console.log('   audioContext:', window.audioContext ? '✅ EXISTS' : '❌ NULL');
    if (window.audioContext) {
        console.log('     - state:', window.audioContext.state);
        console.log('     - sampleRate:', window.audioContext.sampleRate);
    }
    console.log('   analyser:', window.analyser ? '✅ EXISTS' : '❌ NULL');
    if (window.analyser) {
        console.log('     - fftSize:', window.analyser.fftSize);
        console.log('     - frequencyBinCount:', window.analyser.frequencyBinCount);
    }
    console.log('   leftAnalyser:', window.leftAnalyser ? '✅ EXISTS' : '❌ NULL');
    console.log('   rightAnalyser:', window.rightAnalyser ? '✅ EXISTS' : '❌ NULL');
    console.log('   kWeightedAnalyser:', window.kWeightedAnalyser ? '✅ EXISTS' : '❌ NULL');
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. CANVAS ELEMENTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('2. CANVAS ELEMENTS');
    const canvases = {
        spectrumCanvas: 'Spectrum Analyzer (WebGL)',
        leftMeterCanvas: 'Left Channel Meter',
        rightMeterCanvas: 'Right Channel Meter',
        goniometerCanvas: 'Phase Goniometer',
        correlationHeatmapCanvas: 'Correlation Heatmap (ELITE)',
        correlationLegendCanvas: 'Correlation Legend',
        waveformCanvasStatic: 'Waveform (Static)',
        waveformCanvasPlayhead: 'Waveform (Playhead)'
    };

    for (const [id, name] of Object.entries(canvases)) {
        const canvas = document.getElementById(id);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const style = window.getComputedStyle(canvas);
            console.log(`   ${name}:`);
            console.log(`     - Status: ✅ EXISTS`);
            console.log(`     - Size: ${canvas.width}x${canvas.height} (internal)`);
            console.log(`     - Display size: ${canvas.offsetWidth}x${canvas.offsetHeight}px`);
            console.log(`     - Visible: ${style.display !== 'none' && style.visibility !== 'hidden' ? '✅ YES' : '❌ NO'}`);
            console.log(`     - Context: ${ctx ? '✅ OK' : '❌ FAILED'}`);
        } else {
            console.log(`   ${name}: ❌ NOT FOUND (ID: ${id})`);
        }
    }
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. VISUALIZATION FUNCTIONS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('3. VISUALIZATION FUNCTIONS');
    const functions = {
        'drawProfessionalSpectrum': 'Canvas 2D Spectrum (fallback)',
        'WebGLSpectrum': 'WebGL Persistence System',
        'drawStereoMeter': 'L/R Peak Meters',
        'drawGoniometer': 'Phase Goniometer',
        'drawCorrelationHeatmap': 'Frequency Correlation Heatmap',
        'drawCorrelationLegend': 'Correlation Legend',
        'drawProfessionalWaveform': 'Professional Waveform'
    };

    for (const [func, name] of Object.entries(functions)) {
        const exists = typeof window[func] !== 'undefined';
        console.log(`   ${name}: ${exists ? '✅ LOADED' : '❌ MISSING'}`);
        if (func === 'WebGLSpectrum' && exists) {
            console.log(`     - WebGL ready: ${window.WebGLSpectrum.isReady() ? '✅ YES' : '❌ NO'}`);
        }
    }
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. AUDIO BUFFER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('4. AUDIO BUFFER');
    console.log('   audioBuffer:', window.audioBuffer ? '✅ EXISTS' : '❌ NULL');
    if (window.audioBuffer) {
        console.log('     - duration:', window.audioBuffer.duration.toFixed(2) + 's');
        console.log('     - sampleRate:', window.audioBuffer.sampleRate);
        console.log('     - channels:', window.audioBuffer.numberOfChannels);
    }
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. BROADCAST METERS (DOM ELEMENTS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('5. BROADCAST METERS (DOM)');
    const meterElements = {
        'lufsValue': 'LUFS Value Display',
        'lufsMeter': 'LUFS Meter Bar',
        'peakValue': 'True Peak Value Display',
        'peakMeter': 'True Peak Meter Bar',
        'phaseValue': 'Phase Correlation Value',
        'phaseMeter': 'Phase Correlation Meter'
    };

    for (const [id, name] of Object.entries(meterElements)) {
        const element = document.getElementById(id);
        if (element) {
            const style = window.getComputedStyle(element);
            const visible = style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;
            console.log(`   ${name}:`);
            console.log(`     - Status: ✅ EXISTS`);
            console.log(`     - Visible: ${visible ? '✅ YES' : '❌ NO'}`);
            console.log(`     - Content: "${element.textContent || element.innerHTML}"`);
            if (!visible) {
                console.log(`     - display: ${style.display}`);
                console.log(`     - visibility: ${style.visibility}`);
                console.log(`     - opacity: ${style.opacity}`);
            }
        } else {
            console.log(`   ${name}: ❌ NOT FOUND (ID: ${id})`);
        }
    }
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6. ANIMATION LOOP
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('6. ANIMATION LOOP');
    console.log('   animationFrame:', window.animationFrame ? `✅ RUNNING (ID: ${window.animationFrame})` : '❌ NOT RUNNING');
    console.log('   isPlaying:', window.isPlaying ? '✅ TRUE' : '⏸️ FALSE');
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 7. QUICK TEST: Read analyzer data
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('7. ANALYZER DATA TEST');
    if (window.analyser) {
        const testData = new Float32Array(window.analyser.frequencyBinCount);
        window.analyser.getFloatFrequencyData(testData);
        const hasData = testData.some(val => val > -Infinity && !isNaN(val));
        console.log('   Spectrum data:', hasData ? '✅ VALID' : '⚠️ ALL -INFINITY (no audio playing)');
        const max = Math.max(...testData);
        const min = Math.min(...testData);
        console.log(`     - Range: ${min.toFixed(1)} to ${max.toFixed(1)} dB`);
    }
    if (window.leftAnalyser) {
        const testData = new Float32Array(window.leftAnalyser.fftSize);
        window.leftAnalyser.getFloatTimeDomainData(testData);
        const max = Math.max(...testData);
        const min = Math.min(...testData);
        const nonZero = testData.some(val => Math.abs(val) > 0.001);
        console.log('   L/R meters:', nonZero ? '✅ HAS AUDIO DATA' : '⚠️ SILENCE (no audio playing)');
        console.log(`     - Range: ${min.toFixed(3)} to ${max.toFixed(3)}`);
    }
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 8. RECOMMENDATIONS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 RECOMMENDATIONS:');
    console.log('═══════════════════════════════════════════════════════════════');

    const issues = [];

    if (!window.audioContext) issues.push('❌ Audio context not created - reload page and upload a file');
    if (!window.analyser) issues.push('❌ Analyzer not created - check console for Web Audio errors');
    if (!window.audioBuffer) issues.push('⚠️ No audio loaded - upload an audio file to see visualizations');
    if (!window.animationFrame) issues.push('⚠️ Animation loop not running - visualizations paused');
    if (window.audioContext && window.audioContext.state === 'suspended') {
        issues.push('⚠️ Audio context suspended - click Play button to activate');
    }

    const missingCanvas = Object.keys(canvases).filter(id => !document.getElementById(id));
    if (missingCanvas.length > 0) {
        issues.push(`❌ Missing canvases: ${missingCanvas.join(', ')}`);
    }

    const missingFunctions = Object.keys(functions).filter(func => typeof window[func] === 'undefined');
    if (missingFunctions.length > 0) {
        issues.push(`❌ Missing functions: ${missingFunctions.join(', ')}`);
    }

    if (issues.length === 0) {
        console.log('✅ ALL SYSTEMS OPERATIONAL!');
        console.log('');
        console.log('If you still don\'t see visualizations:');
        console.log('1. Load an audio file (if you haven\'t)');
        console.log('2. Click the Play button');
        console.log('3. Check browser console for JavaScript errors');
        console.log('4. Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
    } else {
        issues.forEach(issue => console.log(issue));
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
})();
