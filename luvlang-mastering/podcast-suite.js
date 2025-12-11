/**
 * ENHANCED PODCAST MASTERING SUITE
 * Professional podcast production tools
 * Voice clarity, de-essing, breath removal, multi-speaker balance
 */

class PodcastMasteringEngine {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.detectedSpeakers = [];

        // Professional podcast presets
        this.presets = {
            interview: {
                name: 'Interview (2+ Speakers)',
                targetLUFS: -16,
                voiceClarity: 2.5,
                deessing: 5,
                breathRemoval: 4,
                roomTone: 5,
                compression: 6,
                eq: {
                    bass: -1,
                    lowMid: -0.5,
                    mid: 2.5,
                    highMid: 1.5,
                    high: 0.5
                },
                description: 'Balanced for multiple voices with clear separation'
            },
            solo: {
                name: 'Solo Narrator',
                targetLUFS: -16,
                voiceClarity: 3,
                deessing: 6,
                breathRemoval: 5,
                roomTone: 6,
                compression: 5,
                eq: {
                    bass: 0,
                    lowMid: -1,
                    mid: 2.5,
                    highMid: 2,
                    high: 1
                },
                description: 'Intimate, clear single voice with warmth'
            },
            roundtable: {
                name: 'Roundtable (4+ Speakers)',
                targetLUFS: -16,
                voiceClarity: 3.5,
                deessing: 7,
                breathRemoval: 6,
                roomTone: 7,
                compression: 7,
                eq: {
                    bass: -2,
                    lowMid: -1.5,
                    mid: 3,
                    highMid: 2,
                    high: 1.5
                },
                description: 'Maximum clarity for distinguishing multiple speakers'
            },
            storytelling: {
                name: 'Storytelling',
                targetLUFS: -18,
                voiceClarity: 2,
                deessing: 4,
                breathRemoval: 3,
                roomTone: 4,
                compression: 4,
                eq: {
                    bass: 1,
                    lowMid: 0.5,
                    mid: 1.5,
                    highMid: 1,
                    high: 0.5
                },
                description: 'Natural, dynamic presentation with emotional range'
            },
            videocast: {
                name: 'Video Podcast (YouTube)',
                targetLUFS: -14,
                voiceClarity: 3,
                deessing: 6,
                breathRemoval: 5,
                roomTone: 6,
                compression: 6,
                eq: {
                    bass: -0.5,
                    lowMid: -1,
                    mid: 2.5,
                    highMid: 2,
                    high: 1.5
                },
                description: 'Optimized for YouTube audio codec'
            }
        };
    }

    // Voice clarity enhancement (2-3kHz boost for intelligibility)
    createVoiceClarityFilter(amount) {
        const clarityFilter = this.audioContext.createBiquadFilter();
        clarityFilter.type = 'peaking';
        clarityFilter.frequency.value = 2500; // Sweet spot for voice intelligibility
        clarityFilter.Q.value = 1.2; // Focused boost
        clarityFilter.gain.value = amount;

        console.log(`✅ Voice clarity filter: +${amount.toFixed(1)} dB @ 2.5kHz`);
        return clarityFilter;
    }

    // De-esser (reduce harsh "S" sounds at 6-8kHz)
    createDeesser(intensity) {
        // Dual-band de-essing for better sibilance control
        const deesser1 = this.audioContext.createBiquadFilter();
        deesser1.type = 'peaking';
        deesser1.frequency.value = 6500; // Lower sibilance range
        deesser1.Q.value = 3.0; // Very narrow
        deesser1.gain.value = -intensity * 0.6;

        const deesser2 = this.audioContext.createBiquadFilter();
        deesser2.type = 'peaking';
        deesser2.frequency.value = 8000; // Upper sibilance range
        deesser2.Q.value = 2.5;
        deesser2.gain.value = -intensity * 0.4;

        deesser1.connect(deesser2);

        console.log(`✅ De-esser: -${intensity.toFixed(1)} dB @ 6.5kHz & 8kHz`);
        return { input: deesser1, output: deesser2 };
    }

    // Breath removal (sophisticated gate with envelope follower)
    createBreathGate(sensitivity) {
        const gate = this.audioContext.createDynamicsCompressor();

        // Calculate threshold based on sensitivity (0-10 scale)
        const threshold = -65 + (sensitivity * 2); // -65 to -45 dB range

        gate.threshold.value = threshold;
        gate.ratio.value = 20; // High ratio = gate behavior
        gate.attack.value = 0.001; // Very fast attack
        gate.release.value = 0.05; // Quick release for breaths
        gate.knee.value = 5; // Slight softness

        console.log(`✅ Breath gate: threshold ${threshold.toFixed(0)} dB`);
        return gate;
    }

    // Room tone / background noise reduction
    createNoiseGate(amount) {
        const noiseGate = this.audioContext.createDynamicsCompressor();

        // More aggressive than breath gate
        const threshold = -55 + (amount * 1.5); // -55 to -40 dB

        noiseGate.threshold.value = threshold;
        noiseGate.ratio.value = 20;
        noiseGate.attack.value = 0.001;
        noiseGate.release.value = 0.1;
        noiseGate.knee.value = 10;

        // Add high-pass to reduce rumble
        const hpFilter = this.audioContext.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = 80; // Remove sub-bass rumble
        hpFilter.Q.value = 0.7;

        hpFilter.connect(noiseGate);

        console.log(`✅ Noise gate: threshold ${threshold.toFixed(0)} dB, HPF @ 80Hz`);
        return { input: hpFilter, output: noiseGate };
    }

    // Proximity effect reduction (reduce excessive bass from close mic)
    createProximityFilter() {
        const proximityEQ = this.audioContext.createBiquadFilter();
        proximityEQ.type = 'highpass';
        proximityEQ.frequency.value = 120; // Reduce proximity bass
        proximityEQ.Q.value = 0.7;

        console.log('✅ Proximity effect filter: HPF @ 120Hz');
        return proximityEQ;
    }

    // Plosive reducer (reduce "P" and "B" pops)
    createPlosiveReducer() {
        const plosiveFilter = this.audioContext.createBiquadFilter();
        plosiveFilter.type = 'highpass';
        plosiveFilter.frequency.value = 100;
        plosiveFilter.Q.value = 1.0;

        const plosiveCompressor = this.audioContext.createDynamicsCompressor();
        plosiveCompressor.threshold.value = -30;
        plosiveCompressor.ratio.value = 10;
        plosiveCompressor.attack.value = 0.0001; // Ultra-fast
        plosiveCompressor.release.value = 0.05;

        plosiveFilter.connect(plosiveCompressor);

        console.log('✅ Plosive reducer: HPF + fast compressor');
        return { input: plosiveFilter, output: plosiveCompressor };
    }

    // Create complete podcast processing chain
    createPodcastChain(settings) {
        const chain = {};

        // 1. Proximity effect reduction
        chain.proximityFilter = this.createProximityFilter();

        // 2. Plosive reduction
        const plosiveReducer = this.createPlosiveReducer();
        chain.plosiveReducer = plosiveReducer;

        // 3. Room tone / noise gate
        const noiseGate = this.createNoiseGate(settings.roomTone || 5);
        chain.noiseGate = noiseGate;

        // 4. Breath removal gate
        chain.breathGate = this.createBreathGate(settings.breathRemoval || 4);

        // 5. Voice clarity boost
        chain.voiceClarity = this.createVoiceClarityFilter(settings.voiceClarity || 2.5);

        // 6. De-esser
        const deesser = this.createDeesser(settings.deessing || 5);
        chain.deesser = deesser;

        // 7. EQ for tonal balance
        chain.eq = this.createPodcastEQ(settings.eq || {});

        // 8. Compression for consistency
        chain.compressor = this.createPodcastCompressor(settings.compression || 6);

        // Connect the chain
        chain.proximityFilter.connect(plosiveReducer.input);
        plosiveReducer.output.connect(noiseGate.input);
        noiseGate.output.connect(chain.breathGate);
        chain.breathGate.connect(chain.voiceClarity);
        chain.voiceClarity.connect(deesser.input);
        deesser.output.connect(chain.eq.input);
        chain.eq.output.connect(chain.compressor);

        console.log('✅ Complete podcast processing chain created');
        return {
            input: chain.proximityFilter,
            output: chain.compressor,
            nodes: chain
        };
    }

    // Podcast-optimized EQ
    createPodcastEQ(eqSettings) {
        const bass = this.audioContext.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 120;
        bass.gain.value = eqSettings.bass || -1;

        const lowMid = this.audioContext.createBiquadFilter();
        lowMid.type = 'peaking';
        lowMid.frequency.value = 300;
        lowMid.Q.value = 0.7;
        lowMid.gain.value = eqSettings.lowMid || -0.5;

        const mid = this.audioContext.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.value = 2000;
        mid.Q.value = 0.7;
        mid.gain.value = eqSettings.mid || 2.5;

        const highMid = this.audioContext.createBiquadFilter();
        highMid.type = 'peaking';
        highMid.frequency.value = 4000;
        highMid.Q.value = 0.7;
        highMid.gain.value = eqSettings.highMid || 1.5;

        const high = this.audioContext.createBiquadFilter();
        high.type = 'highshelf';
        high.frequency.value = 8000;
        high.gain.value = eqSettings.high || 0.5;

        // Connect EQ chain
        bass.connect(lowMid);
        lowMid.connect(mid);
        mid.connect(highMid);
        highMid.connect(high);

        console.log('✅ Podcast EQ chain created');
        return { input: bass, output: high };
    }

    // Podcast-optimized compression
    createPodcastCompressor(intensity) {
        const compressor = this.audioContext.createDynamicsCompressor();

        compressor.threshold.value = -24;
        compressor.ratio.value = 1 + (intensity / 2); // 1.5:1 to 6:1
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        compressor.knee.value = 30; // Soft knee for natural sound

        console.log(`✅ Podcast compressor: ${compressor.ratio.value.toFixed(1)}:1 ratio`);
        return compressor;
    }

    // Auto-detect speakers in podcast
    async detectSpeakers(audioBuffer) {
        console.log('🎤 Analyzing podcast for multiple speakers...');

        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const windowSize = Math.floor(sampleRate * 0.5); // 500ms analysis windows

        const segments = [];
        let currentSegment = null;

        // Analyze in windows
        for (let i = 0; i < channelData.length; i += Math.floor(windowSize / 2)) {
            const window = channelData.slice(i, Math.min(i + windowSize, channelData.length));

            // Calculate RMS energy
            let sumSquares = 0;
            for (let j = 0; j < window.length; j++) {
                sumSquares += window[j] * window[j];
            }
            const rms = Math.sqrt(sumSquares / window.length);
            const rmsDB = 20 * Math.log10(rms + 0.0001); // Avoid log(0)

            // Voice activity detection (speech above -40dB)
            const isSpeaking = rmsDB > -40;

            if (isSpeaking) {
                if (!currentSegment) {
                    // Start new speaking segment
                    currentSegment = {
                        start: i / sampleRate,
                        level: rmsDB,
                        samples: 1,
                        peakLevel: rmsDB
                    };
                } else {
                    // Continue segment
                    currentSegment.samples++;
                    currentSegment.level = (currentSegment.level * (currentSegment.samples - 1) + rmsDB) / currentSegment.samples;
                    currentSegment.peakLevel = Math.max(currentSegment.peakLevel, rmsDB);
                }
            } else if (currentSegment) {
                // End of speaking segment
                currentSegment.end = i / sampleRate;
                currentSegment.duration = currentSegment.end - currentSegment.start;

                // Only count segments longer than 0.5s
                if (currentSegment.duration > 0.5) {
                    segments.push(currentSegment);
                }
                currentSegment = null;
            }
        }

        // Group segments into speaker identities
        const speakers = this.groupSpeakersByLevel(segments);
        this.detectedSpeakers = speakers;

        console.log(`✅ Detected ${speakers.length} potential speaker(s)`);
        for (let i = 0; i < speakers.length; i++) {
            console.log(`   Speaker ${i + 1}: ${speakers[i].segments.length} segments, avg level: ${speakers[i].avgLevel.toFixed(1)} dB`);
        }

        return speakers;
    }

    // Group speaking segments by volume level to identify speakers
    groupSpeakersByLevel(segments) {
        const groups = [];
        const tolerance = 4; // dB tolerance for same speaker

        for (const segment of segments) {
            let found = false;

            for (const group of groups) {
                // Check if this segment belongs to existing group
                if (Math.abs(group.avgLevel - segment.level) < tolerance) {
                    group.segments.push(segment);
                    // Recalculate average
                    group.avgLevel = group.segments.reduce((sum, s) => sum + s.level, 0) / group.segments.length;
                    group.totalDuration += segment.duration;
                    found = true;
                    break;
                }
            }

            if (!found) {
                // Create new speaker group
                groups.push({
                    id: groups.length + 1,
                    avgLevel: segment.level,
                    segments: [segment],
                    totalDuration: segment.duration
                });
            }
        }

        // Sort by total speaking time (most active speaker first)
        groups.sort((a, b) => b.totalDuration - a.totalDuration);

        return groups;
    }

    // Apply podcast preset
    applyPodcastPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) {
            console.warn(`Unknown preset: ${presetName}`);
            return null;
        }

        console.log(`🎙️ Applying podcast preset: ${preset.name}`);
        const chain = this.createPodcastChain(preset);

        return {
            chain: chain,
            settings: preset,
            name: preset.name,
            description: preset.description
        };
    }

    // Check podcast platform compliance
    checkPodcastCompliance(lufs, truePeak, dynamicRange) {
        const platforms = {
            spotify: {
                name: 'Spotify',
                targetLUFS: -14,
                maxPeak: -1,
                minDR: 6,
                maxDR: 18
            },
            apple: {
                name: 'Apple Podcasts',
                targetLUFS: -16,
                maxPeak: -1,
                minDR: 8,
                maxDR: 20
            },
            youtube: {
                name: 'YouTube',
                targetLUFS: -14,
                maxPeak: -1,
                minDR: 6,
                maxDR: 16
            },
            audible: {
                name: 'Audible',
                targetLUFS: -18,
                maxPeak: -3,
                minDR: 10,
                maxDR: 25
            },
            anchor: {
                name: 'Anchor/Spotify for Podcasters',
                targetLUFS: -16,
                maxPeak: -1,
                minDR: 8,
                maxDR: 18
            }
        };

        const results = {};

        for (const [key, platform] of Object.entries(platforms)) {
            const lufsDiff = Math.abs(lufs - platform.targetLUFS);
            const peakOK = truePeak <= platform.maxPeak;
            const drOK = dynamicRange >= platform.minDR && dynamicRange <= platform.maxDR;

            const compliant = lufsDiff <= 2 && peakOK && drOK;

            let issues = [];
            if (lufsDiff > 2) {
                issues.push(`Loudness ${lufsDiff.toFixed(1)} dB from target`);
            }
            if (!peakOK) {
                issues.push(`True peak exceeds ${platform.maxPeak} dBTP`);
            }
            if (!drOK) {
                if (dynamicRange < platform.minDR) {
                    issues.push(`Over-compressed (DR: ${dynamicRange.toFixed(1)} dB)`);
                } else {
                    issues.push(`Too dynamic (DR: ${dynamicRange.toFixed(1)} dB)`);
                }
            }

            results[key] = {
                name: platform.name,
                compliant: compliant,
                targetLUFS: platform.targetLUFS,
                currentLUFS: lufs,
                lufsDiff: lufsDiff.toFixed(1),
                peakOK: peakOK,
                drOK: drOK,
                issues: issues,
                recommendation: this.getComplianceRecommendation(compliant, issues)
            };
        }

        return results;
    }

    // Get recommendation based on compliance
    getComplianceRecommendation(compliant, issues) {
        if (compliant) {
            return '✅ Perfect - ready to publish';
        } else if (issues.length === 1) {
            return `🟡 ${issues[0]} - minor adjustment needed`;
        } else {
            return `🔴 ${issues.length} issues - review settings`;
        }
    }

    // Get all available presets
    getPresets() {
        return Object.keys(this.presets).map(key => ({
            id: key,
            name: this.presets[key].name,
            description: this.presets[key].description,
            targetLUFS: this.presets[key].targetLUFS
        }));
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.PodcastMasteringEngine = PodcastMasteringEngine;
}
