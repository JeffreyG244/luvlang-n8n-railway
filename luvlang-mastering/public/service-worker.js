/**
 * SERVICE WORKER - Offline caching and PWA functionality
 * Enables offline audio processing and caches critical assets
 */

const CACHE_NAME = 'luvlang-v1.1.0';

// Assets to cache on install — ONLY list files that actually exist
const STATIC_ASSETS = [
    '/',
    '/src/index.html',
    '/src/css/components.css',
    '/src/css/mobile.css',
    '/manifest.json'
];

// Dynamic assets to cache on first fetch
const DYNAMIC_CACHE_PATTERNS = [
    /\.js$/,
    /\.css$/,
    /\.wasm$/,
    /\.png$/,
    /\.svg$/,
    /\.woff2?$/
];

// Assets that should never be cached
const NO_CACHE_PATTERNS = [
    /\/api\//,
    /stripe\.com/,
    /supabase/,
    /analytics/,
    /\.env/
];

// Install event - cache static assets with graceful fallback
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                // Use individual cache.add() calls so one missing file
                // doesn't prevent the rest from caching
                const results = await Promise.allSettled(
                    STATIC_ASSETS.map(url => cache.add(url))
                );

                const failed = results
                    .map((r, i) => r.status === 'rejected' ? STATIC_ASSETS[i] : null)
                    .filter(Boolean);

                if (failed.length > 0) {
                    console.warn('[ServiceWorker] Some assets failed to cache:', failed);
                }

                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[ServiceWorker] Installation failed:', error);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip requests that shouldn't be cached
    if (NO_CACHE_PATTERNS.some((pattern) => pattern.test(url.href))) {
        return;
    }

    // Handle different caching strategies
    if (isStaticAsset(url)) {
        // Cache-first for static assets
        event.respondWith(cacheFirst(event.request));
    } else if (isDynamicAsset(url)) {
        // Stale-while-revalidate for dynamic assets
        event.respondWith(staleWhileRevalidate(event.request));
    } else {
        // Network-first for other requests
        event.respondWith(networkFirst(event.request));
    }
});

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url) {
    return STATIC_ASSETS.some((asset) =>
        url.pathname === asset || url.pathname.endsWith(asset)
    );
}

/**
 * Check if URL is a dynamic asset
 */
function isDynamicAsset(url) {
    return DYNAMIC_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first strategy
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        return new Response('Offline', { status: 503 });
    }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // Fetch from network in background
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);

    // Return cached version immediately, or wait for network
    return cachedResponse || fetchPromise;
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CLEAR_CACHE':
            caches.delete(CACHE_NAME).then(() => {
                if (event.ports[0]) {
                    event.ports[0].postMessage({ success: true });
                }
            });
            break;

        case 'GET_CACHE_SIZE':
            getCacheSize().then((size) => {
                if (event.ports[0]) {
                    event.ports[0].postMessage({ size });
                }
            });
            break;

        case 'PRECACHE_ASSETS':
            if (payload?.assets) {
                precacheAssets(payload.assets).then(() => {
                    if (event.ports[0]) {
                        event.ports[0].postMessage({ success: true });
                    }
                });
            }
            break;
    }
});

/**
 * Get total cache size
 */
async function getCacheSize() {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    let totalSize = 0;

    for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
        }
    }

    return totalSize;
}

/**
 * Precache specific assets (graceful - individual failures don't block)
 */
async function precacheAssets(assets) {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(
        assets.map(url => cache.add(url))
    );
    return results;
}

// Background sync for offline processing
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-processed-audio') {
        event.waitUntil(syncProcessedAudio());
    }
});

/**
 * Sync processed audio when back online
 */
async function syncProcessedAudio() {
    const db = await openIndexedDB();

    if (!db.transaction) return;

    try {
        const tx = db.transaction('pendingUploads', 'readonly');
        const store = tx.objectStore('pendingUploads');
        const request = store.getAll();

        const pending = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });

        for (const item of pending) {
            try {
                await uploadProcessedAudio(item);
                // Remove from pending after successful upload
                const deleteTx = db.transaction('pendingUploads', 'readwrite');
                deleteTx.objectStore('pendingUploads').delete(item.id);
            } catch (error) {
                console.error('[ServiceWorker] Sync failed for:', item.id);
            }
        }
    } catch (error) {
        console.error('[ServiceWorker] Sync error:', error);
    }
}

/**
 * Open IndexedDB
 */
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('luvlang-offline', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pendingUploads')) {
                db.createObjectStore('pendingUploads', { keyPath: 'id' });
            }
        };
    });
}

/**
 * Upload processed audio with auth headers
 */
async function uploadProcessedAudio(item) {
    // Retrieve auth token from the client that initiated the sync
    const clients = await self.clients.matchAll();
    let authToken = null;

    for (const client of clients) {
        try {
            const channel = new MessageChannel();
            client.postMessage({ type: 'GET_AUTH_TOKEN' }, [channel.port2]);
            authToken = await new Promise((resolve) => {
                channel.port1.onmessage = (e) => resolve(e.data?.token || null);
                setTimeout(() => resolve(null), 2000);
            });
            if (authToken) break;
        } catch (e) {
            // Client not available
        }
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify(item),
        headers
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
}

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};

    const options = {
        body: data.body || 'New notification from LuvLang',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    // Only add icon/badge if they exist
    if (data.icon) {
        options.icon = data.icon;
    }
    if (data.badge) {
        options.badge = data.badge;
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'LuvLang Mastering', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(url);
            }
        })
    );
});
