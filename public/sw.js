const CACHE_NAME = '225-chretien-v3-offline';

// Ressources statiques locales critiques
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Installation : Mise en cache initiale
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force l'activation immédiate
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.warn('SW Precache warning:', err))
  );
});

// Activation : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper pour déterminer si une réponse peut être mise en cache sans erreur
function isCacheable(response, request) {
  if (!response || response.status !== 200) {
    return false;
  }
  // Ne jamais mettre en cache les requêtes partielles (Range / 206)
  if (response.status === 206 || (request && request.headers && request.headers.has('range'))) {
    return false;
  }
  return true;
}

// Helper de mise en cache sécurisé avec try/catch
async function safeCachePut(cache, request, response) {
  try {
    if (isCacheable(response, request)) {
      await cache.put(request, response.clone());
    }
  } catch (e) {
    // Ignorer silencieusement pour éviter toute exception non gérée
  }
}

// Interception des requêtes (Stratégies de cache)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. IGNORER les requêtes non-GET, API, Supabase, WebSockets, Range, et médias vidéo/audio
  if (
    event.request.method !== 'GET' ||
    url.href.includes('supabase') ||
    url.href.includes('pocketbase') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/openwa') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.m4a') ||
    event.request.headers.has('range') ||
    event.request.destination === 'video' ||
    event.request.destination === 'audio'
  ) {
    return;
  }

  // 2. LIBS EXTERNES (CDN) -> Cache First
  if (url.hostname.includes('aistudiocdn.com') || url.hostname.includes('cdn.tailwindcss.com') || url.hostname.includes('unpkg.com')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 3. FONTS & IMAGES -> Stale While Revalidate
  if (event.request.destination === 'font' || event.request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // 4. NAVIGATION (HTML) -> Network First
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 5. DEFAUT -> Stale While Revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

// --- Stratégies ---

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    await safeCachePut(cache, request, networkResponse);
    return networkResponse;
  } catch (error) {
    return new Response('Network error happened', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    await safeCachePut(cache, request, networkResponse);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Fallback si rien n'est trouvé
    return cache.match('/index.html');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    await safeCachePut(cache, request, networkResponse);
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}
