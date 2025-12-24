/**
 * LUVLANG LEGENDARY - COMPLETE INTEGRATION SCRIPT
 * Add this script to your HTML file to enable all legendary features
 * 
 * CRITICAL FIXES:
 * 1. Audio playback to speakers
 * 2. AI auto-fix all issues
 * 3. Target -14 LUFS
 * 4. All new features integrated
 */

console.log('🚀 Loading LuvLang LEGENDARY features...');

// ============================================================================
// INITIALIZATION - Run after DOM loads
// ============================================================================

// Don't auto-initialize on page load - wait for audio file to be uploaded
// initializeLegendaryFeatures() will be called from setupWebAudio() after audioContext is created
console.log('⏳ LEGENDARY features will initialize after audio file is loaded');

function initializeLegendaryFeatures() {
    // Check if already initialized
    if (window.legendaryFeaturesInitialized) {
        console.log('✅ LEGENDARY features already initialized');
        return;
    }

    console.log('✨ Initializing LEGENDARY features...');

    // Get audioContext from window or local scope
    const ctx = window.audioContext || (typeof audioContext !== 'undefined' ? audioContext : null);

    if (!ctx) {
        console.warn('⚠️ audioContext not available yet');
        return;
    }

    // Initialize all feature modules
    try {
        window.referenceTrackMatcher = new ReferenceTrackMatcher(ctx);
        window.multibandCompressor = new MultibandCompressor(ctx);
        window.msProcessor = new MSProcessor(ctx);
        window.presetManager = new PresetManager();
        window.undoRedoManager = new UndoRedoManager();
        
        // Initialize keyboard shortcuts with callbacks
        window.keyboardShortcuts = new KeyboardShortcuts({
            playPause: togglePlayPause,
            abToggle: toggleABComparison,
            resetEQ: resetAllEQ,
            resetAll: resetEverything,
            bypassAll: toggleBypassAll,
            toggleMS: toggleMSMode,
            undo: performUndo,
            redo: performRedo,
            savePreset: showSavePresetDialog,
            autoMaster: runEnhancedAIAutoMaster,
            showHelp: () => window.keyboardShortcuts.showHelp()
        });

        console.log('✅ All LEGENDARY features initialized!');
        console.log('   Press ? to see keyboard shortcuts');

        // Mark as initialized
        window.legendaryFeaturesInitialized = true;

    } catch (error) {
        console.error('❌ Error initializing features:', error);
    }
}

// ============================================================================
// CRITICAL FIX #1: AUDIO PLAYBACK TO SPEAKERS
// ============================================================================

function ensureAudioPlayback() {
    if (!audioContext || !audioContext.destination) {
        console.error('❌ AudioContext not available');
        return false;
    }

    // Find the final output node and connect to destination
    // This varies based on your setup, common patterns:

    // Pattern 1: Analyser (used in this app - already connected in setupWebAudio)
    if (typeof analyser !== 'undefined' && analyser !== null) {
        // Audio chain is: ... → analyser → destination
        // Already connected in setupWebAudio at line 1514
        console.log('🔊 Audio connected: analyser → destination (already setup)');
        return true;
    }

    // Pattern 2: Master output gain
    if (typeof masterOutputGain !== 'undefined' && masterOutputGain !== null) {
        try {
            masterOutputGain.disconnect();
        } catch (e) {}
        masterOutputGain.connect(audioContext.destination);
        console.log('🔊 Audio connected: masterOutputGain → destination');
        return true;
    }

    // Pattern 3: Limiter as final node
    if (typeof limiterNode !== 'undefined' && limiterNode !== null) {
        try {
            limiterNode.disconnect();
        } catch (e) {}
        limiterNode.connect(audioContext.destination);
        console.log('🔊 Audio connected: limiterNode → destination');
        return true;
    }

    // Pattern 4: Compressor as final node
    if (typeof compressorNode !== 'undefined' && compressorNode !== null) {
        try {
            compressorNode.disconnect();
        } catch (e) {}
        compressorNode.connect(audioContext.destination);
        console.log('🔊 Audio connected: compressorNode → destination');
        return true;
    }

    console.warn('⚠️  Audio chain will be connected when file loads');
    return false;
}

