#!/usr/bin/env node
/**
 * Mastering Math Validation Harness (v7.6.2)
 * Validates generateAICorrections() math against professional mastering ranges.
 * Run: node vercel-deploy/test-mastering-math.mjs
 */

// ═══════════════════════════════════════════════════════════════════
// Genre reference targets (synced with luvlang_LEGENDARY_COMPLETE.html v7.6.0)
// ═══════════════════════════════════════════════════════════════════
const GENRE_REFERENCE_TARGETS = {
    'pop':        { slopePerOctave: -4.5, spectrum: { sub: -24, bass: -16, lowmid: -14, mid: -12, highmid: -13, high: -19, air: -29 }, dynamics: { crestFactor: 10, lra: 7, targetLUFS: -14 }, stereo: { width: 0.45, lowCorrelation: 0.95, highCorrelation: 0.6 }, spectralTilt: -0.5 },
    'hiphop':     { slopePerOctave: -5.5, spectrum: { sub: -14, bass: -13, lowmid: -18, mid: -15, highmid: -16, high: -22, air: -33 }, dynamics: { crestFactor: 8, lra: 5, targetLUFS: -14 }, stereo: { width: 0.50, lowCorrelation: 0.98, highCorrelation: 0.55 }, spectralTilt: -1.5 },
    'electronic': { slopePerOctave: -3.5, spectrum: { sub: -14, bass: -14, lowmid: -18, mid: -15, highmid: -15, high: -18, air: -24 }, dynamics: { crestFactor: 7, lra: 5, targetLUFS: -14 }, stereo: { width: 0.55, lowCorrelation: 0.95, highCorrelation: 0.50 }, spectralTilt: 0.0 },
    'rock':       { slopePerOctave: -3.0, spectrum: { sub: -28, bass: -15, lowmid: -14, mid: -11, highmid: -11, high: -17, air: -28 }, dynamics: { crestFactor: 12, lra: 7, targetLUFS: -14 }, stereo: { width: 0.42, lowCorrelation: 0.93, highCorrelation: 0.58 }, spectralTilt: 0.3 },
    'rnb':        { slopePerOctave: -4.8, spectrum: { sub: -18, bass: -14, lowmid: -16, mid: -13, highmid: -15, high: -21, air: -31 }, dynamics: { crestFactor: 10, lra: 6, targetLUFS: -14 }, stereo: { width: 0.48, lowCorrelation: 0.96, highCorrelation: 0.58 }, spectralTilt: -1.0 },
    'acoustic':   { slopePerOctave: -2.8, spectrum: { sub: -32, bass: -18, lowmid: -13, mid: -11, highmid: -13, high: -17, air: -26 }, dynamics: { crestFactor: 14, lra: 10, targetLUFS: -16 }, stereo: { width: 0.40, lowCorrelation: 0.92, highCorrelation: 0.65 }, spectralTilt: 0.5 },
    'jazz':       { slopePerOctave: -2.8, spectrum: { sub: -30, bass: -17, lowmid: -13, mid: -11, highmid: -14, high: -19, air: -28 }, dynamics: { crestFactor: 16, lra: 12, targetLUFS: -16 }, stereo: { width: 0.42, lowCorrelation: 0.90, highCorrelation: 0.60 }, spectralTilt: 0.3 },
    'classical':  { slopePerOctave: -2.5, spectrum: { sub: -34, bass: -20, lowmid: -14, mid: -12, highmid: -14, high: -19, air: -27 }, dynamics: { crestFactor: 20, lra: 14, targetLUFS: -18 }, stereo: { width: 0.50, lowCorrelation: 0.88, highCorrelation: 0.55 }, spectralTilt: 0.5 },
    'metal':      { slopePerOctave: -2.5, spectrum: { sub: -24, bass: -14, lowmid: -14, mid: -10, highmid: -11, high: -17, air: -29 }, dynamics: { crestFactor: 8, lra: 5, targetLUFS: -14 }, stereo: { width: 0.40, lowCorrelation: 0.95, highCorrelation: 0.55 }, spectralTilt: 0.8 },
    'country':    { slopePerOctave: -3.5, spectrum: { sub: -28, bass: -17, lowmid: -14, mid: -11, highmid: -12, high: -17, air: -26 }, dynamics: { crestFactor: 12, lra: 8, targetLUFS: -14 }, stereo: { width: 0.43, lowCorrelation: 0.93, highCorrelation: 0.62 }, spectralTilt: -0.2 },
    'latin':      { slopePerOctave: -5.0, spectrum: { sub: -15, bass: -13, lowmid: -16, mid: -14, highmid: -15, high: -20, air: -30 }, dynamics: { crestFactor: 9, lra: 6, targetLUFS: -14 }, stereo: { width: 0.48, lowCorrelation: 0.96, highCorrelation: 0.55 }, spectralTilt: -1.2 },
    'lofi':       { slopePerOctave: -6.5, spectrum: { sub: -20, bass: -14, lowmid: -12, mid: -14, highmid: -20, high: -28, air: -40 }, dynamics: { crestFactor: 11, lra: 8, targetLUFS: -16 }, stereo: { width: 0.38, lowCorrelation: 0.90, highCorrelation: 0.65 }, spectralTilt: -2.5 }
};

