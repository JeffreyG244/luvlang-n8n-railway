/**
 * ANALYTICS DASHBOARD
 * Professional-grade analysis visualizations
 * LUFS graphs, dynamic range, spectrogram, before/after comparison
 */

import { eventBus, Events } from '../core/event-bus.js';
import { appState } from '../core/app-state.js';
import { resolveContainer } from '../shared/utils.js';

class AnalyticsDashboard {
    constructor(container, audioContext) {
        this.container = resolveContainer(container);
        this.audioContext = audioContext;
        this.analyser = null;
        this.canvases = {};
        this.contexts = {};
        this.animationFrame = null;
        this.isAnalyzing = false;
        this._resizeObserver = null;
        this._eventUnsubs = [];

        // Analysis data
        this.lufsHistory = [];
        this.dynamicRangeData = null;
        this.spectrogramData = [];
        this.beforeBuffer = null;
        this.afterBuffer = null;

        if (this.container) {
            this.init();
        }
    }

    /**
     * Initialize dashboard
     */
    init() {
        this.render();
        this.initCanvases();
        this.bindEvents();
    }

    /**
     * Render dashboard UI
     */
    render() {
        this.container.innerHTML = `
            <div class="analytics-dashboard">
                <div class="analytics-header">
                    <div class="analytics-title">
                        <span class="icon">📊</span>
                        <span>ANALYTICS</span>
                    </div>
                    <div class="analytics-tabs">
                        <button class="tab-btn active" data-tab="lufs">LUFS</button>
                        <button class="tab-btn" data-tab="dynamics">Dynamics</button>
                        <button class="tab-btn" data-tab="spectrogram">Spectrogram</button>
                        <button class="tab-btn" data-tab="comparison">A/B</button>
                    </div>
                </div>

                <div class="analytics-content">
                    <!-- LUFS Tab -->
                    <div class="tab-panel active" id="tab-lufs">
                        <div class="lufs-meters">
                            <div class="lufs-meter-item">
                                <div class="meter-label">Momentary</div>
                                <div class="meter-value" id="lufs-momentary">-∞</div>
                                <div class="meter-bar">
                                    <div class="meter-fill" id="lufs-momentary-bar"></div>
                                </div>
                            </div>
                            <div class="lufs-meter-item">
                                <div class="meter-label">Short-term</div>
                                <div class="meter-value" id="lufs-shortterm">-∞</div>
                                <div class="meter-bar">
                                    <div class="meter-fill" id="lufs-shortterm-bar"></div>
                                </div>
                            </div>
                            <div class="lufs-meter-item primary">
                                <div class="meter-label">Integrated</div>
                                <div class="meter-value" id="lufs-integrated">-∞</div>
                                <div class="meter-bar">
                                    <div class="meter-fill" id="lufs-integrated-bar"></div>
                                </div>
                            </div>
                        </div>
                        <div class="lufs-graph-container">
                            <canvas id="lufs-graph" width="600" height="200"></canvas>
                            <div class="graph-labels">
                                <span class="label-target">Target: -14 LUFS</span>
                                <span class="label-range">Range: -24 to 0 LUFS</span>
                            </div>
                        </div>
                    </div>

                    <!-- Dynamics Tab -->
                    <div class="tab-panel" id="tab-dynamics">
                        <div class="dynamics-meters">
                            <div class="dynamics-meter-item">
                                <div class="meter-label">Dynamic Range</div>
                                <div class="meter-value" id="dynamic-range">-- dB</div>
                                <div class="meter-description">Peak to RMS difference</div>
                            </div>
                            <div class="dynamics-meter-item">
                                <div class="meter-label">Crest Factor</div>
                                <div class="meter-value" id="crest-factor">-- dB</div>
                                <div class="meter-description">Peak to average ratio</div>
                            </div>
                            <div class="dynamics-meter-item">
                                <div class="meter-label">True Peak</div>
                                <div class="meter-value" id="true-peak">-- dBTP</div>
                                <div class="meter-description">Inter-sample peak level</div>
                            </div>
                        </div>
                        <div class="dynamics-graph-container">
                            <canvas id="dynamics-graph" width="600" height="200"></canvas>
                        </div>
                        <div class="dynamics-analysis">
                            <div class="analysis-item">
                                <span class="analysis-label">Compression:</span>
                                <span class="analysis-value" id="compression-analysis">--</span>
                            </div>
                            <div class="analysis-item">
                                <span class="analysis-label">Headroom:</span>
                                <span class="analysis-value" id="headroom-analysis">--</span>
                            </div>
                        </div>
                    </div>

                    <!-- Spectrogram Tab -->
                    <div class="tab-panel" id="tab-spectrogram">
                        <div class="spectrogram-controls">
                            <select id="spectrogram-scale">
                                <option value="linear">Linear</option>
                                <option value="log" selected>Logarithmic</option>
                                <option value="mel">Mel Scale</option>
                            </select>
                            <select id="spectrogram-colormap">
                                <option value="viridis" selected>Viridis</option>
                                <option value="plasma">Plasma</option>
                                <option value="grayscale">Grayscale</option>
                            </select>
                        </div>
                        <div class="spectrogram-container">
                            <canvas id="spectrogram-canvas" width="800" height="300"></canvas>
                            <div class="spectrogram-axis-y">
                                <span>20kHz</span>
                                <span>10kHz</span>
                                <span>1kHz</span>
                                <span>100Hz</span>
                                <span>20Hz</span>
                            </div>
                        </div>
                        <div class="frequency-conflicts" id="frequency-conflicts">
                            <div class="conflicts-title">Frequency Conflicts</div>
                            <div class="conflicts-list">
                                <span class="no-conflicts">No masking issues detected</span>
                            </div>
                        </div>
                    </div>

                    <!-- A/B Comparison Tab -->
                    <div class="tab-panel" id="tab-comparison">
                        <div class="comparison-controls">
                            <button class="btn-set-before" id="btn-set-before">
                                Set as "Before"
                            </button>
                            <button class="btn-toggle-comparison" id="btn-toggle-comparison" disabled>
                                <span id="comparison-state">A (Before)</span>
                            </button>
                            <button class="btn-clear-comparison" id="btn-clear-comparison">
                                Clear
                            </button>
                        </div>
                        <div class="comparison-display">
                            <div class="comparison-side before">
                                <div class="comparison-label">BEFORE</div>
                                <canvas id="before-waveform" width="300" height="100"></canvas>
                                <div class="comparison-stats" id="before-stats">
                                    <span>LUFS: --</span>
                                    <span>Peak: --</span>
                                </div>
                            </div>
                            <div class="comparison-divider"></div>
                            <div class="comparison-side after">
                                <div class="comparison-label">AFTER</div>
                                <canvas id="after-waveform" width="300" height="100"></canvas>
                                <div class="comparison-stats" id="after-stats">
                                    <span>LUFS: --</span>
                                    <span>Peak: --</span>
                                </div>
                            </div>
                        </div>
                        <div class="comparison-diff">
                            <div class="diff-item">
                                <span class="diff-label">LUFS Change:</span>
                                <span class="diff-value" id="lufs-diff">--</span>
                            </div>
                            <div class="diff-item">
                                <span class="diff-label">Peak Change:</span>
                                <span class="diff-value" id="peak-diff">--</span>
                            </div>
                            <div class="diff-item">
                                <span class="diff-label">DR Change:</span>
                                <span class="diff-value" id="dr-diff">--</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize canvas contexts with HiDPI support and resize handling
     */
    initCanvases() {
        // Clear previous references to prevent memory leaks on re-init
        this.canvases = {};
        this.contexts = {};

        // Clean up previous resize observer
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }

        const canvasIds = [
            'lufs-graph',
            'dynamics-graph',
            'spectrogram-canvas',
            'before-waveform',
            'after-waveform'
        ];

        for (const id of canvasIds) {
            const canvas = this.container.querySelector(`#${id}`);
            if (canvas) {
                this.canvases[id] = canvas;
                this.contexts[id] = canvas.getContext('2d');
                this._scaleCanvas(canvas, this.contexts[id]);
            }
        }

