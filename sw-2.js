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

// Repeat-visit cache for Ludus's own static files only (see sw-static-cache.js for exactly what it does and does not
// touch). If that file is ever missing, the worker simply behaves as before.
try { importScripts("/sw-static-cache.js"); } catch (error) { console.warn("[sw] static cache unavailable:", error); }

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

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === "ludus:approve-popup" && typeof data.url === "string") {
    approvedPopupNavigations.set(data.url, Date.now() + 30000);
    return;
  }
});

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

// A proxy page can call window.open while it is still booting, before the
// parent UI has had a chance to hook that frame.  A navigation that creates a
// new client is therefore stopped here, before Scramjet fetches its target.
// The one-shot allowance is only granted after the user presses Proceed.
const approvedPopupNavigations = new Map();

function takeApprovedPopup(url) {
  const expiresAt = approvedPopupNavigations.get(url);
  approvedPopupNavigations.delete(url);
  return !!expiresAt && expiresAt > Date.now();
}

function popupBlockedResponse(proxyUrl, hostname) {
  const safeUrl = JSON.stringify(proxyUrl).replace(/</g, "\\u003c");
  const safeHost = String(hostname || "this site").replace(/[&<>\"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '\"':"&quot;" })[ch]);
  const html = `<!doctype html><meta charset="utf-8"><title>New tab blocked</title>
  <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0c10;color:#fff;font:16px system-ui,sans-serif}.card{max-width:440px;padding:32px;border:1px solid #2b303a;border-radius:18px;background:#14161c;text-align:center;box-shadow:0 20px 50px #0008}h1{font-size:21px;margin:0 0 12px}p{line-height:1.5;color:#b8bec9}button{border:0;border-radius:9px;padding:11px 16px;font-weight:700;cursor:pointer;margin:8px}#proceed{background:#38bdf8;color:#062536}#close{background:#2c313b;color:#fff}</style>
  <main class="card"><div style="font-size:34px">🛑</div><h1>New tab blocked</h1><p><b>${safeHost}</b> tried to open a new proxy tab. It was stopped before the site loaded.</p><button id="close">Keep blocked</button><button id="proceed">Proceed</button></main>
  <script>const u=${safeUrl};document.querySelector('#close').onclick=()=>window.close();document.querySelector('#proceed').onclick=async()=>{const r=await navigator.serviceWorker.ready;const w=navigator.serviceWorker.controller||r.active;w&&w.postMessage({type:'ludus:approve-popup',url:u});setTimeout(()=>location.replace(u),80)};</script>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ── zrok interstitial bypass ─────────────────────────────────────────
// zrok shows a "this share is hosted through zrok" warning page to browsers
// unless the request carries the skip_zrok_interstitial header.  <audio> and
// <video> elements cannot set headers themselves, so every request to a zrok
// host that passes through this worker gets the header added here.  Media
// requests start out as no-cors, so they are re-issued as cors (the resolver
// answers with Access-Control-Allow-Origin: * and allows Range + this header).
// credentials must be "omit": a wildcard Allow-Origin is rejected otherwise.
const ZROK_SKIP_HEADER = "skip_zrok_interstitial";

function isZrokHost(url) {
  try { return new URL(url).hostname.toLowerCase().endsWith(".zrok.io"); }
  catch { return false; }
}

function passThroughFetch(request) {
  if (
    !isZrokHost(request.url) ||
    request.mode === "navigate" ||
    (request.method !== "GET" && request.method !== "HEAD")
  ) return fetch(request);
  const headers = new Headers(request.headers);
  headers.set(ZROK_SKIP_HEADER, "1");
  return fetch(new Request(request, { headers, mode: "cors", credentials: "omit" }));
}

// ── Fetch handler ────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Our own versioned scripts/styles and game thumbnails: answered from the browser's copy. Never proxied traffic.
  const cachedAnswer = self.ludusStaticCache && self.ludusStaticCache.handle(event);
  if (cachedAnswer) { event.respondWith(cachedAnswer); return; }

  event.respondWith(
    (async () => {
      const scramjet = await getScramjet();
      await scramjet.loadConfig();

      // Never put proxy traffic through the application cache.  This keeps
      // Scramjet and the dedicated YouTube flow exactly as they are online.
      if (!scramjet.route(event)) return passThroughFetch(event.request);

      const prefix = scramjet.config?.prefix ?? "/scramjet/";
      const host = proxiedHostname(event.request.url, prefix);
      if (isAdultSWDomain(host)) return blockedResponse();

      // A normal Ludus proxy tab is an iframe (`destination === "iframe"`).
      // Only a new top-level browsing context is a popup, so do not interfere
      // with the proxy's own tab frames.
      if (event.request.mode === "navigate" && event.request.destination === "document" && event.resultingClientId && !takeApprovedPopup(event.request.url)) {
        return popupBlockedResponse(event.request.url, host);
      }

      return scramjet.fetch(event);
    })()
  );
});

self.addEventListener("install",  ()  => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(
  Promise.all([
    caches.delete("ludus-offline-v2"),
    caches.delete("ludus-offline-config"),
    // Older versions of the static-file cache (the current one is kept).
    caches.keys().then(names => Promise.all(names
      .filter(name => name.startsWith("ludus-static-") && name !== (self.ludusStaticCache && self.ludusStaticCache.name))
      .map(name => caches.delete(name))))
  ]).then(() => clients.claim())
));