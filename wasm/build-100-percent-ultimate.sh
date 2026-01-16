#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# LuvLang 100% ULTIMATE LEGENDARY - WASM Build Script
# ═══════════════════════════════════════════════════════════════════════════
#
# Compiles the world-class mastering engine to WebAssembly
# Includes ALL professional features - leaving nothing on the table
#
# NEW FEATURES in 100% ULTIMATE:
# - Intelligent De-Esser (tames sibilance 8-12kHz)
# - Safe-Clip Mode (aggressive limiting for loudness war)
# - DC Offset Filter (essential for clean headroom)
# - Sample Rate Converter (high-quality sinc interpolation)
# - Latency Compensation (reports exact latency for DAW sync)
# - Mix Health Report (detects clipping, phase issues, loudness warnings)
#
# Requires: Emscripten SDK (https://emscripten.org)
#

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════════"
echo "  🏆 LuvLang 100% ULTIMATE LEGENDARY - WASM Build"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  This is the COMPLETE professional mastering suite."
echo "  No missing features. World-class quality."
echo ""

# Check if Emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "❌ ERROR: Emscripten not found!"
    echo ""
    echo "Please install Emscripten SDK:"
    echo "  https://emscripten.org/docs/getting_started/downloads.html"
    echo ""
    echo "Quick install:"
    echo "  git clone https://github.com/emscripten-core/emsdk.git"
    echo "  cd emsdk"
    echo "  ./emsdk install latest"
    echo "  ./emsdk activate latest"
    echo "  source ./emsdk_env.sh"
    exit 1
fi

echo "✅ Emscripten found: $(emcc --version | head -n 1)"
echo ""

# Create build directory
mkdir -p build

echo "🔨 Compiling C++ → WebAssembly (100% ULTIMATE)..."
echo ""

# Compile with maximum optimization
emcc MasteringEngine_100_PERCENT_ULTIMATE.cpp \
    -o build/mastering-engine-100-ultimate.js \
    \
    `# C++ Standard and Optimization` \
    -std=c++17 \
    -O3 \
    -ffast-math \
    \
    `# WebAssembly SIMD (massive performance boost)` \
    -msimd128 \
    -mrelaxed-simd \
    \
    `# Emscripten Settings` \
    --bind \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORT_NAME="createMasteringEngine" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=16777216 \
    -s MAXIMUM_MEMORY=67108864 \
    -s STACK_SIZE=1048576 \
    \
    `# Optimization Flags` \
    -s ASSERTIONS=0 \
    -s MALLOC=emmalloc \
    -s FILESYSTEM=0 \
    -s TEXTDECODER=2 \
    \
    `# Advanced Optimization` \
    --closure 1 \
    --llvm-lto 3 \
    -s ELIMINATE_DUPLICATE_FUNCTIONS=1 \
    -s AGGRESSIVE_VARIABLE_ELIMINATION=1 \
    \
    `# Math Optimizations` \
    -s "BINARYEN_METHOD='native-wasm'" \
    -s SINGLE_FILE=0

if [ $? -eq 0 ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "✨ BUILD SUCCESSFUL! 100% ULTIMATE LEGENDARY ✨"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    # Display file sizes
    WASM_SIZE=$(du -h build/mastering-engine-100-ultimate.wasm | cut -f1)
    JS_SIZE=$(du -h build/mastering-engine-100-ultimate.js | cut -f1)

    echo "📦 Output Files:"
    echo "   WASM Binary: build/mastering-engine-100-ultimate.wasm ($WASM_SIZE)"
    echo "   Glue Code:   build/mastering-engine-100-ultimate.js ($JS_SIZE)"
    echo ""

    # Gzip size estimation
    if command -v gzip &> /dev/null; then
        GZIP_SIZE=$(gzip -c build/mastering-engine-100-ultimate.wasm | wc -c | awk '{print int($1/1024)}')
        echo "   Gzipped:     ~${GZIP_SIZE} KB"
        echo ""
    fi

    echo "🎯 Complete Signal Flow (PROFESSIONAL ORDER):"
    echo "   0. DC Offset Removal (clean headroom)"
    echo "   1. Input Gain / Trim"
    echo "   2. ZDF EQ (Nyquist De-cramping)"
    echo "   2b. High-Frequency Air Protection (12-20kHz soft limiting) ✨ NEW"
    echo "   3. Intelligent De-Esser (8-12kHz sibilance control)"
    echo "   4. Stereo Imager (widen BEFORE compression) ← PROFESSIONAL"
    echo "   5. Multiband Compressor (glues widened signal) ← PROFESSIONAL"
    echo "   6. Analog Saturation (Soft-clipper)"
    echo "   7. True-Peak Limiter (4x oversampling + Safe-Clip mode)"
    echo "   8. Dithering (TPDF)"
    echo ""

    echo "🛠️ Professional Metering & Utilities:"
    echo "   ✅ Dual-Gated LUFS (ITU-R BS.1770-4 compliant)"
    echo "   ✅ LRA Meter (Loudness Range - macro-dynamics) ✨ NEW"
    echo "   ✅ Sample Rate Converter (high-quality SRC)"
    echo "   ✅ Latency Compensation (reports 2400 samples @ 48kHz)"
    echo "   ✅ Mix Health Report (clipping, phase, LUFS warnings)"
    echo ""

    echo "🚀 Next Steps:"
    echo "   1. Integrate with your HTML application"
    echo "   2. See 100_PERCENT_ULTIMATE_README.md for API reference"
    echo "   3. Test with real audio files"
    echo ""

    echo "═══════════════════════════════════════════════════════════════"
    echo "  🏆 100% ULTIMATE LEGENDARY STATUS: ACHIEVED"
    echo "  No missing features. Sterling Sound quality."
    echo "═══════════════════════════════════════════════════════════════"
else
    echo ""
    echo "❌ BUILD FAILED"
    echo "Check errors above for details"
    exit 1
fi
