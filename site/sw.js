/* Service worker : rend le site installable et consultable sans connexion.
   - pages, scripts, styles et données : réseau d'abord (toujours à jour), copie en cache si pas de réseau ;
   - images et police : cache d'abord (elles changent rarement).
   Les documents Google, vidéos et sessions externes nécessitent toujours une connexion. */
const CACHE = 'jajj-v3';
const SOCLE = [
  './', 'index.html', 'manifest.webmanifest',
  'assets/app.css', 'assets/commun.js', 'assets/app.js',
  'assets/logo-unss-nantes.png', 'assets/bandeau.webp', 'assets/bandeau-1024.webp',
  'assets/polices/nunito-latin.woff2', 'assets/app-192.png', 'data/data.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SOCLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Après le premier chargement : on garde aussi en réserve les quiz et les illustrations */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'reserve' && Array.isArray(e.data.urls)) {
    e.waitUntil(caches.open(CACHE).then(async c => {
      for (const u of e.data.urls) { if (!(await c.match(u))) { try { await c.add(u); } catch (er) {} } }
    }));
  }
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // documents externes : pas de cache
  if (/admin\.html|acces\.js|admin\.(js|css)/.test(url.pathname)) return; // l'espace gestion reste en ligne
  if (url.search.includes('apercu')) return;

  const image = /\.(png|webp|jpe?g|svg|woff2)$/i.test(url.pathname);
  if (image) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(rep => {
      if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
      return rep;
    })));
    return;
  }
  e.respondWith(fetch(req).then(rep => {
    if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
    return rep;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
