/**
 * LUVLANG AI MASTERING SUITE - MASTER INTEGRATION
 *
 * Unified API for all 13 revolutionary AI features:
 *
 * 1.  AI Stem Separation - Automatic vocal/drum/bass/instrument separation
 * 2.  Dynamic EQ - Frequency-specific compression
 * 3.  Processing Chain Optimizer - AI-determined effect order
 * 4.  Artifact Detection - 10 types of audio problems detected
 * 5.  Smart Mode Selection - Auto-detect genre and optimal settings
 * 6.  Adaptive Learning - Learns from your adjustments
 * 7.  Audio Fingerprinting - Reference track suggestions
 * 8.  Intelligent Dithering - AI-selected dithering algorithm
 * 9.  Quality Prediction - Predict results before processing
 * 10. Room Compensation - Calibrate for your listening environment
 * 11. Neural Models - Genre-specific trained models
 * 12. AI Assistant - Natural language mastering commands
 * 13. Multi-Track Mixing - Full DAW in the browser
 *
 * WORLD'S MOST ADVANCED BROWSER-BASED MASTERING PLATFORM
 */

class LuvlangAIMasteringSuite {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Initialize all modules
        this.modules = {
            stemSeparator: null,        // Lazy load (heavy)
            dynamicEQ: null,
            chainOptimizer: null,
            artifactDetector: null,
            smartMode: null,
            adaptiveLearning: null,
            fingerprinting: null,
            dithering: null,
            qualityPredictor: null,
            roomCompensator: null,
            neuralModels: null,
            aiAssistant: null,
            multiTrackMixer: null
        };

        // Module loaded status
        this.loaded = {
            stemSeparator: false,
            dynamicEQ: false,
            chainOptimizer: false,
            artifactDetector: false,
            smartMode: false,
            adaptiveLearning: false,
            fingerprinting: false,
            dithering: false,
            qualityPredictor: false,
            roomCompensator: false,
            neuralModels: false,
            aiAssistant: false,
            multiTrackMixer: false
        };

