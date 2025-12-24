/**
 * FORCE INITIALIZATION OF ULTIMATE VISUALS
 * Run this manually if visuals aren't starting automatically
 */

console.log('🚀 FORCE INITIALIZING ULTIMATE VISUALS...');

// Wait a bit for everything to be ready
setTimeout(() => {
    console.log('🔍 Checking for required components...');
    console.log('   audioContext:', !!window.audioContext);
    console.log('   analyser:', !!window.analyser);
    console.log('   audioBuffer:', !!window.audioBuffer);
    console.log('   UltimateEQVisualizer:', typeof UltimateEQVisualizer);
    console.log('   UltimateWaveformVisualizer:', typeof UltimateWaveformVisualizer);

    // Initialize EQ Visualizer
    const eqCanvas = document.getElementById('eqGraphCanvas');
    if (eqCanvas && window.audioContext && window.analyser) {
        if (!window.ultimateEQViz) {
            console.log('🎨 Creating Ultimate EQ Visualizer...');
            try {
                window.ultimateEQViz = new UltimateEQVisualizer(
                    'eqGraphCanvas',
                    window.audioContext,
                    window.analyser
                );
                window.ultimateEQViz.start();
                console.log('✅ EQ Visualizer started!');
            } catch (error) {
                console.error('❌ Error creating EQ visualizer:', error);
            }
        } else {
            console.log('✅ EQ Visualizer already exists');
            // Make sure it's running
            if (!window.ultimateEQViz.animationId) {
                window.ultimateEQViz.start();
                console.log('🔄 Restarted EQ Visualizer');
            }
        }
    } else {
        console.warn('⚠️ Cannot initialize EQ visualizer:');
        console.warn('   eqCanvas:', !!eqCanvas);
        console.warn('   audioContext:', !!window.audioContext);
        console.warn('   analyser:', !!window.analyser);
    }

    // Initialize Waveform Visualizer
    const waveformStatic = document.getElementById('waveformCanvasStatic');
    const waveformPlayhead = document.getElementById('waveformCanvasPlayhead');

    if (waveformStatic && waveformPlayhead) {
        if (!window.ultimateWaveformViz) {
            console.log('🎨 Creating Ultimate Waveform Visualizer...');
            try {
                window.ultimateWaveformViz = new UltimateWaveformVisualizer(
                    'waveformCanvasStatic',
                    'waveformCanvasPlayhead'
                );
                console.log('✅ Waveform Visualizer created!');

                // Load waveform if audio buffer exists
                if (window.audioBuffer) {
                    window.ultimateWaveformViz.loadAudio(window.audioBuffer);
                    console.log('✅ Waveform loaded with audio buffer!');
                }
            } catch (error) {
                console.error('❌ Error creating waveform visualizer:', error);
            }
        } else {
            console.log('✅ Waveform Visualizer already exists');
            // Reload waveform if audio buffer exists
            if (window.audioBuffer) {
                window.ultimateWaveformViz.loadAudio(window.audioBuffer);
                console.log('🔄 Reloaded waveform');
            }
        }
    } else {
        console.warn('⚠️ Cannot initialize waveform visualizer:');
        console.warn('   waveformStatic:', !!waveformStatic);
        console.warn('   waveformPlayhead:', !!waveformPlayhead);
    }

    // Set up EQ band updates
    if (window.ultimateEQViz) {
        console.log('🎛️ Setting up EQ band updates...');
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

        // Update EQ bands every 100ms
        if (window.eqUpdateInterval) {
            clearInterval(window.eqUpdateInterval);
        }
        window.eqUpdateInterval = setInterval(() => {
            if (typeof window.updateEQVisualization === 'function') {
                window.updateEQVisualization();
            }
        }, 100);

        console.log('✅ EQ update interval started');
    }

    // Set up playhead updates
    if (window.ultimateWaveformViz) {
        console.log('▶️ Setting up playhead updates...');
        const audioElement = document.getElementById('audioElement');
        if (audioElement) {
            // Remove old listener if it exists
            if (window.playheadUpdateListener) {
                audioElement.removeEventListener('timeupdate', window.playheadUpdateListener);
            }

            // Create new listener
            window.playheadUpdateListener = () => {
                if (window.ultimateWaveformViz && audioElement.duration > 0) {
                    window.ultimateWaveformViz.updatePlayhead(
                        audioElement.currentTime,
                        audioElement.duration
                    );
                }
            };

            audioElement.addEventListener('timeupdate', window.playheadUpdateListener);
            console.log('✅ Playhead listener attached');
        }
    }

    console.log('🎉 FORCE INITIALIZATION COMPLETE!');
    console.log('   ultimateEQViz:', !!window.ultimateEQViz);
    console.log('   ultimateWaveformViz:', !!window.ultimateWaveformViz);

}, 1000);
