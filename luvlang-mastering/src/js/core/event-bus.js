/**
 * EVENT BUS - Centralized pub/sub for component communication
 * Enables decoupled communication between UI components and audio processors
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Set();
        this.debugMode = false;

        // Initialized
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }

        this.events.get(event).add(callback);

        if (this.debugMode) {
            // eslint-disable-next-line no-console
            console.log(`[EventBus] Subscribed to: ${event}`);
        }

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     */
    once(event, callback) {
        const onceWrapper = (...args) => {
            callback(...args);
            this.off(event, onceWrapper);
        };

        this.onceEvents.add(onceWrapper);
        this.on(event, onceWrapper);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     */
    off(event, callback) {
        if (this.events.has(event)) {
            this.events.get(event).delete(callback);
            this.onceEvents.delete(callback);

            if (this.events.get(event).size === 0) {
                this.events.delete(event);
            }
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.debugMode) {
            // eslint-disable-next-line no-console
            console.log(`[EventBus] Emitting: ${event}`, data);
        }

        if (this.events.has(event)) {
            for (const callback of this.events.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in handler for ${event}:`, error);
                }
            }
        }
    }

    /**
     * Clear all subscriptions for an event
     * @param {string} event - Event name
     */
    clear(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
            this.onceEvents.clear();
        }
    }

    /**
     * Get subscriber count for an event
     * @param {string} event - Event name
     * @returns {number}
     */
    subscriberCount(event) {
        return this.events.has(event) ? this.events.get(event).size : 0;
    }

    /**
     * List all active events
     * @returns {string[]}
     */
    listEvents() {
        return Array.from(this.events.keys());
    }

    /**
     * Enable/disable debug mode
     * @param {boolean} enabled
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        // eslint-disable-next-line no-console
        console.log(`[EventBus] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }
}

// Event names constants
const Events = {
    // Audio Events
    AUDIO_LOADED: 'audio:loaded',
    AUDIO_PLAY: 'audio:play',
    AUDIO_PAUSE: 'audio:pause',
    AUDIO_STOP: 'audio:stop',
    AUDIO_SEEK: 'audio:seek',
    AUDIO_PROGRESS: 'audio:progress',
    AUDIO_ENDED: 'audio:ended',

    // Processing Events
    PROCESSING_START: 'processing:start',
    PROCESSING_PROGRESS: 'processing:progress',
    PROCESSING_COMPLETE: 'processing:complete',
    PROCESSING_ERROR: 'processing:error',

    // EQ Events
    EQ_CHANGE: 'eq:change',
    EQ_BYPASS: 'eq:bypass',
    EQ_RESET: 'eq:reset',

    // Dynamics Events
    DYNAMICS_CHANGE: 'dynamics:change',
    COMPRESSOR_CHANGE: 'compressor:change',
    LIMITER_CHANGE: 'limiter:change',

    // Multitrack Events
    TRACK_ADD: 'track:add',
    TRACK_REMOVE: 'track:remove',
    TRACK_UPDATE: 'track:update',
    TRACK_SOLO: 'track:solo',
    TRACK_MUTE: 'track:mute',
    MIX_RENDER: 'mix:render',

    // Batch Events
    BATCH_ADD: 'batch:add',
    BATCH_START: 'batch:start',
    BATCH_PROGRESS: 'batch:progress',
    BATCH_ITEM_COMPLETE: 'batch:item:complete',
    BATCH_COMPLETE: 'batch:complete',
    BATCH_ERROR: 'batch:error',

    // History Events
    HISTORY_SAVE: 'history:save',
    HISTORY_UNDO: 'history:undo',
    HISTORY_REDO: 'history:redo',
    HISTORY_JUMP: 'history:jump',

    // UI Events
    PANEL_TOGGLE: 'panel:toggle',
    THEME_CHANGE: 'theme:change',
    MODE_CHANGE: 'mode:change',

    // Podcast Events
    PODCAST_PRESET: 'podcast:preset',
    PODCAST_SPEAKER_DETECT: 'podcast:speaker:detect',

    // Analytics Events
    ANALYSIS_START: 'analysis:start',
    ANALYSIS_COMPLETE: 'analysis:complete',
    LUFS_UPDATE: 'lufs:update',

    // Collaboration Events
    COLLAB_CONNECT: 'collab:connect',
    COLLAB_DISCONNECT: 'collab:disconnect',
    COLLAB_CURSOR: 'collab:cursor',
    COLLAB_COMMENT: 'collab:comment',

    // Export Events
    EXPORT_START: 'export:start',
    EXPORT_PROGRESS: 'export:progress',
    EXPORT_COMPLETE: 'export:complete',
    EXPORT_ERROR: 'export:error',

    // State Events
    STATE_CHANGE: 'state:change',
    STATE_RESET: 'state:reset',

    // AI Events
    AI_ANALYZE: 'ai:analyze',
    AI_SUGGEST: 'ai:suggest',
    AI_APPLY: 'ai:apply',
    AI_LEARN: 'ai:learn'
};

// Singleton instance
const eventBus = new EventBus();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventBus, Events, eventBus };
}

if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
    window.Events = Events;
    window.eventBus = eventBus;
}

export { EventBus, Events, eventBus };
