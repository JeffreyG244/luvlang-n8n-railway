# DUPLICATION REMOVAL PLAN

## Issue
User reports duplicates that were previously removed came back:
1. **2 EQs** - seeing what appears to be 2 EQ sections
2. **2 Genres** - seeing 2 genre selector sections
3. **Missing Preset Dropdown** - had a dropdown for presets, now it's gone

## What Happened
- Commit `1022b8b` (Dec 25): Removed duplicate Stereo Field Editor (106 lines)
- BUT I reintroduced it when adding production features
- Also have duplicate Genre selectors that were never cleaned up

## Current Duplicates Found

### 1. Stereo Field Editor (LINES 1549-1653)
**Status:** Duplicate - was removed in commit 1022b8b, I added it back
**Action:** DELETE

### 2. Spectral De-noiser (LINES 1655-1726)
**Status:** Questionable - looks like EQ with 7 faders, but it's for noise removal
**User says:** "deleted the top eq"
**Action:** DELETE (user considers this a duplicate EQ)

### 3. First Genre Selector (LINES 1312-1323)
```html
<!-- GENRE SELECTOR -->
<div class="selector-group">
    <div class="section-title">Genre</div>
    <div class="selector-grid">
        <div class="selector-btn" data-genre="pop">Pop</div>
        <div class="selector-btn" data-genre="hiphop">Hip-Hop</div>
        <div class="selector-btn" data-genre="rock">Rock</div>
        <div class="selector-btn" data-genre="edm">EDM</div>
        <div class="selector-btn active" data-genre="universal">Universal</div>
        <div class="selector-btn" data-genre="jazz">Jazz</div>
    </div>
</div>
```
**Status:** Duplicate - less featured than second one
**Action:** DELETE

### 4. Second Genre Selector (LINES 1348-1377) - KEEP THIS ONE
```html
<!-- GENRE SELECTOR -->
<div class="selector-group">
    <div class="section-title">Genre Preset</div>
    <div class="selector-grid">
        <div class="selector-btn" data-genre="hip-hop">
            <div>Hip-Hop</div>
            <div style="font-size: 0.65rem; opacity: 0.6;">Sub + Presence</div>
        </div>
        ... (with descriptions for each genre)
    </div>
</div>
```
**Status:** Keep - has descriptions, more complete
**Action:** KEEP

## What to Keep

### ✅ Professional 7-Band EQ (LINES 1728+)
This is the ONLY real EQ - the parametric EQ with 7 bands (SUB, BASS, LOW MID, MID, HIGH MID, HIGH, AIR)

### ✅ Genre Preset selector (second one with descriptions)

### ✅ Platform selector (Spotify, YouTube, Apple Music, Tidal)

## Missing Feature: EQ Preset Dropdown

User mentions "made a dropdown of presets" - need to add:
```html
<select id="eqPresetSelect">
    <option value="">-- Select EQ Preset --</option>
    <option value="hip-hop">Hip-Hop (Sub + Presence)</option>
    <option value="pop">Pop (Balanced + Air)</option>
    <option value="edm">EDM (Massive Bass)</option>
    <option value="rock">Rock (Body + Bite)</option>
    <option value="jazz">Jazz (Natural)</option>
    <option value="neutral">Neutral (Flat)</option>
</select>
```

## Removal Plan

1. Remove Stereo Field Editor (lines 1549-1653) = 105 lines
2. Remove Spectral De-noiser (lines 1655-1726) = 72 lines
3. Remove first Genre selector (lines 1312-1323) = 12 lines
4. Add EQ Preset dropdown above or within the EQ section
5. Wire up dropdown to apply genre-specific EQ presets

**Total lines to remove:** ~189 lines

## Verification Checklist

After removal, verify:
- [ ] Only 1 EQ section visible (7-Band Parametric EQ)
- [ ] Only 1 Genre selector visible (with descriptions)
- [ ] EQ Preset dropdown exists and works
- [ ] No duplicate UI elements
- [ ] All audio features still functional

## Why This Happened

**Root Cause:** No structural duplication checking

When I added production features, I didn't check:
- What UI sections already existed
- What was previously removed as duplicates
- Git history of removals

**Solution:** Create UI structure verification checklist (see FUNCTIONAL_QA_CHECKLIST.md Section 16)
