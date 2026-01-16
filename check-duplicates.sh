#!/bin/bash

# UI DUPLICATION DETECTION SCRIPT
# Run this before every commit to catch duplicate UI sections
#
# Usage: ./check-duplicates.sh

echo ""
echo "🔍 UI DUPLICATION CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if HTML file exists
if [ ! -f "luvlang_LEGENDARY_COMPLETE.html" ]; then
    echo "❌ ERROR: luvlang_LEGENDARY_COMPLETE.html not found"
    echo "   Run this script from the luvlang-mastering directory"
    exit 1
fi

# Count UI sections
GENRE_SELECTORS=$(grep -c '<!-- GENRE SELECTOR -->' luvlang_LEGENDARY_COMPLETE.html)
EQ_SECTIONS=$(grep -c '<div class="eq-section"' luvlang_LEGENDARY_COMPLETE.html)
PLATFORM_SELECTORS=$(grep -c '<!-- PLATFORM SELECTOR -->' luvlang_LEGENDARY_COMPLETE.html)
EQ_PRESET_DROPDOWN=$(grep -c 'id="eqPresetSelect"' luvlang_LEGENDARY_COMPLETE.html)

# Display results
echo ""
echo "📊 UI Section Counts:"
echo ""
echo "  Genre Selectors:    $GENRE_SELECTORS (expected: 1)"
echo "  EQ Sections:        $EQ_SECTIONS (expected: 1)"
echo "  Platform Selectors: $PLATFORM_SELECTORS (expected: 1)"
echo "  EQ Preset Dropdown: $EQ_PRESET_DROPDOWN (expected: 1)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for problems
ERRORS=0

if [ "$GENRE_SELECTORS" -ne 1 ]; then
    echo "❌ FAIL: Found $GENRE_SELECTORS Genre Selectors (expected 1)"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ PASS: Genre Selectors"
fi

if [ "$EQ_SECTIONS" -ne 1 ]; then
    echo "❌ FAIL: Found $EQ_SECTIONS EQ Sections (expected 1)"
    echo "   Check for duplicate Stereo Field Editor or Spectral De-noiser"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ PASS: EQ Sections"
fi

if [ "$PLATFORM_SELECTORS" -ne 1 ]; then
    echo "❌ FAIL: Found $PLATFORM_SELECTORS Platform Selectors (expected 1)"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ PASS: Platform Selectors"
fi

if [ "$EQ_PRESET_DROPDOWN" -ne 1 ]; then
    echo "❌ FAIL: EQ Preset Dropdown missing or duplicated (found $EQ_PRESET_DROPDOWN, expected 1)"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ PASS: EQ Preset Dropdown"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Final result
if [ $ERRORS -eq 0 ]; then
    echo ""
    echo "✅ ALL CHECKS PASSED - No duplicate UI sections found"
    echo ""
    exit 0
else
    echo ""
    echo "❌ $ERRORS CHECK(S) FAILED - Fix duplicates before committing"
    echo ""
    echo "Common fixes:"
    echo "  • Remove duplicate <!-- GENRE SELECTOR --> sections"
    echo "  • Remove Stereo Field Editor section (lines with 'Stereo Field Editor')"
    echo "  • Remove Spectral De-noiser section (lines with 'Spectral De-noiser')"
    echo "  • Ensure only ONE 7-Band Parametric EQ exists"
    echo ""
    exit 1
fi
