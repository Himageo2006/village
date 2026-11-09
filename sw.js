/* Keeps the game on the phone once it has been fetched, so a return visit
   downloads almost nothing and a village can be opened with no signal.

   Pictures are served from here once held. Raise the version if one is ever
   repainted under the same name, or phones will go on showing the old one.
   The page and the code are the other way about: the network first, every time,
   so an update is never held back, and the held copy only when there is no
   network at all. */
const STORE = 'village-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== STORE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const art = /\/art\/[^/]+\.webp$/.test(u.pathname), code = e.request.mode === 'navigate' || /\/game\.js$/.test(u.pathname);
  if (!art && !code) return;
  e.respondWith((async () => {
    const box = await caches.open(STORE);
    if (art) {
      const hit = await box.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) box.put(e.request, res.clone());
      return res;
    }
    try {
      const res = await fetch(e.request);
      if (res.ok) box.put(e.request, res.clone());
      return res;
    } catch (err) {
      const held = await box.match(e.request, { ignoreSearch: true });
      if (held) return held;
      throw err;
    }
  })());
});
