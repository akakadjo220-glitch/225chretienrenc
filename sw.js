
const CACHE_NAME = '225-chretien-v2-offline';

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

// Interception des requêtes (Stratégies de cache)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. IGNORER les requêtes API (PocketBase) et non-GET
  // On veut toujours des données fraîches ou une erreur explicite pour l'API
  if (event.request.method !== 'GET' || url.href.includes('pocketbase') || url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. LIBS EXTERNES (CDN) -> Cache First
  // (React, Lucide, Tailwind, etc.) : Elles ne changent pas souvent, on les garde longtemps.
  if (url.hostname.includes('aistudiocdn.com') || url.hostname.includes('cdn.tailwindcss.com') || url.hostname.includes('unpkg.com')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 3. FONTS & IMAGES -> Stale While Revalidate
  // On affiche le cache tout de suite, et on met à jour en arrière-plan pour la prochaine fois
  if (event.request.destination === 'font' || event.request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // 4. NAVIGATION (HTML) -> Network First
  // On essaie d'avoir la dernière version de la page, sinon on sert le cache (Mode Hors-ligne)
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
    cache.put(request, networkResponse.clone());
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
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Fallback si rien n'est trouvé (ex: page offline générique)
    return cache.match('/index.html');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    cache.put(request, networkResponse.clone());
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}
