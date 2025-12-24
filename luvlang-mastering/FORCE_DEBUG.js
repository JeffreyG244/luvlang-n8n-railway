// PASTE THIS INTO BROWSER CONSOLE TO DEBUG

console.log('🔍 IMMEDIATE DEBUG CHECK:');
console.log('');

// Check if draw loop is running
console.log('1. DRAW LOOP STATUS:');
console.log('   animationFrame:', window.animationFrame);
console.log('   isPlaying:', window.isPlaying);
console.log('');

// Check canvases
console.log('2. CANVAS STATUS:');
const spectrumCanvas = document.getElementById('spectrumCanvas');
const waveformStatic = document.getElementById('waveformCanvasStatic');

console.log('   spectrumCanvas:', spectrumCanvas ? `${spectrumCanvas.width}x${spectrumCanvas.height}` : 'NULL');
console.log('   waveformCanvasStatic:', waveformStatic ? `${waveformStatic.width}x${waveformStatic.height}` : 'NULL');

if (spectrumCanvas) {
    console.log('   spectrum offsetWidth:', spectrumCanvas.offsetWidth);
    console.log('   spectrum style.width:', spectrumCanvas.style.width);
}

if (waveformStatic) {
    console.log('   waveform offsetWidth:', waveformStatic.offsetWidth);
    console.log('   waveform style.width:', waveformStatic.style.width);
}
console.log('');

// Check WebGL
console.log('3. WEBGL STATUS:');
console.log('   WebGLSpectrum exists:', typeof window.WebGLSpectrum !== 'undefined');
if (window.WebGLSpectrum) {
    console.log('   WebGLSpectrum.isReady():', window.WebGLSpectrum.isReady());
}
console.log('');

// Check visualization functions
console.log('4. VISUALIZATION FUNCTIONS:');
console.log('   drawProfessionalSpectrum:', typeof window.drawProfessionalSpectrum !== 'undefined');
console.log('   drawProfessionalWaveform:', typeof window.drawProfessionalWaveform !== 'undefined');
console.log('');

// Manual tests
console.log('5. MANUAL TESTS:');
console.log('   Try running: window.drawProfessionalWaveform(document.getElementById("waveformCanvasStatic"), window.audioBuffer)');
console.log('   Try running: window.drawProfessionalSpectrum(document.getElementById("spectrumCanvas"), window.analyser, window.audioContext)');
