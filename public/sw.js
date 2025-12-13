// public/sw.js
// Service Worker for Gabriola Connects PWA
// Version: 1.0.1 - Fixed icon filenames
// Date: 2024-12-13

const CACHE_NAME = 'gabriola-connects-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache immediately on install
// IMPORTANT: Only include files that actually exist!
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  // Note: Removed offline.html and icons from precache
  // They'll be cached as users visit/use them
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching essential files');
        // Use addAll with error handling
        return cache.addAll(PRECACHE_ASSETS).catch((error) => {
          console.error('[ServiceWorker] Pre-cache failed:', error);
          // Don't fail install if pre-cache fails
          // Service worker will still work, just without pre-cached files
        });
      })
      .then(() => {
        console.log('[ServiceWorker] Pre-cache complete');
        return self.skipWaiting();
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
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  // Skip API calls and Supabase requests (always need fresh data)
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
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
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            
            // If no cache and navigation request, show offline page if cached
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL).then((offlineResponse) => {
                if (offlineResponse) {
                  return offlineResponse;
                }
                // No offline page cached, return basic response
                return new Response(
                  '<html><body><h1>Offline</h1><p>You are currently offline. Please check your internet connection.</p></body></html>',
                  {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/html' }
                  }
                );
              });
            }
            
            // For other requests, return a basic error response
            return new Response('Network error', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Background sync for posting when back online (optional)
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

async function syncPosts() {
  // TODO: Implement background sync for forum posts
  console.log('[ServiceWorker] Syncing posts...');
}

// Push notification support (optional - for future alerts)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update from Gabriola Connects',
    icon: '/icons/icon-192-192.png',  // Updated filename with dashes
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag: 'gabriola-notification',
    actions: [
      { action: 'view', title: 'View' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Gabriola Connects', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click');
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
