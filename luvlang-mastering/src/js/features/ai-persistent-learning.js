/**
 * ADVANCED AI - PERSISTENT LEARNING SYSTEM
 * Learns from user behavior to provide better mastering suggestions over time
 * Stores preferences, analyzes patterns, and improves recommendations
 */

import { eventBus, Events } from '../core/event-bus.js';
import { appState } from '../core/app-state.js';
import { showToast, resolveContainer } from '../shared/utils.js';

// ============================================
// AI LEARNING CONFIGURATION
// ============================================

const AI_CONFIG = {
    // Learning rate (0-1, higher = faster adaptation)
    learningRate: 0.3,

    // Minimum samples before making predictions
    minSamples: 5,

    // Weight decay for old preferences
    decayRate: 0.95,

    // Maximum history entries per user
    maxHistory: 1000,

    // Feature importance weights
    featureWeights: {
        genre: 0.25,
        targetLUFS: 0.20,
        eqPreferences: 0.15,
        dynamicsPreferences: 0.15,
        saturationPreferences: 0.10,
        stereoPreferences: 0.10,
        timeOfDay: 0.05
    }
};

// ============================================
// USER PROFILE MODEL
// ============================================

class UserProfile {
    constructor(userId) {
        this.userId = userId;
        this.createdAt = new Date().toISOString();
        this.lastUpdated = new Date().toISOString();

        // Genre preferences (weighted)
        this.genrePreferences = {
            pop: 0.5,
            rock: 0.5,
            edm: 0.5,
            hiphop: 0.5,
            jazz: 0.5,
            classical: 0.5,
            acoustic: 0.5,
            metal: 0.5
        };

        // Average settings preferences
        this.avgSettings = {
            targetLUFS: -14,
            limiterCeiling: -0.3,
            stereoWidth: 100,
            saturationAmount: 20,
            compressionRatio: 3
        };

        // EQ preferences per frequency band
        this.eqProfile = {
            sub: 0,      // 60Hz
            bass: 0,     // 170Hz
            lowMid: 0,   // 400Hz
            mid: 0,      // 1kHz
            presence: 0, // 2.5kHz
            brilliance: 0, // 6kHz
            air: 0       // 12kHz
        };

        // Session statistics
        this.stats = {
            totalSessions: 0,
            totalTracksProcessed: 0,
            avgSessionDuration: 0,
            preferredWorkflowType: 'auto', // 'auto', 'manual', 'mixed'
            abTestingUsage: 0,
            presetUsage: 0,
            customPresetCreations: 0
        };

        // Learning history
        this.history = [];
    }

    /**
     * Update profile from session data
     */
    update(sessionData) {
        const lr = AI_CONFIG.learningRate;

        // Update genre preferences
        if (sessionData.genre) {
            this.genrePreferences[sessionData.genre] =
                this.genrePreferences[sessionData.genre] * (1 - lr) +
                1.0 * lr;

            // Decay other genres slightly
            Object.keys(this.genrePreferences).forEach(g => {
                if (g !== sessionData.genre) {
                    this.genrePreferences[g] *= AI_CONFIG.decayRate;
                }
            });
        }

        // Update average settings
        if (sessionData.settings) {
            Object.keys(this.avgSettings).forEach(key => {
                if (sessionData.settings[key] !== undefined) {
                    this.avgSettings[key] =
                        this.avgSettings[key] * (1 - lr) +
                        sessionData.settings[key] * lr;
                }
            });
        }

        // Update EQ profile
        if (sessionData.eq) {
            Object.keys(this.eqProfile).forEach(band => {
                if (sessionData.eq[band] !== undefined) {
                    this.eqProfile[band] =
                        this.eqProfile[band] * (1 - lr) +
                        sessionData.eq[band] * lr;
                }
            });
        }

        // Update stats
        this.stats.totalSessions++;
        this.stats.totalTracksProcessed += sessionData.tracksProcessed || 1;

        // Add to history
        this.history.push({
            timestamp: new Date().toISOString(),
            ...sessionData
        });

        // Trim history if needed
        if (this.history.length > AI_CONFIG.maxHistory) {
            this.history = this.history.slice(-AI_CONFIG.maxHistory);
        }

        this.lastUpdated = new Date().toISOString();
    }

