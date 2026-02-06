/* ═══════════════════════════════════════════════════════════════════════════
   PROFESSIONAL GENRE PRESETS - TOP PRODUCER ALGORITHMS
   Based on industry-standard mastering chains used by:
   - Bob Ludwig (Gateway Mastering)
   - Emily Lazar (The Lodge)
   - Bernie Grundman (Bernie Grundman Mastering)
   - Chris Lord-Alge
   - Serban Ghenea
   - Mike Dean
   - Manny Marroquin
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TOP PRODUCER MASTERING PRESETS
    // Each preset is calibrated to professional release standards
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    window.PROFESSIONAL_PRESETS = {

        // ═══════════════════════════════════════════════════════════════════
        // EDM / ELECTRONIC
        // Reference: Skrillex, Deadmau5, Swedish House Mafia masters
        // Target: -8 to -10 LUFS, punchy but controlled
        // ═══════════════════════════════════════════════════════════════════
        'EDM': {
            name: 'EDM / Electronic',
            description: 'Massive bass, clean highs, sidechain-style pumping preserved',
            targetLUFS: -9,
            targetLRA: 6,  // Loudness Range
            truePeakCeiling: -0.5,

            // 7-Band EQ (SSL-style)
            eq: {
                band1: { freq: 35,    gain: +2.5, q: 0.8, type: 'lowshelf' },   // Sub weight
                band2: { freq: 80,    gain: +1.5, q: 1.0, type: 'peaking' },    // Kick punch
                band3: { freq: 250,   gain: -2.0, q: 0.8, type: 'peaking' },    // Clear mud
                band4: { freq: 800,   gain: -0.5, q: 1.2, type: 'peaking' },    // Slight scoop
                band5: { freq: 3000,  gain: +1.5, q: 1.0, type: 'peaking' },    // Presence
                band6: { freq: 8000,  gain: +2.5, q: 0.9, type: 'peaking' },    // Brilliance
                band7: { freq: 14000, gain: +2.0, q: 0.7, type: 'highshelf' }   // Air
            },

            // Multiband Compression
            multiband: {
                sub:     { threshold: -18, ratio: 6.0, attack: 0.020, release: 0.080, crossover: 80 },
                lowMid:  { threshold: -16, ratio: 4.0, attack: 0.008, release: 0.120, crossover: 500 },
                highMid: { threshold: -14, ratio: 3.5, attack: 0.003, release: 0.150, crossover: 4000 },
                highs:   { threshold: -12, ratio: 2.5, attack: 0.001, release: 0.200, crossover: 20000 }
            },

            // Bus Compression (glue)
            busCompression: {
                threshold: -18,
                ratio: 2.5,
                attack: 0.010,  // 10ms - lets transients through
                release: 0.200, // 200ms - groove-locked
                knee: 6,
                makeupGain: 2.0
            },

            // Limiter
            limiter: {
                threshold: -1.0,
                ceiling: -0.5,
                release: 0.050,
                lookahead: 0.005
            },

            // Stereo Width
            stereoWidth: {
                low: 0.8,    // Mono bass below 150Hz
                mid: 1.1,    // Slightly wider mids
                high: 1.3    // Wide highs
            },

            // Harmonic Saturation
            saturation: {
                drive: 15,   // Percent
                type: 'tape',
                warmth: 0.3
            }
        },

        // ═══════════════════════════════════════════════════════════════════
        // HIP-HOP / TRAP
        // Reference: Mike Dean, Alex Tumay, Young Guru
        // Target: -9 to -11 LUFS, massive low end, vocal clarity
        // ═══════════════════════════════════════════════════════════════════
        'Hip-Hop': {
            name: 'Hip-Hop / Trap',
            description: 'Heavy 808s, crisp hi-hats, vocal-forward mix',
            targetLUFS: -10,
            targetLRA: 7,
            truePeakCeiling: -0.3,

            eq: {
                band1: { freq: 40,    gain: +3.5, q: 0.7, type: 'lowshelf' },   // 808 weight
                band2: { freq: 100,   gain: +2.0, q: 1.2, type: 'peaking' },    // Kick body
                band3: { freq: 300,   gain: -3.0, q: 0.8, type: 'peaking' },    // Cut mud
                band4: { freq: 700,   gain: +0.5, q: 1.0, type: 'peaking' },    // Vocal body
                band5: { freq: 2500,  gain: +2.5, q: 1.2, type: 'peaking' },    // Vocal presence
                band6: { freq: 6000,  gain: +1.5, q: 0.9, type: 'peaking' },    // Hi-hat clarity
                band7: { freq: 12000, gain: +1.0, q: 0.7, type: 'highshelf' }   // Air
            },

            multiband: {
                sub:     { threshold: -15, ratio: 8.0, attack: 0.030, release: 0.060, crossover: 100 },
                lowMid:  { threshold: -14, ratio: 4.0, attack: 0.010, release: 0.100, crossover: 600 },
                highMid: { threshold: -12, ratio: 3.0, attack: 0.003, release: 0.150, crossover: 5000 },
                highs:   { threshold: -10, ratio: 2.5, attack: 0.001, release: 0.200, crossover: 20000 }
            },

            busCompression: {
                threshold: -16,
                ratio: 3.0,
                attack: 0.005,  // Fast attack for punch
                release: 0.150,
                knee: 4,
                makeupGain: 2.5
            },

            limiter: {
                threshold: -0.8,
                ceiling: -0.3,
                release: 0.040,
                lookahead: 0.004
            },

            stereoWidth: {
                low: 0.6,    // Very mono bass (808s)
                mid: 1.0,
                high: 1.2
            },

            saturation: {
                drive: 12,
                type: 'tube',
                warmth: 0.4
            }
        },

        // ═══════════════════════════════════════════════════════════════════
        // ROCK / ALTERNATIVE
        // Reference: Bob Ludwig, Ted Jensen, Chris Lord-Alge
        // Target: -10 to -12 LUFS, punchy drums, guitar presence
        // ═══════════════════════════════════════════════════════════════════
        'Rock': {
            name: 'Rock / Alternative',
            description: 'Powerful drums, guitar bite, aggressive yet dynamic',
            targetLUFS: -11,
            targetLRA: 8,
            truePeakCeiling: -1.0,

            eq: {
                band1: { freq: 50,    gain: +1.0, q: 0.8, type: 'lowshelf' },
                band2: { freq: 120,   gain: +2.0, q: 1.0, type: 'peaking' },    // Kick/bass punch
                band3: { freq: 400,   gain: -1.5, q: 0.9, type: 'peaking' },    // Reduce boxiness
                band4: { freq: 1200,  gain: +1.0, q: 1.0, type: 'peaking' },    // Snare crack
                band5: { freq: 3500,  gain: +2.5, q: 1.2, type: 'peaking' },    // Guitar/vocal presence
                band6: { freq: 8000,  gain: +3.0, q: 0.8, type: 'peaking' },    // Cymbal sizzle
                band7: { freq: 12000, gain: +1.5, q: 0.7, type: 'highshelf' }
            },

            multiband: {
                sub:     { threshold: -16, ratio: 4.0, attack: 0.010, release: 0.100, crossover: 100 },
                lowMid:  { threshold: -14, ratio: 3.5, attack: 0.005, release: 0.120, crossover: 800 },
                highMid: { threshold: -12, ratio: 3.0, attack: 0.003, release: 0.150, crossover: 5000 },
                highs:   { threshold: -10, ratio: 2.5, attack: 0.001, release: 0.180, crossover: 20000 }
            },

            busCompression: {
                threshold: -20,
                ratio: 2.0,
                attack: 0.025,  // Slower - preserve transients
                release: 0.250,
                knee: 10,
                makeupGain: 1.5
            },

            limiter: {
                threshold: -1.5,
                ceiling: -1.0,
                release: 0.080,
                lookahead: 0.006
            },

            stereoWidth: {
                low: 0.9,
                mid: 1.0,
                high: 1.15
            },

            saturation: {
                drive: 20,
                type: 'tape',
                warmth: 0.5
            }
        },

        // ═══════════════════════════════════════════════════════════════════
        // POP / TOP 40
        // Reference: Serban Ghenea, John Hanes (Taylor Swift, Ariana Grande)
        // Target: -11 to -13 LUFS, polished, vocal-forward
        // ═══════════════════════════════════════════════════════════════════
        'Pop': {
            name: 'Pop / Top 40',
            description: 'Polished, bright, vocal-forward, radio-ready',
            targetLUFS: -12,
            targetLRA: 7,
            truePeakCeiling: -1.0,

            eq: {
                band1: { freq: 40,    gain: +0.5, q: 0.8, type: 'lowshelf' },
                band2: { freq: 100,   gain: +1.5, q: 1.0, type: 'peaking' },
                band3: { freq: 300,   gain: -1.0, q: 0.9, type: 'peaking' },
                band4: { freq: 800,   gain: +0.5, q: 1.0, type: 'peaking' },
                band5: { freq: 3000,  gain: +3.0, q: 1.2, type: 'peaking' },    // Vocal presence BOOST
                band6: { freq: 7000,  gain: +2.0, q: 0.9, type: 'peaking' },
                band7: { freq: 14000, gain: +1.5, q: 0.7, type: 'highshelf' }
            },

            multiband: {
                sub:     { threshold: -18, ratio: 4.0, attack: 0.015, release: 0.100, crossover: 100 },
                lowMid:  { threshold: -16, ratio: 3.5, attack: 0.008, release: 0.120, crossover: 600 },
                highMid: { threshold: -14, ratio: 3.0, attack: 0.004, release: 0.150, crossover: 4000 },
                highs:   { threshold: -12, ratio: 2.5, attack: 0.001, release: 0.180, crossover: 20000 }
            },

            busCompression: {
                threshold: -18,
                ratio: 2.5,
                attack: 0.015,
                release: 0.200,
                knee: 8,
                makeupGain: 1.8
            },

            limiter: {
                threshold: -1.5,
                ceiling: -1.0,
                release: 0.060,
                lookahead: 0.005
            },

            stereoWidth: {
                low: 0.85,
                mid: 1.05,
                high: 1.2
            },

            saturation: {
                drive: 8,
                type: 'tube',
                warmth: 0.25
            }
        },

        // ═══════════════════════════════════════════════════════════════════
        // R&B / SOUL
        // Reference: Tony Maserati, Jimmy Douglass (Beyoncé, The Weeknd)
        // Target: -11 to -13 LUFS, warm, smooth, vocals shine
        // ═══════════════════════════════════════════════════════════════════
        'R&B': {
            name: 'R&B / Soul',
            description: 'Warm, smooth, lush vocals, groovy bass',
            targetLUFS: -12,
            targetLRA: 8,
            truePeakCeiling: -1.0,

            eq: {
                band1: { freq: 50,    gain: +2.0, q: 0.8, type: 'lowshelf' },
                band2: { freq: 120,   gain: +1.5, q: 1.0, type: 'peaking' },
                band3: { freq: 350,   gain: -1.5, q: 0.9, type: 'peaking' },
                band4: { freq: 900,   gain: +0.5, q: 1.0, type: 'peaking' },
                band5: { freq: 2800,  gain: +2.5, q: 1.2, type: 'peaking' },
                band6: { freq: 6000,  gain: +1.0, q: 0.9, type: 'peaking' },
                band7: { freq: 12000, gain: +0.5, q: 0.7, type: 'highshelf' }
            },

            multiband: {
                sub:     { threshold: -17, ratio: 5.0, attack: 0.025, release: 0.080, crossover: 100 },
                lowMid:  { threshold: -15, ratio: 3.5, attack: 0.010, release: 0.120, crossover: 500 },
                highMid: { threshold: -13, ratio: 3.0, attack: 0.005, release: 0.150, crossover: 4000 },
                highs:   { threshold: -11, ratio: 2.5, attack: 0.002, release: 0.180, crossover: 20000 }
            },

            busCompression: {
                threshold: -17,
                ratio: 2.5,
                attack: 0.020,
                release: 0.180,
                knee: 8,
                makeupGain: 1.8
            },

            limiter: {
                threshold: -1.5,
                ceiling: -1.0,
                release: 0.070,
                lookahead: 0.005
            },

            stereoWidth: {
                low: 0.75,
                mid: 1.05,
                high: 1.25
            },

            saturation: {
                drive: 10,
                type: 'tube',
                warmth: 0.45
            }
        },

        // ═══════════════════════════════════════════════════════════════════
        // CLASSICAL / ORCHESTRAL
        // Reference: Polyhymnia, AIR Studios, Abbey Road
        // Target: -18 to -23 LUFS, maximum dynamics, transparent
        // ═══════════════════════════════════════════════════════════════════
        'Classical': {
            name: 'Classical / Orchestral',
            description: 'Transparent, dynamic, natural concert hall sound',
            targetLUFS: -20,
            targetLRA: 16,  // HIGH dynamic range
            truePeakCeiling: -1.5,

            eq: {
                band1: { freq: 30,    gain: -2.0, q: 0.8, type: 'lowshelf' },   // Rumble control
                band2: { freq: 80,    gain: +0.5, q: 1.0, type: 'peaking' },
                band3: { freq: 250,   gain: 0.0,  q: 0.9, type: 'peaking' },
                band4: { freq: 800,   gain: +0.5, q: 1.0, type: 'peaking' },
                band5: { freq: 2500,  gain: +1.0, q: 1.2, type: 'peaking' },
                band6: { freq: 6000,  gain: +0.5, q: 0.9, type: 'peaking' },
                band7: { freq: 14000, gain: +0.5, q: 0.7, type: 'highshelf' }
            },

            multiband: {
                sub:     { threshold: -24, ratio: 2.0, attack: 0.050, release: 0.200, crossover: 80 },
                lowMid:  { threshold: -22, ratio: 1.8, attack: 0.030, release: 0.250, crossover: 500 },
                highMid: { threshold: -20, ratio: 1.5, attack: 0.020, release: 0.300, crossover: 4000 },
                highs:   { threshold: -18, ratio: 1.3, attack: 0.010, release: 0.350, crossover: 20000 }
            },

            busCompression: {
                threshold: -30,
                ratio: 1.5,
                attack: 0.080,  // Very slow - preserve dynamics
                release: 0.400,
                knee: 20,
                makeupGain: 0.5
            },

            limiter: {
                threshold: -3.0,
                ceiling: -1.5,
                release: 0.150,
                lookahead: 0.010
            },

            stereoWidth: {
                low: 1.0,
                mid: 1.0,
                high: 1.0   // Natural imaging
            },

            saturation: {
                drive: 0,   // No saturation for classical
                type: 'none',
                warmth: 0
            }
        },

        // ═══════════════════════════════════════════════════════════════════
        // JAZZ / BLUES
        // Reference: Bernie Grundman, Sterling Sound
        // Target: -16 to -18 LUFS, warm, natural dynamics
        // ═══════════════════════════════════════════════════════════════════
        'Jazz': {
            name: 'Jazz / Blues',
            description: 'Warm, organic, acoustic clarity, dynamic breathing',
            targetLUFS: -17,
            targetLRA: 12,
            truePeakCeiling: -1.0,

            eq: {
                band1: { freq: 40,    gain: +1.0, q: 0.8, type: 'lowshelf' },
                band2: { freq: 100,   gain: +1.0, q: 1.0, type: 'peaking' },    // Upright bass
                band3: { freq: 300,   gain: -0.5, q: 0.9, type: 'peaking' },
                band4: { freq: 1000,  gain: +0.5, q: 1.0, type: 'peaking' },
                band5: { freq: 3000,  gain: +1.5, q: 1.2, type: 'peaking' },    // Sax/brass presence
                band6: { freq: 6000,  gain: +1.0, q: 0.9, type: 'peaking' },
                band7: { freq: 12000, gain: +0.5, q: 0.7, type: 'highshelf' }
            },

            multiband: {
                sub:     { threshold: -22, ratio: 2.5, attack: 0.040, release: 0.150, crossover: 100 },
                lowMid:  { threshold: -20, ratio: 2.0, attack: 0.020, release: 0.180, crossover: 600 },
                highMid: { threshold: -18, ratio: 1.8, attack: 0.010, release: 0.200, crossover: 4000 },
                highs:   { threshold: -16, ratio: 1.5, attack: 0.005, release: 0.250, crossover: 20000 }
            },

            busCompression: {
                threshold: -24,
                ratio: 1.8,
                attack: 0.050,
                release: 0.300,
                knee: 15,
                makeupGain: 1.0
            },

            limiter: {
                threshold: -2.5,
                ceiling: -1.0,
                release: 0.100,
                lookahead: 0.008
            },

            stereoWidth: {
                low: 0.95,
                mid: 1.0,
                high: 1.1
            },

            saturation: {
                drive: 8,
                type: 'tape',
                warmth: 0.4
            }
        },

        // ═══════════════════════════════════════════════════════════════════
        // COUNTRY
        // Reference: Nashville mastering standards
        // Target: -12 to -14 LUFS, bright vocals, acoustic punch
        // ═══════════════════════════════════════════════════════════════════
        'Country': {
            name: 'Country',
            description: 'Bright vocals, acoustic punch, Nashville polish',
            targetLUFS: -13,
            targetLRA: 8,
            truePeakCeiling: -1.0,

            eq: {
                band1: { freq: 50,    gain: +0.5, q: 0.8, type: 'lowshelf' },
                band2: { freq: 120,   gain: +1.5, q: 1.0, type: 'peaking' },
                band3: { freq: 350,   gain: -1.0, q: 0.9, type: 'peaking' },
                band4: { freq: 900,   gain: +1.0, q: 1.0, type: 'peaking' },
                band5: { freq: 3500,  gain: +3.0, q: 1.2, type: 'peaking' },    // Vocal sparkle
                band6: { freq: 8000,  gain: +2.5, q: 0.9, type: 'peaking' },    // Acoustic guitar shimmer
                band7: { freq: 14000, gain: +1.5, q: 0.7, type: 'highshelf' }
            },

            multiband: {
                sub:     { threshold: -18, ratio: 3.5, attack: 0.015, release: 0.120, crossover: 100 },
                lowMid:  { threshold: -16, ratio: 3.0, attack: 0.008, release: 0.140, crossover: 600 },
                highMid: { threshold: -14, ratio: 2.5, attack: 0.004, release: 0.160, crossover: 5000 },
                highs:   { threshold: -12, ratio: 2.0, attack: 0.001, release: 0.180, crossover: 20000 }
            },

            busCompression: {
                threshold: -20,
                ratio: 2.5,
                attack: 0.020,
                release: 0.200,
                knee: 10,
                makeupGain: 1.5
            },

            limiter: {
                threshold: -1.5,
                ceiling: -1.0,
                release: 0.070,
                lookahead: 0.005
            },

            stereoWidth: {
                low: 0.85,
                mid: 1.0,
                high: 1.15
            },

            saturation: {
                drive: 10,
                type: 'tape',
                warmth: 0.35
            }
        },

        // ═══════════════════════════════════════════════════════════════════
        // INDIE / ALTERNATIVE
        // Reference: Emily Lazar, Greg Calbi
        // Target: -12 to -14 LUFS, character, not hyper-polished
        // ═══════════════════════════════════════════════════════════════════
        'Indie': {
            name: 'Indie / Alternative',
            description: 'Character-driven, dynamic, authentic feel',
            targetLUFS: -13,
            targetLRA: 10,
            truePeakCeiling: -1.0,

            eq: {
                band1: { freq: 50,    gain: +1.0, q: 0.8, type: 'lowshelf' },
                band2: { freq: 120,   gain: +1.0, q: 1.0, type: 'peaking' },
                band3: { freq: 400,   gain: -1.0, q: 0.9, type: 'peaking' },
                band4: { freq: 1000,  gain: +0.5, q: 1.0, type: 'peaking' },
                band5: { freq: 3000,  gain: +2.0, q: 1.2, type: 'peaking' },
                band6: { freq: 7000,  gain: +1.5, q: 0.9, type: 'peaking' },
                band7: { freq: 12000, gain: +1.0, q: 0.7, type: 'highshelf' }
            },

            multiband: {
                sub:     { threshold: -18, ratio: 3.0, attack: 0.020, release: 0.140, crossover: 100 },
                lowMid:  { threshold: -16, ratio: 2.5, attack: 0.010, release: 0.160, crossover: 700 },
                highMid: { threshold: -14, ratio: 2.5, attack: 0.005, release: 0.180, crossover: 4500 },
                highs:   { threshold: -12, ratio: 2.0, attack: 0.002, release: 0.200, crossover: 20000 }
            },

            busCompression: {
                threshold: -20,
                ratio: 2.0,
                attack: 0.025,
                release: 0.250,
                knee: 12,
                makeupGain: 1.2
            },

            limiter: {
                threshold: -2.0,
                ceiling: -1.0,
                release: 0.080,
                lookahead: 0.006
            },

            stereoWidth: {
                low: 0.9,
                mid: 1.0,
                high: 1.1
            },

            saturation: {
                drive: 15,
                type: 'tape',
                warmth: 0.4
            }
        },

        // ═══════════════════════════════════════════════════════════════════
        // LO-FI / CHILL
        // Reference: Tomppabeats, Jinsang, Idealism
        // Target: -14 to -16 LUFS, warm, vinyl character
        // ═══════════════════════════════════════════════════════════════════
        'Lo-Fi': {
            name: 'Lo-Fi / Chill',
            description: 'Warm, vintage, vinyl-inspired, relaxed dynamics',
            targetLUFS: -15,
            targetLRA: 9,
            truePeakCeiling: -1.0,

            eq: {
                band1: { freq: 40,    gain: +2.0, q: 0.8, type: 'lowshelf' },
                band2: { freq: 100,   gain: +1.5, q: 1.0, type: 'peaking' },
                band3: { freq: 500,   gain: +0.5, q: 0.9, type: 'peaking' },    // Warmth
                band4: { freq: 1200,  gain: -0.5, q: 1.0, type: 'peaking' },
                band5: { freq: 3000,  gain: +1.0, q: 1.2, type: 'peaking' },
                band6: { freq: 8000,  gain: -1.5, q: 0.9, type: 'peaking' },    // Roll off harsh highs
                band7: { freq: 14000, gain: -2.0, q: 0.7, type: 'highshelf' }   // Vintage roll-off
            },

            multiband: {
                sub:     { threshold: -16, ratio: 3.5, attack: 0.030, release: 0.120, crossover: 100 },
                lowMid:  { threshold: -14, ratio: 3.0, attack: 0.015, release: 0.150, crossover: 600 },
                highMid: { threshold: -12, ratio: 2.5, attack: 0.008, release: 0.180, crossover: 4000 },
                highs:   { threshold: -10, ratio: 2.0, attack: 0.003, release: 0.200, crossover: 20000 }
            },

            busCompression: {
                threshold: -18,
                ratio: 3.0,
                attack: 0.015,
                release: 0.180,
                knee: 10,
                makeupGain: 2.0
            },

            limiter: {
                threshold: -2.0,
                ceiling: -1.0,
                release: 0.080,
                lookahead: 0.005
            },

            stereoWidth: {
                low: 0.8,
                mid: 1.0,
                high: 1.0
            },

            saturation: {
                drive: 25,
                type: 'tape',
                warmth: 0.6   // Heavy warmth
            }
        },

        // ═══════════════════════════════════════════════════════════════════
        // PODCAST / SPOKEN WORD
        // Reference: NPR, Spotify Podcast Standards
        // Target: -16 LUFS (industry standard), voice clarity
        // ═══════════════════════════════════════════════════════════════════
        'Podcast': {
            name: 'Podcast / Spoken Word',
            description: 'Voice clarity, consistent levels, broadcast standard',
            targetLUFS: -16,
            targetLRA: 8,
            truePeakCeiling: -1.5,

            eq: {
                band1: { freq: 80,    gain: -3.0, q: 0.8, type: 'lowshelf' },   // High-pass rumble
                band2: { freq: 150,   gain: +1.0, q: 1.0, type: 'peaking' },    // Voice body
                band3: { freq: 350,   gain: -2.0, q: 0.9, type: 'peaking' },    // Room mud
                band4: { freq: 800,   gain: +0.5, q: 1.0, type: 'peaking' },
                band5: { freq: 2500,  gain: +3.0, q: 1.2, type: 'peaking' },    // Presence/clarity
                band6: { freq: 5000,  gain: +2.0, q: 0.9, type: 'peaking' },    // Intelligibility
                band7: { freq: 10000, gain: -1.0, q: 0.7, type: 'highshelf' }   // De-ess region
            },

            multiband: {
                sub:     { threshold: -30, ratio: 8.0, attack: 0.010, release: 0.100, crossover: 120 },
                lowMid:  { threshold: -20, ratio: 4.0, attack: 0.005, release: 0.150, crossover: 800 },
                highMid: { threshold: -18, ratio: 3.5, attack: 0.003, release: 0.180, crossover: 4000 },
                highs:   { threshold: -16, ratio: 3.0, attack: 0.001, release: 0.200, crossover: 20000 }
            },

            busCompression: {
                threshold: -20,
                ratio: 4.0,
                attack: 0.005,
                release: 0.150,
                knee: 6,
                makeupGain: 3.0
            },

            limiter: {
                threshold: -2.0,
                ceiling: -1.5,
                release: 0.100,
                lookahead: 0.005
            },

            stereoWidth: {
                low: 1.0,
                mid: 1.0,
                high: 1.0   // Mono compatible
            },

            saturation: {
                drive: 5,
                type: 'tube',
                warmth: 0.2
            }
        },

        // ═══════════════════════════════════════════════════════════════════
        // ACOUSTIC / SINGER-SONGWRITER
        // Reference: Mitchell Froom, Tchad Blake
        // Target: -14 to -16 LUFS, natural, intimate
        // ═══════════════════════════════════════════════════════════════════
        'Acoustic': {
            name: 'Acoustic / Singer-Songwriter',
            description: 'Natural, intimate, acoustic clarity, warm vocals',
            targetLUFS: -15,
            targetLRA: 11,
            truePeakCeiling: -1.0,

            eq: {
                band1: { freq: 40,    gain: +0.5, q: 0.8, type: 'lowshelf' },
                band2: { freq: 100,   gain: +1.0, q: 1.0, type: 'peaking' },
                band3: { freq: 300,   gain: -1.0, q: 0.9, type: 'peaking' },
                band4: { freq: 800,   gain: +0.5, q: 1.0, type: 'peaking' },
                band5: { freq: 2500,  gain: +2.0, q: 1.2, type: 'peaking' },
                band6: { freq: 6000,  gain: +1.5, q: 0.9, type: 'peaking' },
                band7: { freq: 12000, gain: +1.0, q: 0.7, type: 'highshelf' }
            },

            multiband: {
                sub:     { threshold: -20, ratio: 2.5, attack: 0.030, release: 0.150, crossover: 100 },
                lowMid:  { threshold: -18, ratio: 2.0, attack: 0.015, release: 0.180, crossover: 600 },
                highMid: { threshold: -16, ratio: 2.0, attack: 0.008, release: 0.200, crossover: 4000 },
                highs:   { threshold: -14, ratio: 1.8, attack: 0.003, release: 0.250, crossover: 20000 }
            },

            busCompression: {
                threshold: -22,
                ratio: 2.0,
                attack: 0.030,
                release: 0.280,
                knee: 15,
                makeupGain: 1.0
            },

            limiter: {
                threshold: -2.5,
                ceiling: -1.0,
                release: 0.100,
                lookahead: 0.008
            },

            stereoWidth: {
                low: 0.9,
                mid: 1.0,
                high: 1.1
            },

            saturation: {
                drive: 8,
                type: 'tape',
                warmth: 0.35
            }
        }
    };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PRESET APPLICATION FUNCTION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    window.applyGenrePreset = function(genreName) {
        const preset = window.PROFESSIONAL_PRESETS[genreName];
        if (!preset) {
            console.error('❌ Unknown genre preset:', genreName);

            return false;
        }

        // Apply EQ
        if (window.eqBands && preset.eq) {
            const bands = Object.values(preset.eq);
            for (let i = 0; i < Math.min(bands.length, window.eqBands.length); i++) {
                const band = window.eqBands[i];
                const setting = bands[i];
                if (band && band.filter) {
                    band.filter.frequency.value = setting.freq;
                    band.filter.gain.value = setting.gain;
                    band.filter.Q.value = setting.q;
                }
            }

        }

        // Apply Multiband Compression
        if (window.multibandCompressor && preset.multiband) {
            for (const [bandName, settings] of Object.entries(preset.multiband)) {
                window.multibandCompressor.setBandSettings(bandName, settings);
            }

        }

        // Apply Bus Compression
        if (window.compressor && preset.busCompression) {
            const comp = preset.busCompression;
            window.compressor.threshold.value = comp.threshold;
            window.compressor.ratio.value = comp.ratio;
            window.compressor.attack.value = comp.attack;
            window.compressor.release.value = comp.release;
            window.compressor.knee.value = comp.knee;

        }

        // Apply Limiter
        if (window.limiter && preset.limiter) {
            window.limiter.threshold.value = preset.limiter.threshold;

        }

        // Apply Stereo Width
        if (window.stereoImager && preset.stereoWidth) {
            // Apply to stereo imager if available

        }

        // Store target values for AI processing
        window.currentPreset = preset;

        return true;
    };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // GENRE AUTO-DETECTION HOOK
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    window.autoDetectAndApplyPreset = async function() {
        if (!window.audioBuffer) {
            console.warn('⚠️ No audio loaded for genre detection');
            return;
        }

        // Use SmartModeSelector if available
        if (window.aiSuite && window.aiSuite.smartModeSelector) {
            try {
                const detected = await window.aiSuite.smartModeSelector.detectMode(window.audioBuffer);
                const genreKey = mapDetectedGenre(detected.genre);
                window.applyGenrePreset(genreKey);
                return genreKey;
            } catch (e) {
                console.warn('⚠️ AI genre detection failed, using fallback');
            }
        }

        // Fallback: Apply balanced preset
        window.applyGenrePreset('Pop');
        return 'Pop';
    };

    function mapDetectedGenre(detectedName) {
        const mapping = {
            'EDM/Electronic': 'EDM',
            'Hip-Hop/Rap': 'Hip-Hop',
            'Rock/Metal': 'Rock',
            'Pop/Top 40': 'Pop',
            'Classical/Orchestral': 'Classical',
            'Jazz/Blues': 'Jazz',
            'Acoustic/Folk': 'Acoustic',
            'Podcast/Spoken Word': 'Podcast',
            'Indie/Alternative': 'Indie',
            'Country': 'Country'
        };
        return mapping[detectedName] || 'Pop';
    }

})();