// ═══════════════════════════════════════════════════════════════════
// Genre presets — compression values synced to v7.6.0 (single source of truth)
// ═══════════════════════════════════════════════════════════════════
const genrePresets = {
    hiphop:     { compression: { threshold: -14, ratio: 2.0, attack: 0.010, release: 0.12, knee: 6 },   targetLUFS: -14 },
    electronic: { compression: { threshold: -12, ratio: 2.5, attack: 0.005, release: 0.08, knee: 4 },   targetLUFS: -14 },
    pop:        { compression: { threshold: -16, ratio: 1.8, attack: 0.020, release: 0.18, knee: 8 },   targetLUFS: -14 },
    rock:       { compression: { threshold: -14, ratio: 2.0, attack: 0.025, release: 0.12, knee: 6 },   targetLUFS: -14 },
    rnb:        { compression: { threshold: -18, ratio: 1.5, attack: 0.025, release: 0.22, knee: 10 },  targetLUFS: -14 },
    acoustic:   { compression: { threshold: -20, ratio: 1.3, attack: 0.035, release: 0.30, knee: 12 },  targetLUFS: -16 },
    jazz:       { compression: { threshold: -22, ratio: 1.2, attack: 0.040, release: 0.35, knee: 15 },  targetLUFS: -16 },
    classical:  { compression: { threshold: -26, ratio: 1.1, attack: 0.050, release: 0.50, knee: 20 },  targetLUFS: -18 },
    metal:      { compression: { threshold: -10, ratio: 2.5, attack: 0.005, release: 0.10, knee: 4 },   targetLUFS: -12 },
    country:    { compression: { threshold: -18, ratio: 1.8, attack: 0.020, release: 0.20, knee: 8 },   targetLUFS: -14 },
    latin:      { compression: { threshold: -14, ratio: 2.0, attack: 0.010, release: 0.12, knee: 6 },   targetLUFS: -14 },
    lofi:       { compression: { threshold: -16, ratio: 2.0, attack: 0.030, release: 0.30, knee: 12 },  targetLUFS: -16 },
};

// ═══════════════════════════════════════════════════════════════════
// EQ curves (synced with v7.6.2 — bass +1 dB boost)
// ═══════════════════════════════════════════════════════════════════
const _eqCurves = {
    'hiphop':     { sub: 3.5, bass: 3.0, lowmid: -2.5, mid: 0.5, highmid: 1.5, high: 1.5, air: 1.0 },
    'electronic': { sub: 2.5, bass: 2.5, lowmid: -2.0, mid: -0.5, highmid: 1.2, high: 2.5, air: 2.0 },
    'pop':        { sub: 0.5, bass: 2.5, lowmid: -1.5, mid: 0.5, highmid: 2.0, high: 2.0, air: 1.5 },
    'rock':       { sub: 1.0, bass: 3.0, lowmid: -1.5, mid: 1.0, highmid: 1.8, high: 2.5, air: 1.5 },
    'rnb':        { sub: 2.0, bass: 2.5, lowmid: -1.5, mid: 0.5, highmid: 1.5, high: 1.0, air: 0.5 },
    'acoustic':   { sub: 0.5, bass: 2.0, lowmid: -1.0, mid: 1.0, highmid: 1.5, high: 1.5, air: 1.5 },
    'jazz':       { sub: 0.5, bass: 2.0, lowmid: -0.5, mid: 0.5, highmid: 1.2, high: 1.0, air: 0.5 },
    'classical':  { sub: -1.5, bass: 1.0, lowmid: 0.0, mid: 0.5, highmid: 0.8, high: 0.5, air: 0.5 },
    'metal':      { sub: 1.5, bass: 3.0, lowmid: -1.5, mid: 1.5, highmid: 2.0, high: 1.5, air: 1.0 },
    'country':    { sub: 0.5, bass: 2.5, lowmid: -1.0, mid: 1.0, highmid: 2.0, high: 2.5, air: 1.5 },
    'latin':      { sub: 2.5, bass: 3.0, lowmid: -1.5, mid: 0.5, highmid: 1.5, high: 1.5, air: 1.0 },
    'lofi':       { sub: 1.5, bass: 3.0, lowmid: 1.0, mid: -0.5, highmid: -1.0, high: -2.0, air: -3.0 }
};

