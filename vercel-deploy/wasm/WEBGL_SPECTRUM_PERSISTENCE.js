/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PRO SPECTRUM ANALYZER - STUDIO GRADE

   Professional mastering-quality spectrum visualization
   - Smooth gradient fill (not flat color)
   - Sharp peak line with glow
   - Peak hold envelope that traces the curve
   - 60fps GPU-accelerated rendering
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// ═══════════════════════════════════════════════════════════════════════════
// SHADER SOURCE CODE
// ═══════════════════════════════════════════════════════════════════════════

const VERTEX_SHADER = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

const PERSISTENCE_SHADER = `
    precision highp float;
    uniform sampler2D u_currentFrame;
    uniform sampler2D u_prevFrame;
    uniform float u_decay;
    uniform vec2 u_resolution;
    varying vec2 v_texCoord;

    void main() {
        vec4 current = texture2D(u_currentFrame, v_texCoord);
        vec4 previous = texture2D(u_prevFrame, v_texCoord);
        vec4 blended = max(current, previous * u_decay);

        // Bloom on bright areas
        float brightness = dot(blended.rgb, vec3(0.299, 0.587, 0.114));
        if (brightness > 0.5) {
            blended.rgb += vec3(0.1, 0.05, 0.15) * (brightness - 0.5);
        }
        gl_FragColor = blended;
    }
`;

const DISPLAY_SHADER = `
    precision highp float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord);
    }
`;

// ═══════════════════════════════════════════════════════════════════════════
// WEBGL STATE
// ═══════════════════════════════════════════════════════════════════════════

let gl = null;
let canvas = null;
let persistenceProgram = null;
let displayProgram = null;
let framebufferA = null;
let framebufferB = null;
let textureA = null;
let textureB = null;
let quadBuffer = null;
let texCoordBuffer = null;
let currentFrameTexture = null;
let DECAY_RATE = 0.92;

// Pre-allocated buffers
let spectrumDataArray = null;
let pixelBuffer = null;
let lastBufferSize = 0;

// Peak hold for envelope
let peakHoldValues = null;
let peakHoldTimes = null;

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function initWebGL(canvasElement) {

    canvas = canvasElement;
    gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });

    if (!gl) {
        console.error('WebGL not supported');
        return false;
    }

    persistenceProgram = createProgram(VERTEX_SHADER, PERSISTENCE_SHADER);
    displayProgram = createProgram(VERTEX_SHADER, DISPLAY_SHADER);

    if (!persistenceProgram || !displayProgram) return false;

    quadBuffer = createBuffer(new Float32Array([-1,-1, 1,-1, -1,1, 1,1]));
    texCoordBuffer = createBuffer(new Float32Array([0,0, 1,0, 0,1, 1,1]));

    const w = canvas.width, h = canvas.height;
    textureA = createTexture(w, h);
    textureB = createTexture(w, h);
    framebufferA = createFramebuffer(textureA);
    framebufferB = createFramebuffer(textureB);
    currentFrameTexture = createTexture(w, h);

    gl.viewport(0, 0, w, h);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Initialize peak hold arrays
    peakHoldValues = new Float32Array(1024);
    peakHoldTimes = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
        peakHoldValues[i] = -100;
        peakHoldTimes[i] = 0;
    }

    return true;
}

