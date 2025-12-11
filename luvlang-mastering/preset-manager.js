/**
 * PRESET MANAGER
 * Save, load, delete, and share custom user presets
 * Uses localStorage for persistence
 */

class PresetManager {
    constructor() {
        this.presets = {};
        this.currentPresetName = null;
        this.storageKey = 'luvlang_user_presets';

        this.loadPresetsFromStorage();
        console.log('✅ Preset Manager initialized');
        console.log(`  📦 Loaded ${Object.keys(this.presets).length} saved presets`);
    }

    /**
     * Save current state as a preset
     */
    savePreset(name, state) {
        if (!name || name.trim() === '') {
            throw new Error('Preset name cannot be empty');
        }

        const preset = {
            name: name.trim(),
            createdAt: new Date().toISOString(),
            state: {
                // 7-band EQ
                eq: state.eq || [0, 0, 0, 0, 0, 0, 0],

                // Compression
                compression: {
                    threshold: state.compression?.threshold || -20,
                    ratio: state.compression?.ratio || 6,
                    attack: state.compression?.attack || 0.003,
                    release: state.compression?.release || 0.250
                },

                // Limiter
                limiter: {
                    threshold: state.limiter?.threshold || -1.5,
                    ratio: state.limiter?.ratio || 20
                },

                // Master controls
                masterGain: state.masterGain || 0,
                stereoWidth: state.stereoWidth || 100,

                // Genre and platform
                genre: state.genre || 'universal',
                platform: state.platform || 'spotify',

                // Multiband (if active)
                multiband: state.multiband || null,

                // M/S settings (if active)
                ms: state.ms || null,

                // Reference track (if used)
                referenceTrack: state.referenceTrack || null
            }
        };

        this.presets[name] = preset;
        this.currentPresetName = name;
        this.savePresetsToStorage();

        console.log(`💾 Preset saved: "${name}"`);
        return preset;
    }

    /**
     * Load a preset by name
     */
    loadPreset(name) {
        const preset = this.presets[name];

        if (!preset) {
            throw new Error(`Preset "${name}" not found`);
        }

        this.currentPresetName = name;
        console.log(`📂 Preset loaded: "${name}"`);

        return preset.state;
    }

    /**
     * Delete a preset
     */
    deletePreset(name) {
        if (!this.presets[name]) {
            throw new Error(`Preset "${name}" not found`);
        }

        delete this.presets[name];

        if (this.currentPresetName === name) {
            this.currentPresetName = null;
        }

        this.savePresetsToStorage();
        console.log(`🗑️ Preset deleted: "${name}"`);
    }

    /**
     * Update current preset with new state
     */
    updateCurrentPreset(state) {
        if (!this.currentPresetName) {
            throw new Error('No preset currently loaded');
        }

        this.savePreset(this.currentPresetName, state);
        console.log(`♻️ Updated preset: "${this.currentPresetName}"`);
    }

    /**
     * Get list of all preset names
     */
    getPresetNames() {
        return Object.keys(this.presets).sort();
    }

    /**
     * Get full preset list with metadata
     */
    getAllPresets() {
        return Object.values(this.presets).map(preset => ({
            name: preset.name,
            createdAt: preset.createdAt,
            genre: preset.state.genre,
            platform: preset.state.platform
        }));
    }

    /**
     * Check if preset exists
     */
    presetExists(name) {
        return this.presets.hasOwnProperty(name);
    }

    /**
     * Rename a preset
     */
    renamePreset(oldName, newName) {
        if (!this.presets[oldName]) {
            throw new Error(`Preset "${oldName}" not found`);
        }

        if (this.presets[newName]) {
            throw new Error(`Preset "${newName}" already exists`);
        }

        this.presets[newName] = this.presets[oldName];
        this.presets[newName].name = newName;
        delete this.presets[oldName];

        if (this.currentPresetName === oldName) {
            this.currentPresetName = newName;
        }

        this.savePresetsToStorage();
        console.log(`✏️ Preset renamed: "${oldName}" → "${newName}"`);
    }