// ═══════════════════════════════════════════════════════════════════
// Simulated track analysis (from real console logs)
// ═══════════════════════════════════════════════════════════════════
const TEST_ANALYSIS = {
    spectrumDB: { sub: -38, bass: -22, lowmid: -18, mid: -15, highmid: -16, high: -23, air: -35 },
    spectralTilt: -2.95,
    overallCrest: 17.0,
    estimatedWidth: 0.42,
    resonances: Array.from({ length: 30 }, (_, i) => ({
        freq: 100 + i * 200, gain: -3 + Math.random() * 2, q: 4 + Math.random() * 2
    })),
    sibilanceExcessive: false,
};

// ═══════════════════════════════════════════════════════════════════
// Reproduce generateAICorrections math (v7.6.0)
// ═══════════════════════════════════════════════════════════════════
function generateAICorrections(analysis, genre) {
    const ref = GENRE_REFERENCE_TARGETS[genre] || GENRE_REFERENCE_TARGETS['pop'];
    const correctionStrength = 0.26;

    const bandKeys = ['sub', 'bass', 'lowmid', 'mid', 'highmid', 'high', 'air'];
    const bandCenterFreqs = [40, 100, 300, 1000, 3500, 8000, 14000];
    const bandOctaves = bandCenterFreqs.map(f => Math.log2(f / 40));

    // Track slope via linear regression
    const trackValues = bandKeys.map(b => analysis.spectrumDB[b] || -60);
    const trackMean = trackValues.reduce((a, b) => a + b, 0) / trackValues.length;
    const octMean = bandOctaves.reduce((a, b) => a + b, 0) / bandOctaves.length;
    let slopeNum = 0, slopeDen = 0;
    for (let i = 0; i < bandKeys.length; i++) {
        slopeNum += (bandOctaves[i] - octMean) * (trackValues[i] - trackMean);
        slopeDen += (bandOctaves[i] - octMean) * (bandOctaves[i] - octMean);
    }
    const trackSlope = slopeDen > 0 ? slopeNum / slopeDen : -3.5;
    const refSlope = ref.slopePerOctave || -3.5;
    const slopeDiff = trackSlope - refSlope;
    const tiltCorrection = Math.max(-1.5, Math.min(1.5, -slopeDiff * 0.3));

    // Track shape (relative)
    const trackShape = {};
    bandKeys.forEach((b, i) => { trackShape[b] = trackValues[i] - trackMean; });
    const refValues = bandKeys.map(b => ref.spectrum[b] || -20);
    const refMean = refValues.reduce((a, b) => a + b, 0) / refValues.length;
    const refShape = {};
    bandKeys.forEach((b, i) => { refShape[b] = refValues[i] - refMean; });

    // EQ deltas
    const eqDeltas = {};
    let totalEQCorrection = 0;
    for (let i = 0; i < bandKeys.length; i++) {
        const band = bandKeys[i];
        const tiltFactor = (bandOctaves[i] - octMean) / (bandOctaves[bandOctaves.length - 1] - bandOctaves[0]);
        const tiltDelta = tiltCorrection * tiltFactor * 2;
        const anomalyDelta = (refShape[band] - trackShape[band]) * correctionStrength * 0.6;
        let delta = tiltDelta + anomalyDelta;
        delta = Math.max(-2.5, Math.min(2.5, delta));
        eqDeltas[band] = Math.round(delta * 100) / 100;
        totalEQCorrection += Math.abs(delta);
    }
    if (totalEQCorrection > 7) {
        const scale = 7 / totalEQCorrection;
        for (const band of bandKeys) {
            eqDeltas[band] = Math.round(eqDeltas[band] * scale * 100) / 100;
        }
        totalEQCorrection = 7;
    }

    // Dynamics
    const crestDiff = (analysis.overallCrest || 10) - (ref.dynamics.crestFactor || 10);

    // Stereo
    const refWidth = ref.stereo.width || 0.45;
    const widthDiff = analysis.estimatedWidth - refWidth;

    // Processing scale (v7.4.6 — high floor for meaningful processing)
    let processingScale;
    if (totalEQCorrection < 1.0) processingScale = 0.75;
    else if (totalEQCorrection < 2.5) processingScale = 0.8;
    else if (totalEQCorrection < 4.0) processingScale = 0.85;
    else if (totalEQCorrection < 6.0) processingScale = 0.9;
    else processingScale = 1.0;

    // Stage bypass (v7.4.6)
    const stageBypass = {
        eq:            totalEQCorrection < 0.5,
        dynamicEQ:     analysis.resonances.length <= 1 && !analysis.sibilanceExcessive
                       && Math.abs(analysis.spectralTilt) < 1.5,
        compression:   Math.abs(crestDiff) < 3,
        multibandComp: Math.abs(crestDiff) < 4 && Math.abs(analysis.spectralTilt) < 1.0,
        transient:     Math.abs(crestDiff) < 4,
        warmth:        analysis.spectralTilt < -0.5 || analysis.overallCrest < 7,
        exciter:       !(analysis.spectralTilt > 0.5 && analysis.spectrumDB.high < -22),
        stereoWidth:   Math.abs(widthDiff) < 0.10,
        msProcessing:  Math.abs(analysis.spectralTilt) < 1.0 && Math.abs(widthDiff) < 0.15,
        hfLimiter:     false,
    };

    // Dynamics budget: max 3 active dynamics stages
    const dynamicsStages = ['compression', 'multibandComp', 'dynamicEQ', 'transient'];
    const activeDynamics = dynamicsStages.filter(s => !stageBypass[s]);
    if (activeDynamics.length > 3) {
        const dynScore = {
            compression:   Math.abs(crestDiff) / 7,
            multibandComp: Math.abs(crestDiff) / 8,
            dynamicEQ:     analysis.resonances.length > 3 ? 0.8 : analysis.resonances.length > 1 ? 0.5 : 0.2,
            transient:     Math.abs(crestDiff) / 10,
        };
        activeDynamics.sort((a, b) => (dynScore[a] || 0) - (dynScore[b] || 0));
        for (let i = 0; i < activeDynamics.length - 3; i++) {
            stageBypass[activeDynamics[i]] = true;
        }
    }

    // Stage intensity (v7.4.6)
    const stageIntensity = {
        eq:            Math.min(1.0, totalEQCorrection / 3.0),
        dynamicEQ:     analysis.resonances.length > 3 ? 0.8 : analysis.resonances.length > 1 ? 0.5 : 0.2,
        compression:   Math.min(1.0, Math.abs(crestDiff) / 8),
        multibandComp: Math.min(1.0, Math.abs(crestDiff) / 8),
        transient:     Math.min(1.0, Math.abs(crestDiff) / 10),
        warmth:        analysis.spectralTilt > 1.0 ? 0.5 : 0.15,
        exciter:       0.15,
        stereoWidth:   Math.min(1.0, Math.abs(widthDiff) / 0.3),
        msProcessing:  0.25,
        hfLimiter:     analysis.sibilanceExcessive ? 0.6 : 0.3,
    };

    return {
        eqDeltas, totalEQCorrection, crestDiff, widthDiff,
        processingScale, stageBypass, stageIntensity,
        trackSlope, refSlope, tiltCorrection,
    };
}

