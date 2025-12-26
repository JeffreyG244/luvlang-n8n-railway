/**
 * AI SAFETY GATES - Production Intelligence Safeguards
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Ensures AI mastering decisions are musical, safe, and professional:
 *
 * 1. Gain Ramping - Prevents digital transients (30ms exponential ramps)
 * 2. Damping Enforcement - 70% factor for musical spectral matching
 * 3. LUFS Safety - Genre targets + strict -1.0 dBTP ceiling
 *
 * Prevents: Clicks, pops, over-processing, clipping, unmusical AI decisions
 */

(function() {
    'use strict';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // GAIN RAMPING SAFETY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    class SafeGainRamper {
        /**
         * Apply gain change with exponential ramping to prevent clicks
         * @param {AudioParam} param - Audio parameter to ramp
         * @param {number} targetValue - Target value
         * @param {AudioContext} context - Audio context
         * @param {number} rampTimeMS - Ramp duration in milliseconds (default: 30ms)
         */
        static rampTo(param, targetValue, context, rampTimeMS = 30) {
            const now = context.currentTime;
            const rampTime = rampTimeMS / 1000; // Convert to seconds

            // Cancel any scheduled changes
            param.cancelScheduledValues(now);

            // Set current value explicitly
            param.setValueAtTime(param.value, now);

            // Exponential ramp to target (prevents zippering/clicks)
            // Use exponential for gain (human perception is logarithmic)
            // Clamp to safe range to avoid Math domain errors
            const safeTarget = Math.max(0.0001, targetValue);
            param.exponentialRampToValueAtTime(safeTarget, now + rampTime);

            console.log(`🎚️ Safe ramp: ${param.value.toFixed(4)} → ${targetValue.toFixed(4)} (${rampTimeMS}ms)`);
        }

        /**
         * Apply EQ gain change with safety ramping
         * @param {BiquadFilterNode} filter - EQ filter node
         * @param {number} targetGainDB - Target gain in dB
         * @param {AudioContext} context
         */
        static rampEQ(filter, targetGainDB, context) {
            this.rampTo(filter.gain, targetGainDB, context, 30);
        }

        /**
         * Apply compression threshold change with safety
         * @param {DynamicsCompressorNode} compressor
         * @param {number} targetThreshold - Target threshold in dB
         * @param {AudioContext} context
         */
        static rampCompression(compressor, targetThreshold, context) {
            this.rampTo(compressor.threshold, targetThreshold, context, 50);
        }

        /**
         * Apply master gain change with safety
         * @param {GainNode} gainNode
         * @param {number} targetGain - Target linear gain
         * @param {AudioContext} context
         */
        static rampMasterGain(gainNode, targetGain, context) {
            this.rampTo(gainNode.gain, targetGain, context, 30);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DAMPING FACTOR ENFORCEMENT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    class DampingEnforcer {
        /**
         * Apply 70% damping to spectral difference
         * Prevents over-correction, ensures musical results
         *
         * @param {number} spectralDiff - Raw spectral difference in dB
         * @param {number} matchStrength - User match strength (0.0-1.0, default 0.7)
         * @param {number} maxAdjustment - Maximum allowed adjustment per band (default 5.0 dB)
         * @returns {number} Damped adjustment in dB
         */
        static applyDamping(spectralDiff, matchStrength = 0.7, maxAdjustment = 5.0) {
            const DAMPING_FACTOR = 0.30; // 70% smoothing = 30% of difference applied

            // Calculate damped movement
            let dampedMove = spectralDiff * DAMPING_FACTOR * matchStrength;

            // Apply safety limits
            dampedMove = Math.max(-maxAdjustment, Math.min(maxAdjustment, dampedMove));

            // Log extreme cases
            if (Math.abs(spectralDiff) > 10.0) {
                console.warn(`⚠️ Extreme spectral difference: ${spectralDiff.toFixed(1)} dB`);
                console.log(`   → Damped to: ${dampedMove.toFixed(1)} dB (safe)`);
            }

            return dampedMove;
        }

        /**
         * Apply damping to entire spectral match curve
         * @param {Array<number>} spectralDifferences - Array of dB differences per band
         * @param {number} matchStrength - Match strength
         * @returns {Array<number>} Damped adjustments
         */
        static applyDampingCurve(spectralDifferences, matchStrength = 0.7) {
            return spectralDifferences.map(diff =>
                this.applyDamping(diff, matchStrength, 5.0)
            );
        }

        /**
         * Validate damping is within musicality bounds
         * @param {Array<number>} adjustments - Proposed EQ adjustments
         * @returns {boolean} True if adjustments are musical
         */
        static validateMusicality(adjustments) {
            // Check for excessive moves
            const maxMove = Math.max(...adjustments.map(Math.abs));
            if (maxMove > 5.0) {
                console.error(`❌ Excessive EQ move: ${maxMove.toFixed(1)} dB`);
                return false;
            }

            // Check for erratic curve (too much variance)
            const variance = this.calculateVariance(adjustments);
            if (variance > 15.0) {
                console.warn(`⚠️ High EQ variance: ${variance.toFixed(1)} (may sound unnatural)`);
            }

            return true;
        }

        static calculateVariance(arr) {
            const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
            const squaredDiffs = arr.map(x => Math.pow(x - mean, 2));
            return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // LUFS TARGET SAFETY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    class LUFSSafetyGate {
        /**
         * Calculate safe makeup gain to reach LUFS target
         * Guarantees true-peak never exceeds -1.0 dBTP
         *
         * @param {number} currentLUFS - Current integrated loudness
         * @param {number} targetLUFS - Desired target loudness
         * @param {number} currentTruePeak - Current true-peak in dBTP
         * @param {number} ceilingDBTP - Absolute ceiling (default: -1.0)
         * @returns {object} { safeGainDB, willClip, warning }
         */
        static calculateSafeGain(currentLUFS, targetLUFS, currentTruePeak, ceilingDBTP = -1.0) {
            // Desired gain to reach target
            const desiredGainDB = targetLUFS - currentLUFS;

            // Predicted true-peak after gain applied
            const predictedPeak = currentTruePeak + desiredGainDB;

            // Check if we'll exceed ceiling
            const willClip = predictedPeak > ceilingDBTP;

            // Calculate safe gain (leave 0.5 dB headroom for safety)
            const headroom = 0.5;
            const maxAllowedGain = ceilingDBTP - currentTruePeak - headroom;

            // Use whichever is more conservative
            const safeGainDB = willClip
                ? Math.min(desiredGainDB, maxAllowedGain)
                : desiredGainDB;

            const warning = willClip
                ? `⚠️ LUFS target would clip! Reducing gain from ${desiredGainDB.toFixed(1)} to ${safeGainDB.toFixed(1)} dB`
                : null;

            if (warning) {
                console.warn(warning);
            }

            return {
                safeGainDB,
                desiredGainDB,
                willClip,
                predictedPeak,
                actualPeak: currentTruePeak + safeGainDB,
                warning
            };
        }

        /**
         * Validate genre-specific LUFS target
         * @param {string} genre - Detected genre
         * @param {number} targetLUFS - Proposed target
         * @returns {boolean} True if target is appropriate for genre
         */
        static validateGenreTarget(genre, targetLUFS) {
            const genreRanges = {
                'EDM': { min: -10, max: -6, ideal: -8 },
                'Hip-Hop': { min: -11, max: -7, ideal: -9 },
                'Pop': { min: -16, max: -12, ideal: -14 },
                'Rock': { min: -14, max: -10, ideal: -12 },
                'Classical': { min: -20, max: -14, ideal: -16 },
                'Jazz': { min: -20, max: -14, ideal: -16 },
                'Acoustic': { min: -20, max: -14, ideal: -16 }
            };

            const range = genreRanges[genre];
            if (!range) {
                console.warn(`⚠️ Unknown genre: ${genre}, using conservative target`);
                return targetLUFS >= -16 && targetLUFS <= -10;
            }

            const isValid = targetLUFS >= range.min && targetLUFS <= range.max;

            if (!isValid) {
                console.warn(`⚠️ Target ${targetLUFS} LUFS is outside safe range for ${genre}`);
                console.log(`   Recommended: ${range.min} to ${range.max} LUFS (ideal: ${range.ideal})`);
            }

            return isValid;
        }

        /**
         * Get safe LUFS target based on genre and current dynamics
         * @param {string} genre - Detected genre
         * @param {number} currentLRA - Current loudness range
         * @returns {number} Safe target LUFS
         */
        static getSafeTarget(genre, currentLRA) {
            const genreTargets = {
                'EDM': -8.0,
                'Hip-Hop': -9.0,
                'Pop': -14.0,
                'Rock': -12.0,
                'Classical': -16.0,
                'Jazz': -16.0,
                'Acoustic': -16.0
            };

            let target = genreTargets[genre] || -14.0;

            // Adjust for high dynamic content
            if (currentLRA > 15) {
                console.log(`📊 High dynamics detected (LRA: ${currentLRA}), using conservative target`);
                target = Math.min(target, -14.0); // Never exceed -14 LUFS for dynamic content
            }

            return target;
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // INTEGRATED AI SAFETY ORCHESTRATOR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    class AISafetyOrchestrator {
        /**
         * Apply AI mastering decisions with all safety gates
         * @param {object} decisions - AI mastering decisions
         * @param {object} nodes - Audio nodes (filters, compressor, etc.)
         * @param {AudioContext} context
         * @returns {object} Applied decisions with safety report
         */
        static applySafely(decisions, nodes, context) {
            const report = {
                eqChanges: [],
                compressionChanges: [],
                gainChanges: [],
                warnings: [],
                dampingApplied: false,
                clippingPrevented: false
            };

            // 1. Apply EQ changes with gain ramping
            if (decisions.eq && Array.isArray(decisions.eq)) {
                decisions.eq.forEach((change, index) => {
                    if (nodes.eqFilters && nodes.eqFilters[index]) {
                        const damped = DampingEnforcer.applyDamping(change, 0.7, 5.0);
                        SafeGainRamper.rampEQ(nodes.eqFilters[index], damped, context);
                        report.eqChanges.push({ band: index, original: change, applied: damped });

                        if (Math.abs(change - damped) > 0.1) {
                            report.dampingApplied = true;
                        }
                    }
                });
            }

            // 2. Apply compression with safety
            if (decisions.compression && nodes.compressor) {
                SafeGainRamper.rampCompression(
                    nodes.compressor,
                    decisions.compression.threshold,
                    context
                );
                report.compressionChanges.push({
                    threshold: decisions.compression.threshold,
                    ratio: decisions.compression.ratio
                });
            }

            // 3. Apply makeup gain with LUFS safety
            if (decisions.makeupGain && nodes.makeupGain) {
                const safetyResult = LUFSSafetyGate.calculateSafeGain(
                    decisions.currentLUFS,
                    decisions.targetLUFS,
                    decisions.currentTruePeak,
                    -1.0
                );

                const safeGainLinear = Math.pow(10, safetyResult.safeGainDB / 20);
                SafeGainRamper.rampMasterGain(nodes.makeupGain, safeGainLinear, context);

                report.gainChanges.push(safetyResult);

                if (safetyResult.willClip) {
                    report.clippingPrevented = true;
                    report.warnings.push(safetyResult.warning);
                }
            }

            // 4. Validate overall musicality
            if (decisions.eq && !DampingEnforcer.validateMusicality(decisions.eq)) {
                report.warnings.push('EQ curve may sound unnatural - consider reducing match strength');
            }

            // 5. Validate genre target
            if (decisions.genre && decisions.targetLUFS) {
                const validTarget = LUFSSafetyGate.validateGenreTarget(
                    decisions.genre,
                    decisions.targetLUFS
                );
                if (!validTarget) {
                    report.warnings.push(`Target LUFS may be inappropriate for ${decisions.genre}`);
                }
            }

            return report;
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // GLOBAL EXPORTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    window.SafeGainRamper = SafeGainRamper;
    window.DampingEnforcer = DampingEnforcer;
    window.LUFSSafetyGate = LUFSSafetyGate;
    window.AISafetyOrchestrator = AISafetyOrchestrator;

    console.log('✅ AI Safety Gates loaded');
    console.log('   ✓ Gain ramping (30ms exponential)');
    console.log('   ✓ Damping enforcement (70% factor)');
    console.log('   ✓ LUFS safety (-1.0 dBTP ceiling)');

})();