function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function createProgram(vs, fs) {
    const v = createShader(gl.VERTEX_SHADER, vs);
    const f = createShader(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('Program error:', gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

function createBuffer(data) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buf;
}

function createTexture(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
}

function createFramebuffer(tex) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fb;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRO SPECTRUM RENDERING
// ═══════════════════════════════════════════════════════════════════════════

function renderSpectrumToTexture(analyser, audioContext) {
    if (!gl || !currentFrameTexture) return;

    const width = canvas.width;
    const height = canvas.height;
    const now = performance.now();

    // Allocate pixel buffer
    const size = width * height * 4;
    if (!pixelBuffer || lastBufferSize !== size) {
        pixelBuffer = new Uint8Array(size);
        lastBufferSize = size;
    }
    pixelBuffer.fill(0);

    // Get FFT data
    const binCount = analyser.frequencyBinCount;
    if (!spectrumDataArray || spectrumDataArray.length !== binCount) {
        spectrumDataArray = new Float32Array(binCount);
    }
    analyser.getFloatFrequencyData(spectrumDataArray);

    const nyquist = audioContext.sampleRate / 2;
    const numPoints = 512;

    // Calculate spectrum heights
    const heights = new Float32Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
        const freq = 20 * Math.pow(1000, i / numPoints); // 20Hz to 20kHz log scale
        const bin = Math.round((freq / nyquist) * binCount);
        const db = spectrumDataArray[Math.min(bin, binCount - 1)];
        const norm = Math.max(0, Math.min(1, (db + 90) / 90));
        heights[i] = Math.pow(norm, 0.7) * (height - 20);
    }

    // Update peak hold envelope
    for (let i = 0; i < numPoints; i++) {
        if (heights[i] > peakHoldValues[i]) {
            peakHoldValues[i] = heights[i];
            peakHoldTimes[i] = now;
        }
        // Decay peaks after 1.5 seconds
        if (now - peakHoldTimes[i] > 1500) {
            peakHoldValues[i] = Math.max(heights[i], peakHoldValues[i] - 2);
        }
    }

    // ═══ DRAW SPECTRUM ═══
    for (let i = 0; i < numPoints - 1; i++) {
        const x1 = Math.floor((i / numPoints) * width);
        const x2 = Math.floor(((i + 1) / numPoints) * width);
        const h1 = heights[i];
        const h2 = heights[i + 1];
        const t = i / numPoints; // 0-1 frequency position

        // Color gradient: Deep blue → Cyan → Purple → Magenta
        let r, g, b;
        if (t < 0.25) {
            // Deep blue to Cyan
            const p = t / 0.25;
            r = Math.floor(20 + 0 * p);
            g = Math.floor(40 + 180 * p);
            b = Math.floor(120 + 135 * p);
        } else if (t < 0.5) {
            // Cyan to Purple
            const p = (t - 0.25) / 0.25;
            r = Math.floor(20 + 110 * p);
            g = Math.floor(220 - 140 * p);
            b = 255;
        } else if (t < 0.75) {
            // Purple to Magenta
            const p = (t - 0.5) / 0.25;
            r = Math.floor(130 + 125 * p);
            g = Math.floor(80 - 40 * p);
            b = Math.floor(255 - 55 * p);
        } else {
            // Magenta to Pink
            const p = (t - 0.75) / 0.25;
            r = 255;
            g = Math.floor(40 + 80 * p);
            b = Math.floor(200 + 55 * p);
        }

        // Draw filled spectrum with vertical gradient
        for (let x = x1; x < x2; x++) {
            const interp = (x - x1) / Math.max(1, x2 - x1);
            const lineH = Math.floor(h1 + (h2 - h1) * interp);

            // Fill from bottom to peak with gradient (darker at bottom)
            for (let y = 0; y < lineH; y++) {
                const idx = (y * width + x) * 4;
                const vertGrad = Math.pow(y / height, 0.8); // Brighter toward top
                const fillAlpha = 0.15 + vertGrad * 0.45;

                pixelBuffer[idx + 0] = Math.floor(r * fillAlpha);
                pixelBuffer[idx + 1] = Math.floor(g * fillAlpha);
                pixelBuffer[idx + 2] = Math.floor(b * fillAlpha);
                pixelBuffer[idx + 3] = Math.floor(180 * fillAlpha);
            }

            // Draw bright peak line (2px with glow)
            for (let dy = -2; dy <= 2; dy++) {
                const py = Math.max(0, Math.min(height - 1, lineH + dy));
                const idx = (py * width + x) * 4;
                const glow = 1.0 - Math.abs(dy) * 0.3;

                pixelBuffer[idx + 0] = Math.min(255, Math.floor((r + 80) * glow));
                pixelBuffer[idx + 1] = Math.min(255, Math.floor((g + 60) * glow));
                pixelBuffer[idx + 2] = Math.min(255, Math.floor((b + 40) * glow));
                pixelBuffer[idx + 3] = Math.floor(255 * glow);
            }
        }
    }

    // ═══ DRAW PEAK HOLD ENVELOPE - PROFESSIONAL DOTTED LINE ═══
    // Bright white/cyan dots tracing the peak envelope - very visible
    for (let i = 0; i < numPoints - 1; i++) {
        const x1 = Math.floor((i / numPoints) * width);
        const x2 = Math.floor(((i + 1) / numPoints) * width);
        const ph1 = peakHoldValues[i];
        const ph2 = peakHoldValues[i + 1];
        const age1 = now - peakHoldTimes[i];
        const age2 = now - peakHoldTimes[i + 1];

        // Calculate fade based on age (dots stay visible longer)
        const alpha1 = age1 < 2000 ? 1.0 : Math.max(0, 1.0 - (age1 - 2000) / 1500);
        const alpha2 = age2 < 2000 ? 1.0 : Math.max(0, 1.0 - (age2 - 2000) / 1500);

        if (alpha1 <= 0 && alpha2 <= 0) continue;
        if (ph1 < 3 && ph2 < 3) continue;

        // Draw peak hold dots DENSELY along the envelope - every 4 pixels
        for (let x = x1; x < x2; x += 4) {
            const interp = (x - x1) / Math.max(1, x2 - x1);
            const peakY = Math.floor(ph1 + (ph2 - ph1) * interp);
            const alpha = alpha1 + (alpha2 - alpha1) * interp;

            if (peakY < 3 || alpha <= 0) continue;

            // Draw BRIGHT dot with larger glow (4px diameter)
            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > 3.5) continue;

                    const px = Math.max(0, Math.min(width - 1, x + dx));
                    const py = Math.max(0, Math.min(height - 1, peakY + dy));
                    const idx = (py * width + px) * 4;

                    // Brighter core, glowing edge
                    const coreBrightness = dist < 1.5 ? 1.0 : Math.max(0, 1.0 - (dist - 1.5) / 2.0);
                    const brightness = coreBrightness * alpha;

                    // Pure white center, cyan/white glow
                    const r = dist < 1.0 ? 255 : 200;
                    const g = dist < 1.0 ? 255 : 255;
                    const b = 255;

                    pixelBuffer[idx + 0] = Math.min(255, Math.max(pixelBuffer[idx + 0], Math.floor(r * brightness)));
                    pixelBuffer[idx + 1] = Math.min(255, Math.max(pixelBuffer[idx + 1], Math.floor(g * brightness)));
                    pixelBuffer[idx + 2] = Math.min(255, Math.max(pixelBuffer[idx + 2], Math.floor(b * brightness)));
                    pixelBuffer[idx + 3] = Math.min(255, Math.max(pixelBuffer[idx + 3], Math.floor(255 * brightness)));
                }
            }
        }
    }

    // ═══ DRAW CONTINUOUS PEAK LINE (connects the dots) ═══
    // Draw a thin glowing line connecting all peak dots
    for (let i = 0; i < numPoints - 1; i++) {
        const x1 = Math.floor((i / numPoints) * width);
        const x2 = Math.floor(((i + 1) / numPoints) * width);
        const ph1 = peakHoldValues[i];
        const ph2 = peakHoldValues[i + 1];
        const age = Math.min(now - peakHoldTimes[i], now - peakHoldTimes[i + 1]);
        const lineAlpha = age < 2000 ? 0.8 : Math.max(0, 0.8 - (age - 2000) / 2000);

        if (lineAlpha <= 0 || (ph1 < 3 && ph2 < 3)) continue;

        // Draw thin line connecting peaks
        for (let x = x1; x <= x2; x++) {
            const interp = (x - x1) / Math.max(1, x2 - x1);
            const peakY = Math.floor(ph1 + (ph2 - ph1) * interp);
            if (peakY < 3) continue;

            // 1px line with slight glow
            for (let dy = -1; dy <= 1; dy++) {
                const py = Math.max(0, Math.min(height - 1, peakY + dy));
                const idx = (py * width + x) * 4;
                const glow = dy === 0 ? lineAlpha : lineAlpha * 0.3;

                pixelBuffer[idx + 0] = Math.min(255, Math.max(pixelBuffer[idx + 0], Math.floor(200 * glow)));
                pixelBuffer[idx + 1] = Math.min(255, Math.max(pixelBuffer[idx + 1], Math.floor(255 * glow)));
                pixelBuffer[idx + 2] = Math.min(255, Math.max(pixelBuffer[idx + 2], Math.floor(255 * glow)));
                pixelBuffer[idx + 3] = Math.min(255, Math.max(pixelBuffer[idx + 3], Math.floor(200 * glow)));
            }
        }
    }

    // Upload to texture
    gl.bindTexture(gl.TEXTURE_2D, currentFrameTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

let pingPong = false;

function render(analyser, audioContext) {
    if (!gl || !persistenceProgram || !displayProgram) return;

    renderSpectrumToTexture(analyser, audioContext);

    // Persistence pass
    const inFB = pingPong ? framebufferB : framebufferA;
    const outFB = pingPong ? framebufferA : framebufferB;
    const inTex = pingPong ? textureB : textureA;
    const outTex = pingPong ? textureA : textureB;

    gl.bindFramebuffer(gl.FRAMEBUFFER, outFB);
    gl.useProgram(persistenceProgram);

    gl.uniform1i(gl.getUniformLocation(persistenceProgram, 'u_currentFrame'), 0);
    gl.uniform1i(gl.getUniformLocation(persistenceProgram, 'u_prevFrame'), 1);
    gl.uniform1f(gl.getUniformLocation(persistenceProgram, 'u_decay'), DECAY_RATE);
    gl.uniform2f(gl.getUniformLocation(persistenceProgram, 'u_resolution'), canvas.width, canvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, currentFrameTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, inTex);

    const pos = gl.getAttribLocation(persistenceProgram, 'a_position');
    const tex = gl.getAttribLocation(persistenceProgram, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(tex);
    gl.vertexAttribPointer(tex, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Display pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(displayProgram);
    gl.uniform1i(gl.getUniformLocation(displayProgram, 'u_texture'), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, outTex);

    const pos2 = gl.getAttribLocation(displayProgram, 'a_position');
    const tex2 = gl.getAttribLocation(displayProgram, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(pos2);
    gl.vertexAttribPointer(pos2, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(tex2);
    gl.vertexAttribPointer(tex2, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    pingPong = !pingPong;
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL API
// ═══════════════════════════════════════════════════════════════════════════

window.WebGLSpectrum = {
    init: initWebGL,
    render: render,
    setDecay: (rate) => { DECAY_RATE = rate; },
    isReady: () => gl !== null
};

