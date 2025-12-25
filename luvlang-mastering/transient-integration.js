/**
 * TRANSIENT DETECTION INTEGRATION
 * Connects the AudioWorklet transient detector to the main application
 */

let transientDetectorNode = null;
let currentTransientAnalysis = null;

/**
 * Initialize transient detector (call once during audio setup)
 */
async function initializeTransientDetector(audioContext) {
    try {
        // Load the worklet processor
        await audioContext.audioWorklet.addModule('transient-detector-worklet.js');

        // Create the worklet node
        transientDetectorNode = new AudioWorkletNode(audioContext, 'transient-detector');

        // Listen for analysis results
        transientDetectorNode.port.onmessage = (event) => {
            if (event.data.type === 'transient-analysis') {
                currentTransientAnalysis = event.data.data;

                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🧠 REAL-TIME TRANSIENT ANALYSIS:');
                console.log(`   Material: ${currentTransientAnalysis.materialType.toUpperCase()}`);
                console.log(`   Transients: ${currentTransientAnalysis.transientCount} (${currentTransientAnalysis.transientDensity.toFixed(1)}/sec)`);
                console.log(`   Recommended Attack: ${currentTransientAnalysis.attackMs}ms`);
                console.log(`   Recommended Release: ${currentTransientAnalysis.releaseMs}ms`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

                // Update UI if elements exist
                updateTransientUI(currentTransientAnalysis);

                // Auto-apply to compressor if enabled
                if (window.autoApplyTransientSettings) {
                    applyTransientSettingsToCompressor(currentTransientAnalysis);
                }
            }
        };

        console.log('✅ Transient Detector initialized (AudioWorklet)');
        return transientDetectorNode;

    } catch (error) {
        console.error('❌ Failed to initialize transient detector:', error);
        return null;
    }
}

/**
 * Connect transient detector to audio chain
 * Insert AFTER source but BEFORE processing
 */
function connectTransientDetector(sourceNode, destinationNode) {
    if (!transientDetectorNode) {
        console.warn('⚠️ Transient detector not initialized');
        return;
    }

    // Insert in chain: source → transient detector → destination
    sourceNode.connect(transientDetectorNode);
    transientDetectorNode.connect(destinationNode);

    console.log('✅ Transient detector connected to audio chain');
}

/**
 * Update UI with transient analysis results
 */
function updateTransientUI(analysis) {
    // Material type indicator
    const materialElement = document.getElementById('materialType');
    if (materialElement) {
        materialElement.textContent = analysis.materialType.toUpperCase();

        // Color-code by type
        switch (analysis.materialType) {
            case 'percussive':
                materialElement.style.color = '#ff4444'; // Red for drums
                break;
            case 'balanced':
                materialElement.style.color = '#ffaa00'; // Orange for pop/rock
                break;
            case 'smooth':
                materialElement.style.color = '#00ff88'; // Green for pads/vocals
                break;
        }
    }

    // Attack/Release recommendations
    const attackElement = document.getElementById('recommendedAttack');
    if (attackElement) {
        attackElement.textContent = `${analysis.attackMs}ms`;
    }

    const releaseElement = document.getElementById('recommendedRelease');
    if (releaseElement) {
        releaseElement.textContent = `${analysis.releaseMs}ms`;
    }

    // Transient density meter
    const densityElement = document.getElementById('transientDensity');
    if (densityElement) {
        densityElement.textContent = `${analysis.transientDensity.toFixed(1)}/sec`;
    }
}

/**
 * Auto-apply transient settings to compressor
 */
function applyTransientSettingsToCompressor(analysis) {
    if (!compressor) {
        console.warn('⚠️ Compressor not initialized');
        return;
    }

    // Apply recommended settings
    compressor.attack.value = analysis.recommendedAttack;
    compressor.release.value = analysis.recommendedRelease;

    console.log(`✅ Auto-applied compressor settings: ${analysis.attackMs}ms attack, ${analysis.releaseMs}ms release`);

    // Update UI sliders if they exist
    const attackSlider = document.getElementById('compressorAttackSlider');
    if (attackSlider) {
        attackSlider.value = analysis.recommendedAttack * 1000; // Convert to ms
    }

    const releaseSlider = document.getElementById('compressorReleaseSlider');
    if (releaseSlider) {
        releaseSlider.value = analysis.recommendedRelease * 1000; // Convert to ms
    }
}

/**
 * Get current transient analysis results
 */
function getTransientAnalysis() {
    return currentTransientAnalysis;
}

/**
 * Reset transient detector
 */
function resetTransientDetector() {
    currentTransientAnalysis = null;
    console.log('🔄 Transient detector reset');
}

// Export for use in main application
if (typeof window !== 'undefined') {
    window.initializeTransientDetector = initializeTransientDetector;
    window.connectTransientDetector = connectTransientDetector;
    window.getTransientAnalysis = getTransientAnalysis;
    window.resetTransientDetector = resetTransientDetector;
    window.autoApplyTransientSettings = true; // Enable auto-apply by default
}
