const CACHE_VERSION = 'v1';
const CACHE_NAME = `calendar-${CACHE_VERSION}`;
const API_CACHE = `calendar-api-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  '/',
  '/dashboard',
  '/login',
  '/styles/globals.css',
  '/styles/theme.css',
];

const API_ROUTES = [
  '/api/notes',
  '/api/calendar/events',
  '/api/analytics',
  '/api/settings',
  '/api/overtime',
];

// Install event — cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Service Worker] Failed to cache some assets:', err);
        // Don't fail install if some assets can't be cached
      });
    })
  );
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== API_CACHE &&
            cacheName.startsWith('calendar-')
          ) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event — network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API routes — network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const cacheClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, cacheClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached API response on network failure
          return caches
            .match(request)
            .then((cached) => {
              return (
                cached ||
                new Response(
                  JSON.stringify({
                    error: 'Offline — cached data may be stale',
                  }),
                  {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' },
                  }
                )
              );
            });
        })
    );
    return;
  }

  // Static assets — cache-first with network fallback
  if (
    request.method === 'GET' &&
    (url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.woff'))
  ) {
    event.respondWith(
      caches
        .match(request)
        .then((cached) => {
          if (cached) return cached;

          return fetch(request).then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const cacheClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cacheClone);
            });

            return response;
          });
        })
        .catch(() => {
          // Return offline fallback for assets
          return new Response(
            'Asset unavailable offline',
            { status: 503 }
          );
        })
    );
    return;
  }

  // Navigation requests — network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches
            .match(request)
            .then(
              (cached) =>
                cached ||
                caches.match('/login') ||
                new Response(
                  'Network error — please check your connection',
                  { status: 503 }
                )
            );
        })
    );
    return;
  }

  // Other requests — pass through
  event.respondWith(fetch(request));
});

// Background sync for notes (when coming online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes());
  }
});

async function syncNotes() {
  try {
    const db = await openIndexedDB();
    const notes = await getPendingNotes(db);

    for (const note of notes) {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });

      if (response.ok) {
        await markNoteSynced(db, note.id);
      }
    }

    // Notify client of sync completion
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { notesSynced: notes.length },
      });
    });
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('CalendarDB', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getPendingNotes(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes');
    const store = tx.objectStore('notes');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.filter((n) => !n.synced));
    req.onerror = () => reject(req.error);
  });
}

function markNoteSynced(db, noteId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    const req = store.get(noteId);
    req.onsuccess = () => {
      const note = req.result;
      note.synced = true;
      store.put(note);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve();
  });
}
