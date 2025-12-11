/**
 * M/S (MID/SIDE) PROCESSING ENGINE
 * Stereo encoding/decoding for independent Mid (center) and Side (stereo) processing
 * Professional mastering technique for surgical stereo control
 */

class MSProcessor {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Create nodes for M/S processing
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Channel splitter/merger
        this.splitter = audioContext.createChannelSplitter(2);
        this.merger = audioContext.createChannelMerger(2);

        // Mid and Side processing chains
        this.midGain = audioContext.createGain();
        this.sideGain = audioContext.createGain();

        // M/S encoding gains (for converting L/R to M/S)
        this.encodeGainL = audioContext.createGain();
        this.encodeGainR = audioContext.createGain();
        this.midSumGain = audioContext.createGain();
        this.sideDiffGain = audioContext.createGain();

        // M/S decoding gains (for converting M/S back to L/R)
        this.decodeMidToL = audioContext.createGain();
        this.decodeMidToR = audioContext.createGain();
        this.decodeSideToL = audioContext.createGain();
        this.decodeSideToR = audioContext.createGain();

        // Mid and Side EQ chains (7 bands each)
        this.midEQ = this.createEQChain('Mid');
        this.sideEQ = this.createEQChain('Side');

        // State
        this.msMode = false; // false = Stereo, true = M/S
        this.currentTarget = 'stereo'; // 'mid', 'side', or 'stereo'

