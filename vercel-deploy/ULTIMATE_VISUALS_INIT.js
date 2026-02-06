/**
 * ULTIMATE VISUALS INITIALIZATION
 * Connects the new visualization engine to the existing audio processing
 */

// Wait for DOM and audio context to be ready
function initializeUltimateVisuals() {

    // Get canvas elements
    const eqCanvas = document.getElementById('eq-graph-canvas') || document.getElementById('eqGraphCanvas');
    const waveformStatic = document.getElementById('waveformCanvasStatic');
    const waveformPlayhead = document.getElementById('waveformCanvasPlayhead');

    if (!eqCanvas) {
        console.warn('⚠️ EQ canvas not found - will retry after audio context is created');
        return;
    }

    // Initialize EQ Visualizer when audio context is available
    if (window.audioContext && window.analyser) {
        try {
            window.ultimateEQViz = new UltimateEQVisualizer(
                eqCanvas.id,
                window.audioContext,
                window.analyser
            );

            // Start visualization
            window.ultimateEQViz.start();

            // Update EQ bands when they change
            window.updateEQVisualization = function() {
                if (!window.ultimateEQViz) return;

                const bands = [
                    { frequency: 40, gain: window.eqSubFilter?.gain.value || 0, Q: 0.707, type: 'lowshelf' },
                    { frequency: 120, gain: window.eqBassFilter?.gain.value || 0, Q: 1.0, type: 'peaking' },
                    { frequency: 350, gain: window.eqLowMidFilter?.gain.value || 0, Q: 1.4, type: 'peaking' },
                    { frequency: 1000, gain: window.eqMidFilter?.gain.value || 0, Q: 1.0, type: 'peaking' },
                    { frequency: 3500, gain: window.eqHighMidFilter?.gain.value || 0, Q: 1.2, type: 'peaking' },
                    { frequency: 8000, gain: window.eqHighFilter?.gain.value || 0, Q: 0.9, type: 'peaking' },
                    { frequency: 14000, gain: window.eqAirFilter?.gain.value || 0, Q: 0.707, type: 'highshelf' }
                ];

                window.ultimateEQViz.updateEQBands(bands);
            };

            // Update visualization when EQ changes
            setInterval(() => {
                if (typeof window.updateEQVisualization === 'function') {
                    window.updateEQVisualization();
                }
            }, 100); // Update 10 times per second

        } catch (error) {
            console.error('❌ Error initializing EQ visualizer:', error);
        }
    }

    // Initialize Waveform Visualizer
    if (waveformStatic && waveformPlayhead) {
        try {
            window.ultimateWaveformViz = new UltimateWaveformVisualizer(
                waveformStatic.id,
                waveformPlayhead.id
            );

            // Update waveform when audio is loaded
            window.loadWaveformVisualization = async function(audioBuffer) {
                if (!window.ultimateWaveformViz) return;

                try {
                    await window.ultimateWaveformViz.loadAudio(audioBuffer);

                } catch (error) {
                    console.error('❌ Error loading waveform:', error);
                }
            };

            // Update playhead position
            window.updateWaveformPlayhead = function(currentTime, duration) {
                if (!window.ultimateWaveformViz) return;
                window.ultimateWaveformViz.updatePlayhead(currentTime, duration);
            };

            // Hook into existing audio element timeupdate
            const audioElement = document.getElementById('audioElement');
            if (audioElement) {
                audioElement.addEventListener('timeupdate', () => {
                    if (typeof window.updateWaveformPlayhead === 'function') {
                        window.updateWaveformPlayhead(audioElement.currentTime, audioElement.duration);
                    }
                });
            }

        } catch (error) {
            console.error('❌ Error initializing waveform visualizer:', error);
        }
    }
}

// Hook into existing setupWebAudio function
const originalSetupWebAudio = window.setupWebAudio;
if (typeof originalSetupWebAudio === 'function') {
    window.setupWebAudio = function(...args) {
        const result = originalSetupWebAudio.apply(this, args);

        // Initialize visuals after a short delay
        setTimeout(() => {
            initializeUltimateVisuals();
        }, 500);

        return result;
    };
}

// Also try to initialize on window load
window.addEventListener('load', () => {
    setTimeout(() => {
        if (!window.ultimateEQViz || !window.ultimateWaveformViz) {

            initializeUltimateVisuals();
        }
    }, 1000);
});

// Hook into file upload to load waveform
const originalHandleFile = window.handleFile;
if (typeof originalHandleFile === 'function') {
    window.handleFile = async function(file) {
        const result = originalHandleFile.call(this, file);

        // Wait for audioBuffer to be decoded
        if (window.audioBuffer && typeof window.loadWaveformVisualization === 'function') {
            setTimeout(async () => {
                if (window.audioBuffer) {
                    await window.loadWaveformVisualization(window.audioBuffer);
                }
            }, 1000);
        }

        return result;
    };
}

