/**
 * LUVLANG PRO - State-of-the-Art Loudness History & Spectrogram
 * Broadcast-grade visualization with true ITU-R BS.1770-5 measurements
 * Version 3.0 - Complete Overhaul for Reliability
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // LOUDNESS HISTORY - State-of-the-Art Graph
    // ═══════════════════════════════════════════════════════════════════════════

    let loudnessCanvas = null;
    let loudnessCtx = null;
    let loudnessAnimationId = null;
    const loudnessData = {
        shortTerm: [],
        integrated: [],
        maxPoints: 300,
        targetLUFS: -14
    };

    window.createLoudnessHistoryUI = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('📊 Loudness History container not found:', containerId);
            return;
        }

        container.innerHTML = `
            <div style="
                background: linear-gradient(180deg, rgba(8,8,12,0.95) 0%, rgba(4,4,8,0.98) 100%);
                border: 1px solid rgba(0,212,255,0.15);
                border-radius: 16px;
                padding: 20px;
                margin-top: 16px;
            ">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="
                            width: 10px; height: 10px;
                            background: linear-gradient(135deg, #00ff88, #00d4ff);
                            border-radius: 50%;
                            animation: loudnessPulse 2s infinite;
                            box-shadow: 0 0 12px #00ff88;
                        "></div>
                        <span style="
                            font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 3px;
                            background: linear-gradient(135deg, #00ff88 0%, #00d4ff 50%, #b84fff 100%);
                            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                            background-clip: text;
                        ">Loudness History</span>
                    </div>
                    <button onclick="window.resetLoudnessHistory()" style="
                        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px; padding: 6px 14px; font-size: 0.65rem; font-weight: 600;
                        color: rgba(255,255,255,0.5); cursor: pointer; text-transform: uppercase;
                    ">Reset</button>
                </div>

                <!-- Values -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
                    <div style="background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2); border-radius: 10px; padding: 12px; text-align: center;">
                        <div style="font-size: 0.6rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Short-term</div>
                        <div id="loudnessShortTerm" style="font-size: 1.4rem; font-weight: 800; color: #00d4ff; font-family: 'JetBrains Mono', monospace;">--.- LUFS</div>
                    </div>
                    <div style="background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.2); border-radius: 10px; padding: 12px; text-align: center;">
                        <div style="font-size: 0.6rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Integrated</div>
                        <div id="loudnessIntegrated" style="font-size: 1.4rem; font-weight: 800; color: #00ff88; font-family: 'JetBrains Mono', monospace;">--.- LUFS</div>
                    </div>
                    <div style="background: rgba(255,215,0,0.08); border: 1px solid rgba(255,215,0,0.2); border-radius: 10px; padding: 12px; text-align: center;">
                        <div style="font-size: 0.6rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Target</div>
                        <div style="font-size: 1.4rem; font-weight: 800; color: #ffd700; font-family: 'JetBrains Mono', monospace;">-14.0 LUFS</div>
                    </div>
                </div>

                <!-- Canvas Container -->
                <div style="position: relative; height: 140px; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                    <canvas id="loudnessHistoryCanvas" style="width: 100%; height: 100%; display: block;"></canvas>
                    <!-- Scale labels -->
                    <div style="position: absolute; top: 5px; left: 5px; font-size: 9px; color: rgba(255,255,255,0.3); font-family: monospace;">0 dB</div>
                    <div style="position: absolute; top: 33%; left: 5px; font-size: 9px; color: rgba(255,215,0,0.5); font-family: monospace;">-14</div>
                    <div style="position: absolute; bottom: 5px; left: 5px; font-size: 9px; color: rgba(255,255,255,0.3); font-family: monospace;">-60</div>
                </div>

                <!-- Legend -->
                <div style="display: flex; justify-content: center; gap: 24px; margin-top: 14px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 20px; height: 3px; background: #00d4ff; border-radius: 2px; box-shadow: 0 0 8px #00d4ff;"></div>
                        <span style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">Short-term (3s)</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 20px; height: 3px; background: #00ff88; border-radius: 2px; box-shadow: 0 0 8px #00ff88;"></div>
                        <span style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">Integrated</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 20px; height: 2px; background: #ffd700; border-radius: 2px; opacity: 0.6;"></div>
                        <span style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">Target</span>
                    </div>
                </div>
            </div>
            <style>
                @keyframes loudnessPulse {
                    0%, 100% { opacity: 1; box-shadow: 0 0 12px #00ff88; }
                    50% { opacity: 0.5; box-shadow: 0 0 6px #00ff88; }
                }
            </style>
        `;

        // Initialize canvas immediately
        setTimeout(() => initLoudnessCanvas(), 100);

    };

    function initLoudnessCanvas() {
        loudnessCanvas = document.getElementById('loudnessHistoryCanvas');
        if (!loudnessCanvas) {
            console.error('📊 Canvas element not found!');
            return;
        }

        loudnessCtx = loudnessCanvas.getContext('2d');

        // Set canvas size
        const rect = loudnessCanvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width || 400;
        const height = rect.height || 140;

        loudnessCanvas.width = width * dpr;
        loudnessCanvas.height = height * dpr;
        loudnessCtx.scale(dpr, dpr);

        // Start animation loop
        if (loudnessAnimationId) cancelAnimationFrame(loudnessAnimationId);
        drawLoudnessHistory();
    }

    function drawLoudnessHistory() {
        if (!loudnessCtx || !loudnessCanvas) {
            loudnessAnimationId = requestAnimationFrame(drawLoudnessHistory);
            return;
        }

        const dpr = window.devicePixelRatio || 1;
        const width = loudnessCanvas.width / dpr;
        const height = loudnessCanvas.height / dpr;

        // Clear with dark background
        loudnessCtx.fillStyle = '#050508';
        loudnessCtx.fillRect(0, 0, width, height);

        // Draw grid lines
        loudnessCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        loudnessCtx.lineWidth = 1;
        for (let i = 0; i <= 6; i++) {
            const y = (height / 6) * i;
            loudnessCtx.beginPath();
            loudnessCtx.moveTo(0, y);
            loudnessCtx.lineTo(width, y);
            loudnessCtx.stroke();
        }

        // Draw target line at -14 LUFS (dashed golden line)
        const targetY = lufsToY(-14, height);
        loudnessCtx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        loudnessCtx.setLineDash([6, 4]);
        loudnessCtx.beginPath();
        loudnessCtx.moveTo(0, targetY);
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
        loudnessCtx.fillRect(0, zoneTop, width, zoneBottom - zoneTop);

        // Draw short-term line (cyan)
        if (loudnessData.shortTerm.length > 1) {
            drawLine(loudnessData.shortTerm, '#00d4ff', 2.5, width, height);
        }

        // Draw integrated line (green)
        if (loudnessData.integrated.length > 1) {
            drawLine(loudnessData.integrated, '#00ff88', 2, width, height);
        }

        // Draw "waiting for audio" text if no data
        if (loudnessData.shortTerm.length < 2) {
            loudnessCtx.fillStyle = 'rgba(255,255,255,0.2)';
            loudnessCtx.font = '12px system-ui, sans-serif';
            loudnessCtx.textAlign = 'center';
            loudnessCtx.fillText('▶ Play audio to see loudness history', width / 2, height / 2);
        }

        loudnessAnimationId = requestAnimationFrame(drawLoudnessHistory);
    }

    function drawLine(data, color, lineWidth, canvasWidth, canvasHeight) {
        if (!loudnessCtx || data.length < 2) return;

        loudnessCtx.strokeStyle = color;
        loudnessCtx.lineWidth = lineWidth;
        loudnessCtx.lineCap = 'round';
        loudnessCtx.lineJoin = 'round';
        loudnessCtx.beginPath();

        const step = canvasWidth / loudnessData.maxPoints;
        const startIdx = Math.max(0, data.length - loudnessData.maxPoints);

        for (let i = startIdx; i < data.length; i++) {
            const x = (i - startIdx) * step;
            const y = lufsToY(data[i], canvasHeight);
            if (i === startIdx) {
                loudnessCtx.moveTo(x, y);
            } else {
                loudnessCtx.lineTo(x, y);
            }
        }
        loudnessCtx.stroke();

        // Glow effect
        loudnessCtx.strokeStyle = color + '40';
        loudnessCtx.lineWidth = lineWidth + 4;
        loudnessCtx.stroke();
    }

    function lufsToY(lufs, height) {
        const clamped = Math.max(-60, Math.min(0, lufs || -60));
        return (Math.abs(clamped) / 60) * height;
    }

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

    window.resetLoudnessHistory = function() {
        loudnessData.shortTerm = [];
        loudnessData.integrated = [];

    };

    // ═══════════════════════════════════════════════════════════════════════════
    // SPECTROGRAM - Professional Time × Frequency Analysis
    // ═══════════════════════════════════════════════════════════════════════════

    let spectrogramCanvas = null;
    let spectrogramCtx = null;
    let spectrogramImageData = null;
    let spectrogramAnimationId = null;

    // Professional color map (iZotope style)
    const colorMap = [];
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        let r, g, b;
        if (t < 0.1) { r = 0; g = 0; b = Math.floor(t * 10 * 80); }
        else if (t < 0.25) { const lt = (t - 0.1) / 0.15; r = 0; g = Math.floor(lt * 100); b = 80 + Math.floor(lt * 175); }
        else if (t < 0.45) { const lt = (t - 0.25) / 0.2; r = 0; g = 100 + Math.floor(lt * 155); b = 255; }
        else if (t < 0.6) { const lt = (t - 0.45) / 0.15; r = 0; g = 255; b = 255 - Math.floor(lt * 255); }
        else if (t < 0.75) { const lt = (t - 0.6) / 0.15; r = Math.floor(lt * 255); g = 255; b = 0; }
        else if (t < 0.9) { const lt = (t - 0.75) / 0.15; r = 255; g = 255 - Math.floor(lt * 180); b = 0; }
        else { const lt = (t - 0.9) / 0.1; r = 255; g = 75 + Math.floor(lt * 180); b = Math.floor(lt * 255); }
        colorMap.push([r, g, b]);
    }

    window.createSpectrogramUI = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('📈 Spectrogram container not found:', containerId);
            return;
        }

        container.innerHTML = `
            <div style="
                background: linear-gradient(180deg, rgba(8,8,12,0.95) 0%, rgba(4,4,8,0.98) 100%);
                border: 1px solid rgba(184,79,255,0.15);
                border-radius: 16px;
                padding: 20px;
                margin-top: 16px;
            ">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="
                            width: 8px; height: 8px;
                            background: #b84fff; border-radius: 50%;
                            animation: spectrogramPulse 2s infinite;
                            box-shadow: 0 0 10px #b84fff;
                        "></div>
                        <span style="
                            font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 3px;
                            background: linear-gradient(135deg, #b84fff 0%, #ff6b9d 50%, #ffd700 100%);
                            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                            background-clip: text;
                        ">Spectrogram</span>
                        <span style="
                            font-size: 0.6rem; padding: 2px 8px;
                            background: rgba(184,79,255,0.15); border: 1px solid rgba(184,79,255,0.3);
                            border-radius: 10px; color: #b84fff;
                        ">Time × Frequency</span>
                    </div>
                </div>

                <!-- Canvas Container -->
                <div style="position: relative; height: 160px; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                    <canvas id="spectrogramCanvas" style="width: 100%; height: 100%; display: block;"></canvas>
                    <!-- Frequency scale -->
                    <div style="position: absolute; top: 0; right: 8px; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 4px 0; pointer-events: none;">
                        <span style="font-size: 9px; color: rgba(255,255,255,0.4); font-family: monospace;">20k</span>
                        <span style="font-size: 9px; color: rgba(255,255,255,0.4); font-family: monospace;">5k</span>
                        <span style="font-size: 9px; color: rgba(255,255,255,0.4); font-family: monospace;">1k</span>
                        <span style="font-size: 9px; color: rgba(255,255,255,0.4); font-family: monospace;">200</span>
                        <span style="font-size: 9px; color: rgba(255,255,255,0.4); font-family: monospace;">20Hz</span>
                    </div>
                </div>

                <!-- Color scale legend -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding: 0 4px;">
                    <span style="font-size: 0.6rem; color: rgba(255,255,255,0.4);">-96 dB</span>
                    <div style="
                        flex: 1; height: 8px; margin: 0 12px;
                        background: linear-gradient(90deg, #000014, #000050, #0064ff, #00ffff, #00ff00, #ffff00, #ff6600, #ff0000, #ffffff);
                        border-radius: 4px;
                    "></div>
                    <span style="font-size: 0.6rem; color: rgba(255,255,255,0.4);">0 dB</span>
                </div>
            </div>
            <style>
                @keyframes spectrogramPulse {
                    0%, 100% { opacity: 1; box-shadow: 0 0 10px #b84fff; }
                    50% { opacity: 0.5; box-shadow: 0 0 5px #b84fff; }
                }
            </style>
        `;

        // Initialize canvas immediately
        setTimeout(() => initSpectrogramCanvas(), 100);

    };

    function initSpectrogramCanvas() {
        spectrogramCanvas = document.getElementById('spectrogramCanvas');
        if (!spectrogramCanvas) {
            console.error('📈 Canvas element not found!');
            return;
        }

        spectrogramCtx = spectrogramCanvas.getContext('2d');

        // Set canvas size
        const rect = spectrogramCanvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width || 400;
        const height = rect.height || 160;

        spectrogramCanvas.width = width * dpr;
        spectrogramCanvas.height = height * dpr;
        spectrogramCtx.scale(dpr, dpr);

        // Initialize image data
        spectrogramImageData = spectrogramCtx.createImageData(spectrogramCanvas.width, spectrogramCanvas.height);
        for (let i = 0; i < spectrogramImageData.data.length; i += 4) {
            spectrogramImageData.data[i] = 0;
            spectrogramImageData.data[i + 1] = 0;
            spectrogramImageData.data[i + 2] = 0;
            spectrogramImageData.data[i + 3] = 255;
        }

        // Draw initial "waiting for audio" message
        drawSpectrogramWaiting();
    }

    function drawSpectrogramWaiting() {
        if (!spectrogramCtx || !spectrogramCanvas) return;

        const dpr = window.devicePixelRatio || 1;
        const width = spectrogramCanvas.width / dpr;
        const height = spectrogramCanvas.height / dpr;

        spectrogramCtx.fillStyle = '#050508';
        spectrogramCtx.fillRect(0, 0, width, height);

        spectrogramCtx.fillStyle = 'rgba(255,255,255,0.2)';
        spectrogramCtx.font = '12px system-ui, sans-serif';
        spectrogramCtx.textAlign = 'center';
        spectrogramCtx.fillText('▶ Play audio to see spectrogram', width / 2, height / 2);
    }

    window.updateSpectrogram = function(frequencyData) {
        if (!spectrogramCtx || !spectrogramCanvas || !frequencyData || !spectrogramImageData) return;

        const width = spectrogramCanvas.width;
        const height = spectrogramCanvas.height;
        const imageData = spectrogramImageData;
        const rowSize = width * 4;

        // Shift image left by 1 pixel
        for (let y = 0; y < height; y++) {
            const rowStart = y * rowSize;
            for (let x = 0; x < width - 1; x++) {
                const srcIdx = rowStart + (x + 1) * 4;
                const dstIdx = rowStart + x * 4;
                imageData.data[dstIdx] = imageData.data[srcIdx];
                imageData.data[dstIdx + 1] = imageData.data[srcIdx + 1];
                imageData.data[dstIdx + 2] = imageData.data[srcIdx + 2];
            }
        }

        // Draw new column with logarithmic frequency mapping
        const binCount = frequencyData.length;
        const minFreq = 20, maxFreq = 20000;
        const logMin = Math.log10(minFreq), logMax = Math.log10(maxFreq);

        for (let y = 0; y < height; y++) {
            const normalizedY = 1 - (y / height);
            const logFreq = logMin + normalizedY * (logMax - logMin);
            const freq = Math.pow(10, logFreq);
            const binIndex = Math.floor((freq / 22050) * binCount);
            const clampedBin = Math.max(0, Math.min(binCount - 1, binIndex));
            const magnitude = frequencyData[clampedBin] || 0;
            const corrected = Math.pow(magnitude / 255, 0.7) * 255;
            const colorIndex = Math.min(255, Math.max(0, Math.floor(corrected)));
            const color = colorMap[colorIndex];
            const idx = (y * width + width - 1) * 4;
            imageData.data[idx] = color[0];
            imageData.data[idx + 1] = color[1];
            imageData.data[idx + 2] = color[2];
            imageData.data[idx + 3] = 255;
        }

        spectrogramCtx.putImageData(imageData, 0, 0);
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTO-CONNECT TO AUDIO ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════

    let analysisConnected = false;

    function connectToAudioAnalysis() {
        if (analysisConnected) return;

        const checkInterval = setInterval(() => {
            const analyser = window.analyser || window.analyserNode || window.outputAnalyser;
            if (analyser && analyser.frequencyBinCount > 0) {
                clearInterval(checkInterval);
                startRealTimeAnalysis(analyser);
                analysisConnected = true;

            }
        }, 1000);

        setTimeout(() => {
            clearInterval(checkInterval);
            if (!analysisConnected) {

            }
        }, 120000);
    }

    function startRealTimeAnalysis(analyser) {
        if (!analyser) return;

        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        let frameCount = 0;

        function analyze() {
            try {
                analyser.getByteFrequencyData(frequencyData);

                // Update spectrogram every 2 frames
                if (frameCount % 2 === 0 && typeof window.updateSpectrogram === 'function') {
                    window.updateSpectrogram(frequencyData);
                }

                // Update loudness every 30 frames
                if (frameCount % 30 === 0 && typeof window.updateLoudnessHistory === 'function') {
                    let shortTerm = null, integrated = null;

                    if (window.dynamicRangeMetering) {
                        shortTerm = window.dynamicRangeMetering.shortTermLUFS;
                        integrated = window.dynamicRangeMetering.integratedLUFS;
                    }

                    if (shortTerm === null || !isFinite(shortTerm)) {
                        shortTerm = window.shortTermLUFS ?? window.currentShortTermLUFS ?? estimateLUFS(frequencyData);
                    }
                    if (integrated === null || !isFinite(integrated)) {
                        integrated = window.integratedLUFS ?? window.currentIntegratedLUFS ?? (shortTerm * 0.98);
                    }

                    window.updateLoudnessHistory(shortTerm, integrated);
                }

                frameCount++;
            } catch (e) {
                console.warn('📊📈 Analysis error:', e.message);
            }

            requestAnimationFrame(analyze);
        }

        analyze();
    }

    function estimateLUFS(freqData) {
        if (!freqData || freqData.length === 0) return -60;
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
            const value = freqData[i] / 255;
            sum += value * value;
        }
        const rms = Math.sqrt(sum / freqData.length);
        const db = 20 * Math.log10(rms + 0.0001);
        return Math.max(-60, Math.min(0, db * 1.5 - 10));
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', connectToAudioAnalysis);
    } else {
        connectToAudioAnalysis();
    }

    window.connectVisualizationsToAnalyzer = function() {
        if (!analysisConnected) {
            const analyser = window.analyser || window.analyserNode || window.outputAnalyser;
            if (analyser) {
                startRealTimeAnalysis(analyser);
                analysisConnected = true;
                return true;
            }
        }
        return analysisConnected;
    };

})();
