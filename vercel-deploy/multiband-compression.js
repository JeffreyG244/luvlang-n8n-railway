/**
 * MULTIBAND COMPRESSION ENGINE
 * 4-band compression with independent control per frequency range
 * Sub (20-120Hz), Low-Mid (120-1kHz), High-Mid (1-8kHz), Highs (8-20kHz)
 */

class MultibandCompressor {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // 4 bands
        this.bands = {
            sub: this.createBand('sub', 20, 120),
            lowMid: this.createBand('lowMid', 120, 1000),
            highMid: this.createBand('highMid', 1000, 8000),
            highs: this.createBand('highs', 8000, 20000)
        };

        // Connect all bands to output
        Object.values(this.bands).forEach(band => {
            band.output.connect(this.output);
        });

        // Genre presets
        this.presets = {
            edm: {
                sub: { threshold: -20, ratio: 10, attack: 0.010, release: 0.100 },
                lowMid: { threshold: -18, ratio: 7, attack: 0.005, release: 0.150 },
                highMid: { threshold: -16, ratio: 5, attack: 0.003, release: 0.200 },
                highs: { threshold: -15, ratio: 3, attack: 0.001, release: 0.250 }
            },
            hiphop: {
                sub: { threshold: -18, ratio: 8, attack: 0.010, release: 0.100 },
                lowMid: { threshold: -16, ratio: 6, attack: 0.005, release: 0.150 },
                highMid: { threshold: -14, ratio: 4, attack: 0.003, release: 0.200 },
                highs: { threshold: -12, ratio: 3, attack: 0.001, release: 0.250 }
            },
            rock: {
                sub: { threshold: -16, ratio: 6, attack: 0.005, release: 0.120 },
                lowMid: { threshold: -14, ratio: 5, attack: 0.004, release: 0.160 },
                highMid: { threshold: -12, ratio: 4, attack: 0.003, release: 0.200 },
                highs: { threshold: -10, ratio: 3, attack: 0.001, release: 0.250 }
            },
            pop: {
                sub: { threshold: -18, ratio: 6, attack: 0.010, release: 0.120 },
                lowMid: { threshold: -16, ratio: 5, attack: 0.005, release: 0.150 },
                highMid: { threshold: -14, ratio: 4, attack: 0.003, release: 0.200 },
                highs: { threshold: -12, ratio: 3, attack: 0.001, release: 0.250 }
            },
            balanced: {
                sub: { threshold: -20, ratio: 4, attack: 0.010, release: 0.150 },
                lowMid: { threshold: -18, ratio: 4, attack: 0.005, release: 0.180 },
                highMid: { threshold: -16, ratio: 4, attack: 0.003, release: 0.200 },
                highs: { threshold: -14, ratio: 3, attack: 0.001, release: 0.250 }
            }
        };

