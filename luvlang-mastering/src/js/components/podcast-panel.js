/* global PodcastMasteringEngine */
/**
 * PODCAST MODE UI
 * Dedicated interface for podcast-specific mastering
 * Exposes existing podcast-suite.js with visual controls
 */

import { eventBus, Events } from '../core/event-bus.js';
import { appState } from '../core/app-state.js';
import { resolveContainer } from '../shared/utils.js';

class PodcastPanel {
    constructor(container, audioContext) {
        this.container = resolveContainer(container);
        this.audioContext = audioContext;
        this.podcastEngine = null;
        this.currentPreset = 'interview';
        this.settings = {
            voiceClarity: 2.5,
            deessing: 5,
            breathRemoval: 4,
            roomTone: 5
        };
        this.detectedSpeakers = [];

        if (this.container) {
            this.init();
        }

        // Initialized
    }

    /**
     * Initialize podcast panel
     */
    async init() {
        // Load podcast engine
        if (typeof PodcastMasteringEngine !== 'undefined') {
            this.podcastEngine = new PodcastMasteringEngine(this.audioContext);
        }

        this.render();
        this.bindEvents();
    }

    /**
     * Render podcast panel
     */
    render() {
        const presets = this.podcastEngine?.getPresets() || [
            { id: 'interview', name: 'Interview (2+ Speakers)', targetLUFS: -16 },
            { id: 'solo', name: 'Solo Narrator', targetLUFS: -16 },
            { id: 'roundtable', name: 'Roundtable (4+ Speakers)', targetLUFS: -16 },
            { id: 'storytelling', name: 'Storytelling', targetLUFS: -18 },
            { id: 'videocast', name: 'Video Podcast (YouTube)', targetLUFS: -14 }
        ];

        this.container.innerHTML = `
            <div class="podcast-panel">
                <div class="podcast-header">
                    <div class="podcast-title">
                        <span class="icon">🎙️</span>
                        <span>PODCAST MODE</span>
                    </div>
                    <button class="btn-switch-mode" id="btn-switch-music">
                        <span>Switch to Music Mode</span>
                    </button>
                </div>

                <div class="podcast-presets">
                    ${presets.map(preset => `
                        <button class="preset-btn ${preset.id === this.currentPreset ? 'active' : ''}"
                                data-preset="${preset.id}"
                                title="${preset.targetLUFS} LUFS">
                            ${this.getPresetIcon(preset.id)}
                            <span>${preset.name.split(' ')[0]}</span>
                        </button>
                    `).join('')}
                </div>

                <div class="podcast-controls">
                    <div class="control-row">
                        <label class="control-label">Voice Clarity</label>
                        <input type="range" class="control-slider" id="voice-clarity"
                               min="0" max="5" step="0.1" value="${this.settings.voiceClarity}">
                        <span class="control-value" id="voice-clarity-value">
                            +${this.settings.voiceClarity.toFixed(1)} dB
                        </span>
                    </div>

                    <div class="control-row">
                        <label class="control-label">De-essing</label>
                        <input type="range" class="control-slider" id="deessing"
                               min="0" max="10" step="1" value="${this.settings.deessing}">
                        <span class="control-value" id="deessing-value">
                            ${this.settings.deessing}/10
                        </span>
                    </div>

                    <div class="control-row">
                        <label class="control-label">Breath Removal</label>
                        <input type="range" class="control-slider" id="breath-removal"
                               min="0" max="10" step="1" value="${this.settings.breathRemoval}">
                        <span class="control-value" id="breath-removal-value">
                            ${this.settings.breathRemoval}/10
                        </span>
                    </div>

                    <div class="control-row">
                        <label class="control-label">Room Tone</label>
                        <input type="range" class="control-slider" id="room-tone"
                               min="0" max="10" step="1" value="${this.settings.roomTone}">
                        <span class="control-value" id="room-tone-value">
                            ${this.settings.roomTone}/10
                        </span>
                    </div>
                </div>

                <div class="speaker-detection">
                    <div class="section-label">
                        <span>Speaker Detection</span>
                        <button class="btn-detect-speakers" id="btn-detect-speakers">
                            <span>🔍 Analyze</span>
                        </button>
                    </div>
                    <div class="speakers-list" id="speakers-list">
                        <div class="no-speakers">
                            <span>Upload audio to detect speakers</span>
                        </div>
                    </div>
                    <button class="btn-balance-speakers" id="btn-balance-speakers" disabled>
                        <span>⚖️ Auto-Balance Speakers</span>
                    </button>
                </div>

                <div class="platform-compliance">
                    <div class="section-label">Platform Compliance</div>
                    <div class="platforms-grid" id="platforms-grid">
                        <div class="platform-item" data-platform="spotify">
                            <input type="checkbox" id="platform-spotify" checked>
                            <label for="platform-spotify">
                                <span class="platform-icon">🎵</span>
                                <span>Spotify</span>
                            </label>
                            <span class="compliance-status" id="compliance-spotify">--</span>
                        </div>
                        <div class="platform-item" data-platform="apple">
                            <input type="checkbox" id="platform-apple" checked>
                            <label for="platform-apple">
                                <span class="platform-icon">🍎</span>
                                <span>Apple</span>
                            </label>
                            <span class="compliance-status" id="compliance-apple">--</span>
                        </div>
                        <div class="platform-item" data-platform="youtube">
                            <input type="checkbox" id="platform-youtube">
                            <label for="platform-youtube">
                                <span class="platform-icon">📺</span>
                                <span>YouTube</span>
                            </label>
                            <span class="compliance-status" id="compliance-youtube">--</span>
                        </div>
                        <div class="platform-item" data-platform="audible">
                            <input type="checkbox" id="platform-audible" checked>
                            <label for="platform-audible">
                                <span class="platform-icon">📚</span>
                                <span>Audible</span>
                            </label>
                            <span class="compliance-status" id="compliance-audible">--</span>
                        </div>
                    </div>
                </div>

                <div class="podcast-actions">
                    <button class="btn-apply-podcast" id="btn-apply-podcast">
                        <span>🎙️ Apply Podcast Processing</span>
                    </button>
                    <button class="btn-preview-podcast" id="btn-preview-podcast">
                        <span>👂 Preview</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get icon for preset
     */
    getPresetIcon(presetId) {
        const icons = {
            interview: '👥',
            solo: '🎤',
            roundtable: '🔄',
            storytelling: '📖',
            videocast: '📹'
        };
        return icons[presetId] || '🎙️';
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Preset buttons
        this.container.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectPreset(btn.dataset.preset);
            });
        });

        // Sliders
        const sliders = [
            { id: 'voice-clarity', key: 'voiceClarity', suffix: ' dB', prefix: '+' },
            { id: 'deessing', key: 'deessing', suffix: '/10' },
            { id: 'breath-removal', key: 'breathRemoval', suffix: '/10' },
            { id: 'room-tone', key: 'roomTone', suffix: '/10' }
        ];

        sliders.forEach(({ id, key, suffix, prefix = '' }) => {
            const slider = this.container.querySelector(`#${id}`);
            const valueEl = this.container.querySelector(`#${id}-value`);

            if (slider) {
                slider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.settings[key] = value;

                    if (valueEl) {
                        valueEl.textContent = `${prefix}${value.toFixed(key === 'voiceClarity' ? 1 : 0)}${suffix}`;
                    }

                    appState.set(`podcast.${key}`, value);
                });
            }
        });

        // Detect speakers button
        const detectBtn = this.container.querySelector('#btn-detect-speakers');
        if (detectBtn) {
            detectBtn.addEventListener('click', () => this.detectSpeakers());
        }

        // Balance speakers button
        const balanceBtn = this.container.querySelector('#btn-balance-speakers');
        if (balanceBtn) {
            balanceBtn.addEventListener('click', () => this.balanceSpeakers());
        }

        // Apply button
        const applyBtn = this.container.querySelector('#btn-apply-podcast');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyProcessing());
        }

        // Preview button
        const previewBtn = this.container.querySelector('#btn-preview-podcast');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewProcessing());
        }

        // Switch to music mode
        const switchBtn = this.container.querySelector('#btn-switch-music');
        if (switchBtn) {
            switchBtn.addEventListener('click', () => {
                appState.set('ui.mode', 'music');
                eventBus.emit(Events.MODE_CHANGE, { mode: 'music' });
            });
        }

        // Listen for analysis updates
        eventBus.on(Events.ANALYSIS_COMPLETE, (data) => this.updateCompliance(data));
    }

    /**
     * Select a preset
     */
    selectPreset(presetId) {
        this.currentPreset = presetId;

        // Update button states
        this.container.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetId);
        });

        // Apply preset settings
        if (this.podcastEngine) {
            const preset = this.podcastEngine.presets[presetId];
            if (preset) {
                this.settings.voiceClarity = preset.voiceClarity;
                this.settings.deessing = preset.deessing;
                this.settings.breathRemoval = preset.breathRemoval;
                this.settings.roomTone = preset.roomTone;

                // Update sliders
                this.updateSliders();
            }
        }

        appState.set('podcast.preset', presetId);
        eventBus.emit(Events.PODCAST_PRESET, { preset: presetId });
    }

    /**
     * Update slider values from settings
     */
    updateSliders() {
        const mappings = [
            { id: 'voice-clarity', key: 'voiceClarity', suffix: ' dB', prefix: '+', decimals: 1 },
            { id: 'deessing', key: 'deessing', suffix: '/10', decimals: 0 },
            { id: 'breath-removal', key: 'breathRemoval', suffix: '/10', decimals: 0 },
            { id: 'room-tone', key: 'roomTone', suffix: '/10', decimals: 0 }
        ];

        mappings.forEach(({ id, key, suffix, prefix = '', decimals }) => {
            const slider = this.container.querySelector(`#${id}`);
            const valueEl = this.container.querySelector(`#${id}-value`);

            if (slider) {
                slider.value = this.settings[key];
            }

            if (valueEl) {
                valueEl.textContent = `${prefix}${this.settings[key].toFixed(decimals)}${suffix}`;
            }
        });
    }

    /**
     * Detect speakers in audio
     */
    async detectSpeakers() {
        const audioBuffer = appState.get('audio.buffer');
        if (!audioBuffer) {
            console.warn('[PodcastPanel] No audio loaded');
            return;
        }

        const detectBtn = this.container.querySelector('#btn-detect-speakers');
        if (detectBtn) {
            detectBtn.disabled = true;
            detectBtn.innerHTML = '<span>🔄 Analyzing...</span>';
        }

        try {
            if (this.podcastEngine) {
                this.detectedSpeakers = await this.podcastEngine.detectSpeakers(audioBuffer);
                this.updateSpeakersList();

                const balanceBtn = this.container.querySelector('#btn-balance-speakers');
                if (balanceBtn) {
                    balanceBtn.disabled = this.detectedSpeakers.length < 2;
                }

                eventBus.emit(Events.PODCAST_SPEAKER_DETECT, {
                    speakers: this.detectedSpeakers
                });
            }
        } catch (error) {
            console.error('[PodcastPanel] Speaker detection failed:', error);
        } finally {
            if (detectBtn) {
                detectBtn.disabled = false;
                detectBtn.innerHTML = '<span>🔍 Analyze</span>';
            }
        }
    }

    /**
     * Update speakers list UI
     */
    updateSpeakersList() {
        const listEl = this.container.querySelector('#speakers-list');
        if (!listEl) return;

        if (this.detectedSpeakers.length === 0) {
            listEl.innerHTML = `
                <div class="no-speakers">
                    <span>No speakers detected</span>
                </div>
            `;
            return;
        }

        // Calculate total duration
        const totalDuration = this.detectedSpeakers.reduce(
            (sum, speaker) => sum + speaker.totalDuration, 0
        );

        listEl.innerHTML = this.detectedSpeakers.map((speaker, i) => {
            const percent = ((speaker.totalDuration / totalDuration) * 100).toFixed(0);

            return `
                <div class="speaker-item">
                    <div class="speaker-icon">🎤</div>
                    <div class="speaker-info">
                        <span class="speaker-name">Speaker ${i + 1}</span>
                        <span class="speaker-stats">
                            ${percent}% time, ${speaker.avgLevel.toFixed(0)} dB avg
                        </span>
                    </div>
                    <div class="speaker-bar">
                        <div class="speaker-bar-fill" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        appState.set('podcast.speakers', this.detectedSpeakers);
    }

    /**
     * Auto-balance speakers
     */
    async balanceSpeakers() {
        if (this.detectedSpeakers.length < 2) return;

        // Find target level (loudest speaker)
        const targetLevel = Math.max(...this.detectedSpeakers.map(s => s.avgLevel));

        // Calculate gain adjustments
        const _adjustments = this.detectedSpeakers.map((speaker, i) => ({
            speaker: i + 1,
            currentLevel: speaker.avgLevel,
            adjustment: targetLevel - speaker.avgLevel
        }));

        // This would apply gain changes to specific time regions
        // For now, just log the recommendations
    }

    /**
     * Apply podcast processing
     */
    async applyProcessing() {
        if (!this.podcastEngine) {
            console.warn('[PodcastPanel] Podcast engine not loaded');
            return;
        }

        eventBus.emit(Events.PROCESSING_START, { type: 'podcast' });

        try {
            const result = this.podcastEngine.applyPodcastPreset(this.currentPreset);

            if (result) {
                appState.set('podcast.enabled', true);
                appState.set('podcast.chain', result.chain);

                eventBus.emit(Events.PROCESSING_COMPLETE, {
                    type: 'podcast',
                    preset: this.currentPreset
                });
            }
        } catch (error) {
            console.error('[PodcastPanel] Processing failed:', error);
            eventBus.emit(Events.PROCESSING_ERROR, { type: 'podcast', error });
        }
    }

    /**
     * Preview processing
     */
    previewProcessing() {
        eventBus.emit(Events.AUDIO_PLAY, { preview: true });
    }

    /**
     * Update platform compliance indicators
     */
    updateCompliance(analysisData) {
        if (!this.podcastEngine || !analysisData) return;

        const { lufs, truePeak, dynamicRange } = analysisData;

        if (lufs === undefined) return;

        const compliance = this.podcastEngine.checkPodcastCompliance(
            lufs,
            truePeak || 0,
            dynamicRange || 10
        );

        // Update each platform status
        Object.entries(compliance).forEach(([platform, status]) => {
            const statusEl = this.container.querySelector(`#compliance-${platform}`);
            if (statusEl) {
                if (status.compliant) {
                    statusEl.textContent = '✅';
                    statusEl.className = 'compliance-status compliant';
                } else {
                    statusEl.textContent = '⚠️';
                    statusEl.className = 'compliance-status warning';
                    statusEl.title = status.issues.join(', ');
                }
            }
        });
    }

    /**
     * Get current settings
     */
    getSettings() {
        return {
            preset: this.currentPreset,
            ...this.settings,
            speakers: this.detectedSpeakers
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PodcastPanel };
}

if (typeof window !== 'undefined') {
    window.PodcastPanel = PodcastPanel;
}

export { PodcastPanel };
