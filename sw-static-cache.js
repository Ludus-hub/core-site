/*
 * sw-static-cache.js — repeat-visit caching for Ludus's OWN static files. Loaded by sw.js with importScripts().
 *
 * Why: Surge answers every file with "Cache-Control: public, max-age=0, must-revalidate", so every visit asks the
 * server again for every script, stylesheet and thumbnail (0.4–0.8 s each in the speed test). Response headers cannot be
 * changed on Surge, so this keeps a copy in the browser and uses it immediately.
 *
 * What it handles (nothing else, so the proxy, the adult-block layer and every app stay exactly as they were):
 *   "code"   root-level .js/.css with a ?v= stamp  (tools/stamp-assets.mjs adds the stamp)   refreshed after 6 hours
 *   "media"  files under /Versions/Assets/Pictures/                                           refreshed after 24 hours
 *
 * What it never touches: pages (navigations), /ludus-servers.js (the server list must always be fresh), /sw.js,
 * /p/*, Range requests, non-GET requests, other origins, and anything under the proxy prefix (a proxied URL is never a
 * root-level file or under /Versions/Assets/Pictures/).
 *
 * Staleness is bounded: a cached file is served instantly, and if it is older than its refresh age the page also
 * revalidates it in the background (a conditional request, usually a tiny 304) so the NEXT load has the new one. A hard
 * reload (Ctrl+Shift+R) bypasses it. Old ?v= versions of a file are deleted when a new one is stored.
 */
(() => {
  const CACHE_NAME = 'ludus-static-v1';
  const MAX_ENTRIES = 400;
  const REFRESH_AFTER = { code: 6 * 3600 * 1000, media: 24 * 3600 * 1000 };
  const NEVER = new Set(['/sw.js', '/sw-static-cache.js', '/ludus-servers.js']);
  const ROOT_CODE = /^\/[A-Za-z0-9._-]+\.(?:m?js|css)$/i;
  const MEDIA = /^\/Versions\/Assets\/Pictures\/.+\.(?:webp|png|jpe?g|gif|svg|ico|avif)$/i;

  function classify(request) {
    if (request.method !== 'GET' || request.mode === 'navigate' || request.headers.has('range')) return null;
    let url; try { url = new URL(request.url); } catch { return null; }
    if (url.origin !== self.location.origin || NEVER.has(url.pathname)) return null;
    if (ROOT_CODE.test(url.pathname)) return url.searchParams.has('v') ? 'code' : null;
    if (MEDIA.test(decodeURI(url.pathname))) return 'media';
    return null;
  }
  const isOld = (response, kind) => {
    const stamp = Date.parse(response.headers.get('date') || '');
    return !Number.isFinite(stamp) || Date.now() - stamp > REFRESH_AFTER[kind];
  };
  async function store(cache, request, response) {
    if (!response || !response.ok || response.type !== 'basic') return;
    const url = new URL(request.url);
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    // A new ?v= of a file replaces the old one; the cache is also kept to a sensible size (oldest first).
    for (const key of keys) {
      const other = new URL(key.url);
      if (other.pathname === url.pathname && other.search !== url.search) await cache.delete(key);
    }
    for (let i = 0; i < keys.length - MAX_ENTRIES; i++) await cache.delete(keys[i]);
  }
  async function refresh(cache, request) {
    try { await store(cache, request, await fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })); } catch { /* offline: keep the copy */ }
  }
  async function serve(event, kind) {
    const request = event.request;
    try {
      const cache = await caches.open(CACHE_NAME);
      // Hard reload / "disable cache": go to the network and refresh the stored copy.
      if (request.cache === 'reload' || request.cache === 'no-store') {
        const fresh = await fetch(request); await store(cache, request, fresh.clone()); return fresh;
      }
      const hit = await cache.match(request, { ignoreVary: true });
      if (hit) { if (isOld(hit, kind)) event.waitUntil(refresh(cache, request)); return hit; }
      const response = await fetch(request);
      event.waitUntil(store(cache, request, response.clone()).catch(() => {}));
      return response;
    } catch (error) {
      return fetch(request); // the Cache API failed (quota, private mode): behave as if this layer did not exist
    }
  }
  // Returns a Promise<Response> for requests this layer owns, or null to let sw.js carry on exactly as before.
  function handle(event) {
    const kind = classify(event.request);
    return kind ? serve(event, kind) : null;
  }
  self.ludusStaticCache = { name: CACHE_NAME, handle, classify };
})();
