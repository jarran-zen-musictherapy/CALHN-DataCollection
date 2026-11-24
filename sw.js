// Increment version number here whenever HTML/CSS/JS is updated
const CACHE_NAME = 'calhn-cache-v2';

const ASSETS_TO_CACHE = [
  // Dashboard
  '/CALHN-DataCollection/',
  '/CALHN-DataCollection/index.html',

  // 1-10 Scale Mood Tracker
  '/CALHN-DataCollection/Clinical_Tools/i-had-a-session.html',
  '/CALHN-DataCollection/Clinical_Tools/i-had-a-session.manifest.json',
  '/CALHN-DataCollection/Clinical_Tools/icon-192.png',
  '/CALHN-DataCollection/Clinical_Tools/icon-512.png',

  // Affective Colour Tracker
  '/CALHN-DataCollection/Clinical_Tools/Affective_Colour_Tracker.html',
  '/CALHN-DataCollection/Clinical_Tools/Affective_Colour_Tracker.manifest.json',
  '/CALHN-DataCollection/Clinical_Tools/colour-icon-192.png',
  '/CALHN-DataCollection/Clinical_Tools/colour-icon-512.png',

  // VAS Mood Check
  '/CALHN-DataCollection/Clinical_Tools/VAS-tracker.html',
  '/CALHN-DataCollection/Clinical_Tools/VAS-tracker.manifest.json',
  '/CALHN-DataCollection/Clinical_Tools/vas-icon-192.png',
  '/CALHN-DataCollection/Clinical_Tools/vas-icon-512.png',

  // SAHR Activity Parser
  '/CALHN-DataCollection/Data_Tools/SAHR_Activity_Parser.html',
  '/CALHN-DataCollection/Data_Tools/sahr_parser_core.js',
  '/CALHN-DataCollection/Data_Tools/sahr_parser_app.js',
  '/CALHN-DataCollection/Data_Tools/vendor/xlsx.full.min.js'
];

// INSTALL: Cache all assets on first load
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching offline assets');
      // Use individual adds so one missing icon doesn't break everything
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => {
          console.warn('[SW] Failed to cache:', url, err);
        }))
      );
    })
  );
  self.skipWaiting();
});

// ACTIVATE: Remove stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim();
});

// FETCH: Pages (HTML) are network-first so updates show immediately, with the cache as offline fallback.
// Everything else is served from cache, falling back to network.
// POST requests (Google Sheets sync) are never intercepted
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request)
    )
  );
});
