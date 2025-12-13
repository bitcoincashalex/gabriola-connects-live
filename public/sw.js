// public/sw.js
// v1.1.1 - Service Worker with auto-update notification support
// Date: 2024-12-13

const CACHE_NAME = 'gabriola-connects-v1.1.0';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Pre-cache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - network first, then cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls and Supabase requests (always need fresh data)
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('supabase.co')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html').then((offlinePage) => {
              if (offlinePage) {
                return offlinePage;
              }
              // Fallback HTML if offline.html not cached
              return new Response(
                `<!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Offline - Gabriola Connects</title>
                  <style>
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 100vh;
                      margin: 0;
                      background: linear-gradient(135deg, #2d5f3f 0%, #1a3a28 100%);
                      color: white;
                      text-align: center;
                      padding: 20px;
                    }
                    .container {
                      max-width: 400px;
                    }
                    h1 {
                      font-size: 2.5rem;
                      margin-bottom: 1rem;
                    }
                    p {
                      font-size: 1.1rem;
                      opacity: 0.9;
                      margin-bottom: 2rem;
                    }
                    button {
                      background: white;
                      color: #2d5f3f;
                      border: none;
                      padding: 12px 24px;
                      font-size: 1rem;
                      font-weight: 600;
                      border-radius: 8px;
                      cursor: pointer;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>📡 Offline</h1>
                    <p>You're currently offline. Gabriola Connects will work again when you reconnect.</p>
                    <button onclick="window.location.reload()">Try Again</button>
                  </div>
                </body>
                </html>`,
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({
                    'Content-Type': 'text/html',
                  }),
                }
              );
            });
          }

          // For non-navigation requests, return a basic error
          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
  );
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Skip waiting and activate new version');
    self.skipWaiting();
  }
});

// Notify clients when a new service worker is waiting
self.addEventListener('waiting', () => {
  console.log('[ServiceWorker] New version waiting');
  // Notify all clients that an update is available
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'UPDATE_AVAILABLE' });
    });
  });
});
