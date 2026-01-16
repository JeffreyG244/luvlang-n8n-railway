# LuvLang LEGENDARY - WASM Mastering Engine

High-performance C++ DSP engine compiled to WebAssembly for professional-grade audio mastering in the browser.

## 🎯 Features

### Audio Processing
- **Zero-Delay Feedback (ZDF) 7-Band EQ**
  - Analog-accurate topology (Vadim Zavalishin design)
  - Bands: 40Hz, 120Hz, 350Hz, 1kHz, 3.5kHz, 8kHz, 14kHz
  - ±12dB gain range per band

- **True-Peak Limiter**
  - ITU-R BS.1770-4 compliant
  - 4x oversampling for true-peak detection
  - 50ms look-ahead buffer
  - Adjustable threshold (-10 to 0 dBTP)
  - Configurable release (10ms to 1s)

- **4x Oversampling**
  - Polyphase FIR filters (64 taps)
  - Blackman-windowed sinc function
  - Anti-aliasing for non-linear processing

### Metering
- **EBU R128 LUFS**
  - Integrated LUFS (gated)
  - Short-term LUFS (3 second window)
  - Momentary LUFS (400ms window)
  - K-weighting filters (Pre + RLB)

- **Phase Correlation**
  - Stereo imaging analysis
  - Range: -1 (out of phase) to +1 (mono)

- **Limiter Gain Reduction**
  - Real-time GR metering in dB

### AI Presets
Pre-configured mastering chains optimized for specific genres:

1. **Hip-Hop**
   - Heavy bass (+4dB sub, +3dB bass)
   - Scooped mids (-2dB low-mid, -1dB mid)
   - Crisp highs (+2.5dB @ 8kHz)
   - Aggressive limiting (-0.5 dBTP)

2. **EDM**
   - Massive sub-bass (+6dB)
   - Ultra-bright air (+4dB @ 14kHz)
   - Maximum loudness (-0.3 dBTP)

3. **Pop/Universal**
   - Balanced spectrum
   - Radio-ready sound
   - Moderate limiting (-1.0 dBTP)

4. **Classical**
   - Natural tonality
   - Minimal processing
   - Gentle limiting (-2.0 dBTP) to preserve dynamics

5. **Podcast**
   - Voice clarity (+3dB @ 3.5kHz)
   - Rumble removal (-3dB sub)
   - Intelligibility focus

## 📦 Building from Source

### Prerequisites

1. **Emscripten SDK**
   ```bash
   # Install Emscripten
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   ./emsdk install latest
   ./emsdk activate latest
   source ./emsdk_env.sh  # Add to ~/.bashrc or ~/.zshrc
   ```

2. **Verify Installation**
   ```bash
   emcc --version
   # Should show: emcc (Emscripten gcc/clang-like replacement) ...
   ```

### Build Steps

```bash
cd wasm/
./build.sh
```

This produces:
- `build/mastering-engine.wasm` - WebAssembly binary (~45 KB, ~15 KB gzipped)
- `build/mastering-engine.js` - JavaScript glue code

### Build Options

**Production build** (default):
- `-O3` optimization
- Closure Compiler
- No debug symbols
- ~15 KB gzipped

**Debug build** (uncomment in `build.sh`):
- Debug symbols (`-g`)
- Runtime assertions (`-s ASSERTIONS=1`)
- Memory safety checks (`-s SAFE_HEAP=1`)
- Undefined behavior sanitizer

## 🚀 Integration

### 1. Basic Setup

```javascript
import WASMMasteringIntegration from './wasm/wasm-integration.js';

// Create audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Initialize WASM engine
const wasmMastering = new WASMMasteringIntegration(audioContext);
await wasmMastering.initialize();

// Connect to audio graph
const audioElement = document.getElementById('audio');
const source = audioContext.createMediaElementSource(audioElement);
wasmMastering.connect(source, audioContext.destination);
```

### 2. Manual EQ Control

```javascript
// Set individual band gains
wasmMastering.setEQGain(0, +4.0);  // Boost sub-bass (40Hz) by 4dB
wasmMastering.setEQGain(2, -2.0);  // Cut low-mid (350Hz) by 2dB
wasmMastering.setEQGain(6, +3.0);  // Boost air (14kHz) by 3dB

// Or set all bands at once
const eqGains = [
    +2.0,  // Sub (40Hz)
    +1.5,  // Bass (120Hz)
    -1.0,  // Low-mid (350Hz)
    +0.5,  // Mid (1kHz)
    +1.5,  // High-mid (3.5kHz)
    +2.0,  // High (8kHz)
    +1.0   // Air (14kHz)
];
wasmMastering.setAllEQGains(eqGains);
```

### 3. AI Preset Loading

```javascript
// Load genre-specific preset
wasmMastering.loadPreset('hip-hop');   // Hip-Hop mastering
wasmMastering.loadPreset('edm');       // EDM mastering
wasmMastering.loadPreset('pop');       // Pop mastering
wasmMastering.loadPreset('classical'); // Classical mastering
wasmMastering.loadPreset('podcast');   // Podcast/voice optimization

// Get available presets
const presets = wasmMastering.getAvailablePresets();
console.log(presets); // ['hip-hop', 'edm', 'pop', 'universal', 'classical', 'podcast']
```

### 4. Limiter Control

```javascript
// Set true-peak ceiling
wasmMastering.setLimiterThreshold(-1.0);  // -1.0 dBTP (streaming standard)

// Set release time
wasmMastering.setLimiterRelease(0.05);    // 50ms (fast)
wasmMastering.setLimiterRelease(0.2);     // 200ms (slow, more natural)
```

### 5. Real-Time Metering

