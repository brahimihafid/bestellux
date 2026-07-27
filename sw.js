/* Bestellux – minimal service worker.
   Its only job is to make the site installable as an app (PWA) and let the
   last-loaded page open instantly even on a flaky connection. It does not
   do anything with orders — those still go straight to WhatsApp. */

const CACHE_NAME = 'bestellux-v15';
const CORE_FILES = ['./', './index.html', './fahrer.html', './restaurant.html', './admin.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Pages and the app files themselves are always fetched with {cache:'reload'},
  // which bypasses the browser's own HTTP cache. Without this, a phone can keep
  // showing a days-old version of the site after an update.
  const url = new URL(event.request.url);
  const isAppFile =
    event.request.mode === 'navigate' ||
    /\.(html|json|js)$/.test(url.pathname) ||
    url.pathname.endsWith('/');
  const req = isAppFile ? new Request(event.request, { cache: 'reload' }) : event.request;

  event.respondWith(
    fetch(req)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
