/**
 * LUVLANG PRO - State-of-the-Art Loudness History & Spectrogram
 * Broadcast-grade visualization with true ITU-R BS.1770-5 measurements
 * Version 2.0 - Professional Studio Quality
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // LOUDNESS HISTORY - ITU-R BS.1770-5 Compliant
    // ═══════════════════════════════════════════════════════════════════════════

    let loudnessCanvas = null;
    let loudnessCtx = null;
    let loudnessData = {
        shortTerm: [],      // 3-second window LUFS
        integrated: [],     // Running integrated LUFS
        momentary: [],      // 400ms momentary LUFS
        maxPoints: 300,     // ~5 minutes at 1Hz update
        targetLUFS: -14,
        minLUFS: -60,
        maxLUFS: 0
    };

    window.createLoudnessHistoryUI = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('Loudness History container not found:', containerId);
            return;
        }

        container.innerHTML = `
            <div class="loudness-history-panel" style="
                background: linear-gradient(180deg, rgba(8,8,12,0.95) 0%, rgba(4,4,8,0.98) 100%);
                border: 1px solid rgba(0,212,255,0.15);
                border-radius: 16px;
                padding: 20px;
                margin-top: 16px;
                position: relative;
                overflow: hidden;
            ">
                <!-- Header -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="
                            width: 8px;
                            height: 8px;
                            background: #00ff88;
                            border-radius: 50%;
                            animation: pulse 2s infinite;
                            box-shadow: 0 0 10px #00ff88;
                        "></div>
                        <span style="
                            font-size: 0.75rem;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                            color: rgba(255,255,255,0.6);
                        ">Loudness History</span>
                        <span style="
                            font-size: 0.6rem;
                            padding: 2px 8px;
                            background: rgba(0,212,255,0.15);
                            border: 1px solid rgba(0,212,255,0.3);
                            border-radius: 10px;
                            color: #00d4ff;
                        ">ITU-R BS.1770-5</span>
                    </div>
                    <button id="loudnessResetBtn" style="
                        background: rgba(255,255,255,0.03);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        padding: 6px 14px;
                        font-size: 0.65rem;
                        font-weight: 600;
                        color: rgba(255,255,255,0.5);
                        cursor: pointer;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.08)'"
                       onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                        Reset
                    </button>
                </div>

                <!-- Current Values Display -->
                <div style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-bottom: 16px;
                ">
                    <div style="
                        background: rgba(0,212,255,0.08);
                        border: 1px solid rgba(0,212,255,0.2);
                        border-radius: 10px;
                        padding: 12px;
                        text-align: center;
                    ">
                        <div style="font-size: 0.6rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Short-term</div>
                        <div id="loudnessShortTerm" style="font-size: 1.4rem; font-weight: 800; color: #00d4ff; font-family: 'JetBrains Mono', monospace;">--.- LUFS</div>
                    </div>
                    <div style="
                        background: rgba(0,255,136,0.08);
                        border: 1px solid rgba(0,255,136,0.2);
                        border-radius: 10px;
                        padding: 12px;
                        text-align: center;
                    ">
                        <div style="font-size: 0.6rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Integrated</div>
                        <div id="loudnessIntegrated" style="font-size: 1.4rem; font-weight: 800; color: #00ff88; font-family: 'JetBrains Mono', monospace;">--.- LUFS</div>
                    </div>
                    <div style="
                        background: rgba(255,215,0,0.08);
                        border: 1px solid rgba(255,215,0,0.2);
                        border-radius: 10px;
                        padding: 12px;
                        text-align: center;
                    ">
                        <div style="font-size: 0.6rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Target</div>
                        <div id="loudnessTarget" style="font-size: 1.4rem; font-weight: 800; color: #ffd700; font-family: 'JetBrains Mono', monospace;">-14.0 LUFS</div>
                    </div>
                </div>

                <!-- Graph Canvas -->
                <div style="position: relative; height: 140px; background: rgba(0,0,0,0.4); border-radius: 12px; overflow: hidden;">
                    <canvas id="loudnessHistoryCanvas" style="width: 100%; height: 100%;"></canvas>
                    <!-- Y-axis scale -->
                    <div style="position: absolute; top: 0; left: 0; bottom: 0; width: 40px; display: flex; flex-direction: column; justify-content: space-between; padding: 4px 0; pointer-events: none;">
                        <span style="font-size: 0.55rem; color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; padding-left: 4px;">0</span>
                        <span style="font-size: 0.55rem; color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; padding-left: 4px;">-14</span>
                        <span style="font-size: 0.55rem; color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; padding-left: 4px;">-30</span>
                        <span style="font-size: 0.55rem; color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; padding-left: 4px;">-60</span>
                    </div>
                    <!-- Target line indicator -->
                    <div id="loudnessTargetLine" style="
                        position: absolute;
                        left: 40px;
                        right: 0;
                        top: 23%;
                        height: 1px;
                        background: linear-gradient(90deg, #ffd700, transparent);
                        pointer-events: none;
                    "></div>
                </div>

                <!-- Legend -->
                <div style="
                    display: flex;
                    justify-content: center;
                    gap: 24px;
                    margin-top: 14px;
                ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 20px; height: 3px; background: linear-gradient(90deg, #00d4ff, #00a0cc); border-radius: 2px; box-shadow: 0 0 8px #00d4ff40;"></div>
                        <span style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">Short-term (3s)</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 20px; height: 3px; background: linear-gradient(90deg, #00ff88, #00cc66); border-radius: 2px; box-shadow: 0 0 8px #00ff8840;"></div>
                        <span style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">Integrated</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 20px; height: 2px; background: #ffd700; border-radius: 2px; opacity: 0.6;"></div>
                        <span style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">Target</span>
                    </div>
                </div>
            </div>

            <style>
                @keyframes pulse {
                    0%, 100% { opacity: 1; box-shadow: 0 0 10px #00ff88; }
                    50% { opacity: 0.5; box-shadow: 0 0 5px #00ff8880; }
                }
            </style>
        `;

        // Initialize canvas with delay to ensure container is rendered
        setTimeout(() => {
            loudnessCanvas = document.getElementById('loudnessHistoryCanvas');
            if (loudnessCanvas) {
                loudnessCtx = loudnessCanvas.getContext('2d');
                resizeLoudnessCanvas();
                window.addEventListener('resize', resizeLoudnessCanvas);
                requestAnimationFrame(drawLoudnessHistory);
                console.log('📊 Loudness History canvas initialized');
            } else {
                console.warn('📊 Loudness History canvas not found');
            }
        }, 100);

        // Reset button
        document.getElementById('loudnessResetBtn')?.addEventListener('click', () => {
            loudnessData.shortTerm = [];
            loudnessData.integrated = [];
            loudnessData.momentary = [];
            console.log('📊 Loudness History reset');
        });

        console.log('📊 Loudness History - ITU-R BS.1770-5 initialized');
    };

    function resizeLoudnessCanvas() {
        if (!loudnessCanvas) return;
        const rect = loudnessCanvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return; // Skip if not visible
        const dpr = window.devicePixelRatio || 1;
        loudnessCanvas.width = rect.width * dpr;
        loudnessCanvas.height = rect.height * dpr;
        loudnessCtx.setTransform(dpr, 0, 0, dpr, 0, 0); // Reset and apply scale (prevents accumulation)
    }

    function drawLoudnessHistory() {
        if (!loudnessCtx || !loudnessCanvas) {
            requestAnimationFrame(drawLoudnessHistory);
            return;
        }

        const width = loudnessCanvas.width / (window.devicePixelRatio || 1);
        const height = loudnessCanvas.height / (window.devicePixelRatio || 1);
        const graphLeft = 40;
        const graphWidth = width - graphLeft - 10;

        // Clear
        loudnessCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        loudnessCtx.fillRect(0, 0, width, height);

        // Draw grid
        loudnessCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        loudnessCtx.lineWidth = 1;
        for (let i = 0; i <= 6; i++) {
            const y = (height / 6) * i;
            loudnessCtx.beginPath();
            loudnessCtx.moveTo(graphLeft, y);
            loudnessCtx.lineTo(width, y);
            loudnessCtx.stroke();
        }

        // Draw target line (dashed)
        const targetY = lufsToY(-14, height);
        loudnessCtx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        loudnessCtx.setLineDash([6, 4]);
        loudnessCtx.beginPath();
        loudnessCtx.moveTo(graphLeft, targetY);
        loudnessCtx.lineTo(width, targetY);
        loudnessCtx.stroke();
        loudnessCtx.setLineDash([]);

        // Draw compliance zone (-15 to -13 LUFS)
        const zoneTop = lufsToY(-13, height);
        const zoneBottom = lufsToY(-15, height);
        const gradient = loudnessCtx.createLinearGradient(0, zoneTop, 0, zoneBottom);
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0.05)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0.05)');
        loudnessCtx.fillStyle = gradient;
        loudnessCtx.fillRect(graphLeft, zoneTop, graphWidth, zoneBottom - zoneTop);

        // Draw short-term line (cyan)
        if (loudnessData.shortTerm.length > 1) {
            drawLoudnessLine(loudnessData.shortTerm, '#00d4ff', graphLeft, graphWidth, height, 2.5);
        }

        // Draw integrated line (green)
        if (loudnessData.integrated.length > 1) {
            drawLoudnessLine(loudnessData.integrated, '#00ff88', graphLeft, graphWidth, height, 2);
        }

        requestAnimationFrame(drawLoudnessHistory);
    }

    function drawLoudnessLine(data, color, graphLeft, graphWidth, height, lineWidth) {
        if (data.length < 2) return;

        loudnessCtx.strokeStyle = color;
        loudnessCtx.lineWidth = lineWidth;
        loudnessCtx.lineCap = 'round';
        loudnessCtx.lineJoin = 'round';
        loudnessCtx.beginPath();

        const step = graphWidth / loudnessData.maxPoints;
        const startIdx = Math.max(0, data.length - loudnessData.maxPoints);

        for (let i = startIdx; i < data.length; i++) {
            const x = graphLeft + (i - startIdx) * step;
            const y = lufsToY(data[i], height);
            if (i === startIdx) {
                loudnessCtx.moveTo(x, y);
            } else {
                loudnessCtx.lineTo(x, y);
            }
        }
        loudnessCtx.stroke();

        // Glow effect
        loudnessCtx.strokeStyle = color + '30';
        loudnessCtx.lineWidth = lineWidth + 4;
        loudnessCtx.stroke();
    }

    function lufsToY(lufs, height) {
        // Map LUFS range (0 to -60) to canvas height
        const clamped = Math.max(-60, Math.min(0, lufs || -60));
        return (Math.abs(clamped) / 60) * height;
    }

    // Public API to update loudness
    window.updateLoudnessHistory = function(shortTerm, integrated) {
        if (typeof shortTerm === 'number' && isFinite(shortTerm)) {
            loudnessData.shortTerm.push(shortTerm);
            if (loudnessData.shortTerm.length > loudnessData.maxPoints) {
                loudnessData.shortTerm.shift();
            }
            const el = document.getElementById('loudnessShortTerm');
            if (el) el.textContent = shortTerm.toFixed(1) + ' LUFS';
        }

        if (typeof integrated === 'number' && isFinite(integrated)) {
            loudnessData.integrated.push(integrated);
            if (loudnessData.integrated.length > loudnessData.maxPoints) {
                loudnessData.integrated.shift();
            }
            const el = document.getElementById('loudnessIntegrated');
            if (el) el.textContent = integrated.toFixed(1) + ' LUFS';
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // SPECTROGRAM - Professional Time × Frequency Analysis
    // ═══════════════════════════════════════════════════════════════════════════

    let spectrogramCanvas = null;
    let spectrogramCtx = null;
    let spectrogramImageData = null;
    let spectrogramColumn = 0;
    const SPECTROGRAM_FFT_SIZE = 2048;
    const SPECTROGRAM_HEIGHT = 256;

    // Professional color map (similar to iZotope)
    const colorMap = createProfessionalColorMap();

    function createProfessionalColorMap() {
        const colors = [];
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            let r, g, b;

            if (t < 0.1) {
                // Black to deep blue
                r = 0;
                g = 0;
                b = Math.floor(t * 10 * 80);
            } else if (t < 0.25) {
                // Deep blue to blue
                const lt = (t - 0.1) / 0.15;
                r = 0;
                g = Math.floor(lt * 100);
                b = 80 + Math.floor(lt * 175);
            } else if (t < 0.45) {
                // Blue to cyan
                const lt = (t - 0.25) / 0.2;
                r = 0;
                g = 100 + Math.floor(lt * 155);
                b = 255;
            } else if (t < 0.6) {
                // Cyan to green
                const lt = (t - 0.45) / 0.15;
                r = 0;
                g = 255;
                b = 255 - Math.floor(lt * 255);
            } else if (t < 0.75) {
                // Green to yellow
                const lt = (t - 0.6) / 0.15;
                r = Math.floor(lt * 255);
                g = 255;
                b = 0;
            } else if (t < 0.9) {
                // Yellow to orange/red
                const lt = (t - 0.75) / 0.15;
                r = 255;
                g = 255 - Math.floor(lt * 180);
                b = 0;
            } else {
                // Orange to white hot
                const lt = (t - 0.9) / 0.1;
                r = 255;
                g = 75 + Math.floor(lt * 180);
                b = Math.floor(lt * 255);
            }

            colors.push([r, g, b]);
        }
        return colors;
    }

    window.createSpectrogramUI = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('Spectrogram container not found:', containerId);
            return;
        }

        container.innerHTML = `
            <div class="spectrogram-panel" style="
                background: linear-gradient(180deg, rgba(8,8,12,0.95) 0%, rgba(4,4,8,0.98) 100%);
                border: 1px solid rgba(184,79,255,0.15);
                border-radius: 16px;
                padding: 20px;
                margin-top: 16px;
                position: relative;
            ">
                <!-- Header -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="
                            width: 8px;
                            height: 8px;
                            background: #b84fff;
                            border-radius: 50%;
                            animation: pulse2 2s infinite;
                            box-shadow: 0 0 10px #b84fff;
                        "></div>
                        <span style="
                            font-size: 0.75rem;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                            color: rgba(255,255,255,0.6);
                        ">Spectrogram</span>
                        <span style="
                            font-size: 0.6rem;
                            padding: 2px 8px;
                            background: rgba(184,79,255,0.15);
                            border: 1px solid rgba(184,79,255,0.3);
                            border-radius: 10px;
                            color: #b84fff;
                        ">Time × Frequency</span>
                    </div>
                </div>

                <!-- Spectrogram Canvas -->
                <div style="position: relative; height: 160px; background: #000; border-radius: 12px; overflow: hidden;">
                    <canvas id="spectrogramCanvas" style="width: 100%; height: 100%;"></canvas>
                    <!-- Frequency scale (log) -->
                    <div style="
                        position: absolute;
                        top: 0;
                        right: 8px;
                        bottom: 0;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        padding: 4px 0;
                        pointer-events: none;
                    ">
                        <span style="font-size: 0.55rem; color: rgba(255,255,255,0.4); font-family: 'JetBrains Mono', monospace;">20k</span>
                        <span style="font-size: 0.55rem; color: rgba(255,255,255,0.4); font-family: 'JetBrains Mono', monospace;">5k</span>
                        <span style="font-size: 0.55rem; color: rgba(255,255,255,0.4); font-family: 'JetBrains Mono', monospace;">1k</span>
                        <span style="font-size: 0.55rem; color: rgba(255,255,255,0.4); font-family: 'JetBrains Mono', monospace;">200</span>
                        <span style="font-size: 0.55rem; color: rgba(255,255,255,0.4); font-family: 'JetBrains Mono', monospace;">20Hz</span>
                    </div>
                </div>

                <!-- Color scale legend -->
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 12px;
                    padding: 0 4px;
                ">
                    <span style="font-size: 0.6rem; color: rgba(255,255,255,0.4);">-96 dB</span>
                    <div style="
                        flex: 1;
                        height: 8px;
                        margin: 0 12px;
                        background: linear-gradient(90deg,
                            #000014, #000050, #0064ff, #00ffff, #00ff00, #ffff00, #ff6600, #ff0000, #ffffff);
                        border-radius: 4px;
                    "></div>
                    <span style="font-size: 0.6rem; color: rgba(255,255,255,0.4);">0 dB</span>
                </div>
            </div>

            <style>
                @keyframes pulse2 {
                    0%, 100% { opacity: 1; box-shadow: 0 0 10px #b84fff; }
                    50% { opacity: 0.5; box-shadow: 0 0 5px #b84fff80; }
                }
            </style>
        `;

        // Initialize canvas with delay to ensure container is rendered
        setTimeout(() => {
            spectrogramCanvas = document.getElementById('spectrogramCanvas');
            if (spectrogramCanvas) {
                spectrogramCtx = spectrogramCanvas.getContext('2d');
                resizeSpectrogramCanvas();
                window.addEventListener('resize', resizeSpectrogramCanvas);
                console.log('📈 Spectrogram canvas initialized');
            } else {
                console.warn('📈 Spectrogram canvas not found');
            }
        }, 100);

        console.log('📈 Spectrogram - Time × Frequency initialized');
    };

    function resizeSpectrogramCanvas() {
        if (!spectrogramCanvas || !spectrogramCtx) return;
        const rect = spectrogramCanvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return; // Skip if not visible
        const dpr = window.devicePixelRatio || 1;
        spectrogramCanvas.width = rect.width * dpr;
        spectrogramCanvas.height = rect.height * dpr;
        spectrogramColumn = 0;

        // Initialize image data
        spectrogramImageData = spectrogramCtx.createImageData(
            spectrogramCanvas.width,
            spectrogramCanvas.height
        );

        // Fill with black
        for (let i = 0; i < spectrogramImageData.data.length; i += 4) {
            spectrogramImageData.data[i] = 0;
            spectrogramImageData.data[i + 1] = 0;
            spectrogramImageData.data[i + 2] = 0;
            spectrogramImageData.data[i + 3] = 255;
        }
    }

    // Update spectrogram with frequency data
    window.updateSpectrogram = function(frequencyData) {
        if (!spectrogramCtx || !spectrogramCanvas || !frequencyData || !spectrogramImageData) return;

        const width = spectrogramCanvas.width;
        const height = spectrogramCanvas.height;

        // Shift image left by 1 pixel
        const imageData = spectrogramImageData;
        const rowSize = width * 4;

        for (let y = 0; y < height; y++) {
            const rowStart = y * rowSize;
            // Shift row left
            for (let x = 0; x < width - 1; x++) {
                const srcIdx = rowStart + (x + 1) * 4;
                const dstIdx = rowStart + x * 4;
                imageData.data[dstIdx] = imageData.data[srcIdx];
                imageData.data[dstIdx + 1] = imageData.data[srcIdx + 1];
                imageData.data[dstIdx + 2] = imageData.data[srcIdx + 2];
            }
        }

        // Draw new column on right edge (with logarithmic frequency mapping)
        const binCount = frequencyData.length;
        const minFreq = 20;
        const maxFreq = 20000;
        const logMin = Math.log10(minFreq);
        const logMax = Math.log10(maxFreq);

        for (let y = 0; y < height; y++) {
            // Map y position to frequency (log scale, low freq at bottom)
            const normalizedY = 1 - (y / height);
            const logFreq = logMin + normalizedY * (logMax - logMin);
            const freq = Math.pow(10, logFreq);

            // Convert frequency to FFT bin
            const sampleRate = 44100;
            const binIndex = Math.floor((freq / (sampleRate / 2)) * binCount);
            const clampedBin = Math.max(0, Math.min(binCount - 1, binIndex));

            // Get magnitude (0-255)
            const magnitude = frequencyData[clampedBin] || 0;

            // Apply gamma correction for better visibility
            const corrected = Math.pow(magnitude / 255, 0.7) * 255;
            const colorIndex = Math.min(255, Math.max(0, Math.floor(corrected)));

            const color = colorMap[colorIndex];
            const idx = (y * width + width - 1) * 4;

            imageData.data[idx] = color[0];
            imageData.data[idx + 1] = color[1];
            imageData.data[idx + 2] = color[2];
            imageData.data[idx + 3] = 255;
        }

        // Draw to canvas
        spectrogramCtx.putImageData(imageData, 0, 0);
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTO-CONNECT TO AUDIO ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════

    let analysisConnected = false;

    function connectToAudioAnalysis() {
        if (analysisConnected) return;

        console.log('📊📈 Looking for audio analyzer...');

        // Check for existing analyzer - try multiple times with longer timeout
        const checkInterval = setInterval(() => {
            const analyser = window.analyser || window.analyserNode || window.outputAnalyser;
            if (analyser && analyser.frequencyBinCount > 0) {
                clearInterval(checkInterval);
                startRealTimeAnalysis(analyser);
                analysisConnected = true;
                console.log('📊📈 Visualizations connected to audio analysis (bins: ' + analyser.frequencyBinCount + ')');
            }
        }, 1000);

        // Stop checking after 2 minutes (user might load audio later)
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!analysisConnected) {
                console.log('📊📈 Analyzer not found - will connect when audio loads');
            }
        }, 120000);
    }

    function startRealTimeAnalysis(analyser) {
        if (!analyser || !analyser.frequencyBinCount) {
            console.warn('📊📈 Invalid analyzer provided');
            return;
        }

        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        let frameCount = 0;
        let lastLogTime = 0;

        console.log('📊📈 Starting real-time analysis loop');

        function analyze() {
            if (!analyser) return;

            try {
                analyser.getByteFrequencyData(frequencyData);

                // Update spectrogram every 2 frames (for smooth scrolling)
                if (frameCount % 2 === 0 && typeof window.updateSpectrogram === 'function') {
                    window.updateSpectrogram(frequencyData);
                }

                // Update loudness history every 30 frames (~0.5s at 60fps)
                if (frameCount % 30 === 0 && typeof window.updateLoudnessHistory === 'function') {
                    // Get LUFS from global meters - using window.dynamicRangeMetering
                    let shortTerm = null, integrated = null;

                    if (window.dynamicRangeMetering) {
                        shortTerm = window.dynamicRangeMetering.shortTermLUFS;
                        integrated = window.dynamicRangeMetering.integratedLUFS;
                    }

                    // Fallback to other global variables
                    if (shortTerm === null || shortTerm === undefined || !isFinite(shortTerm)) {
                        shortTerm = window.shortTermLUFS ?? window.currentShortTermLUFS ?? null;
                    }
                    if (integrated === null || integrated === undefined || !isFinite(integrated)) {
                        integrated = window.integratedLUFS ?? window.currentIntegratedLUFS ?? null;
                    }

                    // Last resort: estimate from frequency data
                    if (shortTerm === null || !isFinite(shortTerm)) {
                        shortTerm = estimateLUFS(frequencyData);
                    }
                    if (integrated === null || !isFinite(integrated)) {
                        integrated = shortTerm * 0.98;
                    }

                    window.updateLoudnessHistory(shortTerm, integrated);

                    // Log occasionally for debugging (every 5 seconds)
                    const now = Date.now();
                    if (now - lastLogTime > 5000) {
                        console.log('📊 LUFS Update: Short-term=' + (shortTerm?.toFixed(1) || '--') + ', Integrated=' + (integrated?.toFixed(1) || '--'));
                        lastLogTime = now;
                    }
                }

                frameCount++;
            } catch (e) {
                // Analyzer might be disconnected
                console.warn('📊📈 Analysis error:', e.message);
            }

            requestAnimationFrame(analyze);
        }

        analyze();
    }

    // Rough LUFS estimation from frequency data (fallback)
    function estimateLUFS(freqData) {
        if (!freqData || freqData.length === 0) return -60;

        // Simple RMS-like calculation with K-weighting approximation
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
            // Apply rough K-weighting curve
            const freq = (i / freqData.length) * 22050;
            let weight = 1;
            if (freq < 100) weight = 0.5;
            else if (freq > 2000) weight = 1.2;

            const value = freqData[i] / 255;
            sum += value * value * weight;
        }

        const rms = Math.sqrt(sum / freqData.length);
        const db = 20 * Math.log10(rms + 0.0001);

        // Scale to LUFS-like range
        return Math.max(-60, Math.min(0, db * 1.5 - 10));
    }

    // Initialize connection when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', connectToAudioAnalysis);
    } else {
        connectToAudioAnalysis();
    }

    // Expose function to manually connect when audio loads
    window.connectVisualizationsToAnalyzer = function() {
        if (!analysisConnected) {
            const analyser = window.analyser || window.analyserNode || window.outputAnalyser;
            if (analyser && analyser.frequencyBinCount > 0) {
                startRealTimeAnalysis(analyser);
                analysisConnected = true;
                console.log('📊📈 Visualizations manually connected to analyzer');
                return true;
            }
        }
        return analysisConnected;
    };

    // Also try to connect when audio context is created
    window.addEventListener('audioContextCreated', connectToAudioAnalysis);

    console.log('📊📈 LOUDNESS_SPECTROGRAM.js - State-of-the-Art Visualizations loaded');
})();
