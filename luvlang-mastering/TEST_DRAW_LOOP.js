/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TEST DRAW LOOP - Quick diagnostic for visualization issues

   Paste this into browser console to check if draw loop is running
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

console.log('🔍 TESTING DRAW LOOP...');

// Test 1: Check if draw loop is running
let frameCount = 0;
const startTime = Date.now();

const testInterval = setInterval(() => {
    frameCount++;
    console.log(`Frame ${frameCount}: animationFrame = ${window.animationFrame}`);

    if (frameCount >= 5) {
        clearInterval(testInterval);
        const elapsed = Date.now() - startTime;
        const fps = (frameCount / elapsed) * 1000;

        console.log('═══════════════════════════════════════');
        console.log(`📊 RESULTS:`);
        console.log(`   Frames counted: ${frameCount}`);
        console.log(`   Time elapsed: ${elapsed}ms`);
        console.log(`   FPS: ${fps.toFixed(1)}`);
        console.log(`   animationFrame ID: ${window.animationFrame || 'NULL'}`);
        console.log('═══════════════════════════════════════');

        if (!window.animationFrame) {
            console.log('❌ PROBLEM: draw() loop is NOT running!');
            console.log('');
            console.log('Try this:');
            console.log('1. Load an audio file if you haven\'t');
            console.log('2. Or run this to manually start:');
            console.log('   > startVisualization()');
        } else {
            console.log('✅ draw() loop IS running!');
            console.log('');
            console.log('If visualizations still not showing, check:');
            console.log('1. Are canvases visible? (check offsetWidth/Height)');
            console.log('2. Is audioBuffer loaded? > window.audioBuffer');
            console.log('3. Do analyzers exist? > window.analyser');
        }
    }
}, 200);

// Test 2: Check critical elements
console.log('');
console.log('🔍 CHECKING CRITICAL ELEMENTS:');
console.log('   audioContext:', window.audioContext ? '✅' : '❌');
console.log('   analyser:', window.analyser ? '✅' : '❌');
console.log('   leftAnalyser:', window.leftAnalyser ? '✅' : '❌');
console.log('   rightAnalyser:', window.rightAnalyser ? '✅' : '❌');
console.log('   audioBuffer:', window.audioBuffer ? '✅' : '❌');
console.log('   isPlaying:', window.isPlaying);
console.log('   animationFrame:', window.animationFrame || 'NULL');
console.log('');

// Test 3: Check canvases
const canvasIds = [
    'spectrumCanvas',
    'leftMeterCanvas',
    'rightMeterCanvas',
    'goniometerCanvas',
    'correlationHeatmapCanvas',
    'waveformCanvasStatic'
];

console.log('🔍 CHECKING CANVASES:');
canvasIds.forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
        console.log(`   ${id}: ✅ ${canvas.width}x${canvas.height} (display: ${canvas.offsetWidth}x${canvas.offsetHeight})`);
    } else {
        console.log(`   ${id}: ❌ NOT FOUND`);
    }
});
console.log('');

// Test 4: Check if WebGL is ready
if (window.WebGLSpectrum) {
    console.log('🔍 WEBGL STATUS:');
    console.log('   WebGLSpectrum exists:', '✅');
    console.log('   WebGLSpectrum.isReady():', window.WebGLSpectrum.isReady() ? '✅' : '❌');
} else {
    console.log('❌ WebGLSpectrum not loaded');
}
console.log('');

// Test 5: Check visualization functions
console.log('🔍 VISUALIZATION FUNCTIONS:');
console.log('   drawProfessionalSpectrum:', typeof window.drawProfessionalSpectrum !== 'undefined' ? '✅' : '❌');
console.log('   drawStereoMeter:', typeof window.drawStereoMeter !== 'undefined' ? '✅' : '❌');
console.log('   drawGoniometer:', typeof window.drawGoniometer !== 'undefined' ? '✅' : '❌');
console.log('   drawCorrelationHeatmap:', typeof window.drawCorrelationHeatmap !== 'undefined' ? '✅' : '❌');
console.log('   drawProfessionalWaveform:', typeof window.drawProfessionalWaveform !== 'undefined' ? '✅' : '❌');
console.log('');

console.log('⏳ Checking if draw loop is running... (wait 1 second)');