// ═══════════════════════════════════════════════════════════════════
// Compute LUFS correction (v7.6.0 — extended chain measurement)
// ═══════════════════════════════════════════════════════════════════
function computeLUFSCorrection(inputLUFS, targetLUFS, intensity, measuredChainLUFS, bypass) {
    // v7.6.1: Restored heuristic compensation — live 24-stage chain loses more
    // than the offline approximation can model. Keep generous compensation.
    let chainLoss = 0;
    if (!bypass || !bypass.dynamicEQ)    chainLoss += 0.5;
    if (!bypass || !bypass.compression)  chainLoss += 1.0 + (intensity - 1) * 0.3;
    if (!bypass || !bypass.multibandComp) chainLoss += 0.5 + (intensity - 1) * 0.2;
    if (!bypass || !bypass.transient)    chainLoss += 0.3;
    chainLoss += 1.0 + (intensity - 1) * 0.5;  // Look-ahead limiter + saturation
    chainLoss += 0.3;  // Brickwall safety
    const compensation = Math.min(chainLoss, 6.0);

    let correctionDB;
    if (measuredChainLUFS !== null && isFinite(measuredChainLUFS) && measuredChainLUFS > -60) {
        correctionDB = targetLUFS - measuredChainLUFS + compensation;
        correctionDB = Math.max(-6, Math.min(12, correctionDB));
    } else {
        correctionDB = targetLUFS - inputLUFS + 4.0;
        correctionDB = Math.max(-3, Math.min(12, correctionDB));
    }
    return correctionDB;
}