    /**
     * Export preset as JSON file
     */
    exportPreset(name) {
        const preset = this.presets[name];

        if (!preset) {
            throw new Error(`Preset "${name}" not found`);
        }

        const json = JSON.stringify(preset, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Download
        const a = document.createElement('a');
        a.href = url;
        a.download = `luvlang_preset_${name.replace(/\s+/g, '_')}.json`;
        a.click();

        URL.revokeObjectURL(url);
        console.log(`📤 Exported preset: "${name}"`);
    }

    /**
     * Import preset from JSON file
     */
    importPreset(jsonString) {
        try {
            const preset = JSON.parse(jsonString);

            if (!preset.name || !preset.state) {
                throw new Error('Invalid preset format');
            }

            // Avoid name conflicts
            let importName = preset.name;
            let counter = 1;
            while (this.presets[importName]) {
                importName = `${preset.name} (${counter})`;
                counter++;
            }

            this.presets[importName] = preset;
            this.savePresetsToStorage();

            console.log(`📥 Imported preset: "${importName}"`);
            return importName;

        } catch (error) {
            throw new Error('Invalid preset file: ' + error.message);
        }
    }

    /**
     * Export all presets as single JSON file
     */
    exportAllPresets() {
        const allPresets = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            presets: this.presets
        };

        const json = JSON.stringify(allPresets, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `luvlang_all_presets_${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
        console.log(`📤 Exported ${Object.keys(this.presets).length} presets`);
    }

    /**
     * Import multiple presets from JSON file
     */
    importAllPresets(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (!data.presets) {
                throw new Error('Invalid preset collection format');
            }

            let importCount = 0;

            Object.values(data.presets).forEach(preset => {
                if (preset.name && preset.state) {
                    // Avoid name conflicts
                    let importName = preset.name;
                    let counter = 1;
                    while (this.presets[importName]) {
                        importName = `${preset.name} (${counter})`;
                        counter++;
                    }

                    this.presets[importName] = preset;
                    importCount++;
                }
            });

            this.savePresetsToStorage();
            console.log(`📥 Imported ${importCount} presets`);
            return importCount;

        } catch (error) {
            throw new Error('Invalid preset collection file: ' + error.message);
        }
    }

    /**
     * Save presets to localStorage
     */
    savePresetsToStorage() {
        try {
            const json = JSON.stringify(this.presets);
            localStorage.setItem(this.storageKey, json);
            console.log('💾 Presets saved to localStorage');
        } catch (error) {
            console.error('❌ Error saving presets to localStorage:', error);
        }
    }

    /**
     * Load presets from localStorage
     */
    loadPresetsFromStorage() {
        try {
            const json = localStorage.getItem(this.storageKey);
            if (json) {
                this.presets = JSON.parse(json);
                console.log('📂 Presets loaded from localStorage');
            }
        } catch (error) {
            console.error('❌ Error loading presets from localStorage:', error);
            this.presets = {};
        }
    }

    /**
     * Clear all presets (with confirmation)
     */
    clearAllPresets() {
        this.presets = {};
        this.currentPresetName = null;
        this.savePresetsToStorage();
        console.log('🗑️ All presets cleared');
    }

    /**
     * Get preset summary for display
     */
    getPresetSummary(name) {
        const preset = this.presets[name];
        if (!preset) return null;

        const state = preset.state;

        return {
            name: preset.name,
            created: new Date(preset.createdAt).toLocaleDateString(),
            genre: state.genre,
            platform: state.platform,
            eqActive: state.eq.some(v => v !== 0),
            multibandActive: !!state.multiband,
            msActive: !!state.ms,
            referenceUsed: !!state.referenceTrack
        };
    }

    /**
     * Create factory presets (built-in)
     */
    static getFactoryPresets() {
        return {
            'Streaming Master': {
                eq: [2, 1, -1, 0, 1, 2, 3],
                compression: { threshold: -18, ratio: 6 },
                masterGain: 0,
                stereoWidth: 110,
                genre: 'pop',
                platform: 'spotify'
            },
            'Club Banger': {
                eq: [4, 3, -2, 0, 1, 2, 2],
                compression: { threshold: -16, ratio: 8 },
                masterGain: 1,
                stereoWidth: 120,
                genre: 'edm',
                platform: 'spotify'
            },
            'Hip-Hop Master': {
                eq: [5, 4, -1, 0, 2, 1, 2],
                compression: { threshold: -17, ratio: 7 },
                masterGain: 1,
                stereoWidth: 100,
                genre: 'hiphop',
                platform: 'spotify'
            },
            'Rock Master': {
                eq: [1, 2, -1, 1, 2, 3, 2],
                compression: { threshold: -18, ratio: 6 },
                masterGain: 0,
                stereoWidth: 115,
                genre: 'rock',
                platform: 'spotify'
            },
            'Podcast Optimized': {
                eq: [0, -2, -1, 2, 3, 0, 1],
                compression: { threshold: -20, ratio: 5 },
                masterGain: -1,
                stereoWidth: 100,
                genre: 'universal',
                platform: 'spotify'
            },
            'Natural Dynamics': {
                eq: [0, 0, 0, 0, 1, 1, 2],
                compression: { threshold: -22, ratio: 3 },
                masterGain: 0,
                stereoWidth: 100,
                genre: 'jazz',
                platform: 'tidal'
            }
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PresetManager;
}
