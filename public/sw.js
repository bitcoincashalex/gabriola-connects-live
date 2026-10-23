// public/sw.js
// v2.1.0 - Alert push notifications: shows the notification, and tapping it opens the alerts
//          page (or brings an open Gabriola Connects window forward). Nothing else changed:
//          page loading and caching work exactly as in v2.0.0.
// Date: 2026-10-23
// Previous: v2.0.0 - Fix black screen when opening from the home screen icon (2026-10-09)
//   - Page loads now give up on the network after 4 seconds and show the last
//     saved copy (or the offline page). Before, a slow or half-dead phone
//     connection left the app waiting forever on a black screen.
//   - New versions activate right away (skipWaiting). Before, an updated sw.js
//     waited until every copy of the app was fully closed, which on a phone can
//     be never, so fixes did not reach home screen users.
//   - Requests to other sites (Supabase, Google, analytics, ferry data) are no
//     longer routed through the service worker at all.
//   - /_next/static files are cached once (their names change every deploy).
//   - /offline.html is now actually pre-cached so the offline page can show.
// Previous: v1.2.0 - Never cache auth/Supabase to prevent stale tokens (2025-12-22)

const CACHE_NAME = 'gabriola-connects-v2.0.0';
const PRECACHE_ASSETS = ['/', '/offline.html', '/manifest.json'];
const NAV_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((error) => console.error('[ServiceWorker] Pre-cache failed:', error))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function offlineFallback() {
  return caches.match('/offline.html').then((page) => page || new Response(
    INLINE_OFFLINE_HTML,
    { status: 503, statusText: 'Service Unavailable', headers: new Headers({ 'Content-Type': 'text/html' }) }
  ));
}

function saveToCache(request, response) {
  if (response && response.status === 200 && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Other sites: let the browser handle them directly
  if (url.origin !== self.location.origin) return;

  // Never touch API routes or sign in pages
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/signin') ||
    url.pathname.startsWith('/signup')
  ) return;

  // Build files: names are unique per deploy, so cache first is safe and fast
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => saveToCache(request, res)))
    );
    return;
  }

  // Page loads: network first, but give up after 4 seconds
  if (request.mode === 'navigate') {
    event.respondWith(new Promise((resolve) => {
      let settled = false;
      const useCache = () => {
        if (settled) return;
        settled = true;
        // ignoreSearch so the home screen start URL (/?source=pwa) matches the saved home page
        caches.match(request, { ignoreSearch: true })
          .then((cached) => resolve(cached || offlineFallback()));
      };
      const timer = setTimeout(useCache, NAV_TIMEOUT_MS);
      fetch(request)
        .then((res) => {
          saveToCache(request, res);
          if (!settled) { settled = true; clearTimeout(timer); resolve(res); }
        })
        .catch(() => { clearTimeout(timer); useCache(); });
    }));
    return;
  }

  // Everything else on this site: network first, saved copy if offline
  event.respondWith(
    fetch(request)
      .then((res) => saveToCache(request, res))
      .catch(() => caches.match(request).then((cached) => cached || new Response('Network error', {
        status: 408, headers: { 'Content-Type': 'text/plain' },
      })))
  );
});

// Alert push notifications (sent by /api/cron/alert-notifications)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Gabriola Connects', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Gabriola Connects alert';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: data.tag || 'gabriola-alert',
    renotify: true,
    requireInteraction: !!data.urgent,
    data: { url: data.url || '/alerts' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/alerts', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && 'focus' in w) {
          if ('navigate' in w) w.navigate(target).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// Kept for compatibility with the update prompt component
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const INLINE_OFFLINE_HTML = `<!DOCTYPE html>
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
                </html>`;