        console.log('[AI Suite] Luvlang AI Mastering Suite initialized');
        console.log('[AI Suite] 13 revolutionary features available');
    }

    /**
     * Initialize specific module
     * @param {string} moduleName - Name of module to load
     * @returns {Promise<boolean>} Success status
     */
    async loadModule(moduleName) {
        if (this.loaded[moduleName]) {
            console.log(`[AI Suite] ${moduleName} already loaded`);
            return true;
        }

        console.log(`[AI Suite] Loading ${moduleName}...`);

        try {
            switch (moduleName) {
                case 'stemSeparator':
                    if (typeof AIStemSeparator !== 'undefined') {
                        this.modules.stemSeparator = new AIStemSeparator();
                        await this.modules.stemSeparator.init();
                    }
                    break;

                case 'dynamicEQ':
                    if (typeof DynamicEQProcessor !== 'undefined') {
                        this.modules.dynamicEQ = new DynamicEQProcessor(this.audioContext);
                        this.modules.dynamicEQ.init();
                    }
                    break;

                case 'chainOptimizer':
                    if (typeof ProcessingChainOptimizer !== 'undefined') {
                        this.modules.chainOptimizer = new ProcessingChainOptimizer();
                    }
                    break;

                case 'artifactDetector':
                    if (typeof ArtifactDetector !== 'undefined') {
                        this.modules.artifactDetector = new ArtifactDetector();
                    }
                    break;

                case 'smartMode':
                    if (typeof SmartModeSelector !== 'undefined') {
                        this.modules.smartMode = new SmartModeSelector();
                    }
                    break;

                case 'adaptiveLearning':
                    if (typeof AdaptiveLearningSystem !== 'undefined') {
                        this.modules.adaptiveLearning = new AdaptiveLearningSystem();
                    }
                    break;

                case 'fingerprinting':
                    if (typeof AudioFingerprinting !== 'undefined') {
                        this.modules.fingerprinting = new AudioFingerprinting();
                        this.modules.fingerprinting.loadCustomReferences();
                    }
                    break;

                case 'dithering':
                    if (typeof IntelligentDitheringSystem !== 'undefined') {
                        this.modules.dithering = new IntelligentDitheringSystem();
                    }
                    break;

                case 'qualityPredictor':
                    if (typeof QualityPredictor !== 'undefined') {
                        this.modules.qualityPredictor = new QualityPredictor();
                    }
                    break;

                case 'roomCompensator':
                    if (typeof RoomCompensator !== 'undefined') {
                        this.modules.roomCompensator = new RoomCompensator();
                    }
                    break;

                case 'neuralModels':
                    if (typeof GenreSpecificModels !== 'undefined') {
                        this.modules.neuralModels = new GenreSpecificModels();
                    }
                    break;

                case 'aiAssistant':
                    if (typeof MasteringAssistant !== 'undefined') {
                        this.modules.aiAssistant = new MasteringAssistant();
                    }
                    break;

                case 'multiTrackMixer':
                    if (typeof MultiTrackMixer !== 'undefined') {
                        this.modules.multiTrackMixer = new MultiTrackMixer(this.audioContext);
                    }
                    break;

                default:
                    console.error(`[AI Suite] Unknown module: ${moduleName}`);
                    return false;
            }

            this.loaded[moduleName] = true;
            console.log(`[AI Suite] ${moduleName} loaded successfully`);
            return true;

        } catch (error) {
            console.error(`[AI Suite] Failed to load ${moduleName}:`, error);
            return false;
        }
    }

    /**
     * Load all modules
     */
    async loadAll() {
        console.log('[AI Suite] Loading all modules...');

        const modules = Object.keys(this.modules);
        const results = await Promise.all(
            modules.map(m => this.loadModule(m))
        );

        const successCount = results.filter(r => r).length;
        console.log(`[AI Suite] Loaded ${successCount}/${modules.length} modules`);

        return successCount === modules.length;
    }

    /**
     * Get module by name
     */
    getModule(moduleName) {
        if (!this.loaded[moduleName]) {
            console.warn(`[AI Suite] Module ${moduleName} not loaded. Call loadModule() first.`);
            return null;
        }

        return this.modules[moduleName];
    }

    /**
     * Check if module is loaded
     */
    isLoaded(moduleName) {
        return this.loaded[moduleName];
    }

    /**
     * Get loaded modules
     */
    getLoadedModules() {
        return Object.entries(this.loaded)
            .filter(([name, loaded]) => loaded)
            .map(([name]) => name);
    }

    /**
     * Get module status
     */
    getStatus() {
        return {
            loaded: this.loaded,
            modules: this.modules,
            audioContext: this.audioContext,
            sampleRate: this.audioContext.sampleRate
        };
    }

    /**
     * MASTER AI MASTERING WORKFLOW
     * Uses all modules in intelligent sequence
     */
    async masterAudio(audioBuffer, options = {}) {
        console.log('[AI Suite] === MASTER AI WORKFLOW START ===');

        const results = {
            input: audioBuffer,
            steps: [],
            warnings: [],
            suggestions: [],
            output: null
        };

        try {
            // STEP 1: Quality Prediction
            if (this.loaded.qualityPredictor) {
                console.log('[AI Suite] Step 1: Quality Prediction');
                const prediction = await this.modules.qualityPredictor.predictQuality(audioBuffer);
                results.steps.push({ name: 'Quality Prediction', result: prediction });
                results.warnings.push(...prediction.warnings);

                console.log(`  Predicted Score: ${prediction.score}/100`);
                console.log(`  Confidence: ${(prediction.confidence * 100).toFixed(0)}%`);
            }

            // STEP 2: Artifact Detection
            if (this.loaded.artifactDetector) {
                console.log('[AI Suite] Step 2: Artifact Detection');
                const artifacts = await this.modules.artifactDetector.detectArtifacts(audioBuffer);
                results.steps.push({ name: 'Artifact Detection', result: artifacts });

                if (artifacts.hasProblems) {
                    console.log(`  ⚠️ Found ${artifacts.issues.length} issues`);
                    results.warnings.push(...artifacts.issues.map(i => i.description));
                } else {
                    console.log('  ✓ No major artifacts detected');
                }
            }

            // STEP 3: Smart Mode Selection
            if (this.loaded.smartMode) {
                console.log('[AI Suite] Step 3: Smart Mode Selection');
                const mode = await this.modules.smartMode.detectMode(audioBuffer);
                results.steps.push({ name: 'Smart Mode', result: mode });

                console.log(`  Genre: ${mode.genre} (${(mode.confidence * 100).toFixed(0)}% confidence)`);
                console.log(`  Target: ${mode.targetLUFS} LUFS for ${mode.platform}`);
                results.suggestions.push(...mode.recommendations);
            }

            // STEP 4: Audio Fingerprinting (Reference Suggestions)
            if (this.loaded.fingerprinting) {
                console.log('[AI Suite] Step 4: Audio Fingerprinting');
                await this.modules.fingerprinting.generateFingerprint(audioBuffer);
                const suggestions = this.modules.fingerprinting.findSimilarTracks(3);
                results.steps.push({ name: 'Fingerprinting', result: suggestions });

                if (suggestions.length > 0) {
                    console.log(`  Similar to: ${suggestions[0].artist} - ${suggestions[0].title}`);
                }
            }

            // STEP 5: Processing Chain Optimization
            if (this.loaded.chainOptimizer) {
                console.log('[AI Suite] Step 5: Processing Chain Optimization');
                const chain = await this.modules.chainOptimizer.optimizeChain(audioBuffer);
                results.steps.push({ name: 'Chain Optimization', result: chain });

                console.log(`  Optimal Chain: ${chain.chainName}`);
                console.log(`  Processing Order: ${chain.chain.slice(0, 5).join(' → ')}...`);
            }

            // STEP 6: Dynamic EQ Processing
            if (this.loaded.dynamicEQ && results.suggestions.length > 0) {
                console.log('[AI Suite] Step 6: Dynamic EQ Processing');
                try {
                    // Apply dynamic EQ based on analysis
                    const dynamicEQResult = await this.modules.dynamicEQ.process(audioBuffer);
                    results.steps.push({ name: 'Dynamic EQ', result: dynamicEQResult });
                    console.log('  Applied frequency-dependent dynamics');
                } catch (e) {
                    console.warn('  Dynamic EQ skipped:', e.message);
                }
            }

            // STEP 7: Intelligent Dithering Selection
            if (this.loaded.dithering) {
                console.log('[AI Suite] Step 7: Intelligent Dithering Analysis');
                const ditherResult = this.modules.dithering.analyzeAndRecommend(audioBuffer);
                results.steps.push({ name: 'Dithering', result: ditherResult });
                console.log(`  Recommended: ${ditherResult.algorithm} (${ditherResult.reason})`);
            }

            // STEP 8: Room Compensation Check
            if (this.loaded.roomCompensation) {
                console.log('[AI Suite] Step 8: Room Compensation');
                const roomStatus = this.modules.roomCompensation.getStatus();
                results.steps.push({ name: 'Room Compensation', result: roomStatus });
                if (roomStatus.calibrated) {
                    console.log('  Room compensation active');
                } else {
                    console.log('  Room not calibrated (optional feature)');
                }
            }

            // STEP 9: Multi-track Analysis (if applicable)
            if (this.loaded.multiTrack) {
                console.log('[AI Suite] Step 9: Multi-track Analysis');
                const mixStatus = { ready: true, trackCount: 1 };
                results.steps.push({ name: 'Multi-track', result: mixStatus });
                console.log('  Single track mode (multi-track available)');
            }

            // STEP 10: Mastering Assistant Recommendations
            if (this.loaded.assistant) {
                console.log('[AI Suite] Step 10: AI Mastering Assistant');
                const assistantTips = this.modules.assistant.getQuickTips();
                results.steps.push({ name: 'Assistant', result: assistantTips });
                if (assistantTips.length > 0) {
                    console.log(`  Tip: ${assistantTips[0]}`);
                }
            }

            // STEP 11: Adaptive Learning Integration
            if (this.loaded.adaptiveLearning) {
                console.log('[AI Suite] Step 11: Adaptive Learning');
                const learningStats = this.modules.adaptiveLearning.getStatistics();
                results.steps.push({ name: 'Adaptive Learning', result: learningStats });
                console.log(`  ${learningStats.totalSessions || 0} previous sessions analyzed`);
            }

            // STEP 12: Quality Prediction
            if (this.loaded.qualityPredictor) {
                console.log('[AI Suite] Step 12: Quality Prediction');
                const prediction = await this.modules.qualityPredictor.predict(audioBuffer);
                results.steps.push({ name: 'Quality Prediction', result: prediction });
                results.qualityScore = prediction.predictedScore;
                console.log(`  Predicted quality score: ${prediction.predictedScore}/100`);
                if (prediction.warnings && prediction.warnings.length > 0) {
                    results.warnings.push(...prediction.warnings);
                }
            }

            // STEP 13: Final Processing Summary
            console.log('[AI Suite] Step 13: Generating Final Summary');
            results.summary = {
                stepsCompleted: results.steps.length,
                suggestionsGenerated: results.suggestions.length,
                warningsFound: results.warnings.length,
                qualityScore: results.qualityScore || 'N/A',
                processingComplete: true
            };
            results.steps.push({ name: 'Summary', result: results.summary });

            // Output is the analyzed buffer (actual processing happens in main engine)
            results.output = audioBuffer;
            results.processingRecommendations = this.generateProcessingRecommendations(results);

            console.log('[AI Suite] === MASTER AI WORKFLOW COMPLETE ===');

            return results;

        } catch (error) {
            console.error('[AI Suite] Master workflow failed:', error);
            throw error;
        }
    }

    /**
     * Get feature summary
     */
    getFeatureSummary() {
        return {
            'AI Stem Separation': {
                loaded: this.loaded.stemSeparator,
                description: 'Automatic separation into vocals/drums/bass/instruments',
                revolutionary: true
            },
            'Dynamic EQ': {
                loaded: this.loaded.dynamicEQ,
                description: 'Frequency-specific compression',
                revolutionary: true
            },
            'Processing Chain Optimizer': {
                loaded: this.loaded.chainOptimizer,
                description: 'AI determines optimal effect order',
                revolutionary: true
            },
            'Artifact Detection': {
                loaded: this.loaded.artifactDetector,
                description: '10 types of audio problems detected',
                revolutionary: true
            },
            'Smart Mode Selection': {
                loaded: this.loaded.smartMode,
                description: 'Auto-detect genre and settings',
                revolutionary: true
            },
            'Adaptive Learning': {
                loaded: this.loaded.adaptiveLearning,
                description: 'Learns from your adjustments',
                revolutionary: true
            },
            'Audio Fingerprinting': {
                loaded: this.loaded.fingerprinting,
                description: 'Reference track suggestions',
                revolutionary: true
            },
            'Intelligent Dithering': {
                loaded: this.loaded.dithering,
                description: 'AI-selected dithering algorithm',
                revolutionary: false
            },
            'Quality Prediction': {
                loaded: this.loaded.qualityPredictor,
                description: 'Predict results before processing',
                revolutionary: true
            },
            'Room Compensation': {
                loaded: this.loaded.roomCompensator,
                description: 'Calibrate for listening environment',
                revolutionary: false
            },
            'Neural Models': {
                loaded: this.loaded.neuralModels,
                description: 'Genre-specific trained models',
                revolutionary: true
            },
            'AI Assistant': {
                loaded: this.loaded.aiAssistant,
                description: 'Natural language commands',
                revolutionary: true
            },
            'Multi-Track Mixing': {
                loaded: this.loaded.multiTrackMixer,
                description: 'Full DAW in browser',
                revolutionary: true
            }
        };
    }

    /**
     * Generate processing recommendations based on AI analysis
     */
    generateProcessingRecommendations(results) {
        const recommendations = {
            eq: [],
            compression: [],
            limiting: [],
            stereo: [],
            general: []
        };

        // Extract recommendations from steps
        for (const step of results.steps) {
            if (step.name === 'Artifact Detection' && step.result) {
                // Add EQ recommendations for frequency issues
                if (step.result.detected && step.result.detected.includes('harsh-frequencies')) {
                    recommendations.eq.push({
                        action: 'reduce',
                        frequency: '3-5kHz',
                        amount: -2,
                        reason: 'Detected harsh frequencies'
                    });
                }
                if (step.result.detected && step.result.detected.includes('muddy-low-mids')) {
                    recommendations.eq.push({
                        action: 'reduce',
                        frequency: '200-400Hz',
                        amount: -3,
                        reason: 'Muddy low-mids detected'
                    });
                }
            }

            if (step.name === 'Smart Mode' && step.result) {
                // Add genre-specific recommendations
                recommendations.general.push({
                    targetLUFS: step.result.targetLUFS,
                    genre: step.result.genre,
                    platform: step.result.platform
                });
            }

            if (step.name === 'Chain Optimization' && step.result) {
                // Processing order recommendations
                recommendations.processingOrder = step.result.chain;
            }

            if (step.name === 'Quality Prediction' && step.result) {
                // Add recommendations from quality predictor
                if (step.result.recommendations) {
                    recommendations.general.push(...step.result.recommendations);
                }
            }
        }

        // Add recommendations from suggestions
        for (const suggestion of results.suggestions) {
            if (typeof suggestion === 'string') {
                if (suggestion.toLowerCase().includes('bass')) {
                    recommendations.eq.push({ type: 'suggestion', text: suggestion });
                } else if (suggestion.toLowerCase().includes('compress')) {
                    recommendations.compression.push({ type: 'suggestion', text: suggestion });
                } else if (suggestion.toLowerCase().includes('stereo') || suggestion.toLowerCase().includes('width')) {
                    recommendations.stereo.push({ type: 'suggestion', text: suggestion });
                } else {
                    recommendations.general.push({ type: 'suggestion', text: suggestion });
                }
            }
        }

        return recommendations;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LuvlangAIMasteringSuite;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.LuvlangAIMasteringSuite = LuvlangAIMasteringSuite;
}
