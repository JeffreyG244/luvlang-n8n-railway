/**
 * LUVLANG MASTERING - MAIN ENTRY POINT
 * Initializes all modules and sets up the application
 */

// Core modules
import { EventBus, Events, eventBus } from './core/event-bus.js';
import { AppState, appState } from './core/app-state.js';

// Feature modules
import { CollaborationManager } from './features/collaboration.js';
import { SUBSCRIPTION_TIERS, SubscriptionManager, PricingUI, initSubscription } from './features/subscription-tiers.js';
import { AILearningEngine, AISuggestionUI, initAILearning } from './features/ai-persistent-learning.js';

// Component modules
import { AnalyticsDashboard } from './components/analytics-dashboard.js';
import { PodcastPanel as _PodcastPanel } from './components/podcast-panel.js';
import { BatchProcessor as _BatchProcessor } from './components/batch-processor.js';
import { UndoTimeline as _UndoTimeline } from './components/undo-timeline.js';
import { MultitrackUI as _MultitrackUI } from './components/multitrack-ui.js';

// Configuration
import CONFIG from '../config/index.js';

// Shared utilities
import { log } from './shared/utils.js';

// ============================================
// APPLICATION CLASS
// ============================================

class LuvLangApp {
    constructor(options = {}) {
        this.options = {
            supabaseUrl: CONFIG.SUPABASE.url,
            supabaseKey: CONFIG.SUPABASE.anonKey,
            stripeKey: CONFIG.STRIPE.publicKey,
            ...options
        };

        this.modules = {};
        this.initialized = false;
        this._initPromise = null;

        log.info('App created');
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) {
            log.warn('Already initialized');
            return;
        }

        // Prevent concurrent init calls — return existing promise if in-flight
        if (this._initPromise) {
            return this._initPromise;
        }