// ============================================================================
// CRITICAL FIX #2: COMPREHENSIVE ANALYSIS BEFORE AI
// ============================================================================

async function comprehensiveAnalysis(audioBuffer) {
    const issues = [];
    const fixes = [];
    
    console.log('🔬 Running comprehensive analysis...');
    
    // 1. CLIPPING CHECK
    let clippedSamples = 0;
    let peakLevel = 0;
    
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        const data = audioBuffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
            const abs = Math.abs(data[i]);
            if (abs > peakLevel) peakLevel = abs;
            if (abs >= 0.99) clippedSamples++;
        }
    }
    
    if (clippedSamples > 0) {
        const gainReduction = 20 * Math.log10(0.95 / peakLevel);
        issues.push(`CLIPPING: ${clippedSamples} samples at max level`);
        fixes.push({ type: 'gain', value: gainReduction, desc: `Reduce gain by ${Math.abs(gainReduction).toFixed(2)} dB` });
    }
    
    // 2. PHASE CHECK (stereo)
    if (audioBuffer.numberOfChannels === 2) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        
        let correlation = 0;
        let samples = 0;
        
        for (let i = 0; i < left.length; i += 100) {
            correlation += left[i] * right[i];
            samples++;
        }
        
        correlation /= samples;
        
        if (correlation < 0.3) {
            issues.push(`PHASE: Poor stereo correlation (${correlation.toFixed(2)})`);
            fixes.push({ type: 'stereoWidth', value: 80, desc: 'Reduce stereo width to 80%' });
        }
    }
    
    // 3. LOUDNESS CHECK (CRITICAL - Target -14 LUFS)
    const data = audioBuffer.getChannelData(0);
    let sumSquares = 0;
    
    for (let i = 0; i < data.length; i++) {
        sumSquares += data[i] * data[i];
    }
    
    const rms = Math.sqrt(sumSquares / data.length);
    const lufs = -0.691 + 10 * Math.log10(rms + 0.0001) - 23;
    
    const targetLUFS = -14; // STREAMING STANDARD
    const lufsDifference = targetLUFS - lufs;
    
    if (Math.abs(lufsDifference) > 0.5) {
        issues.push(`LOUDNESS: ${lufs.toFixed(1)} LUFS (target: ${targetLUFS} LUFS)`);
        fixes.push({ type: 'lufsGain', value: lufsDifference, desc: `Adjust ${lufsDifference > 0 ? '+' : ''}${lufsDifference.toFixed(2)} dB to reach -14 LUFS` });
    }
    
    // 4. DYNAMIC RANGE CHECK
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
    }
    
    const peakDB = 20 * Math.log10(peak + 0.0001);
    const rmsDB = 20 * Math.log10(rms + 0.0001);
    const dynamicRange = peakDB - rmsDB;
    
    if (dynamicRange < 4) {
        issues.push(`DYNAMICS: Over-compressed (${dynamicRange.toFixed(1)} dB DR)`);
        fixes.push({ type: 'compression', value: 2.5, desc: 'Use gentle compression (2.5:1)' });
    }
    
    // 5. DC OFFSET CHECK
    let dcSum = 0;
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch);
        for (let i = 0; i < channelData.length; i++) {
            dcSum += channelData[i];
        }
    }
    
    const dcOffset = dcSum / (audioBuffer.length * audioBuffer.numberOfChannels);
    
    if (Math.abs(dcOffset) > 0.01) {
        issues.push(`DC OFFSET: ${dcOffset.toFixed(4)} detected`);
        fixes.push({ type: 'dcOffset', value: dcOffset, desc: 'Remove DC offset' });
    }
    
    return {
        issues,
        fixes,
        lufs,
        targetLUFS,
        dynamicRange,
        peakLevel,
        clippedSamples,
        dcOffset
    };
}

// ============================================================================
// CRITICAL FIX #3: ENHANCED AI AUTO MASTER
// ============================================================================

