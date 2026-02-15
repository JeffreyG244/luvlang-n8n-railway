/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   COOKIE CONSENT BANNER
   Auto-injects a GDPR/CCPA compliant cookie consent banner on first visit.
   Stores preference in localStorage. Minimal, non-intrusive design.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function() {
    'use strict';

    // Already consented — don't show
    if (localStorage.getItem('cookieConsent')) return;

    function show() {
        var banner = document.createElement('div');
        banner.id = 'cookieConsentBanner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Cookie consent');
        banner.style.cssText =
            'position:fixed;bottom:0;left:0;right:0;z-index:999999;' +
            'background:linear-gradient(180deg,rgba(15,15,25,0.98),rgba(10,10,18,0.99));' +
            'border-top:1px solid rgba(0,212,255,0.15);' +
            'backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);' +
            'padding:18px 24px;display:flex;align-items:center;justify-content:center;' +
            'gap:16px;flex-wrap:wrap;font-family:Inter,-apple-system,sans-serif;' +
            'animation:ccSlideUp 0.4s ease;';

        banner.innerHTML =
            '<style>@keyframes ccSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}</style>' +
            '<p style="margin:0;color:rgba(255,255,255,0.75);font-size:0.82rem;max-width:680px;line-height:1.5;">' +
                'We use essential cookies to keep LuvLang running smoothly. No tracking or advertising cookies. ' +
                '<a href="/cookie-policy" style="color:#00d4ff;text-decoration:underline;">Learn more</a>' +
            '</p>' +
            '<div style="display:flex;gap:10px;flex-shrink:0;">' +
                '<button id="ccAcceptBtn" style="' +
                    'padding:8px 22px;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;' +
                    'background:linear-gradient(135deg,#00d4ff,#b84fff);color:#fff;transition:all 0.15s;' +
                '">Accept</button>' +
                '<button id="ccDeclineBtn" style="' +
                    'padding:8px 22px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;cursor:pointer;' +
                    'font-weight:500;font-size:0.8rem;background:transparent;color:rgba(255,255,255,0.6);transition:all 0.15s;' +
                '">Essential Only</button>' +
            '</div>';

        document.body.appendChild(banner);

        document.getElementById('ccAcceptBtn').addEventListener('click', function() {
            localStorage.setItem('cookieConsent', 'accepted');
            banner.style.animation = 'ccSlideUp 0.3s ease reverse forwards';
            setTimeout(function() { banner.remove(); }, 300);
        });

        document.getElementById('ccDeclineBtn').addEventListener('click', function() {
            localStorage.setItem('cookieConsent', 'essential-only');
            banner.style.animation = 'ccSlideUp 0.3s ease reverse forwards';
            setTimeout(function() { banner.remove(); }, 300);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', show);
    } else {
        show();
    }
})();
