/**
 * STEM MASTERING ENGINE
 * Revolutionary multi-track processing for LuvLang
 * Allows separate processing of vocals, drums, instruments, bass
 */

class StemMasteringEngine {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.stems = {
            vocals: null,
            drums: null,
            instruments: null,
            bass: null
        };
        this.stemBuffers = {};
        this.stemSources = {};
        this.stemProcessors = {};
        this.masterMix = null;
        this.isPlaying = false;
    }

    // Load stem audio file
    async loadStem(stemType, file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.stemBuffers[stemType] = audioBuffer;
            console.log(`✅ Loaded ${stemType} stem: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels`);
            return {
                success: true,
                duration: audioBuffer.duration,
                sampleRate: audioBuffer.sampleRate,
                channels: audioBuffer.numberOfChannels
            };
        } catch (error) {
            console.error(`❌ Error loading ${stemType} stem:`, error);
            return { success: false, error: error.message };
        }
    }

    // Create processing chain for each stem
    createStemProcessor(stemType, settings = {}) {
        const processor = {
            eq: this.audioContext.createBiquadFilter(),
            compressor: this.audioContext.createDynamicsCompressor(),
            deesser: null,
            gain: this.audioContext.createGain()
        };

        // Configure based on stem type
        if (stemType === 'vocals') {
            // Vocal processing: clarity boost + de-essing
            processor.eq.type = 'peaking';
            processor.eq.frequency.value = 2500; // Vocal clarity sweet spot
            processor.eq.Q.value = 0.7;
            processor.eq.gain.value = settings.eq || 2;

            processor.compressor.threshold.value = -24;
            processor.compressor.ratio.value = settings.compression || 4;
            processor.compressor.attack.value = 0.003;
            processor.compressor.release.value = 0.25;
            processor.compressor.knee.value = 30;

            // De-esser for sibilance control
            processor.deesser = this.audioContext.createBiquadFilter();
            processor.deesser.type = 'peaking';
            processor.deesser.frequency.value = 7000;
            processor.deesser.Q.value = 2.0;
            processor.deesser.gain.value = -(settings.deessing || 3);

        } else if (stemType === 'drums') {
            // Drum processing: punch + tightness
            processor.eq.type = 'lowshelf';
            processor.eq.frequency.value = 100; // Drum thump
            processor.eq.gain.value = settings.eq || 3;

            processor.compressor.threshold.value = -18;
            processor.compressor.ratio.value = settings.compression || 6;
            processor.compressor.attack.value = 0.001; // Fast for transients
            processor.compressor.release.value = 0.1;
            processor.compressor.knee.value = 10; // Harder knee for punch

        } else if (stemType === 'bass') {
            // Bass processing: sub emphasis + control
            processor.eq.type = 'lowshelf';
            processor.eq.frequency.value = 60; // Sub bass
            processor.eq.gain.value = settings.eq || 4;

            processor.compressor.threshold.value = -20;
            processor.compressor.ratio.value = settings.compression || 5;
            processor.compressor.attack.value = 0.005;
            processor.compressor.release.value = 0.15;
            processor.compressor.knee.value = 20;

        } else { // instruments
            // Instrument processing: balance + space
            processor.eq.type = 'peaking';
            processor.eq.frequency.value = 1000;
            processor.eq.Q.value = 0.7;
            processor.eq.gain.value = settings.eq || 0;

            processor.compressor.threshold.value = -24;
            processor.compressor.ratio.value = settings.compression || 4;
            processor.compressor.attack.value = 0.003;
            processor.compressor.release.value = 0.25;
            processor.compressor.knee.value = 30;
        }

        // Apply volume setting (convert dB to linear)
        processor.gain.gain.value = Math.pow(10, (settings.volume || 0) / 20);

        this.stemProcessors[stemType] = processor;
        console.log(`✅ Created ${stemType} processor:`, settings);
        return processor;
    }

    // Play all stems together (live preview)
    async playStemsLive(settings) {
        if (this.isPlaying) {
            this.stopStems();
        }

        const loadedStems = Object.keys(this.stemBuffers).filter(type => this.stemBuffers[type]);

        if (loadedStems.length === 0) {
            throw new Error('No stems loaded. Please upload at least one stem.');
        }

        // Create merger for combining stems
        const merger = this.audioContext.createChannelMerger(2);
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = 1.0;

        // Process each stem
        for (const stemType of loadedStems) {
            const buffer = this.stemBuffers[stemType];

            // Create buffer source
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.loop = false;

            // Create processor with settings
            const processor = this.createStemProcessor(stemType, settings[stemType] || {});

            // Connect processing chain
            let currentNode = source;
            currentNode.connect(processor.eq);
            currentNode = processor.eq;

            currentNode.connect(processor.compressor);
            currentNode = processor.compressor;

            if (processor.deesser) {
                currentNode.connect(processor.deesser);
                currentNode = processor.deesser;
            }

            currentNode.connect(processor.gain);
            currentNode = processor.gain;

            currentNode.connect(merger);

            // Store source for stopping
            this.stemSources[stemType] = source;

            // Start playback
            source.start(0);
        }

        // Master bus processing
        const masterEQ = this.audioContext.createBiquadFilter();
        masterEQ.type = 'peaking';
        masterEQ.frequency.value = 2000;
        masterEQ.Q.value = 0.7;
        masterEQ.gain.value = 0;

        const masterCompressor = this.audioContext.createDynamicsCompressor();
        masterCompressor.threshold.value = -12;
        masterCompressor.ratio.value = 4;
        masterCompressor.attack.value = 0.003;
        masterCompressor.release.value = 0.25;
        masterCompressor.knee.value = 30;

        const masterLimiter = this.audioContext.createDynamicsCompressor();
        masterLimiter.threshold.value = -1;
        masterLimiter.ratio.value = 20;
        masterLimiter.attack.value = 0.001;
        masterLimiter.release.value = 0.1;
        masterLimiter.knee.value = 0;

        // Connect master chain
        merger.connect(masterGain);
        masterGain.connect(masterEQ);
        masterEQ.connect(masterCompressor);
        masterCompressor.connect(masterLimiter);
        masterLimiter.connect(this.audioContext.destination);

        this.isPlaying = true;
        console.log(`✅ Playing ${loadedStems.length} stems together with mastering`);

        return { success: true, stemsPlaying: loadedStems.length };
    }

    // Stop playback
    stopStems() {
        for (const source of Object.values(this.stemSources)) {
            try {
                source.stop();
            } catch (e) {
                // Source may already be stopped
            }
        }
        this.stemSources = {};
        this.isPlaying = false;
        console.log('⏹️ Stopped stem playback');
    }

    // Render stems to single file (offline rendering)
    async renderStems(settings, duration = null) {
        const loadedStems = Object.keys(this.stemBuffers).filter(type => this.stemBuffers[type]);

        if (loadedStems.length === 0) {
            throw new Error('No stems loaded');
        }

        // Find longest stem duration
        const maxDuration = duration || Math.max(...loadedStems.map(type => this.stemBuffers[type].duration));
        const sampleRate = this.stemBuffers[loadedStems[0]].sampleRate;

        // Create offline context
        const offlineContext = new OfflineAudioContext(2, sampleRate * maxDuration, sampleRate);

        // Create merger
        const merger = offlineContext.createChannelMerger(2);

        // Process each stem offline
        for (const stemType of loadedStems) {
            const buffer = this.stemBuffers[stemType];

            const source = offlineContext.createBufferSource();
            source.buffer = buffer;

            // Create processors in offline context
            const eq = offlineContext.createBiquadFilter();
            const compressor = offlineContext.createDynamicsCompressor();
            const gain = offlineContext.createGain();

            // Apply settings from live processors
            const settings_stem = settings[stemType] || {};
            const liveProcessor = this.stemProcessors[stemType];

            if (liveProcessor) {
                eq.type = liveProcessor.eq.type;
                eq.frequency.value = liveProcessor.eq.frequency.value;
                eq.Q.value = liveProcessor.eq.Q.value;
                eq.gain.value = liveProcessor.eq.gain.value;

                compressor.threshold.value = liveProcessor.compressor.threshold.value;
                compressor.ratio.value = liveProcessor.compressor.ratio.value;
                compressor.attack.value = liveProcessor.compressor.attack.value;
                compressor.release.value = liveProcessor.compressor.release.value;
                compressor.knee.value = liveProcessor.compressor.knee.value;

                gain.gain.value = liveProcessor.gain.gain.value;
            }

            // Connect
            source.connect(eq);
            eq.connect(compressor);
            compressor.connect(gain);
            gain.connect(merger);

            source.start(0);
        }

        // Master bus
        const masterCompressor = offlineContext.createDynamicsCompressor();
        masterCompressor.threshold.value = -12;
        masterCompressor.ratio.value = 4;

        const masterLimiter = offlineContext.createDynamicsCompressor();
        masterLimiter.threshold.value = -1;
        masterLimiter.ratio.value = 20;

        merger.connect(masterCompressor);
        masterCompressor.connect(masterLimiter);
        masterLimiter.connect(offlineContext.destination);

        console.log(`🎬 Rendering ${loadedStems.length} stems offline...`);
        const renderedBuffer = await offlineContext.startRendering();
        console.log(`✅ Stem rendering complete: ${renderedBuffer.duration.toFixed(2)}s`);

        return renderedBuffer;
    }

    // Get stem info
    getStemInfo(stemType) {
        const buffer = this.stemBuffers[stemType];
        if (!buffer) return null;

        return {
            duration: buffer.duration,
            sampleRate: buffer.sampleRate,
            channels: buffer.numberOfChannels,
            loaded: true
        };
    }

    // Clear all stems
    clearAllStems() {
        this.stopStems();
        this.stemBuffers = {};
        this.stemProcessors = {};
        console.log('🗑️ Cleared all stems');
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.StemMasteringEngine = StemMasteringEngine;
}
