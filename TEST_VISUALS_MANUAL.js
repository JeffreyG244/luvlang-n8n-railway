/**
 * MANUAL TEST - Run this in browser console to test visuals
 * Copy and paste this entire code into the browser console and press Enter
 */

console.log('🧪 TESTING ULTIMATE VISUALS MANUALLY...');
console.log('');

// Check if classes are loaded
console.log('1. Checking if visualization classes are loaded:');
console.log('   UltimateEQVisualizer:', typeof UltimateEQVisualizer);
console.log('   UltimateWaveformVisualizer:', typeof UltimateWaveformVisualizer);
console.log('');

// Check if required components exist
console.log('2. Checking required components:');
console.log('   window.audioContext:', window.audioContext);
console.log('   window.analyser:', window.analyser);
console.log('   window.audioBuffer:', window.audioBuffer);
console.log('');

// Check if canvas elements exist
console.log('3. Checking canvas elements:');
const eqCanvas = document.getElementById('eqGraphCanvas');
const waveStatic = document.getElementById('waveformCanvasStatic');
const wavePlayhead = document.getElementById('waveformCanvasPlayhead');
console.log('   eqGraphCanvas:', eqCanvas);
console.log('   waveformCanvasStatic:', waveStatic);
console.log('   waveformCanvasPlayhead:', wavePlayhead);
console.log('');

// Try to initialize EQ Visualizer
if (typeof UltimateEQVisualizer !== 'undefined' && window.audioContext && window.analyser && eqCanvas) {
    console.log('4. ✅ All requirements met! Creating EQ Visualizer...');
    try {
        window.ultimateEQViz = new UltimateEQVisualizer(
            'eqGraphCanvas',
            window.audioContext,
            window.analyser
        );
        console.log('   ✅ EQ Visualizer created!');

        window.ultimateEQViz.start();
        console.log('   ✅ EQ Visualizer started!');
        console.log('   Animation ID:', window.ultimateEQViz.animationId);
    } catch (error) {
        console.error('   ❌ Error creating EQ visualizer:', error);
        console.error('   Error details:', error.message);
        console.error('   Stack:', error.stack);
    }
} else {
    console.log('4. ❌ Missing requirements for EQ Visualizer:');
    if (typeof UltimateEQVisualizer === 'undefined') console.log('   - UltimateEQVisualizer class not loaded');
    if (!window.audioContext) console.log('   - audioContext not available');
    if (!window.analyser) console.log('   - analyser not available');
    if (!eqCanvas) console.log('   - eqGraphCanvas element not found');
}
console.log('');

// Try to initialize Waveform Visualizer
if (typeof UltimateWaveformVisualizer !== 'undefined' && waveStatic && wavePlayhead) {
    console.log('5. ✅ Creating Waveform Visualizer...');
    try {
        window.ultimateWaveformViz = new UltimateWaveformVisualizer(
            'waveformCanvasStatic',
            'waveformCanvasPlayhead'
        );
        console.log('   ✅ Waveform Visualizer created!');

        if (window.audioBuffer) {
            window.ultimateWaveformViz.loadAudio(window.audioBuffer);
            console.log('   ✅ Waveform loaded with audio buffer!');
        } else {
            console.log('   ⚠️ No audio buffer available yet - waveform will load when you upload audio');
        }
    } catch (error) {
        console.error('   ❌ Error creating waveform visualizer:', error);
        console.error('   Error details:', error.message);
    }
} else {
    console.log('5. ❌ Missing requirements for Waveform Visualizer:');
    if (typeof UltimateWaveformVisualizer === 'undefined') console.log('   - UltimateWaveformVisualizer class not loaded');
    if (!waveStatic) console.log('   - waveformCanvasStatic element not found');
    if (!wavePlayhead) console.log('   - waveformCanvasPlayhead element not found');
}
console.log('');

console.log('6. Final status:');
console.log('   window.ultimateEQViz:', window.ultimateEQViz);
console.log('   window.ultimateWaveformViz:', window.ultimateWaveformViz);
console.log('');

if (window.ultimateEQViz && window.ultimateEQViz.animationId) {
    console.log('🎉 SUCCESS! EQ Visualizer is running!');
    console.log('   You should see the spectrum animating on the EQ graph.');
} else {
    console.log('❌ EQ Visualizer is NOT running.');
}

if (window.ultimateWaveformViz) {
    console.log('🎉 SUCCESS! Waveform Visualizer created!');
    if (window.audioBuffer) {
        console.log('   Waveform should be displayed.');
    }
} else {
    console.log('❌ Waveform Visualizer is NOT created.');
}

console.log('');
console.log('🧪 TEST COMPLETE');
