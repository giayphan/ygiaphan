// ygiaphan service worker — bump version to invalidate cache
const VERSION = 'yp-v4';
const STATIC = [
  './',
  './index.html',
  './post.html',
  './courses.html',
  './category.html',
  './about.html',
  './contact.html',
  './login.html',
  './me.html',
  './data-deletion.html',
  './manifest.json',
  './assets/css/main.css',
  './assets/js/app.js',
  './assets/js/api.js',
  './assets/js/auth.js',
  './assets/js/post.js',
  './assets/js/learn.js',
  './assets/js/marked.min.js',
  './assets/img/logo.png',
  './assets/img/favicon.svg',
  './content/config.js',
  './content/site.js',
  './content/nav.js',
  './content/courses.js',
  './content/slides.js',
  './content/i18n/vi.js',
  './content/i18n/th.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(STATIC).catch(()=>{})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k!==VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Strategy:
// - HTML: network-first (fresh content), fallback cache
// - CSS/JS/img: cache-first (fast), update bg
// - API (script.google.com): network-only (no cache)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Skip Google APIs / external (no caching)
  if (url.hostname.includes('google.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('facebook')) return;
  // HTML
  if (e.request.mode === 'navigate' || e.request.destination === 'document'){
    e.respondWith(
      fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(VERSION).then(c => c.put(e.request, cp));
        return r;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Static (cache-first)
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchProm = fetch(e.request).then(r => {
        if (r.ok){ const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); }
        return r;
      }).catch(() => cached);
      return cached || fetchProm;
    })
  );
});

// Allow page to trigger update + skip waiting
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
