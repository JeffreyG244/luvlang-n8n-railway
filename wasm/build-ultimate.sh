#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# LuvLang ULTIMATE LEGENDARY - WASM Build Script
# ═══════════════════════════════════════════════════════════════════════════
#
# Compiles the professional-grade mastering engine to WebAssembly
# Requires: Emscripten SDK (https://emscripten.org/docs/getting_started/downloads.html)
#
# Usage:
#   ./build-ultimate.sh
#
# Output:
#   build/mastering-engine-ultimate.wasm  (~50-60 KB, 18 KB gzipped)
#   build/mastering-engine-ultimate.js    (Glue code)
#

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════════"
echo "  LuvLang ULTIMATE LEGENDARY - WASM Build"
echo "═══════════════════════════════════════════════════════════════"
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

echo "🔨 Compiling C++ → WebAssembly..."
echo ""

# Compile with maximum optimization
emcc MasteringEngine_ULTIMATE_LEGENDARY.cpp \
    -o build/mastering-engine-ultimate.js \
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
    echo "✨ BUILD SUCCESSFUL! ✨"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    # Display file sizes
    WASM_SIZE=$(du -h build/mastering-engine-ultimate.wasm | cut -f1)
    JS_SIZE=$(du -h build/mastering-engine-ultimate.js | cut -f1)

    echo "📦 Output Files:"
    echo "   WASM Binary: build/mastering-engine-ultimate.wasm ($WASM_SIZE)"
    echo "   Glue Code:   build/mastering-engine-ultimate.js ($JS_SIZE)"
    echo ""

    # Gzip size estimation
    if command -v gzip &> /dev/null; then
        GZIP_SIZE=$(gzip -c build/mastering-engine-ultimate.wasm | wc -c | awk '{print int($1/1024)}')
        echo "   Gzipped:     ~${GZIP_SIZE} KB"
        echo ""
    fi

    echo "🎯 Signal Flow:"
    echo "   1. Input Gain / Trim"
    echo "   2. ZDF EQ (Nyquist De-cramping)"
    echo "   3. Multiband Compressor (LR4 crossovers)"
    echo "   4. Stereo Imager (Frequency-dependent width)"
    echo "   5. Analog Saturation (Soft-clipper)"
    echo "   6. True-Peak Limiter (4x oversampling)"
    echo "   7. Dithering (TPDF)"
    echo ""

    echo "🚀 Next Steps:"
    echo "   1. Integrate with your HTML application"
    echo "   2. See wasm-integration-ultimate.js for usage examples"
    echo "   3. Test with real audio files"
    echo ""

    echo "═══════════════════════════════════════════════════════════════"
    echo "  🏆 LEGENDARY STATUS: ACHIEVED"
    echo "═══════════════════════════════════════════════════════════════"
else
    echo ""
    echo "❌ BUILD FAILED"
    echo "Check errors above for details"
    exit 1
fi