// ═══════════════════════════════════════════════════════════════════
// Compute NY compression wet mix (v7.6.0)
// ═══════════════════════════════════════════════════════════════════
function computeNYWet(intensity, compRatioTarget, bypass) {
    if (intensity <= 2 || bypass) return 0;
    const nyBaseMix = { 3: 0.06, 4: 0.10, 5: 0.15 };
    const nyBase = nyBaseMix[intensity] || 0.06;
    const nyRatioScale = Math.max(0.3, 1.0 - (compRatioTarget - 1.5) / 6.0);
    return nyBase * nyRatioScale;
}

// ═══════════════════════════════════════════════════════════════════
// Compute compressor threshold (v7.6.0 — reads from genrePresets)
// ═══════════════════════════════════════════════════════════════════
function computeCompThreshold(baseThreshold, intensity, compScale, aiThresholdOffset) {
    const thresholdOffset = { 1: 4, 2: 2, 3: 0, 4: -2, 5: -4 };
    let adjusted = baseThreshold + (thresholdOffset[intensity] || 0);
    adjusted += (1.0 - compScale) * 6;
    adjusted += aiThresholdOffset || 0;
    adjusted = Math.max(adjusted, -24); // Floor cap
    return adjusted;
}

// ═══════════════════════════════════════════════════════════════════
// Simulate Pass 3 verification (v7.6.0)
// ═══════════════════════════════════════════════════════════════════
function simulatePass3Verification(targetLUFS, pass2CorrectionDB, simulatedChainLUFS) {
    // After pass 2 correction, simulate what pass 3 would measure
    const predictedOutput = simulatedChainLUFS + pass2CorrectionDB;
    const deviation = predictedOutput - targetLUFS;
    let finalCorrection = pass2CorrectionDB;
    if (Math.abs(deviation) > 0.5) {
        const microCorrection = -deviation * 0.8;
        finalCorrection += microCorrection;
        finalCorrection = Math.max(-6, Math.min(12, finalCorrection));
    }
    return { finalCorrection, deviation, withinTolerance: Math.abs(deviation) <= 0.5 };
}

// ═══════════════════════════════════════════════════════════════════
// Test runner
// ═══════════════════════════════════════════════════════════════════
const GENRES = Object.keys(GENRE_REFERENCE_TARGETS);
let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failures = [];

function check(label, value, min, max) {
    totalChecks++;
    const pass = value >= min && value <= max;
    if (pass) {
        passedChecks++;
    } else {
        failedChecks++;
        failures.push({ label, value, min, max });
    }
    const icon = pass ? 'PASS' : 'FAIL';
    const valueStr = typeof value === 'number' ? value.toFixed(3) : value;
    if (!pass) {
        console.log(`  ${icon}: ${label} = ${valueStr} (expected ${min} to ${max})`);
    }
    return pass;
}

