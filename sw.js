/* Jun's Carom offline support.
   The page itself is always fetched fresh when online (so updates apply at the next launch);
   the cached copy is used only when the network is unavailable. */
const CACHE = 'jun-carom-mobile-1.1';
const FILES = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function page() {
  const cache = await caches.open(CACHE), control = new AbortController(), timer = setTimeout(() => control.abort(), 3500);
  try {
    const response = await fetch('./index.html', { cache: 'no-store', signal: control.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error('bad status');
    await cache.put('./index.html', response.clone());
    return response;
  } catch (error) {
    clearTimeout(timer);
    return (await cache.match('./index.html')) || Response.error();
  }
}
async function asset(request) {
  const cache = await caches.open(CACHE), hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.cache === 'no-store') return;                       // update checks go straight to the network
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) e.respondWith(page());
  else e.respondWith(asset(e.request));
});