        this._initPromise = this._doInit();
        try {
            await this._initPromise;
        } finally {
            this._initPromise = null;
        }
    }

    async _doInit() {

        log.info('Initializing...');

        try {
            // Initialize Supabase client
            await this.initSupabase();

            // Initialize core modules
            await this.initCore();

            // Initialize feature modules
            await this.initFeatures();

            // Initialize UI components
            await this.initUI();

            // Set up event listeners
            this.setupEventListeners();

            this.initialized = true;
            log.info('Initialization complete');

            eventBus.emit('app:ready', { app: this });

        } catch (error) {
            log.error('Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize Supabase client
     */
    async initSupabase() {
        if (typeof supabase !== 'undefined') {
            this.supabase = supabase.createClient(
                this.options.supabaseUrl,
                this.options.supabaseKey
            );
            log.info('Supabase initialized');
        } else {
            log.warn('Supabase not available');
            this.supabase = null;
        }
    }

    /**
     * Initialize core modules
     */
    async initCore() {
        // Event bus is already initialized as singleton
        this.modules.eventBus = eventBus;

        // App state is already initialized as singleton
        this.modules.appState = appState;

        log.info('Core modules initialized');
    }

    /**
     * Initialize feature modules
     */
    async initFeatures() {
        // Subscription manager
        if (this.options.stripeKey) {
            this.modules.subscription = initSubscription(this.supabase, this.options.stripeKey);
        }

        // AI Learning Engine
        this.modules.ai = initAILearning(this.supabase);

        log.info('Feature modules initialized');
    }

    /**
     * Initialize UI components
     */
    async initUI() {
        const containers = {
            collaboration: document.querySelector('#collaboration-panel'),
            analytics: document.querySelector('#analytics-panel'),
            podcast: document.querySelector('#podcast-panel'),
            batch: document.querySelector('#batch-panel'),
            aiSuggestions: document.querySelector('#ai-suggestions-panel'),
            undoTimeline: document.querySelector('#undo-timeline'),
            pricing: document.querySelector('#pricing-page')
        };

        // Collaboration panel
        if (containers.collaboration && this.supabase) {
            this.modules.collaboration = new CollaborationManager(
                containers.collaboration,
                this.supabase
            );
        }

        // Analytics dashboard — reuse single shared AudioContext
        if (containers.analytics) {
            if (!this._audioContext) {
                this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            this.modules.analytics = new AnalyticsDashboard(
                containers.analytics,
                this._audioContext
            );
        }

        // AI Suggestions
        if (containers.aiSuggestions && this.modules.ai) {
            this.modules.aiUI = new AISuggestionUI(
                containers.aiSuggestions,
                this.modules.ai
            );
        }

        // Pricing page
        if (containers.pricing && this.modules.subscription) {
            this.modules.pricingUI = new PricingUI(
                containers.pricing,
                this.modules.subscription
            );
        }

        log.info('UI components initialized');
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Audio loaded
        eventBus.on(Events.AUDIO_LOADED, (data) => {
            log.info('Audio loaded:', data.fileName);

            // Start AI session
            if (this.modules.ai) {
                this.modules.ai.startSession();
            }

            // Start analysis
            if (this.modules.analytics && data.buffer) {
                this.modules.analytics.startAnalysis(data.buffer);
            }
        });

        // Processing complete
        eventBus.on(Events.PROCESSING_COMPLETE, (_data) => {
            log.info('Processing complete');
        });

        // Export complete
        eventBus.on(Events.EXPORT_COMPLETE, async (_data) => {
            log.info('Export complete');

            // Record usage
            if (this.modules.subscription) {
                await this.modules.subscription.recordUsage('tracksProcessed', 1);
            }
        });

        // State change - sync with collaboration
        eventBus.on(Events.STATE_CHANGE, (_data) => {
            if (this.modules.collaboration) {
                this.modules.collaboration.saveProjectState();
            }
        });

        // Keyboard shortcuts — store reference for cleanup
        this._keyHandler = (e) => this.handleKeyboardShortcut(e);
        document.addEventListener('keydown', this._keyHandler);

        // Auto-save state every 30 seconds
        this._autoSaveInterval = setInterval(() => {
            this.saveState();
        }, 30000);

        // Save state before page unload
        window.addEventListener('beforeunload', () => this.saveState());

        // Restore previous state if available
        this.restoreState();
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcut(e) {
        const _shortcuts = CONFIG.UI.shortcuts;

        // Ignore if in input field
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                eventBus.emit(Events.AUDIO_PLAY);
                break;

            case 'Escape':
                eventBus.emit(Events.AUDIO_STOP);
                break;

            case 'KeyB':
                if (!e.ctrlKey && !e.metaKey) {
                    eventBus.emit('bypass:toggle');
                }
                break;

            case 'KeyA':
                if (!e.ctrlKey && !e.metaKey) {
                    eventBus.emit('ab:toggle');
                }
                break;

            case 'KeyZ':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        appState.redo();
                    } else {
                        appState.undo();
                    }
                }
                break;

            case 'KeyE':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    eventBus.emit(Events.EXPORT_START);
                }
                break;
        }
    }

    /**
     * Get module by name
     */
    getModule(name) {
        return this.modules[name];
    }

    /**
     * Check if feature is available
     */
    hasFeature(featureName) {
        if (this.modules.subscription) {
            return this.modules.subscription.hasFeature(featureName);
        }
        return CONFIG.FEATURES[featureName] ?? false;
    }

    /**
     * Get AI suggestions
     */
    getAISuggestions() {
        if (this.modules.ai) {
            return this.modules.ai.getSuggestions();
        }
        return null;
    }

    /**
     * Apply AI suggestions
     */
    applyAISuggestions() {
        if (this.modules.ai) {
            const suggestions = this.modules.ai.getSuggestions();
            this.modules.ai.applySuggestions(suggestions);
        }
    }

    /**
     * Save application state to localStorage
     */
    saveState() {
        try {
            const stateToSave = appState.get();
            // Exclude non-serializable data (audio buffers)
            const { audio, ...saveable } = stateToSave;
            const saveData = {
                ...saveable,
                audio: { ...audio, buffer: null },
                _savedAt: Date.now()
            };
            localStorage.setItem('luvlang_app_state', JSON.stringify(saveData));
        } catch (e) {
            // localStorage full or unavailable — fail silently
        }
    }

    /**
     * Restore state from localStorage
     */
    restoreState() {
        try {
            const saved = localStorage.getItem('luvlang_app_state');
            if (!saved) return;

            const parsed = JSON.parse(saved);
            // Only restore if saved within last 24 hours
            if (parsed._savedAt && Date.now() - parsed._savedAt > 86400000) return;

            // Restore non-audio state (EQ, dynamics, export settings, etc.)
            const restorePaths = ['eq', 'dynamics', 'stereo', 'master', 'export', 'ui', 'podcast', 'batch.settings'];
            for (const path of restorePaths) {
                const value = path.split('.').reduce((obj, key) => obj?.[key], parsed);
                if (value !== undefined) {
                    appState.set(path, value, false); // Don't save to history
                }
            }
        } catch (e) {
            // Corrupted state — fail silently
        }
    }

    /**
     * Get configuration
     */
    getConfig() {
        return CONFIG;
    }

    /**
     * Destroy application — properly clean up all resources
     */
    destroy() {
        // Stop auto-save
        if (this._autoSaveInterval) {
            clearInterval(this._autoSaveInterval);
            this._autoSaveInterval = null;
        }

        // Clean up modules
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });

        // Close shared AudioContext to free resources
        if (this._audioContext && this._audioContext.state !== 'closed') {
            this._audioContext.close().catch(() => {});
            this._audioContext = null;
        }

        // Remove keyboard listener
        document.removeEventListener('keydown', this._keyHandler);

        // Clear event listeners
        eventBus.clear();

        this.initialized = false;
    }
}

// NOTE: Auto-initialization removed to prevent double-init.
// The HTML entry point (src/index.html) handles creating and
// initializing the app instance via:
//   const { LuvLangApp } = await import('./js/index.js');
//   const app = new LuvLangApp();
//   await app.init();

// ============================================
// EXPORTS
// ============================================

export {
    LuvLangApp,

    // Core
    EventBus,
    Events,
    eventBus,
    AppState,
    appState,

    // Features
    CollaborationManager,
    SubscriptionManager,
    SUBSCRIPTION_TIERS,
    AILearningEngine,

    // Components
    AnalyticsDashboard,

    // Config
    CONFIG
};

// Global exports
if (typeof window !== 'undefined') {
    window.LuvLangApp = LuvLangApp;
    window.LUVLANG_CONFIG = CONFIG;
}