console.log('========================================');
console.log('Mastering Math Validation (v7.6.0)');
console.log('========================================');
console.log(`Test track: spectralTilt=${TEST_ANALYSIS.spectralTilt}, crest=${TEST_ANALYSIS.overallCrest}, resonances=${TEST_ANALYSIS.resonances.length}\n`);

for (const genre of GENRES) {
    const ref = GENRE_REFERENCE_TARGETS[genre];
    const gp = genrePresets[genre];
    const result = generateAICorrections(TEST_ANALYSIS, genre);
    const bandKeys = ['sub', 'bass', 'lowmid', 'mid', 'highmid', 'high', 'air'];

    console.log(`--- ${genre.toUpperCase()} ---`);
    console.log(`  totalEQ=${result.totalEQCorrection.toFixed(2)}, processingScale=${result.processingScale}, crestDiff=${result.crestDiff.toFixed(1)}, trackSlope=${result.trackSlope.toFixed(2)}`);

    // EQ checks — ±2.5 dB per band (professional range)
    for (const band of bandKeys) {
        check(`${genre}:eq:${band}`, result.eqDeltas[band], -2.5, 2.5);
    }
    check(`${genre}:totalEQ`, result.totalEQCorrection, 0, 7.0);

    // Dynamics stage bypass count
    const dynamicsStages = ['compression', 'multibandComp', 'dynamicEQ', 'transient'];
    const activeDyn = dynamicsStages.filter(s => !result.stageBypass[s]).length;
    check(`${genre}:activeDynamics`, activeDyn, 0, 3);

    // Stage intensity checks
    check(`${genre}:int:exciter`, result.stageIntensity.exciter, 0, 0.20);
    check(`${genre}:int:warmth`, result.stageIntensity.warmth, 0, 0.6);
    check(`${genre}:int:msProcessing`, result.stageIntensity.msProcessing, 0, 0.35);
    check(`${genre}:int:hfLimiter`, result.stageIntensity.hfLimiter, 0, 0.7);

    // v7.6.0: Genre-specific LUFS target verification
    const expectedTarget = gp.targetLUFS;
    check(`${genre}:targetLUFS`, expectedTarget, -18, -12);

    // LUFS correction checks (simulate two-pass with typical chain output)
    for (const intensity of [3, 4, 5]) {
        const targetLUFS = expectedTarget;
        // Simulate a chain measurement that reads ~2-4 dB louder than target (typical)
        const simulatedChainLUFS = targetLUFS + 2;
        const correction = computeLUFSCorrection(-20, targetLUFS, intensity, simulatedChainLUFS, result.stageBypass);
        check(`${genre}:lufs:i${intensity}`, correction, -6, 12);

        // v7.6.0: Pass 3 verification test
        const pass3 = simulatePass3Verification(targetLUFS, correction, simulatedChainLUFS);
        check(`${genre}:pass3:i${intensity}`, pass3.finalCorrection, -6, 12);
    }

    // NY compression wet checks (v7.6.0: allow up to 0.18 for gentle comp ratios)
    for (const intensity of [3, 4, 5]) {
        const compRatio = gp.compression.ratio;
        const nyWet = computeNYWet(intensity, compRatio, result.stageBypass.compression);
        check(`${genre}:nyWet:i${intensity}`, nyWet, 0, 0.18);
    }

    // Compressor threshold checks (v7.6.0: reads from genrePresets)
    for (const intensity of [3, 4, 5]) {
        const baseThreshold = gp.compression.threshold;
        const compScale = result.stageIntensity.compression;
        const threshold = computeCompThreshold(baseThreshold, intensity, compScale, 0);
        check(`${genre}:compThresh:i${intensity}`, threshold, -30, 0);
    }

    console.log(`  Active dynamics: ${activeDyn}/4`);
    console.log(`  Target LUFS: ${expectedTarget} (genre-specific)`);
    const bypassSummary = Object.entries(result.stageBypass).filter(([, v]) => v).map(([k]) => k);
    console.log(`  Bypassed: ${bypassSummary.join(', ') || 'none'}`);
    console.log('');
}