    /**
     * Get top genres
     */
    getTopGenres(n = 3) {
        return Object.entries(this.genrePreferences)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([genre, score]) => ({ genre, score }));
    }

    /**
     * Export profile for storage
     */
    toJSON() {
        return {
            userId: this.userId,
            createdAt: this.createdAt,
            lastUpdated: this.lastUpdated,
            genrePreferences: this.genrePreferences,
            avgSettings: this.avgSettings,
            eqProfile: this.eqProfile,
            stats: this.stats,
            history: this.history.slice(-100) // Only store recent history
        };
    }

    /**
     * Import profile from storage
     */
    static fromJSON(data) {
        const profile = new UserProfile(data.userId);
        Object.assign(profile, data);
        return profile;
    }
}

// ============================================
// AI LEARNING ENGINE
// ============================================

class AILearningEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.userProfile = null;
        this.currentSession = null;
        this.predictions = {};
        this._eventUnsubs = [];

        this.init();
        // Initialized
    }

    /**
     * Initialize learning engine
     */
    async init() {
        // Listen to state changes (store unsubs for cleanup)
        const events = [
            [Events.STATE_CHANGE, (data) => this.onStateChange(data)],
            [Events.AUDIO_LOADED, (data) => this.onAudioLoaded(data)],
            [Events.PROCESSING_COMPLETE, (data) => this.onProcessingComplete(data)],
            [Events.EXPORT_COMPLETE, (data) => this.onExportComplete(data)]
        ];
        for (const [event, handler] of events) {
            const unsub = eventBus.on(event, handler);
            if (typeof unsub === 'function') this._eventUnsubs.push(unsub);
        }

        // Load user profile if authenticated
        await this.loadUserProfile();
    }

    /**
     * Load user profile from database
     */
    async loadUserProfile() {
        if (!this.supabase) {
            // Use local storage as fallback
            const stored = localStorage.getItem('luvlang_ai_profile');
            if (stored) {
                try {
                    this.userProfile = UserProfile.fromJSON(JSON.parse(stored));
                } catch {
                    // Corrupted data — start fresh
                    localStorage.removeItem('luvlang_ai_profile');
                    this.userProfile = new UserProfile('local');
                }
            } else {
                this.userProfile = new UserProfile('local');
            }
            return;
        }

        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return;

            const { data, error: _error } = await this.supabase
                .from('ai_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data) {
                this.userProfile = UserProfile.fromJSON(data.profile);
            } else {
                this.userProfile = new UserProfile(user.id);
            }
        } catch (_error) {
            this.userProfile = new UserProfile('anonymous');
        }
    }

    /**
     * Save user profile
     */
    async saveUserProfile() {
        if (!this.userProfile) return;

        const profileData = this.userProfile.toJSON();

        // Save to local storage as backup
        localStorage.setItem('luvlang_ai_profile', JSON.stringify(profileData));

        if (!this.supabase) return;

        try {
            await this.supabase
                .from('ai_profiles')
                .upsert({
                    user_id: this.userProfile.userId,
                    profile: profileData,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });
        } catch (error) {
            // Save failed silently
        }
    }

    /**
     * Start new mastering session
     */
    startSession() {
        this.currentSession = {
            startTime: Date.now(),
            actions: [],
            initialSettings: { ...appState.get() },
            detectedGenre: null,
            finalSettings: null,
            satisfaction: null
        };
    }

    /**
     * End mastering session
     */
    async endSession(satisfaction = null) {
        if (!this.currentSession) return;

        this.currentSession.endTime = Date.now();
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
        this.currentSession.satisfaction = satisfaction;
        this.currentSession.finalSettings = {
            eq: appState.get('eq'),
            dynamics: appState.get('dynamics'),
            master: appState.get('master'),
            stereo: appState.get('stereo')
        };

        // Extract learning data
        const sessionData = this.extractSessionData();

        // Update user profile
        if (this.userProfile) {
            this.userProfile.update(sessionData);
            await this.saveUserProfile();
        }

        this.currentSession = null;
    }

    /**
     * Extract learning data from session
     */
    extractSessionData() {
        const session = this.currentSession;
        if (!session) return {};

        // Analyze final EQ settings
        const eqState = appState.get('eq');
        const eqData = {};
        if (eqState?.bands) {
            const bandNames = ['sub', 'bass', 'lowMid', 'mid', 'presence', 'brilliance', 'air'];
            eqState.bands.forEach((band, i) => {
                eqData[bandNames[i]] = band.gain;
            });
        }

        return {
            genre: session.detectedGenre || this.detectGenreFromSettings(),
            settings: {
                targetLUFS: appState.get('master.targetLUFS'),
                limiterCeiling: appState.get('dynamics.limiter.ceiling'),
                stereoWidth: appState.get('stereo.width'),
                saturationAmount: appState.get('saturation.amount') || 0,
                compressionRatio: appState.get('dynamics.compressor.ratio')
            },
            eq: eqData,
            duration: session.duration,
            actionCount: session.actions.length,
            tracksProcessed: 1,
            satisfaction: session.satisfaction,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Detect genre from current settings
     */
    detectGenreFromSettings() {
        const lufs = appState.get('master.targetLUFS') || -14;
        const compressionRatio = appState.get('dynamics.compressor.ratio') || 3;
        const bassGain = appState.get('eq.bands.0.gain') || 0;

        // Simple heuristic-based detection
        if (lufs >= -10 && compressionRatio >= 4) {
            return bassGain > 2 ? 'hiphop' : 'edm';
        } else if (lufs <= -16) {
            return compressionRatio < 2.5 ? 'classical' : 'jazz';
        } else if (compressionRatio >= 3.5) {
            return 'rock';
        }

        return 'pop';
    }

    /**
     * Handle state change events
     */
    onStateChange(data) {
        if (!this.currentSession) return;

        this.currentSession.actions.push({
            type: 'state_change',
            path: data.path,
            timestamp: Date.now()
        });
    }

    /**
     * Handle audio loaded event
     */
    onAudioLoaded(data) {
        if (!this.currentSession) {
            this.startSession();
        }

        // Analyze audio and detect genre
        this.currentSession.detectedGenre = this.analyzeAudioForGenre(data);
    }

    /**
     * Analyze audio to detect genre
     */
    analyzeAudioForGenre(audioData) {
        // Simplified genre detection based on spectral analysis
        // In production, this would use ML models

        const features = this.extractAudioFeatures(audioData);

        if (features.bassEnergy > 0.7 && features.tempo > 120) {
            return 'edm';
        } else if (features.bassEnergy > 0.6 && features.tempo < 100) {
            return 'hiphop';
        } else if (features.midEnergy > 0.6 && features.dynamicRange > 15) {
            return 'classical';
        } else if (features.highEnergy > 0.5 && features.tempo > 100) {
            return 'rock';
        }

        return 'pop';
    }

    /**
     * Extract audio features for genre detection
     */
    extractAudioFeatures(_audioData) {
        // Placeholder - would use actual audio analysis
        return {
            bassEnergy: 0.5,
            midEnergy: 0.5,
            highEnergy: 0.5,
            tempo: 120,
            dynamicRange: 10
        };
    }

    /**
     * Handle processing complete event
     */
    onProcessingComplete(_data) {
        if (this.currentSession) {
            this.currentSession.actions.push({
                type: 'processing_complete',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Handle export complete event
     */
    async onExportComplete(_data) {
        // End session with implicit satisfaction (user exported = satisfied)
        await this.endSession(0.8);
    }

    /**
     * Get AI suggestions based on user profile
     */
    getSuggestions(_audioAnalysis = null) {
        if (!this.userProfile) {
            return this.getDefaultSuggestions();
        }

        const suggestions = {
            confidence: 0,
            settings: {},
            reasons: []
        };

        // Calculate confidence based on data available
        const sampleCount = this.userProfile.stats.totalSessions;
        suggestions.confidence = Math.min(0.95, sampleCount / (sampleCount + AI_CONFIG.minSamples));

        // Get genre-based recommendations
        const topGenres = this.userProfile.getTopGenres(1);
        if (topGenres.length > 0) {
            const preferredGenre = topGenres[0].genre;
            suggestions.settings.genre = preferredGenre;
            suggestions.reasons.push(`Detected preference for ${preferredGenre} style`);
        }

        // Use average settings as base
        suggestions.settings.targetLUFS = this.userProfile.avgSettings.targetLUFS;
        suggestions.settings.limiterCeiling = this.userProfile.avgSettings.limiterCeiling;
        suggestions.settings.stereoWidth = this.userProfile.avgSettings.stereoWidth;
        suggestions.settings.saturationAmount = this.userProfile.avgSettings.saturationAmount;
        suggestions.settings.compressionRatio = this.userProfile.avgSettings.compressionRatio;

        // EQ suggestions
        suggestions.settings.eq = { ...this.userProfile.eqProfile };

        // Add reasons
        if (Math.abs(this.userProfile.avgSettings.targetLUFS - (-14)) > 1) {
            suggestions.reasons.push(
                `Based on your history, targeting ${this.userProfile.avgSettings.targetLUFS.toFixed(1)} LUFS`
            );
        }

        // Time-based adjustments
        const hour = new Date().getHours();
        if (hour >= 22 || hour < 6) {
            suggestions.reasons.push('Late night session - subtle settings recommended');
        }

        return suggestions;
    }

    /**
     * Get default suggestions for new users
     */
    getDefaultSuggestions() {
        return {
            confidence: 0.3,
            settings: {
                genre: 'pop',
                targetLUFS: -14,
                limiterCeiling: -0.3,
                stereoWidth: 100,
                saturationAmount: 15,
                compressionRatio: 3,
                eq: {
                    sub: 0,
                    bass: 0,
                    lowMid: 0,
                    mid: 0,
                    presence: 0,
                    brilliance: 0,
                    air: 0
                }
            },
            reasons: ['Using standard streaming-optimized settings']
        };
    }

    /**
     * Apply AI suggestions to current state
     */
    applySuggestions(suggestions) {
        if (!suggestions?.settings) return;

        const settings = suggestions.settings;

        // Apply EQ
        if (settings.eq) {
            const bandNames = ['sub', 'bass', 'lowMid', 'mid', 'presence', 'brilliance', 'air'];
            const bands = appState.get('eq.bands');
            bandNames.forEach((name, i) => {
                if (settings.eq[name] !== undefined && bands[i]) {
                    appState.set(`eq.bands.${i}.gain`, settings.eq[name]);
                }
            });
        }

        // Apply dynamics
        if (settings.compressionRatio) {
            appState.set('dynamics.compressor.ratio', settings.compressionRatio);
        }
        if (settings.limiterCeiling) {
            appState.set('dynamics.limiter.ceiling', settings.limiterCeiling);
        }

        // Apply master settings
        if (settings.targetLUFS) {
            appState.set('master.targetLUFS', settings.targetLUFS);
        }

        // Apply stereo
        if (settings.stereoWidth) {
            appState.set('stereo.width', settings.stereoWidth);
        }

        eventBus.emit(Events.AI_APPLY, { suggestions, applied: true });
    }

    /**
     * Learn from user feedback
     */
    async learnFromFeedback(rating, _comments = '') {
        if (!this.currentSession) return;

        this.currentSession.satisfaction = rating / 5; // Normalize to 0-1

        // If rating is high, reinforce current settings
        if (rating >= 4) {
            // Increase learning rate temporarily for positive feedback
            const originalLR = AI_CONFIG.learningRate;
            AI_CONFIG.learningRate = 0.5;

            await this.endSession(rating / 5);

            AI_CONFIG.learningRate = originalLR;
        } else {
            await this.endSession(rating / 5);
        }

    }

    /**
     * Get learning statistics
     */
    getStats() {
        if (!this.userProfile) return null;

        return {
            totalSessions: this.userProfile.stats.totalSessions,
            totalTracks: this.userProfile.stats.totalTracksProcessed,
            topGenres: this.userProfile.getTopGenres(3),
            avgSettings: this.userProfile.avgSettings,
            profileAge: this.userProfile.createdAt,
            lastActive: this.userProfile.lastUpdated
        };
    }

    /**
     * Reset learning profile
     */
    async resetProfile() {
        if (!this.userProfile) return;

        const userId = this.userProfile.userId;
        this.userProfile = new UserProfile(userId);
        await this.saveUserProfile();
    }

    /**
     * Cleanup all resources
     */
    destroy() {
        for (const unsub of this._eventUnsubs) {
            unsub();
        }
        this._eventUnsubs = [];
        this.currentSession = null;
    }

    /**
     * Export learning data
     */
    exportData() {
        if (!this.userProfile) return null;

        return {
            profile: this.userProfile.toJSON(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * Import learning data
     */
    async importData(data) {
        if (!data?.profile) return false;

        try {
            this.userProfile = UserProfile.fromJSON(data.profile);
            await this.saveUserProfile();
            return true;
        } catch (error) {
            console.error('[AILearningEngine] Import failed:', error);
            return false;
        }
    }
}

// ============================================
// AI SUGGESTION UI COMPONENT
// ============================================

class AISuggestionUI {
    constructor(container, aiEngine) {
        this.container = resolveContainer(container);
        this.ai = aiEngine;

        if (this.container) {
            this.render();
        }
    }

    render() {
        const suggestions = this.ai.getSuggestions();
        const stats = this.ai.getStats();

        this.container.innerHTML = `
            <div class="ai-suggestions-panel">
                <div class="ai-header">
                    <div class="ai-title">
                        <span class="icon">🤖</span>
                        <span>AI ASSISTANT</span>
                    </div>
                    <div class="ai-confidence">
                        Confidence: ${Math.round(suggestions.confidence * 100)}%
                    </div>
                </div>

                <div class="ai-suggestions">
                    <h4>Suggested Settings</h4>
                    <ul class="suggestion-list">
                        ${suggestions.reasons.map(r => `<li>💡 ${r}</li>`).join('')}
                    </ul>

                    <button class="btn-apply-suggestions" id="btn-apply-ai">
                        <span>✨ Apply AI Suggestions</span>
                    </button>
                </div>

                ${stats ? `
                <div class="ai-stats">
                    <h4>Learning Progress</h4>
                    <div class="stat-grid">
                        <div class="stat-item">
                            <div class="stat-value">${stats.totalSessions}</div>
                            <div class="stat-label">Sessions</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.totalTracks}</div>
                            <div class="stat-label">Tracks</div>
                        </div>
                    </div>
                    <div class="top-genres">
                        <h5>Your Style</h5>
                        ${stats.topGenres.map(g => `
                            <div class="genre-bar">
                                <span>${g.genre}</span>
                                <div class="bar" style="width: ${g.score * 100}%"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="ai-feedback">
                    <h4>Rate This Master</h4>
                    <div class="rating-stars">
                        ${[1,2,3,4,5].map(n => `
                            <button class="star" data-rating="${n}">★</button>
                        `).join('')}
                    </div>
                    <p class="rating-hint">Your feedback helps improve suggestions</p>
                </div>

                <div class="ai-actions">
                    <button class="btn-reset-ai" id="btn-reset-ai">Reset Learning</button>
                    <button class="btn-export-ai" id="btn-export-ai">Export Data</button>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        // Apply suggestions button
        const applyBtn = this.container.querySelector('#btn-apply-ai');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const suggestions = this.ai.getSuggestions();
                this.ai.applySuggestions(suggestions);
                this.showToast('AI suggestions applied!');
            });
        }

        // Rating stars
        this.container.querySelectorAll('.rating-stars .star').forEach(star => {
            star.addEventListener('click', async () => {
                const rating = parseInt(star.dataset.rating);

                // Update UI
                this.container.querySelectorAll('.rating-stars .star').forEach((s, i) => {
                    s.classList.toggle('active', i < rating);
                });

                // Send feedback
                await this.ai.learnFromFeedback(rating);
                this.showToast(`Thanks for your ${rating}-star rating!`);
                this.render(); // Refresh stats
            });
        });

        // Reset button
        const resetBtn = this.container.querySelector('#btn-reset-ai');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (confirm('Reset AI learning? This will clear all learned preferences.')) {
                    await this.ai.resetProfile();
                    this.render();
                    this.showToast('AI learning reset');
                }
            });
        }

        // Export button
        const exportBtn = this.container.querySelector('#btn-export-ai');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const data = this.ai.exportData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `luvlang-ai-profile-${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }
    }

    showToast(message) {
        showToast(message, { className: 'ai-toast', duration: 3000 });
    }
}

// ============================================
// EXPORTS
// ============================================

let aiLearningEngine = null;

const initAILearning = (supabaseClient) => {
    aiLearningEngine = new AILearningEngine(supabaseClient);
    return aiLearningEngine;
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AI_CONFIG,
        UserProfile,
        AILearningEngine,
        AISuggestionUI,
        initAILearning
    };
}

if (typeof window !== 'undefined') {
    window.AILearningEngine = AILearningEngine;
    window.AISuggestionUI = AISuggestionUI;
    window.initAILearning = initAILearning;
}

export {
    AI_CONFIG,
    UserProfile,
    AILearningEngine,
    AISuggestionUI,
    initAILearning
};
