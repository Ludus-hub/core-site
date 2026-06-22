/**
 * sw.js — Scramjet v2.0.0-alpha Service Worker
 *
 * Adult blocking layer 2 of 2.
 * Layer 1 is in index.html's navigateActive() — blocks address-bar navigation.
 * This layer catches what layer 1 misses: in-page link clicks, JS redirects,
 * meta-refreshes, and fetches for iframes spawned inside the proxy.
 *
 * IMPORTANT: keep ADULT_SW_DOMAINS in sync with ADULT_DOMAINS in index.html.
 *
 * IDB NOTE: ScramjetServiceWorker's constructor opens "$scramjet" v1 without
 * an onupgradeneeded handler, which creates the DB with no object stores.
 * Every subsequent open sees an existing v1 DB — onupgradeneeded never fires —
 * and all transactions crash with "object store not found".
 * Fix: ensureSchema() pre-opens the DB with the correct stores and closes the
 * connection before we ever call new ScramjetServiceWorker().
 */

importScripts("/p/scram/scramjet.all.js");
const { ScramjetServiceWorker } = $scramjetLoadWorker();

// ── IDB pre-init ─────────────────────────────────────────────────────
// Must run before ScramjetServiceWorker constructor so the DB is created
// with the correct schema on first install.
function ensureSchema() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("$scramjet", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of [
        "config", "cookies", "redirectTrackers",
        "referrerPolicies", "publicSuffixList"
      ]) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };
    req.onsuccess = () => { req.result.close(); resolve(); };
    req.onerror  = () => reject(req.error);
  });
}

// Lazy singleton — avoids top-level instantiation (which bypasses ensureSchema)
// and survives SW restarts (re-initialises on first fetch after wake-up).
let _scramjetPromise = null;
function getScramjet() {
  if (!_scramjetPromise) {
    _scramjetPromise = ensureSchema().then(() => new ScramjetServiceWorker());
  }
  return _scramjetPromise;
}

// ── Adult domain list (mirror of index.html's ADULT_DOMAINS) ────────
const ADULT_SW_DOMAINS = new Set([
  "pornhub.com","xvideos.com","xnxx.com","xhamster.com","redtube.com",
  "youporn.com","tube8.com","spankbang.com","txxx.com","beeg.com",
  "eporner.com","drtuber.com","gotporn.com","vporn.com","pornmd.com",
  "4tube.com","xtube.com","porntube.com","sunporno.com","fapster.xxx",
  "vidlox.me","proporn.com","hclips.com","hdzog.com","fuq.com",
  "anyporn.com","tnaflix.com","empflix.com","pornerbros.com",
  "porn.com","sex.com","brazzers.com","bangbros.com","reality-kings.com",
  "naughtyamerica.com","mofos.com","teamskeet.com","tushy.com",
  "vixen.com","blacked.com","deeper.com","dogfartnetwork.com",
  "rule34.xxx","gelbooru.com","e621.net","nhentai.net",
  "hentaifoundry.com","literotica.com",
  "onlyfans.com","fansly.com","stripchat.com","chaturbate.com",
  "myfreecams.com","cam4.com","livejasmin.com","bongacams.com",
  "adultfriendfinder.com",
]);

function proxiedHostname(reqUrl, prefix) {
  try {
    const idx = reqUrl.indexOf(prefix);
    if (idx === -1) return null;
    const encoded = reqUrl.slice(idx + prefix.length).split('#')[0];
    return new URL(decodeURIComponent(encoded)).hostname.replace(/^www\./, '').toLowerCase();
  } catch { return null; }
}

function isAdultSWDomain(hostname) {
  if (!hostname) return false;
  if (ADULT_SW_DOMAINS.has(hostname)) return true;
  for (const d of ADULT_SW_DOMAINS) {
    if (hostname.endsWith('.' + d)) return true;
  }
  return /\.(xxx|porn|adult|sex)$/.test(hostname);
}

const BLOCKED_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:-apple-system,sans-serif;background:#0a0008;color:#fff;
       display:flex;flex-direction:column;align-items:center;
       justify-content:center;height:100vh;margin:0;gap:12px}
  .icon{font-size:48px}
  h1{font-size:20px;margin:0;color:#ff6b6b}
  p{color:rgba(255,255,255,0.5);font-size:13px;margin:0}
</style></head>
<body>
  <div class="icon">🚫</div>
  <h1>Site Blocked</h1>
  <p>This content is not allowed.</p>
</body></html>`;

function blockedResponse() {
  return new Response(BLOCKED_HTML, {
    status: 403,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ── Fetch handler ────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const scramjet = await getScramjet();
      await scramjet.loadConfig();

      if (!scramjet.route(event)) return fetch(event.request);

      const prefix = scramjet.config?.prefix ?? "/scramjet/";
      const host = proxiedHostname(event.request.url, prefix);
      if (isAdultSWDomain(host)) return blockedResponse();

      return scramjet.fetch(event);
    })()
  );
});

self.addEventListener("install",  ()  => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));
