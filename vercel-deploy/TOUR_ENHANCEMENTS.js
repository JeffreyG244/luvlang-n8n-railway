/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TOUR ENHANCEMENTS — State-of-the-Art Interactive Experience
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Features:
   1. Real-time mastering narration (Chloe comments during AI processing)
   2. A/B before/after demo during tour
   3. Achievement/celebration system with confetti
   4. Contextual micro-tours for first-time feature interactions
   5. Improved tour ending with scorecard walkthrough
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
        // Don't narrate if voice is muted
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
        // Estimate speech duration: ~100ms per word, min 2s
        var words = line.split(' ').length;
        var delay = Math.max(2000, words * 120);
        setTimeout(processNarrationQueue, delay);
    }

    // Reset narration state when new mastering starts
    function resetNarration() {
        lastNarrationPercent = -1;
        narrationQueue = [];
        narrationActive = false;
    }

    // Hook into master button click to reset narration
    function installMasterButtonHook() {
        var checkInterval = setInterval(function() {
            var btn = document.getElementById('aiMasterBtnFloating');
            if (!btn) return;
            clearInterval(checkInterval);

            btn.addEventListener('click', function() {
                resetNarration();
            }, true); // capture phase to fire before other handlers
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

        // Wait a beat after mastering completes
        setTimeout(function() {
            if (typeof window.speakWithDucking === 'function') {
                window.speakWithDucking(
                    'Listen to this. Here is your track before mastering...'
                );
            }

            // Switch to dry (original) after speech starts
            setTimeout(function() {
                if (typeof window.handleFloatingABToggle === 'function') {
                    // Ensure we're hearing the dry signal
                    var toggle = document.getElementById('integratedABToggleBtn');
                    if (toggle) {
                        var label = toggle.querySelector('.ab-toggle-label');
                        if (label && label.textContent.indexOf('MASTERED') !== -1) {
                            toggle.click(); // Switch to original
                        }
                    }
                }

                // After 5 seconds, switch to mastered
                setTimeout(function() {
                    if (typeof window.speakWithDucking === 'function') {
                        window.speakWithDucking('And now, after mastering. Hear the difference?');
                    }
                    setTimeout(function() {
                        var toggle = document.getElementById('integratedABToggleBtn');
                        if (toggle) {
                            var label = toggle.querySelector('.ab-toggle-label');
                            if (label && label.textContent.indexOf('ORIGINAL') !== -1) {
                                toggle.click(); // Switch to mastered
                            }
                        }
                    }, 800);
                }, 5000);
            }, 2500);
        }, 1500);
    }

    // Hook into mastering complete event
    var origOnMasteringComplete = null;
    function installABDemoHook() {
        var checkInterval = setInterval(function() {
            if (typeof window.onMasteringComplete !== 'function') return;
            if (origOnMasteringComplete) return; // already hooked
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
    // 3. ACHIEVEMENT / CELEBRATION SYSTEM
    // Confetti + Chloe celebration for milestones
    // ═══════════════════════════════════════════════════════════════════════

    var ACHIEVEMENTS = {
        first_master:    { title: 'First Master',       desc: 'Mastered your first track', icon: '🎉' },
        grade_a_plus:    { title: 'Perfection',          desc: 'Achieved an A+ grade',     icon: '🏆' },
        perfect_100:     { title: 'Legendary Score',     desc: 'Scored 100/100',           icon: '💎' },
        five_masters:    { title: 'On a Roll',           desc: 'Mastered 5 tracks',        icon: '🔥' },
        genre_explorer:  { title: 'Genre Explorer',      desc: 'Tried 3 different genres', icon: '🌍' },
        first_export:    { title: 'Ready to Ship',       desc: 'Exported your first track', icon: '📦' }
    };

    function getUnlockedAchievements() {
        try {
            return JSON.parse(localStorage.getItem('luvlang_achievements') || '[]');
        } catch (_) { return []; }
    }

    function saveAchievement(id) {
        var unlocked = getUnlockedAchievements();
        if (unlocked.indexOf(id) !== -1) return false; // already unlocked
        unlocked.push(id);
        localStorage.setItem('luvlang_achievements', JSON.stringify(unlocked));
        return true;
    }

    function triggerAchievement(id) {
        if (!ACHIEVEMENTS[id]) return;
        if (!saveAchievement(id)) return; // already unlocked

        var ach = ACHIEVEMENTS[id];

        // Show confetti
        launchConfetti();

        // Show achievement toast
        showAchievementToast(ach);

        // Chloe congratulates
        if (typeof window.speakWithDucking === 'function' && !window._voiceMuted) {
            var messages = {
                first_master:   'Achievement unlocked! You just mastered your first track. Welcome to the studio!',
                grade_a_plus:   'Achievement unlocked! You got a perfect A plus grade. That is pro level quality!',
                perfect_100:    'Legendary! A perfect 100 out of 100. Your track is absolutely flawless!',
                five_masters:   'Achievement unlocked! Five tracks mastered. You are on a roll!',
                genre_explorer: 'Achievement unlocked! You have explored three different genres. Nice range!',
                first_export:   'Achievement unlocked! Your first export. Time to share your music with the world!'
            };
            if (messages[id]) {
                setTimeout(function() { window.speakWithDucking(messages[id]); }, 1000);
            }
        }
    }

    function showAchievementToast(ach) {
        var toast = document.createElement('div');
        toast.style.cssText =
            'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999998;' +
            'background:linear-gradient(135deg,rgba(255,215,0,0.15),rgba(184,79,255,0.15));' +
            'border:1px solid rgba(255,215,0,0.4);border-radius:16px;padding:16px 28px;' +
            'display:flex;align-items:center;gap:14px;backdrop-filter:blur(20px);' +
            'box-shadow:0 8px 40px rgba(0,0,0,0.5),0 0 30px rgba(255,215,0,0.2);' +
            'animation:achSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1);' +
            'font-family:Inter,-apple-system,sans-serif;';

        toast.innerHTML =
            '<style>@keyframes achSlideIn{from{transform:translateX(-50%) translateY(-60px);opacity:0}' +
            'to{transform:translateX(-50%) translateY(0);opacity:1}}' +
            '@keyframes achSlideOut{from{opacity:1}to{opacity:0;transform:translateX(-50%) translateY(-30px)}}</style>' +
            '<span style="font-size:2rem;">' + ach.icon + '</span>' +
            '<div>' +
            '<div style="font-size:0.65rem;font-weight:700;color:#ffd700;text-transform:uppercase;letter-spacing:2px;">Achievement Unlocked</div>' +
            '<div style="font-size:1rem;font-weight:700;color:#fff;margin-top:2px;">' + ach.title + '</div>' +
            '<div style="font-size:0.78rem;color:rgba(255,255,255,0.6);">' + ach.desc + '</div>' +
            '</div>';

        document.body.appendChild(toast);

        setTimeout(function() {
            toast.style.animation = 'achSlideOut 0.4s ease forwards';
            setTimeout(function() { toast.remove(); }, 400);
        }, 5000);
    }

    // ── Confetti Canvas ──
    function launchConfetti() {
        var canvas = document.createElement('canvas');
        canvas.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999997;pointer-events:none;';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);

        var ctx = canvas.getContext('2d');
        var particles = [];
        var colors = ['#ffd700', '#00d4ff', '#b84fff', '#00ff88', '#ff6b6b', '#ff9a56', '#fff'];

        for (var i = 0; i < 120; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: -20 - Math.random() * 100,
                w: 4 + Math.random() * 6,
                h: 8 + Math.random() * 10,
                color: colors[Math.floor(Math.random() * colors.length)],
                vy: 2 + Math.random() * 4,
                vx: (Math.random() - 0.5) * 4,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 12,
                opacity: 1
            });
        }

        var startTime = Date.now();
        var duration = 3500;

        function animate() {
            var elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                canvas.remove();
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (var j = 0; j < particles.length; j++) {
                var p = particles[j];
                p.y += p.vy;
                p.x += p.vx;
                p.vy += 0.08; // gravity
                p.vx *= 0.99; // air resistance
                p.rotation += p.rotationSpeed;

                // Fade out in last second
                if (elapsed > duration - 1000) {
                    p.opacity = Math.max(0, 1 - (elapsed - (duration - 1000)) / 1000);
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            }

            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
    }

    // ── Achievement Triggers ──
    function checkMasteringAchievements() {
        var hist = window._masteringHistory;
        if (!hist || hist.length === 0) return;

        // First master
        triggerAchievement('first_master');

        // 5 masters
        if (hist.length >= 5) {
            triggerAchievement('five_masters');
        }

        // Check latest grade
        var last = hist[hist.length - 1];
        if (last) {
            if (last.grade === 'A+') {
                triggerAchievement('grade_a_plus');
            }
            if (last.total >= 100) {
                triggerAchievement('perfect_100');
            }
        }

        // Genre explorer - check unique genres
        var genres = {};
        for (var k = 0; k < hist.length; k++) {
            if (hist[k].details && hist[k].details.genre) {
                genres[hist[k].details.genre] = true;
            }
        }
        if (Object.keys(genres).length >= 3) {
            triggerAchievement('genre_explorer');
        }
    }

    // Hook into mastering completion for achievements
    function installAchievementHooks() {
        // After scorecard renders, check achievements
        var origShowFloating = null;
        var checkInterval = setInterval(function() {
            if (typeof window.showFloatingABCompare !== 'function') return;
            if (origShowFloating) return;
            clearInterval(checkInterval);

            origShowFloating = window.showFloatingABCompare;
            window.showFloatingABCompare = function() {
                origShowFloating.apply(this, arguments);
                // Slight delay so _masteringHistory is populated
                setTimeout(checkMasteringAchievements, 500);
            };
        }, 500);

        // Export achievement
        var origPerformExport = null;
        var checkExport = setInterval(function() {
            if (typeof window.performExport !== 'function') return;
            if (origPerformExport) return;
            clearInterval(checkExport);

            origPerformExport = window.performExport;
            window.performExport = function() {
                origPerformExport.apply(this, arguments);
                triggerAchievement('first_export');
            };
        }, 500);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. CONTEXTUAL MICRO-TOURS
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
        if (seen.indexOf(id) !== -1) return; // already seen
        markMicroTourSeen(id);

        // Don't interrupt main tour or mastering
        if (window.tourActive) return;
        if (window._masteringLocked === undefined && window.masteringComplete) return;

        // Show micro-tour tooltip
        showMicroTourTooltip(tour);

        // Chloe speaks
        if (typeof window.speakWithDucking === 'function' && !window._voiceMuted) {
            window.speakWithDucking(tour.text);
        }
    }

    function showMicroTourTooltip(tour) {
        // Remove any existing micro-tour
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

        // Auto-dismiss after 12 seconds
        setTimeout(function() {
            if (tooltip.parentNode) {
                tooltip.style.animation = 'mtSlideOut 0.3s ease forwards';
                setTimeout(function() { tooltip.remove(); }, 300);
            }
        }, 12000);
    }

    function installMicroTourListeners() {
        // Delay to ensure DOM is ready
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
    // 5. IMPROVED TOUR ENDING — SCORECARD WALKTHROUGH
    // Replaces basic "You're All Set" modal with grade celebration
    // ═══════════════════════════════════════════════════════════════════════

    function installImprovedTourEnding() {
        // Override closeVoiceTourExplore to add scorecard celebration
        var origClose = null;
        var checkInterval = setInterval(function() {
            if (typeof window.closeVoiceTourExplore !== 'function') return;
            if (origClose) return;
            clearInterval(checkInterval);

            origClose = window.closeVoiceTourExplore;
            window.closeVoiceTourExplore = function() {
                origClose.apply(this, arguments);

                // After closing the explore modal, show the scorecard if available
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

        // Chloe walks through the score
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

        // Highlight the scorecard section briefly
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
        installAchievementHooks();
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
        triggerAchievement: triggerAchievement,
        launchConfetti: launchConfetti,
        showMicroTour: showMicroTour,
        resetNarration: resetNarration
    };

})();
