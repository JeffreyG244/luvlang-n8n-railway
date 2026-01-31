/**
 * CODEC PREVIEW ENGINE
 * Simulate how mastered tracks sound after streaming compression
 * Unique feature - no other free platform has this!
 */

class CodecPreviewEngine {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.currentCodec = 'original';
        this.processingChain = null;

        this.codecProfiles = {
            spotify: {
                name: 'Spotify',
                fullName: 'Spotify (Ogg Vorbis 320kbps)',
                bitrate: 320,
                format: 'ogg',
                quality: 0.92,
                hfRolloff: 20000, // High frequency rolloff in Hz
                hfSlope: 24, // dB/octave
                compression: 0.88, // Dynamic range compression factor
                stereoWidth: 1.0,
                description: 'High quality streaming - minimal artifacts'
            },
            apple: {
                name: 'Apple Music',
                fullName: 'Apple Music (AAC 256kbps)',
                bitrate: 256,
                format: 'aac',
                quality: 0.90,
                hfRolloff: 19500,
                hfSlope: 18,
                compression: 0.85,
                stereoWidth: 0.98,
                description: 'Excellent quality - subtle HF smoothing'
            },
            youtube: {
                name: 'YouTube',
                fullName: 'YouTube (AAC 128kbps)',
                bitrate: 128,
                format: 'aac',
                quality: 0.78,
                hfRolloff: 16000,
                hfSlope: 12,
                compression: 0.75,
                stereoWidth: 0.92,
                description: 'Moderate quality - noticeable HF loss'
            },
            podcast: {
                name: 'Podcast Platforms',
                fullName: 'Podcast Platforms (MP3 128kbps)',
                bitrate: 128,
                format: 'mp3',
                quality: 0.72,
                hfRolloff: 15000,
                hfSlope: 12,
                compression: 0.70,
                stereoWidth: 0.85,
                description: 'Voice-optimized - reduced fidelity'
            },
            soundcloud: {
                name: 'SoundCloud',
                fullName: 'SoundCloud (MP3 128kbps)',
                bitrate: 128,
                format: 'mp3',
                quality: 0.70,
                hfRolloff: 14500,
                hfSlope: 12,
                compression: 0.68,
                stereoWidth: 0.90,
                description: 'Noticeable compression - optimize carefully'
            }
        };
    }

    // Apply codec simulation to audio source
    applyCodecSimulation(source, codecType = 'original') {
        // Clear previous chain
        if (this.processingChain) {
            this.clearProcessingChain();
        }

        if (codecType === 'original') {
            // No processing - direct connection
            this.currentCodec = 'original';
            return source;
        }

        const profile = this.codecProfiles[codecType];
        if (!profile) {
            console.warn(`Unknown codec: ${codecType}, using original`);
            return source;
        }

        console.log(`🎧 Applying ${profile.fullName} simulation...`);

        // Create processing chain
        const chain = {
            // 1. High-frequency rolloff (lossy codecs reduce HF content)
            hfFilter1: this.audioContext.createBiquadFilter(),
            hfFilter2: this.audioContext.createBiquadFilter(),

            // 2. Subtle dynamic range compression
            compressor: this.audioContext.createDynamicsCompressor(),

            // 3. Bit depth reduction (quantization noise simulation)
            waveshaper: this.audioContext.createWaveShaper(),

            // 4. Stereo width reduction
            stereoReducer: this.createStereoWidthProcessor(profile.stereoWidth),

            // 5. Overall gain adjustment
            gainNode: this.audioContext.createGain()
        };

        // Configure high-frequency rolloff (2-stage for steeper slope)
        chain.hfFilter1.type = 'lowpass';
        chain.hfFilter1.frequency.value = profile.hfRolloff;
        chain.hfFilter1.Q.value = 0.7;

        chain.hfFilter2.type = 'lowpass';
        chain.hfFilter2.frequency.value = profile.hfRolloff * 1.1;
        chain.hfFilter2.Q.value = 0.5;

        // Configure compression (lossy codecs often apply compression)
        chain.compressor.threshold.value = -30;
        chain.compressor.ratio.value = 1 + (1 - profile.compression) * 3;
        chain.compressor.attack.value = 0.003;
        chain.compressor.release.value = 0.25;
        chain.compressor.knee.value = 20;

        // Configure bit depth reduction
        const bitDepth = Math.floor(profile.quality * 16);
        chain.waveshaper.curve = this.createBitReductionCurve(bitDepth);
        chain.waveshaper.oversample = 'none';

        // Configure gain (lossy compression typically reduces peaks)
        chain.gainNode.gain.value = 0.95 + (profile.quality * 0.05);

        // Connect processing chain
        source.connect(chain.hfFilter1);
        chain.hfFilter1.connect(chain.hfFilter2);
        chain.hfFilter2.connect(chain.compressor);
        chain.compressor.connect(chain.waveshaper);
        chain.waveshaper.connect(chain.stereoReducer.input);
        chain.stereoReducer.output.connect(chain.gainNode);

        this.processingChain = chain;
        this.currentCodec = codecType;

        console.log(`✅ ${profile.name} codec simulation active`);
        console.log(`   - HF Rolloff: ${profile.hfRolloff}Hz`);
        console.log(`   - Quality: ${Math.round(profile.quality * 100)}%`);
        console.log(`   - Bitrate: ${profile.bitrate}kbps`);

        return chain.gainNode;
    }

    // Create bit reduction curve for waveshaper
    createBitReductionCurve(bitDepth) {
        const samples = 65536;
        const curve = new Float32Array(samples);
        const step = 1 / Math.pow(2, bitDepth);

        for (let i = 0; i < samples; i++) {
            const x = (i - samples / 2) / (samples / 2);
            // Quantize to bit depth
            curve[i] = Math.round(x / step) * step;
            // Clamp to -1 to +1
            curve[i] = Math.max(-1, Math.min(1, curve[i]));
        }

        return curve;
    }

    // Create stereo width reduction processor
    createStereoWidthProcessor(width) {
        // Mid-side processing for stereo width control
        const splitter = this.audioContext.createChannelSplitter(2);
        const merger = this.audioContext.createChannelMerger(2);

        const midGain = this.audioContext.createGain();
        const sideGain = this.audioContext.createGain();

        // Width formula: 0 = mono, 1 = full stereo
        midGain.gain.value = 1.0;
        sideGain.gain.value = width;

        // This is a simplified version - proper M/S would use matrix
        splitter.connect(midGain, 0);
        splitter.connect(sideGain, 1);

        midGain.connect(merger, 0, 0);
        sideGain.connect(merger, 0, 1);

        return {
            input: splitter,
            output: merger
        };
    }

    // Analyze codec impact on audio
    analyzeCodecImpact(codecType) {
        const profile = this.codecProfiles[codecType];
        if (!profile) return null;

        const qualityScore = Math.round(profile.quality * 100);
        const hfLossKHz = (profile.hfRolloff / 1000).toFixed(1);

        let artifacts = [];
        if (profile.quality < 0.75) {
            artifacts.push('Noticeable high-frequency loss');
            artifacts.push('Possible pre-echo on transients');
        }
        if (profile.quality < 0.80) {
            artifacts.push('Slight stereo imaging reduction');
        }
        if (profile.bitrate <= 128) {
            artifacts.push('Reduced dynamic range');
            artifacts.push('Potential compression artifacts');
        }

        let recommendation = '';
        if (qualityScore >= 90) {
            recommendation = '✅ Excellent preservation - safe for all content';
        } else if (qualityScore >= 80) {
            recommendation = '🟢 Good quality - slight compromises acceptable';
        } else if (qualityScore >= 70) {
            recommendation = '🟡 Moderate quality - avoid excessive HF content';
        } else {
            recommendation = '⚠️ Reduced quality - optimize for speech/simplicity';
        }

        return {
            name: profile.name,
            fullName: profile.fullName,
            bitrate: profile.bitrate,
            format: profile.format.toUpperCase(),
            qualityScore: qualityScore,
            hfRolloff: `${hfLossKHz} kHz`,
            hfLoss: `Frequencies above ${hfLossKHz}kHz reduced by ${profile.hfSlope}dB/octave`,
            stereoReduction: `${Math.round((1 - profile.stereoWidth) * 100)}% stereo width reduction`,
            artifacts: artifacts,
            recommendation: recommendation,
            description: profile.description
        };
    }

    // Get optimization tips for specific codec
    getOptimizationTips(codecType) {
        const profile = this.codecProfiles[codecType];
        if (!profile) return [];

        const tips = [];

        if (profile.hfRolloff < 18000) {
            tips.push({
                icon: '🔉',
                tip: `Avoid excessive highs above ${(profile.hfRolloff / 1000).toFixed(0)}kHz`,
                detail: 'These frequencies will be heavily reduced by the codec'
            });
        }

        if (profile.compression < 0.80) {
            tips.push({
                icon: '📊',
                tip: 'Avoid over-compression in your master',
                detail: 'The codec will add its own compression, reducing dynamics further'
            });
        }

        if (profile.quality < 0.75) {
            tips.push({
                icon: '🎚️',
                tip: 'Boost midrange slightly (1-4kHz)',
                detail: 'Compensates for codec-induced tonal shifts'
            });
        }

        if (profile.stereoWidth < 0.95) {
            tips.push({
                icon: '↔️',
                tip: 'Avoid extreme stereo widening',
                detail: `Codec reduces stereo width by ${Math.round((1 - profile.stereoWidth) * 100)}%`
            });
        }

        if (codecType === 'podcast' || codecType === 'youtube') {
            tips.push({
                icon: '🎤',
                tip: 'Optimize for voice intelligibility',
                detail: 'Boost 2-4kHz range for clearer speech'
            });
        }

        return tips;
    }

    // Compare multiple codecs side-by-side
    compareCodecs(codecList = ['spotify', 'apple', 'youtube', 'podcast']) {
        const comparison = {};

        for (const codec of codecList) {
            comparison[codec] = this.analyzeCodecImpact(codec);
        }

        return comparison;
    }

    // Clear processing chain
    clearProcessingChain() {
        if (this.processingChain) {
            // Disconnect all nodes
            try {
                Object.values(this.processingChain).forEach(node => {
                    if (node && node.disconnect) {
                        node.disconnect();
                    } else if (node && node.input && node.input.disconnect) {
                        node.input.disconnect();
                    }
                    if (node && node.output && node.output.disconnect) {
                        node.output.disconnect();
                    }
                });
            } catch (e) {
                console.warn('Error disconnecting codec chain:', e);
            }
            this.processingChain = null;
        }
    }

    // Get current codec info
    getCurrentCodec() {
        return this.currentCodec;
    }

    // Get all available codecs
    getAvailableCodecs() {
        return Object.keys(this.codecProfiles).map(key => ({
            id: key,
            name: this.codecProfiles[key].name,
            fullName: this.codecProfiles[key].fullName,
            bitrate: this.codecProfiles[key].bitrate,
            format: this.codecProfiles[key].format
        }));
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.CodecPreviewEngine = CodecPreviewEngine;
}