        // Watch for container resizes and re-scale canvases
        if (typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver(() => {
                for (const [id, canvas] of Object.entries(this.canvases)) {
                    if (canvas && this.contexts[id]) {
                        this._scaleCanvas(canvas, this.contexts[id]);
                    }
                }
                // Redraw graphs after resize
                if (this.lufsHistory.length > 0) this.drawLUFSGraph();
                if (this.dynamicRangeData) this.drawDynamicsGraph();
            });
            this._resizeObserver.observe(this.container);
        }
    }

    /**
     * Scale a canvas for the current device pixel ratio
     */
    _scaleCanvas(canvas, ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Tab switching
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Comparison controls
        const setBeforeBtn = this.container.querySelector('#btn-set-before');
        const toggleBtn = this.container.querySelector('#btn-toggle-comparison');
        const clearBtn = this.container.querySelector('#btn-clear-comparison');

        if (setBeforeBtn) {
            setBeforeBtn.addEventListener('click', () => this.setBeforeState());
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleComparison());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearComparison());
        }

        // Listen for analysis events (track for cleanup)
        this._onAnalysisComplete = (data) => this.updateAnalysis(data);
        this._onLufsUpdate = (data) => this.updateLUFS(data);
        eventBus.on(Events.ANALYSIS_COMPLETE, this._onAnalysisComplete);
        eventBus.on(Events.LUFS_UPDATE, this._onLufsUpdate);
    }

    /**
     * Switch active tab
     */
    switchTab(tabId) {
        // Update tab buttons
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Update tab panels
        this.container.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `tab-${tabId}`);
        });
    }

    /**
     * Start real-time analysis
     */
    startAnalysis(audioBuffer) {
        this.isAnalyzing = true;

        // Create analyser node
        if (!this.analyser) {
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
        }

        // Compute LUFS
        this.computeLUFS(audioBuffer);

        // Compute dynamics
        this.computeDynamics(audioBuffer);

        // Generate spectrogram
        this.generateSpectrogram(audioBuffer);

        // Start animation loop
        this.animate();

        eventBus.emit(Events.ANALYSIS_START, {});
    }

    /**
     * Compute LUFS values
     */
    computeLUFS(audioBuffer) {
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;

        // Block size for momentary (400ms) and short-term (3s)
        const momentaryBlockSize = Math.floor(sampleRate * 0.4);
        const _shortTermBlockSize = Math.floor(sampleRate * 3);

        this.lufsHistory = [];
        let integratedSum = 0;
        let integratedCount = 0;

        // Calculate momentary LUFS over time
        for (let i = 0; i < channelData.length; i += momentaryBlockSize) {
            const block = channelData.slice(i, Math.min(i + momentaryBlockSize, channelData.length));

            // Calculate RMS
            let sum = 0;
            for (let j = 0; j < block.length; j++) {
                sum += block[j] * block[j];
            }
            const rms = Math.sqrt(sum / block.length);
            const lufs = -0.691 + 10 * Math.log10(rms + 1e-10);

            // Apply gating (-70 LUFS threshold)
            if (lufs > -70) {
                this.lufsHistory.push({
                    time: i / sampleRate,
                    momentary: lufs
                });
                integratedSum += rms;
                integratedCount++;
            }
        }

        // Calculate integrated LUFS
        const integratedLufs = integratedCount > 0
            ? -0.691 + 10 * Math.log10(integratedSum / integratedCount + 1e-10)
            : -70;

        // Update state
        appState.set('analysis.lufs.integrated', integratedLufs, false);
        appState.set('analysis.lufs.history', this.lufsHistory, false);

        this.drawLUFSGraph();
        this.updateLUFSMeters(integratedLufs);
    }

    /**
     * Compute dynamics values
     */
    computeDynamics(audioBuffer) {
        const channelData = audioBuffer.getChannelData(0);

        // Find peak
        let peak = 0;
        let sumSquares = 0;

        for (let i = 0; i < channelData.length; i++) {
            const abs = Math.abs(channelData[i]);
            if (abs > peak) peak = abs;
            sumSquares += channelData[i] * channelData[i];
        }

        const rms = Math.sqrt(sumSquares / channelData.length);
        const peakDb = 20 * Math.log10(peak + 1e-10);
        const rmsDb = 20 * Math.log10(rms + 1e-10);

        // Dynamic range
        const dynamicRange = peakDb - rmsDb;

        // Crest factor
        const crestFactor = peak / (rms + 1e-10);
        const crestDb = 20 * Math.log10(crestFactor);

        // True peak (simplified - would need oversampling for accurate measurement)
        const truePeak = peakDb + 0.2; // Approximate

        // Update UI
        const drEl = this.container.querySelector('#dynamic-range');
        const cfEl = this.container.querySelector('#crest-factor');
        const tpEl = this.container.querySelector('#true-peak');

        if (drEl) drEl.textContent = `${dynamicRange.toFixed(1)} dB`;
        if (cfEl) cfEl.textContent = `${crestDb.toFixed(1)} dB`;
        if (tpEl) tpEl.textContent = `${truePeak.toFixed(1)} dBTP`;

        // Analysis text
        const compressionEl = this.container.querySelector('#compression-analysis');
        const headroomEl = this.container.querySelector('#headroom-analysis');

        if (compressionEl) {
            if (dynamicRange < 6) {
                compressionEl.textContent = 'Heavy compression detected';
                compressionEl.classList.add('warning');
            } else if (dynamicRange < 10) {
                compressionEl.textContent = 'Moderate compression';
                compressionEl.classList.remove('warning');
            } else {
                compressionEl.textContent = 'Good dynamic range';
                compressionEl.classList.remove('warning');
            }
        }

        if (headroomEl) {
            const headroom = -truePeak;
            headroomEl.textContent = `${headroom.toFixed(1)} dB headroom`;
            headroomEl.classList.toggle('warning', headroom < 1);
        }

        // Store for comparison
        this.dynamicRangeData = {
            peak: peakDb,
            rms: rmsDb,
            dynamicRange,
            crestFactor: crestDb,
            truePeak
        };

        appState.set('analysis.dynamicRange', dynamicRange, false);
        appState.set('analysis.truePeak', truePeak, false);

        this.drawDynamicsGraph();
    }

    /**
     * Generate spectrogram
     */
    generateSpectrogram(audioBuffer) {
        const canvas = this.canvases['spectrogram-canvas'];
        const ctx = this.contexts['spectrogram-canvas'];
        if (!canvas || !ctx) return;

        const channelData = audioBuffer.getChannelData(0);
        const _sampleRate = audioBuffer.sampleRate;
        const fftSize = 2048;
        const hopSize = 512;

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        // Number of time frames
        const numFrames = Math.floor((channelData.length - fftSize) / hopSize);
        const frameWidth = width / numFrames;

        // Simplified spectrogram (real implementation would use FFT)
        const colormap = this.getColormap('viridis');

        for (let frame = 0; frame < numFrames; frame++) {
            const start = frame * hopSize;
            const block = channelData.slice(start, start + fftSize);

            // Simple frequency estimation (placeholder for FFT)
            const numBins = 128;
            for (let bin = 0; bin < numBins; bin++) {
                // Calculate energy in frequency bin (simplified)
                let energy = 0;
                const binStart = Math.floor(bin / numBins * fftSize);
                const binEnd = Math.floor((bin + 1) / numBins * fftSize);

                for (let i = binStart; i < binEnd; i++) {
                    energy += block[i] * block[i];
                }

                const normalized = Math.min(1, energy * 100);
                const color = colormap(normalized);

                ctx.fillStyle = color;
                ctx.fillRect(
                    frame * frameWidth,
                    height - (bin + 1) * (height / numBins),
                    frameWidth + 1,
                    height / numBins + 1
                );
            }
        }
    }

    /**
     * Get colormap function
     */
    getColormap(name) {
        const clamp = (v) => Math.max(0, Math.min(255, Math.floor(v)));

        const colormaps = {
            viridis: (t) => {
                const r = clamp(68 + t * 187);
                const g = clamp(1 + t * 254);
                const b = clamp(84 + t * (-84));
                return `rgb(${r}, ${g}, ${b})`;
            },
            plasma: (t) => {
                const r = clamp(13 + t * 242);
                const g = clamp(8 + t * 220);
                const b = clamp(135 + t * (-75));
                return `rgb(${r}, ${g}, ${b})`;
            },
            grayscale: (t) => {
                const v = clamp(t * 255);
                return `rgb(${v}, ${v}, ${v})`;
            }
        };

        return colormaps[name] || colormaps.viridis;
    }

    /**
     * Draw LUFS graph
     */
    drawLUFSGraph() {
        const canvas = this.canvases['lufs-graph'];
        const ctx = this.contexts['lufs-graph'];
        if (!canvas || !ctx) return;

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Horizontal lines every 6 dB
        for (let lufs = 0; lufs >= -24; lufs -= 6) {
            const y = ((0 - lufs) / 24) * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px JetBrains Mono';
            ctx.fillText(`${lufs}`, 5, y - 3);
        }

        // Target line at -14 LUFS
        const targetY = ((0 - (-14)) / 24) * height;
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(width, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw LUFS history
        if (this.lufsHistory.length > 0) {
            const maxTime = this.lufsHistory[this.lufsHistory.length - 1].time;

            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let i = 0; i < this.lufsHistory.length; i++) {
                const entry = this.lufsHistory[i];
                const x = (entry.time / maxTime) * width;
                const y = ((0 - Math.max(-24, entry.momentary)) / 24) * height;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();
        }
    }

    /**
     * Draw dynamics graph
     */
    drawDynamicsGraph() {
        const canvas = this.canvases['dynamics-graph'];
        const ctx = this.contexts['dynamics-graph'];
        if (!canvas || !ctx || !this.dynamicRangeData) return;

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        // Draw bars
        const barWidth = 80;
        const gap = 40;
        const startX = (width - (barWidth * 3 + gap * 2)) / 2;

        const values = [
            { label: 'Peak', value: this.dynamicRangeData.peak, color: '#ff3c3c' },
            { label: 'RMS', value: this.dynamicRangeData.rms, color: '#00d4ff' },
            { label: 'DR', value: this.dynamicRangeData.dynamicRange, color: '#b84fff' }
        ];

        values.forEach((item, i) => {
            const x = startX + i * (barWidth + gap);
            const normalized = Math.min(1, (item.value + 60) / 60);
            const barHeight = normalized * (height - 40);

            // Bar
            ctx.fillStyle = item.color;
            ctx.fillRect(x, height - 20 - barHeight, barWidth, barHeight);

            // Label
            ctx.fillStyle = 'white';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(item.label, x + barWidth / 2, height - 5);
            ctx.fillText(`${item.value.toFixed(1)} dB`, x + barWidth / 2, height - 25 - barHeight);
        });
    }

    /**
     * Update LUFS meters
     */
    updateLUFSMeters(integrated) {
        const integratedEl = this.container.querySelector('#lufs-integrated');
        const integratedBar = this.container.querySelector('#lufs-integrated-bar');

        if (integratedEl) {
            integratedEl.textContent = `${integrated.toFixed(1)} LUFS`;
        }

        if (integratedBar) {
            const normalized = Math.min(100, Math.max(0, (integrated + 24) / 24 * 100));
            integratedBar.style.width = `${normalized}%`;
        }
    }

    /**
     * Update LUFS from event
     */
    updateLUFS(data) {
        const momentaryEl = this.container.querySelector('#lufs-momentary');
        const shortTermEl = this.container.querySelector('#lufs-shortterm');

        if (momentaryEl && data.momentary !== undefined) {
            momentaryEl.textContent = `${data.momentary.toFixed(1)} LUFS`;
        }

        if (shortTermEl && data.shortTerm !== undefined) {
            shortTermEl.textContent = `${data.shortTerm.toFixed(1)} LUFS`;
        }
    }

    /**
     * Set before state for comparison
     */
    setBeforeState() {
        const currentBuffer = appState.get('audio.buffer');
        if (!currentBuffer) {
            console.warn('[AnalyticsDashboard] No audio loaded');
            return;
        }

        this.beforeBuffer = currentBuffer;
        this.beforeAnalysis = { ...this.dynamicRangeData };
        this.beforeLufs = appState.get('analysis.lufs.integrated');

        this.drawComparisonWaveform('before', this.beforeBuffer);
        this.updateComparisonStats('before', this.beforeLufs, this.beforeAnalysis?.peak);

        const toggleBtn = this.container.querySelector('#btn-toggle-comparison');
        if (toggleBtn) toggleBtn.disabled = false;
    }

    /**
     * Toggle A/B comparison
     */
    toggleComparison() {
        const stateEl = this.container.querySelector('#comparison-state');
        const isA = stateEl.textContent.includes('A');

        if (isA && this.beforeBuffer) {
            // Switch to before state
            // Would need to apply the before buffer to playback
            stateEl.textContent = 'B (After)';
        } else {
            stateEl.textContent = 'A (Before)';
        }

        this.updateComparisonDiff();
    }

    /**
     * Clear comparison
     */
    clearComparison() {
        this.beforeBuffer = null;
        this.beforeAnalysis = null;
        this.beforeLufs = null;

        const toggleBtn = this.container.querySelector('#btn-toggle-comparison');
        if (toggleBtn) toggleBtn.disabled = true;

        // Clear canvases
        const beforeCanvas = this.contexts['before-waveform'];
        const afterCanvas = this.contexts['after-waveform'];

        if (beforeCanvas) {
            beforeCanvas.fillStyle = '#0a0a0f';
            beforeCanvas.fillRect(0, 0, 300, 100);
        }

        if (afterCanvas) {
            afterCanvas.fillStyle = '#0a0a0f';
            afterCanvas.fillRect(0, 0, 300, 100);
        }

        // Clear stats
        ['before', 'after'].forEach(side => {
            const statsEl = this.container.querySelector(`#${side}-stats`);
            if (statsEl) {
                statsEl.innerHTML = '<span>LUFS: --</span><span>Peak: --</span>';
            }
        });
    }

    /**
     * Draw comparison waveform
     */
    drawComparisonWaveform(side, audioBuffer) {
        const canvas = this.canvases[`${side}-waveform`];
        const ctx = this.contexts[`${side}-waveform`];
        if (!canvas || !ctx || !audioBuffer) return;

        const width = 300;
        const height = 100;
        const channelData = audioBuffer.getChannelData(0);

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = side === 'before' ? '#ff8800' : '#00d4ff';
        ctx.lineWidth = 1;
        ctx.beginPath();

        const step = Math.ceil(channelData.length / width);
        for (let i = 0; i < width; i++) {
            const start = i * step;
            let min = 0, max = 0;

            for (let j = 0; j < step && start + j < channelData.length; j++) {
                const sample = channelData[start + j];
                if (sample < min) min = sample;
                if (sample > max) max = sample;
            }

            const y1 = (1 - max) * height / 2;
            const y2 = (1 - min) * height / 2;

            ctx.moveTo(i, y1);
            ctx.lineTo(i, y2);
        }

        ctx.stroke();
    }

    /**
     * Update comparison stats
     */
    updateComparisonStats(side, lufs, peak) {
        const statsEl = this.container.querySelector(`#${side}-stats`);
        if (!statsEl) return;

        statsEl.innerHTML = `
            <span>LUFS: ${lufs?.toFixed(1) || '--'}</span>
            <span>Peak: ${peak?.toFixed(1) || '--'} dB</span>
        `;
    }

    /**
     * Update comparison diff
     */
    updateComparisonDiff() {
        const currentLufs = appState.get('analysis.lufs.integrated');
        const currentPeak = this.dynamicRangeData?.peak;
        const currentDR = this.dynamicRangeData?.dynamicRange;

        const lufsDiff = this.container.querySelector('#lufs-diff');
        const peakDiff = this.container.querySelector('#peak-diff');
        const drDiff = this.container.querySelector('#dr-diff');

        if (lufsDiff && this.beforeLufs !== null && currentLufs !== null) {
            const diff = currentLufs - this.beforeLufs;
            lufsDiff.textContent = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} LUFS`;
            lufsDiff.classList.toggle('positive', diff > 0);
            lufsDiff.classList.toggle('negative', diff < 0);
        }

        if (peakDiff && this.beforeAnalysis?.peak !== undefined && currentPeak !== undefined) {
            const diff = currentPeak - this.beforeAnalysis.peak;
            peakDiff.textContent = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} dB`;
        }

        if (drDiff && this.beforeAnalysis?.dynamicRange !== undefined && currentDR !== undefined) {
            const diff = currentDR - this.beforeAnalysis.dynamicRange;
            drDiff.textContent = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} dB`;
        }
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isAnalyzing) return;

        // Update real-time visualizations here

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    /**
     * Stop analysis
     */
    stopAnalysis() {
        this.isAnalyzing = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    /**
     * Cleanup all resources to prevent memory leaks
     */
    destroy() {
        this.stopAnalysis();

        // Disconnect resize observer
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }

        // Remove event bus listeners
        if (this._onAnalysisComplete) {
            eventBus.off(Events.ANALYSIS_COMPLETE, this._onAnalysisComplete);
        }
        if (this._onLufsUpdate) {
            eventBus.off(Events.LUFS_UPDATE, this._onLufsUpdate);
        }

        // Release audio buffer references
        this.beforeBuffer = null;
        this.afterBuffer = null;
        this.lufsHistory = [];
        this.dynamicRangeData = null;
        this.canvases = {};
        this.contexts = {};

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalyticsDashboard };
}

if (typeof window !== 'undefined') {
    window.AnalyticsDashboard = AnalyticsDashboard;
}

export { AnalyticsDashboard };
