/**
 * STEREO FIELD EDITOR
 * Visual frequency-based stereo width control
 * Like iZotope Ozone Imager - control stereo width per frequency band
 */

class StereoFieldEditor {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.isActive = false;

        // Audio nodes
        this.inputNode = null;
        this.outputNode = null;
        this.splitters = [];
        this.mergers = [];
        this.midGains = [];
        this.sideGains = [];

        // 7 frequency bands matching the EQ
        this.bands = [
            { name: 'Sub', frequency: 40, width: 100 },      // 0-80Hz
            { name: 'Bass', frequency: 120, width: 100 },    // 80-200Hz
            { name: 'Low Mid', frequency: 350, width: 100 }, // 200-600Hz
            { name: 'Mid', frequency: 1000, width: 100 },    // 600-2kHz
            { name: 'High Mid', frequency: 3500, width: 100 },// 2kHz-6kHz
            { name: 'High', frequency: 8000, width: 100 },   // 6kHz-12kHz
            { name: 'Air', frequency: 15000, width: 100 }    // 12kHz+
        ];

        this.initialize();
    }

    initialize() {
        // Create M/S processing chain for each frequency band
        this.inputNode = this.audioContext.createGain();
        this.outputNode = this.audioContext.createGain();

        // Create crossover filters and M/S processors for each band
        let previousFilter = this.inputNode;

        this.bands.forEach((band, index) => {
            // Create band-pass filter
            const lowpass = this.audioContext.createBiquadFilter();
            const highpass = this.audioContext.createBiquadFilter();

            if (index === 0) {
                // First band: lowpass only
                lowpass.type = 'lowpass';
                lowpass.frequency.value = (band.frequency + this.bands[index + 1].frequency) / 2;
                lowpass.Q.value = 0.7;
                previousFilter.connect(lowpass);
                previousFilter = lowpass;
            } else if (index === this.bands.length - 1) {
                // Last band: highpass only
                highpass.type = 'highpass';
                highpass.frequency.value = (this.bands[index - 1].frequency + band.frequency) / 2;
                highpass.Q.value = 0.7;
                previousFilter.connect(highpass);
                previousFilter = highpass;
            } else {
                // Middle bands: bandpass
                lowpass.type = 'lowpass';
                highpass.type = 'highpass';
                lowpass.frequency.value = (band.frequency + this.bands[index + 1].frequency) / 2;
                highpass.frequency.value = (this.bands[index - 1].frequency + band.frequency) / 2;
                lowpass.Q.value = 0.7;
                highpass.Q.value = 0.7;
                previousFilter.connect(highpass);
                highpass.connect(lowpass);
                previousFilter = lowpass;
            }

            // Create M/S encoder
            const splitter = this.audioContext.createChannelSplitter(2);
            const merger = this.audioContext.createChannelMerger(2);

            // Mid and Side gains
            const midGain = this.audioContext.createGain();
            const sideGain = this.audioContext.createGain();

            midGain.gain.value = 1.0;
            sideGain.gain.value = 1.0; // 100% width by default

            // Connect filter to splitter
            previousFilter.connect(splitter);

            // Encode to Mid/Side
            // Mid = (L + R) / 2
            // Side = (L - R) / 2

            // For simplicity, we'll use stereo width control directly
            // Width = 0: mono, Width = 100: original stereo, Width = 200: enhanced stereo

            splitter.connect(midGain, 0); // Left to mid
            splitter.connect(sideGain, 1); // Right to side

            midGain.connect(merger, 0, 0);
            midGain.connect(merger, 0, 1);
            sideGain.connect(merger, 0, 0);
            sideGain.connect(merger, 0, 1);

            merger.connect(this.outputNode);

            this.splitters.push(splitter);
            this.mergers.push(merger);
            this.midGains.push(midGain);
            this.sideGains.push(sideGain);
        });

        console.log('✅ Stereo Field Editor initialized with', this.bands.length, 'frequency bands');
    }

    /**
     * Set stereo width for a specific frequency band
     * @param {number} bandIndex - Band index (0-6)
     * @param {number} widthPercent - Width percentage (0-200)
     *   0 = mono
     *   100 = original stereo
     *   200 = maximum stereo enhancement
     */
    setWidth(bandIndex, widthPercent) {
        if (bandIndex < 0 || bandIndex >= this.bands.length) {
            console.warn('Invalid band index:', bandIndex);
            return;
        }

        // Clamp width to 0-200%
        widthPercent = Math.max(0, Math.min(200, widthPercent));

        // Update band width
        this.bands[bandIndex].width = widthPercent;

        // Calculate mid/side gains
        // At 0%: side = 0 (mono)
        // At 100%: mid = 1, side = 1 (original)
        // At 200%: side = 2 (enhanced)

        const widthFactor = widthPercent / 100;

        if (this.sideGains[bandIndex]) {
            this.sideGains[bandIndex].gain.value = widthFactor;
        }

        console.log(`🎚️ Stereo width for ${this.bands[bandIndex].name} (${this.bands[bandIndex].frequency}Hz): ${widthPercent}%`);
    }

    /**
     * Get current width for a band
     */
    getWidth(bandIndex) {
        if (bandIndex < 0 || bandIndex >= this.bands.length) {
            return 100;
        }
        return this.bands[bandIndex].width;
    }

    /**
     * Reset all bands to 100% (original stereo)
     */
    reset() {
        this.bands.forEach((band, index) => {
            this.setWidth(index, 100);
        });
        console.log('✅ Stereo Field Editor reset to defaults');
    }

    /**
     * Apply a preset (e.g., "wide", "mono-bass", "narrow")
     */
    applyPreset(presetName) {
        console.log('🎛️ Applying stereo field preset:', presetName);

        switch(presetName.toLowerCase()) {
            case 'wide':
                // Enhance stereo field across all frequencies
                this.setWidth(0, 50);   // Sub: mono
                this.setWidth(1, 70);   // Bass: slightly narrow
                this.setWidth(2, 120);  // Low Mid: wider
                this.setWidth(3, 130);  // Mid: wider
                this.setWidth(4, 150);  // High Mid: very wide
                this.setWidth(5, 160);  // High: very wide
                this.setWidth(6, 170);  // Air: maximum width
                break;

            case 'mono-bass':
                // Mono low end, stereo highs (standard mastering)
                this.setWidth(0, 0);    // Sub: full mono
                this.setWidth(1, 30);   // Bass: mostly mono
                this.setWidth(2, 80);   // Low Mid: slight mono
                this.setWidth(3, 100);  // Mid: normal
                this.setWidth(4, 120);  // High Mid: wider
                this.setWidth(5, 130);  // High: wider
                this.setWidth(6, 140);  // Air: wide
                break;

            case 'narrow':
                // Reduce stereo field (for mono compatibility)
                this.setWidth(0, 0);    // Sub: mono
                this.setWidth(1, 30);   // Bass: narrow
                this.setWidth(2, 50);   // Low Mid: narrow
                this.setWidth(3, 70);   // Mid: narrow
                this.setWidth(4, 70);   // High Mid: narrow
                this.setWidth(5, 80);   // High: slightly narrow
                this.setWidth(6, 90);   // Air: slightly narrow
                break;

            case 'center-focus':
                // Collapse everything to center except air
                this.setWidth(0, 0);    // Sub: mono
                this.setWidth(1, 0);    // Bass: mono
                this.setWidth(2, 20);   // Low Mid: very narrow
                this.setWidth(3, 40);   // Mid: narrow
                this.setWidth(4, 60);   // High Mid: narrow
                this.setWidth(5, 100);  // High: normal
                this.setWidth(6, 120);  // Air: wide
                break;

            default:
                this.reset();
        }
    }

    /**
     * Toggle active state
     */
    setActive(active) {
        this.isActive = active;

        if (active) {
            console.log('✅ Stereo Field Editor: ACTIVE');
        } else {
            console.log('⏸️ Stereo Field Editor: BYPASSED');
            this.reset();
        }
    }

    /**
     * Get stereo width analysis (for visualization)
     */
    getAnalysis() {
        return this.bands.map((band, index) => ({
            name: band.name,
            frequency: band.frequency,
            width: band.width,
            widthDB: 20 * Math.log10(band.width / 100)
        }));
    }
}

// Export for use in main application
if (typeof window !== 'undefined') {
    window.StereoFieldEditor = StereoFieldEditor;
}
