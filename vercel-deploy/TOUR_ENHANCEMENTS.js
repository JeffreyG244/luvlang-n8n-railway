/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TOUR ENHANCEMENTS — Professional Interactive Experience
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Features:
   1. Real-time mastering narration (Chloe comments during AI processing)
   2. A/B before/after demo during tour
   3. Contextual micro-tours for first-time feature interactions
   4. Improved tour ending with scorecard walkthrough
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // 1. REAL-TIME MASTERING NARRATION
    // Chloe narrates what's happening during the AI mastering process
    // ═══════════════════════════════════════════════════════════════════════

    var narrationQueue = [];
    var narrationActive = false;
    var lastNarrationPercent = -1;

    var NARRATION_LINES = {
        5:  'Scanning your frequency spectrum... Let me see what we are working with.',
        20: 'Measuring your loudness levels and dynamic range.',
        30: 'Analysis done! Now the real magic starts.',
        36: 'Shaping your tone with the parametric EQ... Sweetening those frequencies.',
        44: 'Tightening up the dynamics with compression. This gives it that professional punch.',
        52: 'Widening the stereo image... Making it feel bigger and more immersive.',
        60: 'Dialing in the target loudness for your platform. Every streaming service has a sweet spot.',
        75: 'Applying the final limiter to protect against clipping. Almost there.',
        88: 'Adding harmonic enhancement for that analog warmth.',
        95: 'Running final quality checks...',
        100: null // handled by chloeNarrateMasterResult
    };

    // Observe the progress element for changes
    function installNarrationObserver() {
        var checkInterval = setInterval(function() {
            var percentEl = document.getElementById('aiProgressPercentage') ||
                            document.querySelector('[id*="rogress"][id*="ercentage"]');
            if (!percentEl) return;

            clearInterval(checkInterval);

            var observer = new MutationObserver(function() {
                var text = percentEl.textContent.replace('%', '').trim();
                var pct = parseInt(text, 10);
                if (isNaN(pct) || pct === lastNarrationPercent) return;

                // Find the narration line for this percentage
                var keys = Object.keys(NARRATION_LINES).map(Number).sort(function(a, b) { return a - b; });
                for (var i = 0; i < keys.length; i++) {
                    var threshold = keys[i];
                    if (pct >= threshold && threshold > lastNarrationPercent && NARRATION_LINES[threshold]) {
                        queueNarration(NARRATION_LINES[threshold]);
                    }
                }
                lastNarrationPercent = pct;
            });

            observer.observe(percentEl, { characterData: true, childList: true, subtree: true });
        }, 500);
    }

    function queueNarration(text) {
        if (typeof window.speakWithDucking !== 'function') return;
        if (window._voiceMuted) return;

        narrationQueue.push(text);
        if (!narrationActive) processNarrationQueue();
    }

    function processNarrationQueue() {
        if (narrationQueue.length === 0) {
            narrationActive = false;
            return;
        }
        narrationActive = true;
        var line = narrationQueue.shift();
        window.speakWithDucking(line);
        var words = line.split(' ').length;
        var delay = Math.max(2000, words * 120);
        setTimeout(processNarrationQueue, delay);
    }

    function resetNarration() {
        lastNarrationPercent = -1;
        narrationQueue = [];
        narrationActive = false;
    }

    function installMasterButtonHook() {
        var checkInterval = setInterval(function() {
            var btn = document.getElementById('aiMasterBtnFloating');
            if (!btn) return;
            clearInterval(checkInterval);

            btn.addEventListener('click', function() {
                resetNarration();
            }, true);
        }, 500);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. A/B BEFORE/AFTER DEMO DURING TOUR
    // After mastering completes during tour, auto-play comparison
    // ═══════════════════════════════════════════════════════════════════════

    var abDemoPlayed = false;

    function playABDemoDuringTour() {
        if (abDemoPlayed) return;
        if (!window.tourActive) return;
        abDemoPlayed = true;

        setTimeout(function() {
            if (typeof window.speakWithDucking === 'function') {
                window.speakWithDucking(
                    'Listen to this. Here is your track before mastering...'
                );
            }

            setTimeout(function() {
                if (typeof window.handleFloatingABToggle === 'function') {
                    var toggle = document.getElementById('integratedABToggleBtn');
                    if (toggle) {
                        var label = toggle.querySelector('.ab-toggle-label');
                        if (label && label.textContent.indexOf('MASTERED') !== -1) {
                            toggle.click();
                        }
                    }
                }

                setTimeout(function() {
                    if (typeof window.speakWithDucking === 'function') {
                        window.speakWithDucking('And now, after mastering. Hear the difference?');
                    }
                    setTimeout(function() {
                        var toggle = document.getElementById('integratedABToggleBtn');
                        if (toggle) {
                            var label = toggle.querySelector('.ab-toggle-label');
                            if (label && label.textContent.indexOf('ORIGINAL') !== -1) {
                                toggle.click();
                            }
                        }
                    }, 800);
                }, 5000);
            }, 2500);
        }, 1500);
    }

    var origOnMasteringComplete = null;
    function installABDemoHook() {
        var checkInterval = setInterval(function() {
            if (typeof window.onMasteringComplete !== 'function') return;
            if (origOnMasteringComplete) return;
            clearInterval(checkInterval);

            origOnMasteringComplete = window.onMasteringComplete;
            window.onMasteringComplete = function() {
                origOnMasteringComplete.apply(this, arguments);
                if (window.tourActive) {
                    playABDemoDuringTour();
                }
            };
        }, 500);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. CONTEXTUAL MICRO-TOURS
    // First-time interactions trigger short Chloe explanations
    // ═══════════════════════════════════════════════════════════════════════

    var MICRO_TOURS = {
        eq_bands: {
            selector: '.eq-band-container, .eq-slider, [data-band]',
            text: 'This is the parametric EQ. Each band controls a different frequency range. ' +
                  'Boost the highs for brightness, cut the mids to reduce muddiness, or add warmth with the lows.',
            title: 'Parametric EQ'
        },
        compressor: {
            selector: '#compressorSection, .compressor-knob, [id*="ompressor"]',
            text: 'The compressor controls your dynamic range. Lower the threshold to compress more, ' +
                  'increase the ratio for heavier compression. Keep the attack fast for punch.',
            title: 'Dynamics Compressor'
        },
        stereo_width: {
            selector: '#stereoWidthModule, #stereoWidthSlider, [id*="tereoWidth"]',
            text: 'Stereo width makes your mix feel wider or narrower. ' +
                  'Push it up for a big, immersive sound. Keep it centered for mono compatibility.',
            title: 'Stereo Width'
        },
        genre_presets: {
            selector: '.sub-genre-btn, #subGenreGrid, [data-subgenre]',
            text: 'Sub-genre presets apply professionally tuned EQ curves for your specific style. ' +
                  'Each one targets the frequency balance that works best for that genre.',
            title: 'Genre Presets'
        },
        intensity: {
            selector: '#intensitySlider, .intensity-control, [id*="ntensity"]',
            text: 'The intensity slider controls how aggressively the mastering is applied. ' +
                  'Lower settings are subtle and transparent. Higher settings give a more processed, radio-ready sound.',
            title: 'Mastering Intensity'
        },
        platform: {
            selector: '.selector-btn[data-platform], #platformSection',
            text: 'Platform presets set the target loudness. Spotify uses minus fourteen LUFS, ' +
                  'Apple Music uses minus sixteen, and YouTube uses minus fourteen. ' +
                  'Pick your platform for the best playback experience.',
            title: 'Platform Targeting'
        }
    };

    function getSeenMicroTours() {
        try {
            return JSON.parse(localStorage.getItem('luvlang_microToursSeen') || '[]');
        } catch (_) { return []; }
    }

    function markMicroTourSeen(id) {
        var seen = getSeenMicroTours();
        if (seen.indexOf(id) === -1) {
            seen.push(id);
            localStorage.setItem('luvlang_microToursSeen', JSON.stringify(seen));
        }
    }

    function showMicroTour(id) {
        var tour = MICRO_TOURS[id];
        if (!tour) return;

        var seen = getSeenMicroTours();
        if (seen.indexOf(id) !== -1) return;
        markMicroTourSeen(id);

        if (window.tourActive) return;
        if (window._masteringLocked === undefined && window.masteringComplete) return;

        showMicroTourTooltip(tour);

        if (typeof window.speakWithDucking === 'function' && !window._voiceMuted) {
            window.speakWithDucking(tour.text);
        }
    }

    function showMicroTourTooltip(tour) {
        var existing = document.getElementById('microTourTooltip');
        if (existing) existing.remove();

        var tooltip = document.createElement('div');
        tooltip.id = 'microTourTooltip';
        tooltip.style.cssText =
            'position:fixed;bottom:24px;right:24px;z-index:99990;' +
            'background:linear-gradient(165deg,rgba(12,17,35,0.95),rgba(8,12,28,0.98));' +
            'border:1px solid rgba(0,212,255,0.25);border-radius:16px;' +
            'padding:18px 22px;max-width:320px;' +
            'box-shadow:0 12px 40px rgba(0,0,0,0.6),0 0 20px rgba(0,212,255,0.1);' +
            'animation:mtSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1);' +
            'font-family:Inter,-apple-system,sans-serif;backdrop-filter:blur(20px);';

        tooltip.innerHTML =
            '<style>@keyframes mtSlideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}' +
            '@keyframes mtSlideOut{from{opacity:1}to{opacity:0;transform:translateY(10px)}}</style>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
                '<span style="font-size:0.6rem;font-weight:700;color:#00d4ff;text-transform:uppercase;letter-spacing:2px;">Quick Tip</span>' +
                '<button id="mtCloseBtn" style="margin-left:auto;background:none;border:none;color:rgba(255,255,255,0.4);' +
                    'cursor:pointer;font-size:1.1rem;line-height:1;padding:0;" aria-label="Close">&times;</button>' +
            '</div>' +
            '<div style="font-size:0.92rem;font-weight:700;color:#fff;margin-bottom:6px;">' + tour.title + '</div>' +
            '<div style="font-size:0.78rem;color:rgba(255,255,255,0.65);line-height:1.5;">' + tour.text + '</div>';

        document.body.appendChild(tooltip);

        document.getElementById('mtCloseBtn').addEventListener('click', function() {
            tooltip.style.animation = 'mtSlideOut 0.3s ease forwards';
            setTimeout(function() { tooltip.remove(); }, 300);
        });

        setTimeout(function() {
            if (tooltip.parentNode) {
                tooltip.style.animation = 'mtSlideOut 0.3s ease forwards';
                setTimeout(function() { tooltip.remove(); }, 300);
            }
        }, 12000);
    }

    function installMicroTourListeners() {
        setTimeout(function() {
            Object.keys(MICRO_TOURS).forEach(function(id) {
                var config = MICRO_TOURS[id];
                var selectors = config.selector.split(', ');
                selectors.forEach(function(sel) {
                    var els = document.querySelectorAll(sel);
                    els.forEach(function(el) {
                        el.addEventListener('click', function() {
                            showMicroTour(id);
                        }, { once: true });
                    });
                });
            });
        }, 3000);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. IMPROVED TOUR ENDING — SCORECARD WALKTHROUGH
    // ═══════════════════════════════════════════════════════════════════════

    function installImprovedTourEnding() {
        var origClose = null;
        var checkInterval = setInterval(function() {
            if (typeof window.closeVoiceTourExplore !== 'function') return;
            if (origClose) return;
            clearInterval(checkInterval);

            origClose = window.closeVoiceTourExplore;
            window.closeVoiceTourExplore = function() {
                origClose.apply(this, arguments);

                var hist = window._masteringHistory;
                if (hist && hist.length > 0) {
                    var last = hist[hist.length - 1];
                    setTimeout(function() {
                        showScorecardWalkthrough(last);
                    }, 800);
                }
            };
        }, 500);
    }

    function showScorecardWalkthrough(entry) {
        if (!entry) return;

        if (typeof window.speakWithDucking === 'function' && !window._voiceMuted) {
            var msg = 'Let me walk you through your scorecard. ';
            msg += 'Your track earned a ' + entry.grade + ' grade with ' + entry.total + ' out of 100. ';

            if (entry.scores) {
                if (entry.scores.lufs !== undefined) {
                    msg += 'Loudness scored ' + entry.scores.lufs + ' out of 25. ';
                }
                if (entry.scores.dynamics !== undefined) {
                    msg += 'Dynamic range scored ' + entry.scores.dynamics + ' out of 25. ';
                }
                if (entry.scores.tonal !== undefined) {
                    msg += 'Tonal balance scored ' + entry.scores.tonal + ' out of 25. ';
                }
                if (entry.scores.peak !== undefined) {
                    msg += 'True peak scored ' + entry.scores.peak + ' out of 25. ';
                }
            }

            if (entry.total >= 90) {
                msg += 'This is professional release quality. You are ready to export!';
            } else if (entry.total >= 70) {
                msg += 'Great results! Try adjusting the genre preset for an even higher score.';
            } else {
                msg += 'Try a different genre or sub-genre preset to boost your score.';
            }

            window.speakWithDucking(msg);
        }

        var scorecardEl = document.getElementById('scorecardPanel') ||
                          document.querySelector('[id*="corecard"]');
        if (scorecardEl) {
            scorecardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            scorecardEl.style.boxShadow = '0 0 40px rgba(0,212,255,0.5), 0 0 80px rgba(0,212,255,0.25)';
            scorecardEl.style.transition = 'box-shadow 0.5s ease';
            setTimeout(function() {
                scorecardEl.style.boxShadow = '';
            }, 4000);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════

    function init() {
        installNarrationObserver();
        installMasterButtonHook();
        installABDemoHook();
        installMicroTourListeners();
        installImprovedTourEnding();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    window.TourEnhancements = {
        showMicroTour: showMicroTour,
        resetNarration: resetNarration
    };

})();