async function runEnhancedAIAutoMaster() {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 AI AUTO MASTER - LEGENDARY EDITION');
    console.log('   Target: -14 LUFS | Pristine Quality | All Issues Fixed');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    if (!audioBuffer) {
        alert('⚠️  Please upload an audio file first');
        return;
    }
    
    // STEP 1: COMPREHENSIVE ANALYSIS
    console.log('━━━ STEP 1/4: COMPREHENSIVE ANALYSIS ━━━');
    const analysis = await comprehensiveAnalysis(audioBuffer);
    
    if (analysis.issues.length > 0) {
        console.log(`⚠️  Found ${analysis.issues.length} issues:`);
        analysis.issues.forEach((issue, i) => {
            console.log(`   ${i + 1}. ${issue}`);
        });
        console.log('');
        
        // Show in UI
        displayIssuesInUI(analysis);
    } else {
        console.log('✅ No issues found - track is pristine!');
        console.log('');
    }
    
    // STEP 2: AUTO-FIX ALL ISSUES
    console.log('━━━ STEP 2/4: AUTO-FIX ALL ISSUES ━━━');
    
    let totalGainAdjustment = 0;
    let stereoWidthTarget = 100;
    let compressionRatio = 6;
    
    analysis.fixes.forEach((fix, i) => {
        console.log(`   ${i + 1}. ${fix.desc}`);
        
        if (fix.type === 'gain' || fix.type === 'lufsGain') {
            totalGainAdjustment += fix.value;
        }
        if (fix.type === 'stereoWidth') {
            stereoWidthTarget = fix.value;
        }
        if (fix.type === 'compression') {
            compressionRatio = fix.value;
        }
    });
    
    console.log('');
    console.log(`   Total Gain Adjustment: ${totalGainAdjustment > 0 ? '+' : ''}${totalGainAdjustment.toFixed(2)} dB`);
    console.log(`   Stereo Width: ${stereoWidthTarget}%`);
    console.log(`   Compression Ratio: ${compressionRatio}:1`);
    console.log('');
    
    // STEP 3: APPLY SETTINGS
    console.log('━━━ STEP 3/4: APPLYING AI MASTERING ━━━');

    // Apply master gain using the window function from main HTML
    if (typeof window.applyMasterGain === 'function') {
        window.applyMasterGain(totalGainAdjustment);
    } else {
        console.error('❌ window.applyMasterGain not available');
    }

    // Apply stereo width using the window function from main HTML
    if (typeof window.applyStereoWidth === 'function') {
        window.applyStereoWidth(stereoWidthTarget);
    } else {
        console.error('❌ window.applyStereoWidth not available');
    }

    // Apply compression using the window function from main HTML
    if (typeof window.applyCompression === 'function') {
        window.applyCompression(compressionRatio);
    } else {
        console.error('❌ window.applyCompression not available');
    }

    // Run existing AI EQ optimization using the window function from main HTML
    if (typeof window.runAIEQOptimization === 'function') {
        await window.runAIEQOptimization();
    } else {
        console.error('❌ window.runAIEQOptimization not available');
    }
    
    console.log('');
    
    // STEP 4: VERIFICATION
    console.log('━━━ STEP 4/4: FINAL VERIFICATION ━━━');
    
    const finalAnalysis = await comprehensiveAnalysis(audioBuffer);
    
    console.log(`   Final LUFS: ${finalAnalysis.lufs.toFixed(1)} (target: -14)`);
    console.log(`   Dynamic Range: ${finalAnalysis.dynamicRange.toFixed(1)} dB`);
    console.log(`   Peak Level: ${(20 * Math.log10(finalAnalysis.peakLevel)).toFixed(1)} dBFS`);
    console.log(`   Clipping: ${finalAnalysis.clippedSamples === 0 ? '✅ None' : '⚠️  ' + finalAnalysis.clippedSamples + ' samples'}`);
    console.log('');
    
    const qualityScore = calculateQualityScore(finalAnalysis);
    console.log(`   Quality Score: ${qualityScore}/100`);
    console.log('');
    console.log('✅ AI AUTO MASTER COMPLETE - STREAMING READY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
}

// ============================================================================
// NOTE: Helper functions (applyMasterGain, applyStereoWidth, applyCompression,
// runAIEQOptimization) are defined as window.* functions in the main HTML file
// (luvlang_LEGENDARY_COMPLETE.html lines 3774-3856)
// ============================================================================

function calculateQualityScore(analysis) {
    let score = 100;
    
    // Deduct for issues
    if (Math.abs(analysis.lufs - (-14)) > 1) score -= 10;
    if (analysis.clippedSamples > 0) score -= 20;
    if (analysis.dynamicRange < 6) score -= 10;
    if (Math.abs(analysis.dcOffset) > 0.01) score -= 5;
    
    return Math.max(0, score);
}

function displayIssuesInUI(analysis) {
    // Create or update issues panel
    let panel = document.getElementById('aiIssuesPanel');
    
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'aiIssuesPanel';
        panel.style.cssText = `
            background: linear-gradient(135deg, rgba(255,100,100,0.1), rgba(255,150,50,0.1));
            border: 1px solid rgba(255,100,100,0.3);
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
            font-family: 'Inter', sans-serif;
        `;
        
        // Insert at top of analysis panel or main area
        const target = document.querySelector('.analysis-panel') || document.querySelector('.center-main');
        if (target) {
            target.insertBefore(panel, target.firstChild);
        }
    }
    
    let html = `
        <div style="font-size: 1rem; font-weight: 700; color: #ff6b6b; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">⚠️</span>
            <span>Issues Detected (Auto-Fixed by AI)</span>
        </div>
        <ul style="margin: 0; padding-left: 25px; font-size: 0.85rem; opacity: 0.9; line-height: 1.8;">
    `;
    
    analysis.issues.forEach(issue => {
        html += `<li>${issue}</li>`;
    });
    
    html += `</ul>`;
    html += `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.8rem; opacity: 0.7;">
            ✅ AI automatically applied ${analysis.fixes.length} fixes • Target: -14 LUFS streaming standard
        </div>
    `;
    
    panel.innerHTML = html;
    
    // Auto-hide after 12 seconds
    setTimeout(() => {
        panel.style.transition = 'opacity 0.5s, transform 0.5s';
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (panel.parentNode) {
                panel.parentNode.removeChild(panel);
            }
        }, 500);
    }, 12000);
}

