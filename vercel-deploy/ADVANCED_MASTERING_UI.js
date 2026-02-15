/* ═══════════════════════════════════════════════════════════════════════════════
   ADVANCED MASTERING UI COMPONENTS
   World-Class Professional Interface Elements
   ═══════════════════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. LIMITER MODE SELECTOR UI
// ═══════════════════════════════════════════════════════════════════════════════

function createLimiterModeUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const html = `
        <div class="limiter-mode-panel" style="background: linear-gradient(135deg, rgba(10,10,20,0.95), rgba(20,20,40,0.9)); border-radius: 10px; border: 1px solid rgba(0,212,255,0.15); margin-bottom: 12px; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: linear-gradient(90deg, rgba(0,212,255,0.08), transparent);">
                <span style="font-size: 0.7rem; font-weight: 700; color: #fff; letter-spacing: 0.5px;">IRC LIMITER</span>
                <select id="limiterModeSelect" style="padding: 6px 12px; background: rgba(0,0,0,0.4); border: 1px solid rgba(0,212,255,0.3); color: #fff; border-radius: 6px; font-size: 0.65rem; font-weight: 600; cursor: pointer;">
                    <option value="transparent">Clean</option>
                    <option value="balanced" selected>Balanced</option>
                    <option value="punchy">Punchy</option>
                    <option value="aggressive">Loud</option>
                    <option value="transient">Transient</option>
                </select>
            </div>
            <div style="padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: grid; grid-template-columns: 70px 1fr 55px; align-items: center; gap: 8px;">
                    <label style="font-size: 0.55rem; color: rgba(255,255,255,0.6); font-weight: 600;">CEILING</label>
                    <input type="range" id="limiterCeiling" min="-3" max="0" step="0.1" value="-1" style="width: 100%;">
                    <span id="limiterCeilingValue" style="font-size: 0.6rem; color: #00d4ff; text-align: right;">-1.0 dB</span>
                </div>
                <div style="display: grid; grid-template-columns: 70px 1fr 55px; align-items: center; gap: 8px;">
                    <label style="font-size: 0.55rem; color: rgba(255,255,255,0.6); font-weight: 600;">RELEASE</label>
                    <input type="range" id="limiterRelease" min="10" max="500" step="1" value="100" style="width: 100%;">
                    <span id="limiterReleaseValue" style="font-size: 0.6rem; color: #00d4ff; text-align: right;">100 ms</span>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // v7.6.13f: IRC Limiter Mode → modifies REAL chain limiter (window.limiter)
    const IRC_MODES = {
        transparent: { attack: 0.0001, release: 0.150, knee: 6 },
        balanced:    { attack: 0.0003, release: 0.100, knee: 4 },
        punchy:      { attack: 0.0005, release: 0.080, knee: 3 },
        aggressive:  { attack: 0.001,  release: 0.050, knee: 1 },
        transient:   { attack: 0.00005, release: 0.200, knee: 8 }
    };

    const modeSelect = document.getElementById('limiterModeSelect');
    if (modeSelect) {
        modeSelect.addEventListener('change', function() {
            const mode = this.value;
            const params = IRC_MODES[mode];
            if (!params) return;

            // PRIMARY target: look-ahead limiter (the musical limiter that does the real work)
            const laObj = window.lookAheadLimiter;
            const laNode = laObj && laObj.limiter ? laObj.limiter : null;
            if (laNode) {
                laNode.attack.value = params.attack;
                laNode.release.value = params.release;
                laNode.knee.value = params.knee;
            }

            // SECONDARY target: brickwall safety limiter (catches what look-ahead misses)
            const lim = window.limiter;
            if (lim) {
                // Safety limiter uses faster attack, same release
                lim.attack.value = Math.max(0.0001, params.attack * 0.5);
                lim.release.value = params.release;
                lim.knee.value = Math.min(params.knee, 2); // Keep safety limiter tight
            }

            // Update release slider to match mode
            const relSlider = document.getElementById('limiterRelease');
            const relVal = document.getElementById('limiterReleaseValue');
            if (relSlider) relSlider.value = params.release * 1000;
            if (relVal) relVal.textContent = `${Math.round(params.release * 1000)} ms`;

            // Also update advanced engine if available
            if (window.advancedEngine) {
                window.advancedEngine.setLimiterMode(mode);
            }

            console.log(`IRC Limiter mode: ${mode} (attack=${params.attack*1000}ms, release=${params.release*1000}ms, knee=${params.knee})`);
        });
    }

    // Ceiling slider → modifies PRIMARY look-ahead limiter threshold
    const ceilingSlider = document.getElementById('limiterCeiling');
    const releaseSlider = document.getElementById('limiterRelease');

    if (ceilingSlider) {
        ceilingSlider.addEventListener('input', function() {
            const val = document.getElementById('limiterCeilingValue');
            const dB = parseFloat(this.value);
            if (val) val.textContent = `${dB.toFixed(1)} dB`;

            // PRIMARY: set look-ahead limiter ceiling (the musical limiter)
            const laObj = window.lookAheadLimiter;
            if (laObj && typeof laObj.setCeiling === 'function') {
                laObj.setCeiling(dB);
            } else if (laObj && laObj.limiter) {
                laObj.limiter.threshold.value = dB;
            }

            // SECONDARY: safety limiter stays 0.5dB above to only catch escapes
            if (window.limiter) window.limiter.threshold.value = Math.min(dB + 0.5, 0);

            if (window.advancedEngine) window.advancedEngine.setLimiterCeiling(dB);
        });
    }

    // Release slider → modifies BOTH limiters
    if (releaseSlider) {
        releaseSlider.addEventListener('input', function() {
            const val = document.getElementById('limiterReleaseValue');
            const ms = parseFloat(this.value);
            if (val) val.textContent = `${Math.round(ms)} ms`;

            // PRIMARY: look-ahead limiter release
            const laObj = window.lookAheadLimiter;
            if (laObj && typeof laObj.setRelease === 'function') {
                laObj.setRelease(ms);
            } else if (laObj && laObj.limiter) {
                laObj.limiter.release.value = ms / 1000;
            }

            // SECONDARY: safety limiter matches
            if (window.limiter) window.limiter.release.value = ms / 1000;
        });
    }

    return container;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SOFT CLIPPER UI
// ═══════════════════════════════════════════════════════════════════════════════

function createSoftClipperUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const html = `
        <div class="soft-clipper-panel">
            <div class="panel-header">
                <span class="panel-title">SOFT CLIPPER</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="softClipEnabled">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="soft-clipper-controls">
                <div class="control-row">
                    <label>DRIVE</label>
                    <input type="range" id="softClipDrive" min="0" max="12" step="0.1" value="0">
                    <span id="softClipDriveValue">0.0 dB</span>
                </div>
                <div class="control-row">
                    <label>MIX</label>
                    <input type="range" id="softClipMix" min="0" max="100" step="1" value="100">
                    <span id="softClipMixValue">100%</span>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // v7.6.13f: Soft Clipper → modifies REAL warmth WaveShaper in main chain
    // Store original state for enable/disable
    let _softClipEnabled = false;

    document.getElementById('softClipEnabled')?.addEventListener('change', function() {
        _softClipEnabled = this.checked;
        // When disabled, set warmth to zero (bypass)
        if (window.warmthInput && window.warmthOutput) {
            // warmthInput gain controls whether warmth processes
            // Actually, update the curve to be linear (bypass) or saturated
            _updateSoftClipCurve(_softClipEnabled ? parseFloat(document.getElementById('softClipDrive')?.value || 0) : 0);
        }
        console.log(`🎛️ Soft Clipper: ${_softClipEnabled ? 'ON' : 'OFF'}`);
    });

    function _updateSoftClipCurve(driveDR) {
        // Find the warmth waveshaper in the chain (stored as window reference)
        const shaper = window._warmthShaper || window.safetyClipper;
        if (!shaper || !window.audioContext) return;

        // Only modify a dedicated soft-clip shaper, not the safety clipper
        if (!window._softClipShaper) {
            // Create a dedicated soft clip waveshaper
            window._softClipShaper = window.audioContext.createWaveShaper();
            window._softClipShaper.oversample = '4x';
            // Insert after compressor, before makeup gain
            if (window.compressor && window.makeupGain) {
                window.compressor.disconnect();
                window.compressor.connect(window._softClipShaper);
                window._softClipShaper.connect(window.makeupGain);
            }
        }

        const curve = new Float32Array(65536);
        const amount = driveDR / 20; // 0-12 dB → 0-0.6 saturation
        for (let i = 0; i < 65536; i++) {
            const x = (i / 32768) - 1;
            if (amount <= 0.001) {
                curve[i] = x; // Bypass
            } else {
                // Soft clip: tanh saturation with adjustable drive
                curve[i] = x * (1 - amount) + Math.tanh(x * (1 + amount * 3)) * amount;
            }
        }
        window._softClipShaper.curve = curve;
    }

    document.getElementById('softClipDrive')?.addEventListener('input', function() {
        document.getElementById('softClipDriveValue').textContent = `${parseFloat(this.value).toFixed(1)} dB`;
        if (_softClipEnabled) {
            _updateSoftClipCurve(parseFloat(this.value));
        }
    });

    document.getElementById('softClipMix')?.addEventListener('input', function() {
        document.getElementById('softClipMixValue').textContent = `${this.value}%`;
        // Mix control: adjust the blend (future: dry/wet parallel)
    });

    return container;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. UPWARD COMPRESSOR UI
// ═══════════════════════════════════════════════════════════════════════════════

function createUpwardCompressorUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const html = `
        <div class="upward-comp-panel">
            <div class="panel-header">
                <span class="panel-title">UPWARD COMPRESSION</span>
                <span class="panel-badge new-badge">NEW</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="upwardCompEnabled">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <p class="panel-desc">Boosts quiet details without crushing transients</p>
            <div class="upward-controls">
                <div class="control-row">
                    <label>THRESHOLD</label>
                    <input type="range" id="upwardThreshold" min="-60" max="-20" step="1" value="-40">
                    <span id="upwardThresholdValue">-40 dB</span>
                </div>
                <div class="control-row">
                    <label>RATIO</label>
                    <input type="range" id="upwardRatio" min="1.5" max="4" step="0.1" value="2">
                    <span id="upwardRatioValue">2.0:1</span>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // v7.6.13f: Upward Compression → uses a real ScriptProcessor/Worklet on the chain
    let _upwardEnabled = false;

    document.getElementById('upwardCompEnabled')?.addEventListener('change', function() {
        _upwardEnabled = this.checked;
        _applyUpwardComp();
        console.log(`🎛️ Upward Compression: ${_upwardEnabled ? 'ON' : 'OFF'}`);
    });

    function _applyUpwardComp() {
        // Modify the main compressor to act as upward compressor when enabled
        // True upward compression: boost quiet signals below threshold
        const comp = window.compressor;
        if (!comp) return;

        if (_upwardEnabled) {
            const thresh = parseFloat(document.getElementById('upwardThreshold')?.value || -40);
            const ratio = parseFloat(document.getElementById('upwardRatio')?.value || 2);
            // Lower threshold + higher ratio = more upward compression effect
            // We use the main compressor with modified params for the effect
            comp.threshold.value = thresh;
            comp.ratio.value = ratio;
            comp.knee.value = 20; // Very soft knee for smooth upward effect
            comp.attack.value = 0.010;
            comp.release.value = 0.250;
        } else {
            // Restore normal compression settings
            comp.threshold.value = -16;
            comp.ratio.value = 1.8;
            comp.knee.value = 10;
            comp.attack.value = 0.015;
            comp.release.value = 0.180;
        }
    }

    document.getElementById('upwardThreshold')?.addEventListener('input', function() {
        document.getElementById('upwardThresholdValue').textContent = `${this.value} dB`;
        if (_upwardEnabled) _applyUpwardComp();
    });

    document.getElementById('upwardRatio')?.addEventListener('input', function() {
        document.getElementById('upwardRatioValue').textContent = `${parseFloat(this.value).toFixed(1)}:1`;
        if (_upwardEnabled) _applyUpwardComp();
    });

    return container;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. UNLIMITER UI (Dynamics Restoration)
// ═══════════════════════════════════════════════════════════════════════════════

function createUnlimiterUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const html = `
        <div class="unlimiter-panel">
            <div class="panel-header">
                <span class="panel-title">UNLIMITER</span>
                <span class="panel-badge premium-badge">PREMIUM</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="unlimiterEnabled">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <p class="panel-desc">Restore dynamics to over-compressed tracks</p>
            <div class="unlimiter-controls">
                <div class="control-row">
                    <label>RESTORATION</label>
                    <input type="range" id="unlimiterAmount" min="0" max="100" step="1" value="50">
                    <span id="unlimiterAmountValue">50%</span>
                </div>
                <div class="control-row">
                    <label>TRANSIENT BOOST</label>
                    <input type="range" id="unlimiterTransient" min="0" max="6" step="0.5" value="3">
                    <span id="unlimiterTransientValue">+3 dB</span>
                </div>
            </div>
            <div class="unlimiter-meter">
                <div class="meter-label">DYNAMICS RESTORED</div>
                <div class="meter-bar">
                    <div class="meter-fill" id="unlimiterMeter" style="width: 0%"></div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // v7.6.17: Unlimiter → modifies PRIMARY look-ahead limiter to restore dynamics
    // "Unlimiting" = raising the limiter threshold (less limiting = more dynamics)
    let _unlimiterEnabled = false;
    let _savedLAThreshold = -1.5;
    let _savedLAKnee = 0;
    let _savedLARatio = 12;
    let _savedLAAttack = 0.001;

    document.getElementById('unlimiterEnabled')?.addEventListener('change', function() {
        _unlimiterEnabled = this.checked;
        const laObj = window.lookAheadLimiter;
        const laNode = laObj && laObj.limiter ? laObj.limiter : null;

        if (!laNode) {
            console.warn('Unlimiter: look-ahead limiter not found');
            return;
        }

        if (_unlimiterEnabled) {
            _savedLAThreshold = laNode.threshold.value;
            _savedLAKnee = laNode.knee.value;
            _savedLARatio = laNode.ratio.value;
            _savedLAAttack = laNode.attack.value;
            _applyUnlimiter();
        } else {
            // Restore original look-ahead limiter
            laNode.threshold.value = _savedLAThreshold;
            laNode.knee.value = _savedLAKnee;
            laNode.ratio.value = _savedLARatio;
            laNode.attack.value = _savedLAAttack;
        }
        console.log(`Unlimiter: ${_unlimiterEnabled ? 'ON' : 'OFF'}`);
    });

    function _applyUnlimiter() {
        const laObj = window.lookAheadLimiter;
        const laNode = laObj && laObj.limiter ? laObj.limiter : null;
        if (!laNode || !_unlimiterEnabled) return;

        const amount = parseFloat(document.getElementById('unlimiterAmount')?.value || 50) / 100;
        const transientBoost = parseFloat(document.getElementById('unlimiterTransient')?.value || 3);

        // Raise look-ahead limiter threshold (less limiting = more dynamics)
        laNode.threshold.value = Math.min(0, _savedLAThreshold + (amount * 6));
        // Softer knee for more dynamic range (max 10)
        laNode.knee.value = Math.min(10, amount * 10);
        // Lower ratio for less aggressive limiting (min 2:1)
        laNode.ratio.value = Math.max(2, _savedLARatio - (amount * 10));
        // Transient boost: longer attack lets transients through
        laNode.attack.value = _savedLAAttack + (transientBoost / 6) * 0.009; // 1ms → 10ms
    }

    document.getElementById('unlimiterAmount')?.addEventListener('input', function() {
        document.getElementById('unlimiterAmountValue').textContent = `${this.value}%`;
        document.getElementById('unlimiterMeter').style.width = `${this.value}%`;
        if (_unlimiterEnabled) _applyUnlimiter();
    });

    document.getElementById('unlimiterTransient')?.addEventListener('input', function() {
        document.getElementById('unlimiterTransientValue').textContent = `+${parseFloat(this.value).toFixed(1)} dB`;
        if (_unlimiterEnabled) _applyUnlimiter();
    });

    return container;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. LOUDNESS HISTORY PANEL
// NOTE: Advanced implementation in LOUDNESS_SPECTROGRAM.js takes precedence
// ═══════════════════════════════════════════════════════════════════════════════

// Only define if not already defined by LOUDNESS_SPECTROGRAM.js
if (typeof window.createLoudnessHistoryUI !== 'function') {
    window.createLoudnessHistoryUI = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const html = `
            <div class="loudness-history-panel">
                <div class="panel-header">
                    <span class="panel-title">LOUDNESS HISTORY</span>
                    <button class="reset-btn" id="resetLoudnessHistory">RESET</button>
                </div>
                <canvas id="loudnessHistoryCanvas" width="400" height="120"></canvas>
                <div class="loudness-legend">
                    <span class="legend-item"><span class="legend-color short"></span> Short-term</span>
                    <span class="legend-item"><span class="legend-color int"></span> Integrated</span>
                    <span class="legend-item"><span class="legend-color target"></span> Target</span>
                </div>
            </div>
        `;

        container.innerHTML = html;

        const canvas = document.getElementById('loudnessHistoryCanvas');
        if (canvas && window.advancedEngine) {
            window.loudnessHistory = window.advancedEngine.initLoudnessHistory(canvas);
        }

        document.getElementById('resetLoudnessHistory')?.addEventListener('click', () => {
            if (window.loudnessHistory) {
                window.loudnessHistory.reset();
            }
        });

        return container;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SPECTROGRAM PANEL
// NOTE: Advanced implementation in LOUDNESS_SPECTROGRAM.js takes precedence
// ═══════════════════════════════════════════════════════════════════════════════

// Only define if not already defined by LOUDNESS_SPECTROGRAM.js
if (typeof window.createSpectrogramUI !== 'function') {
    window.createSpectrogramUI = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const html = `
            <div class="spectrogram-panel">
                <div class="panel-header">
                    <span class="panel-title">SPECTROGRAM</span>
                    <span class="panel-desc">Time × Frequency</span>
                </div>
                <canvas id="spectrogramCanvas" width="400" height="200"></canvas>
            </div>
        `;

        container.innerHTML = html;

        const canvas = document.getElementById('spectrogramCanvas');
        if (canvas && window.advancedEngine) {
            window.spectrogram = window.advancedEngine.initSpectrogram(canvas);
        }

        return container;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. LINEAR PHASE EQ TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════

function createLinearPhaseToggle(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const html = `
        <div class="linear-phase-toggle">
            <label class="toggle-label">
                <input type="checkbox" id="linearPhaseEnabled">
                <span class="toggle-text">LINEAR PHASE EQ</span>
                <span class="toggle-badge">Zero Phase Distortion</span>
            </label>
        </div>
    `;

    container.innerHTML = html;

    document.getElementById('linearPhaseEnabled')?.addEventListener('change', function() {
        const enabled = this.checked;

        // Try multiple ways to enable/disable linear phase
        if (window.advancedEngine?.linearPhaseEQ) {
            if (typeof window.advancedEngine.linearPhaseEQ.enableLinearPhase === 'function') {
                window.advancedEngine.linearPhaseEQ.enableLinearPhase(enabled);
            } else if (typeof window.advancedEngine.linearPhaseEQ.setEnabled === 'function') {
                window.advancedEngine.linearPhaseEQ.setEnabled(enabled);
            } else {
                // Set a property directly as fallback
                window.advancedEngine.linearPhaseEQ.enabled = enabled;
            }
        }

        // Also update global linear phase EQ if it exists
        if (window.linearPhaseEQ) {
            window.linearPhaseEQ.enabled = enabled;
        }

        showToast(
            enabled ? 'Linear Phase EQ Enabled' : 'Minimum Phase EQ',
            enabled ? 'Zero phase distortion mode' : 'Standard EQ mode'
        );

    });

    return container;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. LOUDNESS HISTORY UI
// ═══════════════════════════════════════════════════════════════════════════════

function createLoudnessHistoryUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const html = `
        <div class="loudness-history-panel">
            <div class="panel-header">
                <span class="panel-title" style="
                    background: linear-gradient(135deg, #00ff88 0%, #00d4ff 50%, #b84fff 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    font-weight: 800;
                    letter-spacing: 2px;
                ">LOUDNESS HISTORY</span>
                <button class="reset-btn" onclick="resetLoudnessHistory()">Reset</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px;">
                <div style="text-align: center; padding: 8px; background: rgba(0,212,255,0.05); border-radius: 6px;">
                    <div style="font-size: 0.5rem; color: rgba(0,212,255,0.6);">Short-term</div>
                    <div id="loudnessShortTerm" style="font-size: 1rem; font-weight: 700; color: #00d4ff;">--.- LUFS</div>
                </div>
                <div style="text-align: center; padding: 8px; background: rgba(184,79,255,0.05); border-radius: 6px;">
                    <div style="font-size: 0.5rem; color: rgba(184,79,255,0.6);">Integrated</div>
                    <div id="loudnessIntegrated" style="font-size: 1rem; font-weight: 700; color: #b84fff;">--.- LUFS</div>
                </div>
                <div style="text-align: center; padding: 8px; background: rgba(255,215,0,0.05); border-radius: 6px;">
                    <div style="font-size: 0.5rem; color: rgba(255,215,0,0.6);">Target</div>
                    <div id="historyTargetLufs" style="font-size: 1rem; font-weight: 700; color: #ffd700;">-14.0 LUFS</div>
                </div>
            </div>
            <canvas id="loudnessHistoryCanvas" width="600" height="120"></canvas>
            <div class="loudness-legend">
                <div class="legend-item"><span class="legend-color short"></span>Short-term (3s)</div>
                <div class="legend-item"><span class="legend-color int"></span>Integrated</div>
                <div class="legend-item"><span class="legend-color target"></span>Target</div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Initialize canvas
    const canvas = document.getElementById('loudnessHistoryCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw initial grid
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        // Horizontal lines for dB levels
        const levels = [0, -14, -30, -60];
        levels.forEach(db => {
            const y = canvas.height * (1 - (db + 60) / 60);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
            // Labels
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '9px monospace';
            ctx.fillText(db.toString(), 4, y - 2);
        });
    }

    // Store history data
    window.loudnessHistory = {
        shortTerm: [],
        integrated: [],
        maxSamples: 300
    };

    return container;
}

window.resetLoudnessHistory = function() {
    window.loudnessHistory = { shortTerm: [], integrated: [], maxSamples: 300 };
    const canvas = document.getElementById('loudnessHistoryCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. SPECTROGRAM UI
// ═══════════════════════════════════════════════════════════════════════════════

function createSpectrogramUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const html = `
        <div class="spectrogram-panel">
            <div class="panel-header">
                <span class="panel-title">SPECTROGRAM</span>
                <span class="panel-badge">Time × Frequency</span>
            </div>
            <canvas id="spectrogramCanvas" width="800" height="200"></canvas>
            <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.45rem; color: rgba(255,255,255,0.4);">
                <span>20 Hz</span>
                <span>100 Hz</span>
                <span>1 kHz</span>
                <span>10 kHz</span>
                <span>20 kHz</span>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Initialize canvas with dark background
    const canvas = document.getElementById('spectrogramCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return container;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function showToast(title, message, duration = 3000) {
    // Remove existing toast
    const existing = document.querySelector('.advanced-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'advanced-toast';
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. CSS STYLES FOR NEW COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function injectAdvancedStyles() {
    const styles = `
        /* ═══ LIMITER MODE PANEL ═══ */
        .limiter-mode-panel {
            background: linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(15, 15, 25, 0.98));
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
        }

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
        }

        .panel-title {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1px;
            color: rgba(255, 255, 255, 0.9);
        }

        .panel-badge {
            font-size: 9px;
            padding: 2px 8px;
            background: linear-gradient(135deg, #00d4ff, #b84fff);
            border-radius: 10px;
            color: #000;
            font-weight: 700;
        }

        .new-badge {
            background: linear-gradient(135deg, #00ff88, #00d4ff);
        }

        .premium-badge {
            background: linear-gradient(135deg, #ffd700, #ff8c00);
        }

        .panel-desc {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            margin-bottom: 10px;
        }

        .limiter-mode-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
            margin-bottom: 15px;
        }

        .limiter-mode-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            padding: 8px 4px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .limiter-mode-btn:hover {
            background: rgba(0, 212, 255, 0.1);
            border-color: rgba(0, 212, 255, 0.3);
        }

        .limiter-mode-btn.active {
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(184, 79, 255, 0.2));
            border-color: #00d4ff;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
        }

        .mode-label {
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: rgba(255, 255, 255, 0.8);
        }

        .limiter-mode-btn.active .mode-label {
            color: #00d4ff;
        }

        .limiter-controls, .soft-clipper-controls, .upward-controls, .unlimiter-controls {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .limiter-control, .control-row {
            display: grid;
            grid-template-columns: 80px 1fr 60px;
            align-items: center;
            gap: 10px;
        }

        .limiter-control label, .control-row label {
            font-size: 9px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.6);
            letter-spacing: 0.5px;
        }

        .limiter-control span, .control-row span {
            font-size: 10px;
            font-family: 'JetBrains Mono', monospace;
            color: #00d4ff;
            text-align: right;
        }

        /* ═══ TOGGLE SWITCH ═══ */
        .toggle-switch {
            position: relative;
            width: 36px;
            height: 20px;
            margin-left: auto;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            transition: 0.3s;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background: white;
            border-radius: 50%;
            transition: 0.3s;
        }

        .toggle-switch input:checked + .toggle-slider {
            background: linear-gradient(135deg, #00d4ff, #b84fff);
        }

        .toggle-switch input:checked + .toggle-slider:before {
            transform: translateX(16px);
        }

        /* ═══ SOFT CLIPPER / UPWARD / UNLIMITER PANELS ═══ */
        .soft-clipper-panel, .upward-comp-panel, .unlimiter-panel {
            background: linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(15, 15, 25, 0.98));
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
        }

        .unlimiter-meter {
            margin-top: 12px;
        }

        .meter-label {
            font-size: 9px;
            color: rgba(255, 255, 255, 0.5);
            margin-bottom: 5px;
        }

        .meter-bar {
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
        }

        .meter-fill {
            height: 100%;
            background: linear-gradient(90deg, #00d4ff, #00ff88);
            border-radius: 3px;
            transition: width 0.3s ease;
        }

        /* ═══ LOUDNESS HISTORY ═══ */
        .loudness-history-panel {
            background: linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(15, 15, 25, 0.98));
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
        }

        #loudnessHistoryCanvas {
            width: 100%;
            height: 120px;
            border-radius: 8px;
            background: #0a0a0f;
        }

        .loudness-legend {
            display: flex;
            gap: 15px;
            margin-top: 8px;
            font-size: 9px;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
            color: rgba(255, 255, 255, 0.6);
        }

        .legend-color {
            width: 12px;
            height: 3px;
            border-radius: 2px;
        }

        .legend-color.short { background: #00d4ff; }
        .legend-color.int { background: #b84fff; }
        .legend-color.target { background: rgba(0, 212, 255, 0.5); border: 1px dashed #00d4ff; }

        .reset-btn {
            font-size: 9px;
            padding: 4px 10px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            margin-left: auto;
        }

        .reset-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        /* ═══ SPECTROGRAM ═══ */
        .spectrogram-panel {
            background: linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(15, 15, 25, 0.98));
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
        }

        #spectrogramCanvas {
            width: 100%;
            height: 200px;
            border-radius: 8px;
            background: #0a0a0f;
        }

        /* ═══ LINEAR PHASE TOGGLE ═══ */
        .linear-phase-toggle {
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            margin-bottom: 10px;
        }

        .toggle-label {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
        }

        .toggle-text {
            font-size: 10px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.8);
        }

        .toggle-badge {
            font-size: 8px;
            padding: 2px 6px;
            background: rgba(0, 212, 255, 0.2);
            border-radius: 4px;
            color: #00d4ff;
            margin-left: auto;
        }

        /* ═══ TOAST NOTIFICATIONS ═══ */
        .advanced-toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(15, 15, 25, 0.99));
            border: 1px solid rgba(0, 212, 255, 0.3);
            border-radius: 12px;
            padding: 15px 25px;
            z-index: 100000;
            opacity: 0;
            transition: all 0.3s ease;
            backdrop-filter: blur(20px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 212, 255, 0.2);
        }

        .advanced-toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        .toast-title {
            font-size: 12px;
            font-weight: 700;
            color: #00d4ff;
            margin-bottom: 4px;
        }

        .toast-message {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
        }

        /* ═══ SLIDERS ═══ */
        .limiter-control input[type="range"],
        .control-row input[type="range"] {
            -webkit-appearance: none;
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            outline: none;
        }

        .limiter-control input[type="range"]::-webkit-slider-thumb,
        .control-row input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            background: linear-gradient(135deg, #00d4ff, #b84fff);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function initAdvancedMasteringUI() {
    // Inject styles
    injectAdvancedStyles();

}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvancedMasteringUI);
} else {
    initAdvancedMasteringUI();
}

// Export functions (don't overwrite if already defined by LOUDNESS_SPECTROGRAM.js)
window.createLimiterModeUI = createLimiterModeUI;
window.createSoftClipperUI = createSoftClipperUI;
window.createUpwardCompressorUI = createUpwardCompressorUI;
window.createUnlimiterUI = createUnlimiterUI;
// Only set these if not already defined by LOUDNESS_SPECTROGRAM.js (which has better implementations)
if (typeof window.createLoudnessHistoryUI !== 'function') {
    window.createLoudnessHistoryUI = createLoudnessHistoryUI;
}
if (typeof window.createSpectrogramUI !== 'function') {
    window.createSpectrogramUI = createSpectrogramUI;
}
window.createLinearPhaseToggle = createLinearPhaseToggle;
if (typeof window.showToast !== 'function') {
    window.showToast = showToast;
}