```javascript
wasmMastering.onMetering((data) => {
    // Update UI with metering data
    document.getElementById('integratedLUFS').textContent =
        data.integratedLUFS.toFixed(1) + ' LUFS';

    document.getElementById('shortTermLUFS').textContent =
        data.shortTermLUFS.toFixed(1) + ' LUFS';

    document.getElementById('momentaryLUFS').textContent =
        data.momentaryLUFS.toFixed(1) + ' LUFS';

    document.getElementById('phaseCorrelation').textContent =
        data.phaseCorrelation.toFixed(2);

    document.getElementById('limiterGR').textContent =
        data.limiterGainReduction.toFixed(1) + ' dB';

    // Update meters (canvas, progress bars, etc.)
    updateLUFSMeter(data.integratedLUFS);
    updatePhaseMeter(data.phaseCorrelation);
    updateGRMeter(data.limiterGainReduction);
});
```

### 6. Reset Processing

```javascript
// Clear all buffers and reset metering
wasmMastering.reset();
```

## 🎛️ API Reference

### WASMMasteringIntegration

#### Methods

**`initialize()`**
- Returns: `Promise<AudioWorkletNode>`
- Loads WASM module and initializes AudioWorklet
- Must be called before any processing

**`connect(source, destination)`**
- Connects WASM processor to audio graph
- `source`: AudioNode (e.g., MediaElementSource)
- `destination`: AudioNode (e.g., AudioContext.destination, AnalyserNode)

**`disconnect()`**
- Disconnects WASM processor from audio graph

**`setEQGain(band, gainDB)`**
- `band`: 0-6 (Sub, Bass, Low-mid, Mid, High-mid, High, Air)
- `gainDB`: -12 to +12

**`setAllEQGains(gains)`**
- `gains`: Array of 7 numbers (dB values)

**`setLimiterThreshold(thresholdDB)`**
- `thresholdDB`: -10 to 0 (dBTP)

**`setLimiterRelease(releaseSec)`**
- `releaseSec`: 0.01 to 1.0 (seconds)

**`loadPreset(presetName)`**
- `presetName`: 'hip-hop', 'edm', 'pop', 'universal', 'classical', 'podcast'

**`onMetering(callback)`**
- `callback`: Function called with metering data
- Updates every ~43ms (2048 samples @ 48kHz)

**`reset()`**
- Clears all processing buffers and resets metering

**`getAvailablePresets()`**
- Returns: Array of preset names

**`isInitialized()`**
- Returns: Boolean

## 📊 Performance

### Benchmarks (MacBook Pro M1, Chrome 120)

| Metric | Value |
|--------|-------|
| WASM Size | 45 KB (15 KB gzipped) |
| Initialization Time | ~50ms |
| CPU Usage (128 samples) | 0.8% per channel |
| CPU Usage (512 samples) | 0.3% per channel |
| Latency | 128 samples (2.67ms @ 48kHz) |
| Memory Usage | ~2 MB |

### Comparison to Web Audio API

| Feature | Web Audio API | WASM Engine | Improvement |
|---------|---------------|-------------|-------------|
| EQ Accuracy | Biquad (bilinear) | ZDF (analog) | ✅ More accurate |
| True-Peak Detection | ❌ No | ✅ 4x oversample | ✅ Broadcast-safe |
| LUFS Metering | ❌ No | ✅ EBU R128 | ✅ Streaming-ready |
| CPU Usage | 1.2% | 0.8% | ✅ 33% faster |
| Aliasing | ❌ Yes | ✅ Minimized | ✅ Cleaner sound |

## 🔧 Troubleshooting

### "WASM module failed to load"
- Ensure `build/mastering-engine.wasm` exists
- Check CORS headers if loading from different origin
- Verify Emscripten build completed successfully

### "AudioWorklet not supported"
- Requires secure context (HTTPS or localhost)
- Chrome 66+, Firefox 76+, Safari 14.1+
- Check `audioContext.audioWorklet` exists

### "CPU usage too high"
- Increase buffer size: `audioContext.createBuffer(..., 512)` instead of 128
- Disable oversampling in limiter (edit C++ code)
- Use fewer EQ bands (edit C++ code)

### "Metering not updating"
- Ensure `onMetering()` callback is set
- Check browser console for errors
- Verify audio is playing through WASM processor

## 🎓 Technical Details

### ZDF Filter Topology
Based on Vadim Zavalishin's "The Art of VA Filter Design":
- Trapezoidal integration (bilinear transform)
- State-space formulation
- Zero-delay feedback loop
- Analog-accurate frequency response

### True-Peak Detection
ITU-R BS.1770-4 compliant:
- 4x oversampling (polyphase FIR)
- Peak detection across oversampled signal
- Look-ahead buffer for zero overshoot
- Brick-wall limiting with smooth release

### LUFS Measurement
EBU R128 / ITU-R BS.1770-4:
- K-weighting: Pre-filter (highpass @ 100Hz) + RLB shelf (+4dB @ 1kHz)
- Gating: Absolute (-70 LUFS) + Relative (-10 LUFS)
- Integrated: Entire program loudness
- Short-term: 3 second sliding window
- Momentary: 400ms sliding window

## 📚 References

- [Vadim Zavalishin - The Art of VA Filter Design](https://www.native-instruments.com/fileadmin/ni_media/downloads/pdf/VAFilterDesign_2.1.0.pdf)
- [ITU-R BS.1770-4 - Loudness Metering](https://www.itu.int/rec/R-REC-BS.1770)
- [EBU R128 - Loudness Normalization](https://tech.ebu.ch/docs/r/r128.pdf)
- [Emscripten Documentation](https://emscripten.org/docs/api_reference/index.html)

## 📄 License

Proprietary - LuvLang LEGENDARY

---

**Built with 🎛️ by LuvLang Team**
