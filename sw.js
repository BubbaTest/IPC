// sw.js - Service Worker

const CACHE_NAME = 'v1-cache-pwa';
const OFFLINE_PAGE = '/offline.html';
const ASSETS_TO_CACHE = [
    '/',    
    '/login.html',
    '/layoutadmin.html',
    '/layoutusuario.html',
    '/ExportarMuestra.html',
    '/ListarMuestra.html',
    '/MantCat.html',
    '/offline.html',
    '/Content/bootstrap.min.css',
    '/Content/bootstrap.minbootstrap-float-label.css',
    '/Content/select2.min.css',
    '/Content/bootstrap-icons.css', // Agregar el CSS de Bootstrap Icons
    '/Content/fonts/bootstrap-icons.woff', // Agregar la fuente .woff
    '/Content/fonts/bootstrap-icons.woff2', // Agregar la fuente .woff2
    '/Controller/BaseDatos.js',
    '/Controller/Muestra.js',
    '/Scripts/bootstrap.bundle.min.js',
    '/Scripts/jquery-3.5.1.min.js',
    '/Scripts/jquery.inputmask.bundle.js',
    '/Scripts/select2.min.js',
    '/img/icon-192.png',
    '/img/icon-512.png'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating new service worker');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Manejo de solicitudes con estrategia de Cache First + Network Fallback
self.addEventListener('fetch', event => {
    // Solo interceptamos solicitudes GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Si no está en caché, intentar desde red
                return fetch(event.request)
                    .then(response => {
                        // Si la respuesta es válida, guardarla en caché
                        if (!response || response.status !== 200 || response.type === 'opaque') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
            })
            .catch(() => {
                // Si falla todo, mostrar página offline
                return caches.match(OFFLINE_PAGE);
            })
    );
});

self.addEventListener('updatefound', () => {
    const installingWorker = registration.installing;
    installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
                console.log('Nueva versión disponible.');
                // Mostrar notificación o recargar
            }
        }
    };
});