        this.setupMSEncoding();
        console.log('✅ M/S Processor initialized');
    }

    /**
     * Create 7-band EQ chain (matching main EQ structure)
     */
    createEQChain(label) {
        const chain = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            bands: {}
        };

        const bandConfig = {
            sub: { type: 'lowshelf', freq: 40, q: 0.7 },
            bass: { type: 'peaking', freq: 120, q: 0.7 },
            lowmid: { type: 'peaking', freq: 350, q: 0.7 },
            mid: { type: 'peaking', freq: 1000, q: 0.7 },
            highmid: { type: 'peaking', freq: 3500, q: 0.7 },
            high: { type: 'peaking', freq: 8000, q: 0.7 },
            air: { type: 'highshelf', freq: 14000, q: 0.7 }
        };

        let currentNode = chain.input;

        Object.keys(bandConfig).forEach(bandName => {
            const config = bandConfig[bandName];
            const filter = this.audioContext.createBiquadFilter();

            filter.type = config.type;
            filter.frequency.value = config.freq;
            filter.Q.value = config.q;
            filter.gain.value = 0; // Start neutral

            currentNode.connect(filter);
            currentNode = filter;

            chain.bands[bandName] = filter;
        });

        currentNode.connect(chain.output);
        console.log(`  ✓ ${label} EQ chain created (7 bands)`);

        return chain;
    }

    /**
     * Setup M/S encoding/decoding topology
     */
    setupMSEncoding() {
        // M/S ENCODING (L/R → M/S)
        // Mid (M) = (L + R) / 2
        // Side (S) = (L - R) / 2

        this.input.connect(this.splitter);

        // Left channel
        this.splitter.connect(this.encodeGainL, 0);
        this.encodeGainL.gain.value = 0.5; // Divide by 2

        // Right channel
        this.splitter.connect(this.encodeGainR, 1);
        this.encodeGainR.gain.value = 0.5; // Divide by 2

        // Create Mid (L+R)/2
        this.encodeGainL.connect(this.midSumGain);
        this.encodeGainR.connect(this.midSumGain);
        this.midSumGain.connect(this.midEQ.input);

        // Create Side (L-R)/2 - invert R channel
        const invertR = this.audioContext.createGain();
        invertR.gain.value = -1;
        this.encodeGainR.connect(invertR);
        this.encodeGainL.connect(this.sideDiffGain);
        invertR.connect(this.sideDiffGain);
        this.sideDiffGain.connect(this.sideEQ.input);

        // M/S DECODING (M/S → L/R)
        // Left (L) = M + S
        // Right (R) = M - S

        this.midEQ.output.connect(this.midGain);
        this.sideEQ.output.connect(this.sideGain);

        // Decode to Left channel (M + S)
        this.midGain.connect(this.decodeMidToL);
        this.sideGain.connect(this.decodeSideToL);
        this.decodeMidToL.connect(this.merger, 0, 0);
        this.decodeSideToL.connect(this.merger, 0, 0);

        // Decode to Right channel (M - S)
        this.midGain.connect(this.decodeMidToR);
        this.sideGain.connect(this.decodeSideToR);
        this.decodeMidToR.connect(this.merger, 0, 1);

        const invertSide = this.audioContext.createGain();
        invertSide.gain.value = -1;
        this.sideGain.connect(invertSide);
        invertSide.connect(this.merger, 0, 1);

        this.merger.connect(this.output);

        console.log('  ✓ M/S encoding/decoding topology configured');
    }

    /**
     * Set EQ value for Mid or Side channel
     */
    setEQ(target, bandName, dbValue) {
        if (target !== 'mid' && target !== 'side') {
            console.error('❌ Invalid M/S target:', target);
            return;
        }

        const chain = target === 'mid' ? this.midEQ : this.sideEQ;
        const filter = chain.bands[bandName];

        if (!filter) {
            console.error('❌ Invalid band name:', bandName);
            return;
        }

        filter.gain.value = dbValue;
        console.log(`🎛️ ${target.toUpperCase()} EQ ${bandName}: ${dbValue.toFixed(1)} dB`);
    }

    /**
     * Get EQ value for Mid or Side channel
     */
    getEQ(target, bandName) {
        if (target !== 'mid' && target !== 'side') return 0;

        const chain = target === 'mid' ? this.midEQ : this.sideEQ;
        const filter = chain.bands[bandName];

        return filter ? filter.gain.value : 0;
    }

    /**
     * Set Mid/Side balance
     */
    setMidSideBalance(midLevel, sideLevel) {
        // midLevel and sideLevel are 0-1 (linear gain)
        this.midGain.gain.value = midLevel;
        this.sideGain.gain.value = sideLevel;

        console.log(`🔀 M/S Balance: Mid ${(midLevel * 100).toFixed(0)}%, Side ${(sideLevel * 100).toFixed(0)}%`);
    }

    /**
     * Set stereo width using M/S (0-200%)
     */
    setStereoWidth(widthPercent) {
        // 0% = Mono, 100% = Normal, 200% = Maximum width
        const width = widthPercent / 100;

        // Keep mid constant, adjust side
        this.midGain.gain.value = 1.0;
        this.sideGain.gain.value = width;

        console.log(`↔️ Stereo width: ${widthPercent.toFixed(0)}% (M/S mode)`);
    }

    /**
     * Enable/disable M/S mode
     */
    setMSMode(enabled) {
        this.msMode = enabled;

        if (enabled) {
            console.log('✅ M/S Mode ENABLED - Mid/Side processing active');
        } else {
            // Reset to neutral when disabled
            this.resetMSProcessing();
            console.log('⏸️ M/S Mode DISABLED - Stereo processing');
        }
    }

    /**
     * Reset all M/S processing to neutral
     */
    resetMSProcessing() {
        // Reset Mid EQ
        Object.values(this.midEQ.bands).forEach(filter => {
            filter.gain.value = 0;
        });

        // Reset Side EQ
        Object.values(this.sideEQ.bands).forEach(filter => {
            filter.gain.value = 0;
        });

        // Reset balance
        this.midGain.gain.value = 1.0;
        this.sideGain.gain.value = 1.0;

        console.log('🔄 M/S processing reset to neutral');
    }

    /**
     * Apply professional M/S preset
     */
    applyPreset(presetName) {
        const presets = {
            // Wide highs, centered bass (club/EDM standard)
            wideHiphs: {
                mid: { sub: 0, bass: 0, lowmid: 0, mid: 0, highmid: -2, high: -3, air: -4 },
                side: { sub: -12, bass: -8, lowmid: -4, mid: 0, highmid: +2, high: +4, air: +6 }
            },

            // Centered vocals, wide instruments
            vocalFocus: {
                mid: { sub: 0, bass: 0, lowmid: 0, mid: +2, highmid: +3, high: 0, air: 0 },
                side: { sub: -12, bass: -6, lowmid: 0, mid: -2, highmid: 0, high: +2, air: +3 }
            },

            // Mono bass, stereo everything else
            clubReady: {
                mid: { sub: +3, bass: +2, lowmid: 0, mid: 0, highmid: 0, high: 0, air: 0 },
                side: { sub: -24, bass: -12, lowmid: -3, mid: 0, highmid: +2, high: +3, air: +4 }
            },

            // Natural stereo image
            natural: {
                mid: { sub: 0, bass: 0, lowmid: 0, mid: 0, highmid: 0, high: 0, air: 0 },
                side: { sub: -6, bass: -3, lowmid: 0, mid: 0, highmid: 0, high: +1, air: +2 }
            }
        };

        const preset = presets[presetName];
        if (!preset) {
            console.error('❌ Invalid M/S preset:', presetName);
            return;
        }

        // Apply Mid settings
        Object.keys(preset.mid).forEach(band => {
            this.setEQ('mid', band, preset.mid[band]);
        });

        // Apply Side settings
        Object.keys(preset.side).forEach(band => {
            this.setEQ('side', band, preset.side[band]);
        });

        this.setMSMode(true);
        console.log(`✅ Applied M/S preset: ${presetName}`);
    }

    /**
     * Get current M/S settings for display
     */
    getSettings() {
        return {
            mode: this.msMode ? 'M/S' : 'Stereo',
            midBalance: (this.midGain.gain.value * 100).toFixed(0) + '%',
            sideBalance: (this.sideGain.gain.value * 100).toFixed(0) + '%',
            midEQ: this.getEQSettings('mid'),
            sideEQ: this.getEQSettings('side')
        };
    }

    /**
     * Get EQ settings for Mid or Side
     */
    getEQSettings(target) {
        const chain = target === 'mid' ? this.midEQ : this.sideEQ;
        const settings = {};

        Object.keys(chain.bands).forEach(bandName => {
            settings[bandName] = chain.bands[bandName].gain.value.toFixed(1) + ' dB';
        });

        return settings;
    }

    /**
     * Connect input source
     */
    connectInput(sourceNode) {
        sourceNode.connect(this.input);
        console.log('🔌 Input connected to M/S processor');
    }

    /**
     * Get output node for next stage
     */
    getOutput() {
        return this.output;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MSProcessor;
}
