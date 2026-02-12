// LuvLang Mastering Studio - Service Worker v7.6.3e
const CACHE_VERSION = 'luvlang-v7.6.3e';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/app',
  '/landing.html',
  '/luvlang_LEGENDARY_COMPLETE.html',
  '/favicon.svg',
  '/og-image.png',
  '/PROFESSIONAL_CSS_FIXES.css',
  '/LUXURY_DARK_CHROME_THEME.css'
];

// Dynamic cache: JS, CSS, WASM fetched at runtime
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';

// Never cache these patterns
const NO_CACHE_PATTERNS = [
  /\/api\//,
  /stripe\.com/,
  /js\.stripe\.com/,
  /supabase/,
  /googleapis\.com/,
  /gstatic\.com/
];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch strategy router
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip no-cache patterns
  if (NO_CACHE_PATTERNS.some((pattern) => pattern.test(request.url))) return;

  // HTML: network-first (always get fresh content, fall back to cache)
  if (request.headers.get('accept')?.includes('text/html') ||
      url.pathname.endsWith('.html') ||
      url.pathname === '/' ||
      url.pathname === '/app') {
    event.respondWith(networkFirst(request));
    return;
  }

  // JS, CSS, WASM: stale-while-revalidate
  if (url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.wasm')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Images & other static: cache-first
  if (url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.webp')) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

// --- Caching strategies ---

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 404 });
  }
}