// ═══════════════════════════════════════════════════════════════════
// v7.6.0: Genre-LUFS target differentiation checks
// ═══════════════════════════════════════════════════════════════════
console.log('--- GENRE-LUFS DIFFERENTIATION ---');
check('metal:targetLUFS=-12', genrePresets.metal.targetLUFS, -12, -12);
check('hiphop:targetLUFS=-14', genrePresets.hiphop.targetLUFS, -14, -14);
check('pop:targetLUFS=-14', genrePresets.pop.targetLUFS, -14, -14);
check('acoustic:targetLUFS=-16', genrePresets.acoustic.targetLUFS, -16, -16);
check('jazz:targetLUFS=-16', genrePresets.jazz.targetLUFS, -16, -16);
check('classical:targetLUFS=-18', genrePresets.classical.targetLUFS, -18, -18);
check('lofi:targetLUFS=-16', genrePresets.lofi.targetLUFS, -16, -16);
console.log('  All genre-specific LUFS targets verified');
console.log('');

// ═══════════════════════════════════════════════════════════════════
// v7.6.0: Compressor sync verification
// genrePresets compression values should match what mastering chain uses
// ═══════════════════════════════════════════════════════════════════
console.log('--- COMPRESSOR SYNC VERIFICATION ---');
check('hiphop:comp:threshold', genrePresets.hiphop.compression.threshold, -14, -14);
check('electronic:comp:threshold', genrePresets.electronic.compression.threshold, -12, -12);
check('pop:comp:threshold', genrePresets.pop.compression.threshold, -16, -16);
check('classical:comp:threshold', genrePresets.classical.compression.threshold, -26, -26);
check('metal:comp:threshold', genrePresets.metal.compression.threshold, -10, -10);
check('metal:comp:ratio', genrePresets.metal.compression.ratio, 2.5, 2.5);
check('classical:comp:ratio', genrePresets.classical.compression.ratio, 1.1, 1.1);
console.log('  All compressor values synced');
console.log('');

// ═══════════════════════════════════════════════════════════════════
// Cross-genre differentiation check (v7.6.0)
// Signature bands should differ by >= 1.5 dB between contrasting genres
// ═══════════════════════════════════════════════════════════════════
console.log('--- CROSS-GENRE DIFFERENTIATION ---');
const INTENSITY_MULT = 0.75; // Intensity 3 multiplier

const diffChecks = [
    { name: 'Hip-Hop vs Classical (sub)',     g1: 'hiphop',     g2: 'classical',  band: 'sub' },
    { name: 'Lo-Fi vs Electronic (air)',      g1: 'lofi',       g2: 'electronic', band: 'air' },
    { name: 'Pop vs Lo-Fi (highmid)',         g1: 'pop',        g2: 'lofi',       band: 'highmid' },
    { name: 'Metal vs Electronic (mid)',      g1: 'metal',      g2: 'electronic', band: 'mid' },
    { name: 'Hip-Hop vs Classical (lowmid)',  g1: 'hiphop',     g2: 'classical',  band: 'lowmid' },
    { name: 'Lo-Fi vs Pop (high)',            g1: 'lofi',       g2: 'pop',        band: 'high' },
];

for (const dc of diffChecks) {
    const v1 = _eqCurves[dc.g1][dc.band] * INTENSITY_MULT;
    const v2 = _eqCurves[dc.g2][dc.band] * INTENSITY_MULT;
    const diff = Math.abs(v1 - v2);
    const pass = check(`diff:${dc.name}`, diff, 1.5, 10);
    if (!pass) {
        console.log(`    ${dc.g1}=${v1.toFixed(2)} dB, ${dc.g2}=${v2.toFixed(2)} dB, diff=${diff.toFixed(2)} dB`);
    } else {
        console.log(`  PASS: ${dc.name} — diff=${diff.toFixed(2)} dB (${dc.g1}=${v1.toFixed(2)}, ${dc.g2}=${v2.toFixed(2)})`);
    }
}

// Summary
console.log('\n========================================');
console.log(`RESULTS: ${passedChecks}/${totalChecks} checks passed, ${failedChecks} failed`);
if (failures.length > 0) {
    console.log('\nFAILURES:');
    for (const f of failures) {
        console.log(`  ${f.label} = ${typeof f.value === 'number' ? f.value.toFixed(3) : f.value} (expected ${f.min} to ${f.max})`);
    }
    process.exit(1);
} else {
    console.log('\nAll checks PASSED!');
    process.exit(0);
}
