/**
 * ADAPTIVE LEARNING SYSTEM
 *
 * Learns from user adjustments and creates personalized AI profile
 * - Watches when users manually adjust after AI master
 * - Learns patterns: "This user always adds +2dB at 10kHz for EDM"
 * - Creates personalized mastering style
 * - Future masters incorporate user preferences
 *
 * Privacy-first: All data stored in browser localStorage
 */

class AdaptiveLearningSystem {
    constructor() {
        this.learningData = {
            adjustments: [],
            genrePreferences: {},
            eqPreferences: {},
            compressionPreferences: {},
            limitingPreferences: {},
            totalSessions: 0
        };

        this.loadLearningData();
    }

    /**
     * Record user adjustment after AI master
     */
    recordAdjustment(context) {
        const adjustment = {
            timestamp: Date.now(),
            genre: context.genre,
            aiSettings: context.aiSettings,
            userSettings: context.userSettings,
            changes: this.calculateChanges(context.aiSettings, context.userSettings)
        };

        this.learningData.adjustments.push(adjustment);
        this.learningData.totalSessions++;

        // Update genre-specific preferences
        if (!this.learningData.genrePreferences[context.genre]) {
            this.learningData.genrePreferences[context.genre] = {
                sessions: 0,
                avgEQAdjustments: {},
                avgCompressionAdjustments: {},
                avgLimitingAdjustments: {}
            };
        }

        const genrePref = this.learningData.genrePreferences[context.genre];
        genrePref.sessions++;

        // Update preferences
        this.updatePreferences(genrePref, adjustment.changes);

        // Save to localStorage
        this.saveLearningData();

    }

    /**
     * Calculate changes between AI and user settings
     */
    calculateChanges(aiSettings, userSettings) {
        const changes = {
            eq: {},
            compression: {},
            limiting: {},
            overall: {}
        };

        // EQ changes
        if (aiSettings.eq && userSettings.eq) {
            for (const [band, aiValue] of Object.entries(aiSettings.eq)) {
                const userValue = userSettings.eq[band];
                if (userValue !== undefined) {
                    changes.eq[band] = userValue - aiValue;
                }
            }
        }

        // Compression changes
        if (aiSettings.compression && userSettings.compression) {
            for (const [param, aiValue] of Object.entries(aiSettings.compression)) {
                const userValue = userSettings.compression[param];
                if (userValue !== undefined) {
                    changes.compression[param] = userValue - aiValue;
                }
            }
        }

        // Limiting changes
        if (aiSettings.limiting && userSettings.limiting) {
            for (const [param, aiValue] of Object.entries(aiSettings.limiting)) {
                const userValue = userSettings.limiting[param];
                if (userValue !== undefined) {
                    changes.limiting[param] = userValue - aiValue;
                }
            }
        }

        return changes;
    }

    /**
     * Update preferences based on new changes
     */
    updatePreferences(genrePref, changes) {
        // Update EQ preferences (running average)
        for (const [band, change] of Object.entries(changes.eq || {})) {
            if (!genrePref.avgEQAdjustments[band]) {
                genrePref.avgEQAdjustments[band] = 0;
            }
            genrePref.avgEQAdjustments[band] =
                (genrePref.avgEQAdjustments[band] * (genrePref.sessions - 1) + change) /
                genrePref.sessions;
        }

        // Update compression preferences
        for (const [param, change] of Object.entries(changes.compression || {})) {
            if (!genrePref.avgCompressionAdjustments[param]) {
                genrePref.avgCompressionAdjustments[param] = 0;
            }
            genrePref.avgCompressionAdjustments[param] =
                (genrePref.avgCompressionAdjustments[param] * (genrePref.sessions - 1) + change) /
                genrePref.sessions;
        }

        // Update limiting preferences
        for (const [param, change] of Object.entries(changes.limiting || {})) {
            if (!genrePref.avgLimitingAdjustments[param]) {
                genrePref.avgLimitingAdjustments[param] = 0;
            }
            genrePref.avgLimitingAdjustments[param] =
                (genrePref.avgLimitingAdjustments[param] * (genrePref.sessions - 1) + change) /
                genrePref.sessions;
        }
    }