        console.log('✅ Multiband Compressor initialized with 4 bands');
    }

    /**
     * Create a single frequency band with filter and compressor
     * Uses Linkwitz-Riley crossovers (4th order, 24dB/octave) for phase-coherent summing
     */
    createBand(name, lowFreq, highFreq) {
        const band = {
            name: name,
            lowFreq: lowFreq,
            highFreq: highFreq,
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            lowpass1: null,
            lowpass2: null,   // Second stage for Linkwitz-Riley 4th order
            highpass1: null,
            highpass2: null,  // Second stage for Linkwitz-Riley 4th order
            compressor: this.audioContext.createDynamicsCompressor(),
            makeupGain: this.audioContext.createGain(), // Per-band makeup gain
            gainReduction: 0 // Track gain reduction for metering
        };

        // Create Linkwitz-Riley crossover filters (two cascaded 2nd-order Butterworth = 4th-order LR)
        // Q=0.5 for each stage creates -6dB at crossover, summed response = flat
        if (highFreq < 20000) {
            // First stage lowpass
            band.lowpass1 = this.audioContext.createBiquadFilter();
            band.lowpass1.type = 'lowpass';
            band.lowpass1.frequency.value = highFreq;
            band.lowpass1.Q.value = 0.5;  // Linkwitz-Riley Q (was 0.7 Butterworth)

            // Second stage lowpass for 24dB/octave slope
            band.lowpass2 = this.audioContext.createBiquadFilter();
            band.lowpass2.type = 'lowpass';
            band.lowpass2.frequency.value = highFreq;
            band.lowpass2.Q.value = 0.5;
        }

        if (lowFreq > 20) {
            // First stage highpass
            band.highpass1 = this.audioContext.createBiquadFilter();
            band.highpass1.type = 'highpass';
            band.highpass1.frequency.value = lowFreq;
            band.highpass1.Q.value = 0.5;  // Linkwitz-Riley Q (was 0.7 Butterworth)

            // Second stage highpass for 24dB/octave slope
            band.highpass2 = this.audioContext.createBiquadFilter();
            band.highpass2.type = 'highpass';
            band.highpass2.frequency.value = lowFreq;
            band.highpass2.Q.value = 0.5;
        }

        // Connect filter chain (4th-order Linkwitz-Riley: two cascaded 2nd-order filters)
        let currentNode = band.input;

        if (band.highpass1) {
            currentNode.connect(band.highpass1);
            currentNode = band.highpass1;
        }
        if (band.highpass2) {
            currentNode.connect(band.highpass2);
            currentNode = band.highpass2;
        }

        if (band.lowpass1) {
            currentNode.connect(band.lowpass1);
            currentNode = band.lowpass1;
        }
        if (band.lowpass2) {
            currentNode.connect(band.lowpass2);
            currentNode = band.lowpass2;
        }

        // Connect to compressor -> makeup gain -> output
        currentNode.connect(band.compressor);
        band.compressor.connect(band.makeupGain);
        band.makeupGain.connect(band.output);

        // Default settings
        band.compressor.threshold.value = -20;
        band.compressor.ratio.value = 4;
        band.compressor.attack.value = 0.005;
        band.compressor.release.value = 0.150;
        band.compressor.knee.value = 30;

        // Initialize makeup gain (will be auto-calculated based on compression)
        band.makeupGain.gain.value = 1.0;

        console.log(`  ✓ Band created: ${name} (${lowFreq}-${highFreq}Hz) [Linkwitz-Riley 24dB/oct]`);

        return band;
    }

    /**
     * Calculate and apply automatic makeup gain for a band
     * Based on threshold and ratio: makeupDB = threshold * (1 - 1/ratio) * 0.5
     */
    calculateMakeupGain(bandName) {
        const band = this.bands[bandName];
        if (!band) return;

        const threshold = band.compressor.threshold.value;
        const ratio = band.compressor.ratio.value;

        // Calculate makeup gain to compensate for compression
        // Formula: makeupDB = |threshold| * (1 - 1/ratio) * 0.5
        // The 0.5 factor is conservative to avoid over-compensation
        const makeupDB = Math.abs(threshold) * (1 - 1/ratio) * 0.5;
        const makeupLinear = Math.pow(10, makeupDB / 20);

        band.makeupGain.gain.value = makeupLinear;

        console.log(`  📊 ${bandName} makeup gain: +${makeupDB.toFixed(1)}dB (linear: ${makeupLinear.toFixed(3)})`);

        return makeupDB;
    }

    /**
     * Apply automatic makeup gain to all bands
     */
    applyAutoMakeupGain() {
        Object.keys(this.bands).forEach(bandName => {
            this.calculateMakeupGain(bandName);
        });
        console.log('✅ Auto makeup gain applied to all bands');
    }

    /**
     * Connect input source to multiband compressor
     */
    connectInput(sourceNode) {
        // Split input to all 4 bands
        Object.values(this.bands).forEach(band => {
            sourceNode.connect(band.input);
        });
        console.log('🔌 Input connected to multiband compressor');
    }

    /**
     * Set settings for a specific band
     */
    setBandSettings(bandName, settings) {
        const band = this.bands[bandName];
        if (!band) {
            console.error('❌ Invalid band name:', bandName);
            return;
        }

        if (settings.threshold !== undefined) {
            band.compressor.threshold.value = settings.threshold;
        }
        if (settings.ratio !== undefined) {
            band.compressor.ratio.value = settings.ratio;
        }
        if (settings.attack !== undefined) {
            band.compressor.attack.value = settings.attack;
        }
        if (settings.release !== undefined) {
            band.compressor.release.value = settings.release;
        }

        // Auto-recalculate makeup gain when threshold or ratio changes
        if (settings.threshold !== undefined || settings.ratio !== undefined) {
            this.calculateMakeupGain(bandName);
        }

        console.log(`⚙️ ${bandName} settings updated:`, settings);
    }

    /**
     * Load genre preset
     */
    loadPreset(genreName) {
        const preset = this.presets[genreName];
        if (!preset) {
            console.error('❌ Invalid genre preset:', genreName);
            return;
        }

        Object.keys(preset).forEach(bandName => {
            this.setBandSettings(bandName, preset[bandName]);
        });

        // Apply automatic makeup gain after loading preset
        this.applyAutoMakeupGain();

        console.log(`✅ Loaded multiband preset: ${genreName} (with auto makeup gain)`);
    }

    /**
     * Get current settings for all bands
     */
    getAllSettings() {
        const settings = {};

        Object.keys(this.bands).forEach(bandName => {
            const band = this.bands[bandName];
            settings[bandName] = {
                threshold: band.compressor.threshold.value,
                ratio: band.compressor.ratio.value,
                attack: band.compressor.attack.value,
                release: band.compressor.release.value
            };
        });

        return settings;
    }

    /**
     * Get gain reduction for metering (simulated)
     */
    getGainReduction(bandName) {
        const band = this.bands[bandName];
        if (!band) return 0;

        // Web Audio API doesn't expose gain reduction directly
        // We simulate it based on threshold and ratio
        return band.compressor.reduction || 0;
    }

    /**
     * Bypass multiband (use single-band instead)
     */
    setBypass(bypassed) {
        if (bypassed) {
            // Disconnect all bands
            Object.values(this.bands).forEach(band => {
                band.output.disconnect();
            });
            console.log('⏸️ Multiband compression bypassed');
        } else {
            // Reconnect all bands
            Object.values(this.bands).forEach(band => {
                band.output.connect(this.output);
            });
            console.log('▶️ Multiband compression active');
        }
    }

    /**
     * Get band info for UI display
     */
    getBandInfo(bandName) {
        const band = this.bands[bandName];
        if (!band) return null;

        return {
            name: band.name,
            frequencyRange: `${band.lowFreq}-${band.highFreq}Hz`,
            threshold: band.compressor.threshold.value.toFixed(1) + ' dB',
            ratio: band.compressor.ratio.value.toFixed(1) + ':1',
            attack: (band.compressor.attack.value * 1000).toFixed(1) + ' ms',
            release: (band.compressor.release.value * 1000).toFixed(0) + ' ms',
            gainReduction: this.getGainReduction(bandName).toFixed(1) + ' dB'
        };
    }

    /**
     * Auto-set based on detected genre and dynamics
     */
    autoSetFromAnalysis(analysis) {
        const { genre, dynamicRange, spectralBalance } = analysis;

        // Start with genre preset
        if (this.presets[genre]) {
            this.loadPreset(genre);
        } else {
            this.loadPreset('balanced');
        }

        // Adjust based on dynamic range
        if (dynamicRange > 16) {
            // Very dynamic - reduce compression
            Object.keys(this.bands).forEach(bandName => {
                const current = this.bands[bandName].compressor.ratio.value;
                this.setBandSettings(bandName, { ratio: Math.max(2, current - 1) });
            });
        } else if (dynamicRange < 8) {
            // Already compressed - use light touch
            Object.keys(this.bands).forEach(bandName => {
                this.setBandSettings(bandName, { ratio: 3, threshold: -25 });
            });
        }

        console.log('🤖 Auto-set multiband compression from analysis');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultibandCompressor;
}