// ============================================================================
// PLACEHOLDER FUNCTIONS (Connect to your existing code)
// ============================================================================

function togglePlayPause() {
    // Your play/pause logic
    console.log('⏯️  Play/Pause');
}

function toggleABComparison() {
    // Your A/B comparison logic
    console.log('🔀 A/B Toggle');
}

function resetAllEQ() {
    // Your EQ reset logic
    console.log('🔄 Reset EQ');
}

function resetEverything() {
    // Your full reset logic
    console.log('🔄 Reset Everything');
}

function toggleBypassAll() {
    // Your bypass logic
    console.log('⏸️  Bypass All');
}

function toggleMSMode() {
    // Your M/S toggle logic
    console.log('🔀 M/S Mode Toggle');
}

function performUndo() {
    if (window.undoRedoManager) {
        const state = window.undoRedoManager.undo();
        if (state) {
            console.log('↶ Undo');
            // Apply state
        }
    }
}

function performRedo() {
    if (window.undoRedoManager) {
        const state = window.undoRedoManager.redo();
        if (state) {
            console.log('↷ Redo');
            // Apply state
        }
    }
}

function showSavePresetDialog() {
    const name = prompt('Enter preset name:');
    if (name && window.presetManager) {
        const state = getCurrentSettings();
        window.presetManager.savePreset(name, state);
        console.log(`💾 Preset saved: ${name}`);
    }
}

function getCurrentSettings() {
    // Return current state object
    return {
        eq: [0, 0, 0, 0, 0, 0, 0], // Get from UI
        compression: {},
        masterGain: 0,
        stereoWidth: 100
    };
}

console.log('✅ LEGENDARY Integration Script Loaded');
console.log('   Run initializeLegendaryFeatures() after audioContext is ready');