    /**
     * Apply learned preferences to AI settings
     */
    applyLearnedPreferences(aiSettings, genre) {
        if (!this.learningData.genrePreferences[genre]) {
            return aiSettings;
        }

        const genrePref = this.learningData.genrePreferences[genre];

        // Only apply if we have enough data (at least 3 sessions)
        if (genrePref.sessions < 3) {
            return aiSettings;
        }

        // Apply EQ adjustments
        if (aiSettings.eq) {
            for (const [band, avgChange] of Object.entries(genrePref.avgEQAdjustments)) {
                if (aiSettings.eq[band] !== undefined) {
                    aiSettings.eq[band] += avgChange;
                }
            }
        }

        // Apply compression adjustments
        if (aiSettings.compression) {
            for (const [param, avgChange] of Object.entries(genrePref.avgCompressionAdjustments)) {
                if (aiSettings.compression[param] !== undefined) {
                    aiSettings.compression[param] += avgChange;
                }
            }
        }

        // Apply limiting adjustments
        if (aiSettings.limiting) {
            for (const [param, avgChange] of Object.entries(genrePref.avgLimitingAdjustments)) {
                if (aiSettings.limiting[param] !== undefined) {
                    aiSettings.limiting[param] += avgChange;
                }
            }
        }

        return aiSettings;
    }

    /**
     * Get learning statistics
     */
    getStatistics() {
        const stats = {
            totalSessions: this.learningData.totalSessions,
            genresLearned: Object.keys(this.learningData.genrePreferences).length,
            totalAdjustments: this.learningData.adjustments.length,
            genreBreakdown: {}
        };

        for (const [genre, pref] of Object.entries(this.learningData.genrePreferences)) {
            stats.genreBreakdown[genre] = {
                sessions: pref.sessions,
                commonAdjustments: this.getCommonAdjustments(pref)
            };
        }

        return stats;
    }

    /**
     * Get most common adjustments for a genre
     */
    getCommonAdjustments(genrePref) {
        const adjustments = [];

        // Significant EQ adjustments (> ±1dB)
        for (const [band, avgChange] of Object.entries(genrePref.avgEQAdjustments)) {
            if (Math.abs(avgChange) > 1.0) {
                adjustments.push({
                    type: 'EQ',
                    parameter: band,
                    change: avgChange,
                    description: `${avgChange > 0 ? '+' : ''}${avgChange.toFixed(1)} dB @ ${band}`
                });
            }
        }

        // Significant compression adjustments
        for (const [param, avgChange] of Object.entries(genrePref.avgCompressionAdjustments)) {
            if (Math.abs(avgChange) > 0.5) {
                adjustments.push({
                    type: 'Compression',
                    parameter: param,
                    change: avgChange
                });
            }
        }

        return adjustments;
    }

    /**
     * Reset learning data
     */
    resetLearningData() {
        if (confirm('Reset all learned preferences? This cannot be undone.')) {
            this.learningData = {
                adjustments: [],
                genrePreferences: {},
                eqPreferences: {},
                compressionPreferences: {},
                limitingPreferences: {},
                totalSessions: 0
            };

            this.saveLearningData();
            return true;
        }
        return false;
    }

    /**
     * Export learning data
     */
    exportLearningData() {
        const json = JSON.stringify(this.learningData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `luvlang-learning-data-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Import learning data
     */
    async importLearningData(file) {
        try {
            const text = await file.text();
            const imported = JSON.parse(text);

            // Validate structure
            if (!imported.adjustments || !imported.genrePreferences) {
                throw new Error('Invalid learning data format');
            }

            this.learningData = imported;
            this.saveLearningData();

            return true;
        } catch (error) {
            console.error('[Adaptive Learning] Import failed:', error);
            return false;
        }
    }

    /**
     * Save to localStorage
     */
    saveLearningData() {
        try {
            localStorage.setItem('luvlang_adaptive_learning',
                                JSON.stringify(this.learningData));
        } catch (error) {
            console.error('[Adaptive Learning] Save failed:', error);
        }
    }

    /**
     * Load from localStorage
     */
    loadLearningData() {
        try {
            const stored = localStorage.getItem('luvlang_adaptive_learning');
            if (stored) {
                this.learningData = JSON.parse(stored);
            }
        } catch (error) {
            console.error('[Adaptive Learning] Load failed:', error);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdaptiveLearningSystem;
}
