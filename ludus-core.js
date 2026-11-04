/*
 * ludus-core.js — the ONE shared script for every Ludus page.
 *
 * It replaces loading-protocol.js and all the per-app copies of resolver / optimisation code.
 * Include both on every page that uses servers (either order works, the list is read when first needed):
 *     <script src="ludus-servers.js"></script>      (pure data: the only place servers are listed)
 *     <script src="ludus-core.js"></script>
 *
 * What lives here
 *   1. LudusCore.resolver  – server list, validated "active" server, shared health cache, per-request failover,
 *                            zrok header. If the list is missing the page shows a visible error instead of
 *                            silently running on some stale URL.
 *   1b. LudusCore.servers   – the "music app setup": one monitor that checks every server and its speed, connects to
 *                            the fastest, keeps re-checking, fails over, plus the shared merged status + selector
 *                            control (mountPicker) used by Music, Movie, YouTube and Drive.
 *   2. Loading protocol    – lazy images, async decoding, lighter media preload (opt out: data-ludus-eager).
 *   3. LudusCore.apps      – (index page only) lazy app frames, lag/memory relief, and
 *                            "wake on demand" for the mixer. Apps that are actually playing audio/video are
 *                            protected; everything else can be reclaimed.
 *   4. LudusCore.memory    – heap pressure reading plus a trim registry: apps register a function that drops
 *                            caches, and the index page tells them to run it when memory gets tight.
 *   5. Small shared helpers (developer check, service-worker check, hidden-frame check, idle scheduling).
 */
(() => {
  'use strict';
  if (window.LudusCore) return;

  const ZROK_HEADER = 'skip_zrok_interstitial';
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
    del(key) { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } },
  };
  const unique = list => [...new Set(list)];
  const isTop = (() => { try { return window.top === window; } catch { return false; } })();
  // State shared by every same-origin frame (health results, "is it playing" flags). Falls back to this window.
  const shared = (() => { try { return (window.top.__ludusShared = window.top.__ludusShared || {}); } catch { return (window.__ludusShared = window.__ludusShared || {}); } })();

  const runWhenIdle = (work, timeout = 1200) => {
    if ('requestIdleCallback' in window) return requestIdleCallback(work, { timeout });
    return setTimeout(work, Math.min(timeout, 50));
  };

  // Same rule Music, YouTube and the index page already used: dev flag plus the session unlock.
  const isDeveloper = () => {
    try { return localStorage.getItem('mathmaster_dev') === 'true' && sessionStorage.getItem('mathmaster_dev_unlocked') === 'true'; }
    catch { return false; }
  };
  const swControlled = () => { try { return Boolean(navigator.serviceWorker && navigator.serviceWorker.controller); } catch { return false; } };

  // True while this page is not on screen (background tab, or its iframe sits inside a display:none app section).
  let hiddenCache = { at: 0, value: false };
  const isHidden = () => {
    const now = Date.now();
    if (now - hiddenCache.at < 700) return hiddenCache.value;
    let value = document.hidden;
    if (!value) { try { const frame = window.frameElement; if (frame) value = frame.getClientRects().length === 0; } catch { /* cross-origin parent */ } }
    hiddenCache = { at: now, value };
    return value;
  };

  /* ───────────────────────────── 1. Resolver ───────────────────────────── */
  const KEY_ACTIVE = 'ludus_active_resolver';
  const KEY_CUSTOM = 'ludus_custom_yt_servers'; // personal servers shared by every Ludus app
  const HEALTHY_TTL = 45000;  // a server that answered /health this recently is trusted without re-probing
  const DEAD_TTL = 15000;     // a server that failed is not retried for this long (stops hammering a dead tunnel)

  // Accepts "https://host", "https://host/resolve" or a trailing slash; plain http only for this computer.
  function toResolveUrl(raw) {
    const text = String(raw || '').trim().replace(/\/+$/, '');
    if (!text) return '';
    let url; try { url = new URL(text); } catch { return ''; }
    const local = /^(localhost|\[?::1\]?|127(\.\d+){3})$/i.test(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return '';
    url.search = ''; url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/resolve$/, '') + '/resolve';
    return url.href;
  }
  const baseOf = url => String(url || '').replace(/\/resolve\/?$/, '').replace(/\/+$/, '');
  const isZrok = url => /\.shares\.zrok\.io(?:\/|$)/i.test(String(url));
  const headersFor = url => (isZrok(url) ? { [ZROK_HEADER]: 'true' } : {});

  let missingShown = false;
  function reportMissing() {
    if (missingShown) return;
    missingShown = true;
    console.error('[Ludus] The server list did not load. Make sure ludus-servers.js is deployed and included on this page.');
    const show = () => {
      if (document.getElementById('ludus-core-banner')) return;
      const bar = document.createElement('div');
      bar.id = 'ludus-core-banner';
      bar.setAttribute('role', 'alert');
      bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:2147483647;padding:8px 12px;font:600 13px system-ui,sans-serif;background:#7f1d1d;color:#fff;text-align:center';
      bar.textContent = 'The Ludus server list failed to load (ludus-servers.js), so servers are unavailable. Reload the page, or check that the file is deployed.';
      (document.body || document.documentElement).appendChild(bar);
    };
    document.body ? show() : document.addEventListener('DOMContentLoaded', show, { once: true });
  }
  function missingError() {
    reportMissing();
    return Object.assign(new Error('The Ludus server list (ludus-servers.js) failed to load.'), { resolverListMissing: true });
  }

  const builtIn = () => unique((Array.isArray(window.LUDUS_RESOLVER_URLS) ? window.LUDUS_RESOLVER_URLS : []).map(toResolveUrl).filter(Boolean));
  const custom = () => {
    const fromDirectory = window.LudusServers?.youtube?.custom?.();
    return unique((Array.isArray(fromDirectory) ? fromDirectory : String(store.get(KEY_CUSTOM) || '').split(/[\n,]/)).map(toResolveUrl).filter(Boolean));
  };
  // Built-in servers always hold the first slots; personal servers follow.
  const urls = () => { const list = builtIn(); if (!list.length) reportMissing(); return list; };
  const all = () => unique([...urls(), ...custom()]);
  const servers = () => all().map((url, index) => ({ id: `server-${index + 1}`, label: `Server ${index + 1}`, url }));
  const label = url => { const index = all().indexOf(toResolveUrl(url)); return index >= 0 ? `Server ${index + 1}` : 'Server'; };

  // The stored choice only counts if it is still in the list. A server that was removed from
  // ludus-servers.js is forgotten instead of being tried first forever.
  function active() {
    const list = all();
    const stored = toResolveUrl(store.get(KEY_ACTIVE));
    if (stored && list.includes(stored)) return stored;
    if (stored) store.del(KEY_ACTIVE);
    return list[0] || '';
  }
  function remember(url) {
    const normal = toResolveUrl(url);
    if (normal && all().includes(normal)) store.set(KEY_ACTIVE, normal);
    return normal;
  }
  const order = () => { const first = active(); return first ? unique([first, ...all()]) : all(); };

  const health = (shared.health = shared.health || new Map()); // base -> { ok, ms, at }
  const probing = new Map();
  async function runProbe(base, timeout) {
    const started = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await window.fetch(`${base}/health`, { signal: controller.signal, cache: 'no-store', headers: headersFor(base) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json().catch(() => null);
      if (!data || data.ok === false) throw new Error('The server did not answer like a Ludus resolver');
      const record = { ok: true, ms: Math.round(performance.now() - started), at: Date.now() };
      health.set(base, record);
      return record;
    } catch (error) {
      health.set(base, { ok: false, at: Date.now() });
      throw error;
    } finally { clearTimeout(timer); }
  }
  // One /health call per server at a time, shared by every caller and every app.
  function probe(url, { timeout = 6000, signal, force = false, maxAge = HEALTHY_TTL } = {}) {
    const resolveUrl = toResolveUrl(url); const base = baseOf(resolveUrl);
    if (!base) return Promise.reject(new Error('Invalid server address'));
    const hit = health.get(base); const age = hit ? Date.now() - hit.at : Infinity;
    const done = record => ({ url: resolveUrl, base, ms: record.ms, at: record.at });
    if (!force && hit && hit.ok && age < Math.min(HEALTHY_TTL, maxAge)) return Promise.resolve(done(hit));
    if (!force && hit && !hit.ok && age < DEAD_TTL) return Promise.reject(new Error('Server unavailable'));
    let promise = probing.get(base);
    if (!promise) { promise = runProbe(base, timeout).finally(() => probing.delete(base)); probing.set(base, promise); }
    const result = promise.then(done);
    if (!signal) return result;
    result.catch(() => {}); // a late failure after the caller aborted must not surface as an unhandled rejection
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      result.then(resolve, reject);
    });
  }
  const markDown = url => {
    const base = baseOf(toResolveUrl(url) || url);
    if (base) health.set(base, { ok: false, at: Date.now() });
    if (typeof monitor !== 'undefined') monitor.noteDown(toResolveUrl(url) || url); // keep every status display honest
  };
  const healthOf = url => health.get(baseOf(toResolveUrl(url) || url)) || null;

  // Fastest healthy server of the given list (default: all, active first). Remembers the winner.
  async function pickFastest(list = order(), options = {}) {
    const candidates = unique(list.map(toResolveUrl).filter(Boolean));
    if (!candidates.length) throw missingError();
    try {
      const winner = await Promise.any(candidates.map(url => probe(url, options).then(() => url)));
      remember(winner);
      return winner;
    } catch { throw new Error('No server is available right now.'); }
  }
  // Base URL (no /resolve) of a server that is known to be up: the active one if it is healthy, otherwise
  // the fastest of the rest.
  async function ready() {
    const current = active();
    if (!current) throw missingError();
    try { await probe(current); return baseOf(current); }
    catch {
      const others = order().filter(url => url !== current);
      return baseOf(await pickFastest(others.length ? others : [current]));
    }
  }
  const isTunnelFailure = response => !response.ok && response.status >= 500 && !/json/i.test(response.headers.get('content-type') || '');
  // GET <server>/<path>?params with the zrok header, a timeout, and ONE automatic failover if the server (not the
  // request) is the problem: network error, or a tunnel error page. Returns the Response for the caller to read.
  async function request(path, params, { timeout = 30000, signal, failover = true } = {}) {
    const query = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString() : '';
    const target = base => `${base}/${String(path).replace(/^\//, '')}${query ? `?${query}` : ''}`;
    const attempt = base => window.fetch(target(base), {
      signal: AbortSignal.any([AbortSignal.timeout(timeout), ...(signal ? [signal] : [])]),
      headers: headersFor(base),
    });
    const base = await ready();
    try {
      const response = await attempt(base);
      if (isTunnelFailure(response)) throw Object.assign(new TypeError(`Server error (HTTP ${response.status})`), { tunnel: true });
      return response;
    } catch (error) {
      const slow = error?.name === 'TimeoutError' || (error?.name === 'AbortError' && !signal?.aborted);
      if (!failover || signal?.aborted || slow) throw error;
      markDown(base);
      const others = order().filter(url => baseOf(url) !== base);
      if (!others.length) throw error;
      return attempt(baseOf(await pickFastest(others)));
    }
  }


  /* ───────────────────────────── 1b. Server monitor + picker (the "music app setup") ───────────────────────────── */
  // What Ludus Music always did, now one shared implementation for every app:
  //   - checks that EVERY server is connected, and how fast each one answers,
  //   - connects to the fastest one,
  //   - keeps re-checking (every 30 s while the page is visible, after the network returns, and right after a request
  //     fails), switching away from a server that dies and, with some hysteresis, to a clearly faster one,
  //   - a manual choice is respected until that server stops answering.
  // Apps only mount a picker (or subscribe) and react to onChange; they never run their own checking loop.
  //
  // ONE engine, TWO completely separate server lists. An `adapter` is the only thing that knows which servers belong to a
  // monitor, so the resolver monitor can never see a proxy (Wisp) server and the proxy monitor can never see a resolver:
  //   list() / label(url) / normalize(url) / has(url)   this kind's servers only
  //   active()                                           the server in use (resolver: stored choice; proxy: the one this page is connected to)
  //   probe(url, { timeout, force, maxAge })             resolves { ms, at } when the server answers, rejects when it does not
  //   pinned() / pin(url) / unpin()                      a manual choice
  //   remember(url)                                      make a server the active one (resolver only)
  //   autoSwitch                                         true: switch by itself (a resolver is chosen per request).
  //                                                      false: only report 'switch-available' (a proxy connection is made once per page load)
  const makeMonitor = adapter => {
    const CHECK_EVERY = adapter.checkEvery, MAX_AGE = adapter.maxAge;
    const subs = new Set();
    const statuses = adapter.statuses; // url -> { state: unknown|checking|up|down, ms, at }
    let phase = 'idle', timer = null, running = null, slowStreak = 0, lastRun = 0, started = false;
    const set = (url, patch) => statuses.set(url, { ...(statuses.get(url) || { state: 'unknown' }), ...patch });
    const snapshot = () => {
      const current = adapter.active();
      return { phase, active: current, label: adapter.label(current), pinned: adapter.pinned() === current,
        servers: adapter.list().map(url => ({ url, label: adapter.label(url), ...(statuses.get(url) || { state: 'unknown' }) })) };
    };
    function emit(reason) {
      const snap = snapshot();
      subs.forEach(fn => { try { fn(snap, reason); } catch { /* a broken subscriber must not stop the others */ } });
      try { window.dispatchEvent(new CustomEvent(adapter.event, { detail: { reason, ...snap } })); } catch { /* no DOM events */ }
    }
    const upList = () => adapter.list().filter(url => statuses.get(url)?.state === 'up').sort((a, b) => statuses.get(a).ms - statuses.get(b).ms);
    function decide(reason) {
      const current = adapter.active(), cur = statuses.get(current);
      const ups = upList();
      if (!ups.length) { phase = 'offline'; emit('offline'); return; }
      phase = 'ready';
      const best = ups[0];
      if (!adapter.autoSwitch) {                                                       // proxy: report, the page decides when to reconnect
        if (current && (!cur || cur.state !== 'up') && reason !== 'manual') emit('switch-available'); else emit('checked');
        return;
      }
      let target = null;
      if (reason === 'start' && adapter.pinned() !== current) target = best;           // first check: connect to the fastest
      else if (!cur || cur.state !== 'up') { if (reason !== 'manual') target = best; } // current one died: fail over
      else if (best !== current && adapter.pinned() !== current && cur.ms > 150 && statuses.get(best).ms < cur.ms * 0.6) {
        if (++slowStreak >= 2) target = best;                                          // clearly faster twice in a row
      } else slowStreak = 0;
      if (target && target !== current) { slowStreak = 0; if (adapter.pinned() === current) adapter.unpin(); adapter.remember(target); emit('switch'); }
      else emit('checked');
    }
    function checkAll({ force = false, reason = 'interval' } = {}) {
      if (running) return running;
      const list = adapter.list();
      if (!list.length) { phase = 'offline'; emit(reason); return Promise.resolve(snapshot()); }
      if (phase === 'idle') phase = 'finding';
      list.forEach(url => { if (force || !statuses.has(url)) set(url, { state: 'checking' }); });
      emit(reason === 'start' ? 'start' : 'checking');
      const maxAge = force ? 0 : (reason === 'start' && adapter.startMaxAge) || MAX_AGE;
      running = Promise.allSettled(list.map(url => adapter.probe(url, { timeout: adapter.timeout, force, maxAge }).then(
        result => { set(url, { state: 'up', ms: result.ms, at: result.at }); emit('probe'); },
        () => { set(url, { state: 'down', at: Date.now() }); emit('probe'); },
      ))).then(() => { lastRun = Date.now(); decide(reason); return snapshot(); }).finally(() => { running = null; });
      return running;
    }
    function start() {
      if (started) return; started = true;
      checkAll({ reason: 'start' });
      timer = setInterval(() => { if (!isHidden() && navigator.onLine !== false) checkAll({ reason: 'interval' }); }, CHECK_EVERY);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastRun > CHECK_EVERY) checkAll({ reason: 'interval' }); });
      window.addEventListener('online', () => checkAll({ force: true, reason: 'online' }));
      if (adapter.watchList) { // a server was added: check it right away (removed ones simply disappear from the list)
        const sync = () => {
          if (running) { running.then(sync); return; }
          if (adapter.list().some(url => !statuses.has(url))) checkAll({ reason: 'list' }); else emit('list');
        };
        window.addEventListener('ludus:servers-changed', event => { if (event.detail && event.detail.type === adapter.type) sync(); });
      }
    }
    // A person picked a server: stick with it, re-check just that one, and leave it alone until it stops answering.
    async function choose(url) {
      const normal = adapter.normalize(url);
      if (!normal || !adapter.has(normal)) return snapshot();
      slowStreak = 0; adapter.pin(normal);
      set(normal, { state: 'checking' }); emit('manual');
      try { const result = await adapter.probe(normal, { timeout: 8000, force: true }); set(normal, { state: 'up', ms: result.ms, at: result.at }); }
      catch { set(normal, { state: 'down', at: Date.now() }); if (adapter.unpinFailed) adapter.unpin(normal); }
      emit('manual-result');
      return snapshot();
    }
    // A request just failed on this server: show it, and look for a replacement straight away.
    function noteDown(url) {
      if (!started || !url) return;
      set(url, { state: 'down', at: Date.now() }); emit('down');
      if (url === adapter.active()) checkAll({ force: true, reason: 'failover' });
    }
    return {
      start, checkAll, choose, noteDown, snapshot, words: adapter.words, describe: adapter.describe,
      refresh: () => checkAll({ force: true, reason: 'manual-check' }),
      // A request just succeeded on this server (e.g. after a per-request failover): make it the active one everywhere.
      adopt(url) {
        if (!adapter.autoSwitch) return;
        const normal = adapter.normalize(url);
        if (!normal || normal === adapter.active() || !adapter.has(normal)) return;
        adapter.remember(normal); set(normal, { state: 'up', at: Date.now(), ms: statuses.get(normal)?.ms || 0 }); emit('switch');
      },
      best: () => upList()[0] || '',
      subscribe(fn) { subs.add(fn); started || start(); try { fn(snapshot(), 'subscribe'); } catch { /* ignore */ } return () => subs.delete(fn); },
    };
  };

  // ── Resolver (YouTube) servers: exactly what Music, YouTube, Movie and Drive have always used ──
  const monitor = makeMonitor({
    type: 'yt', event: 'ludus:servers', statuses: (shared.statuses = shared.statuses || new Map()),
    words: { finding: 'Finding fastest server…', offline: 'Server unavailable', choose: 'Choose server', recheck: 'Re-check servers' },
    list: all, label, normalize: toResolveUrl, has: url => all().includes(url),
    active, remember,
    probe: (url, { timeout, force, maxAge }) => probe(url, { timeout, force, maxAge }),
    pinned: () => shared.pinned || '', pin(url) { shared.pinned = url; remember(url); }, unpin() { shared.pinned = ''; },
    autoSwitch: true, checkEvery: 30000, maxAge: 20000, timeout: 6000,
  });

  // ── Proxy (Scramjet / Wisp) servers: their own list, their own health checks, nothing shared with the resolvers ──
  // The list, the saved pin and the health cache all live in LudusServers.proxy (ludus-servers.js). A Wisp server counts as
  // available when a WebSocket to it opens, and its speed is how long that took. Switching proxy servers needs the page to
  // reconnect, so this monitor never switches by itself: it tells the page ('switch-available') and the page decides.
  const proxyDir = () => { const dir = window.LudusServers && window.LudusServers.proxy; return dir && typeof dir.probe === 'function' && typeof dir.connected === 'function' ? dir : null; }; // an older cached ludus-servers.js has no probe(): treated as "no proxy list"
  const proxyUrls = () => { const dir = proxyDir(); return dir ? dir.urls() : []; };
  const proxyLabel = url => { const dir = proxyDir(); const hit = dir && dir.all().find(item => item.url === url); return hit ? hit.label : 'Proxy'; };
  const proxyActive = () => { // the server this page is connected to; if that server has since left the list, the one that would be used now
    const dir = proxyDir(); if (!dir) return '';
    const connected = dir.connected(); return connected && dir.urls().includes(connected) ? connected : ((dir.active() || {}).url || '');
  };
  const proxyMonitor = makeMonitor({
    type: 'proxy', event: 'ludus:proxy-servers', statuses: (shared.proxyStatuses = shared.proxyStatuses || new Map()),
    words: { finding: 'Finding fastest proxy…', offline: 'Proxy unavailable', choose: 'Choose proxy server', recheck: 'Re-check proxy servers' },
    describe: url => { try { return new URL(url).hostname; } catch { return ''; } },
    list: proxyUrls, label: proxyLabel, normalize: url => (proxyDir() ? proxyDir().normalize(url) : ''), has: url => proxyUrls().includes(url),
    active: proxyActive, remember() {},
    probe: async (url, { force, maxAge }) => {
      const dir = proxyDir(); if (!dir) throw new Error('The proxy server list did not load');
      const record = await dir.probe(url, { force, maxAge });
      if (!record || !record.ok) throw new Error('Proxy server unavailable');
      return { ms: record.ms, at: record.at };
    },
    pinned: () => (proxyDir() ? proxyDir().pinned() : ''), pin(url) { proxyDir()?.select(url); }, unpin() { proxyDir()?.unpin(); }, unpinFailed: true,
    autoSwitch: false, watchList: true, checkEvery: 45000, maxAge: 30000, startMaxAge: 60000, timeout: 5000,
  });
  // Resolves with the proxy server a page should connect to: the fastest one that answers (or the person's pick, while it
  // answers). Uses a recent check when there is one, so startup stays quick; never waits longer than maxWait.
  function proxyReady({ maxWait = 2500, grace = 700 } = {}) {
    return new Promise(resolve => {
      let settled = false, graceTimer = null, unsubscribe = () => {};
      const finish = () => {
        if (settled) return; settled = true; clearTimeout(cap); clearTimeout(graceTimer); unsubscribe();
        const dir = proxyDir(); resolve(dir ? ((dir.active() || {}).url || '') : '');
      };
      const cap = setTimeout(finish, maxWait);
      unsubscribe = proxyMonitor.subscribe(snap => {
        if (settled) return;
        const pending = snap.servers.some(server => server.state === 'checking' || server.state === 'unknown');
        if (snap.servers.length && !pending) return void setTimeout(finish, 0);
        if (!graceTimer && snap.servers.some(server => server.state === 'up')) graceTimer = setTimeout(finish, grace); // someone answered: wait briefly for faster ones
      });
    });
  }

  const PICKER_CSS = `
.ludus-srv{position:relative;display:inline-flex;min-width:0;max-width:100%;font-family:inherit}
.ludus-srv,.ludus-srv *{box-sizing:border-box}
.ludus-srv-pill{display:flex;align-items:center;gap:7px;min-width:0;max-width:100%;padding:6px 5px 6px 13px;border-radius:999px;border:1px solid var(--line,rgba(255,255,255,.09));background:rgba(255,255,255,.04);color:var(--faint,rgba(255,255,255,.5));font:600 11.5px/1.2 inherit;white-space:nowrap;cursor:pointer;appearance:none;transition:border-color .15s,color .15s,background .15s}
.ludus-srv-pill:hover{border-color:rgba(255,255,255,.2);color:#fff}
.ludus-srv-pill:focus-visible{outline:2px solid var(--accent,#00c9ff);outline-offset:2px}
.ludus-srv-pill i{flex:none;display:inline-block;width:6px;height:6px;border-radius:50%;background:#f0a15b;box-shadow:0 0 6px #f0a15b}
.ludus-srv[data-state=online] .ludus-srv-pill{color:rgba(255,255,255,.7)}
.ludus-srv[data-state=online] i{background:var(--accent-2,#92fe9d);box-shadow:0 0 6px var(--accent-2,#92fe9d)}
.ludus-srv[data-state=offline] i{background:#ff6b6b;box-shadow:0 0 6px #ff6b6b}
.ludus-srv[data-state=pending] i{animation:ludusSrvPulse 1s ease-in-out infinite}
@keyframes ludusSrvPulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
.ludus-srv-label{white-space:nowrap}
.ludus-srv-chev{flex:none;display:grid;place-items:center;width:22px;height:22px;margin-left:2px;border-left:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.72)}
.ludus-srv-chev svg{transition:transform .16s ease}
.ludus-srv-pill:hover .ludus-srv-chev,.ludus-srv-pill[aria-expanded=true] .ludus-srv-chev{color:var(--accent,#00c9ff)}
.ludus-srv-pill[aria-expanded=true] .ludus-srv-chev svg{transform:rotate(180deg)}
.ludus-srv[data-dir=up] .ludus-srv-pill[aria-expanded=true] .ludus-srv-chev svg{transform:rotate(0)}
.ludus-srv[data-dir=up] .ludus-srv-chev svg{transform:rotate(180deg)}
.ludus-srv-menu{position:absolute;z-index:2147483000;top:calc(100% + 8px);right:0;display:grid;min-width:216px;padding:6px;border:1px solid rgba(255,255,255,.13);border-radius:12px;background:rgba(19,22,28,.97);box-shadow:0 14px 34px rgba(0,0,0,.42);backdrop-filter:blur(18px);text-align:left}
.ludus-srv[data-dir=up] .ludus-srv-menu{top:auto;bottom:calc(100% + 8px)}
.ludus-srv-menu[hidden]{display:none}
.ludus-srv-menu button{display:grid;grid-template-columns:1fr auto;align-items:center;gap:2px 14px;width:100%;padding:8px 9px;border:0;border-radius:8px;background:transparent;color:rgba(255,255,255,.86);font:650 12px/1.2 inherit;text-align:left;cursor:pointer}
.ludus-srv-menu button:hover,.ludus-srv-menu button.active{background:rgba(0,201,255,.13);color:#fff}
.ludus-srv-menu button.active::after{content:'Connected';grid-column:2;grid-row:1;color:var(--accent,#00c9ff);font-size:10px;font-weight:800}
.ludus-srv-menu em{margin-left:6px;color:var(--accent-2,#92fe9d);font-size:9px;font-style:normal;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.ludus-srv-health{grid-column:1/-1;grid-row:2;color:rgba(255,255,255,.56);font-size:10px;font-weight:600}
.ludus-srv-health.up{color:#92fe9d}
.ludus-srv-health.down{color:#ff8a8a}
.ludus-srv-menu .ludus-srv-recheck{display:block;margin-top:4px;padding:8px 9px;border-top:1px solid rgba(255,255,255,.08);border-radius:0 0 8px 8px;color:rgba(255,255,255,.6);font-size:11px}
.ludus-srv-menu .ludus-srv-recheck{position:sticky;bottom:-6px;background:rgba(19,22,28,.97)}
.ludus-srv-menu .ludus-srv-recheck:hover{background:rgba(19,22,28,.97);color:var(--accent,#00c9ff)}
.ludus-srv[data-skin=streamer] .ludus-srv-pill{min-height:30px;padding:0 4px 0 11px;background:rgba(255,255,255,.06);color:#fff;font-weight:700;font-size:12px}
.ludus-srv[data-skin=streamer] .ludus-srv-pill:hover{border-color:var(--accent,#00c9ff);color:var(--accent,#00c9ff);background:var(--accent-soft,rgba(0,201,255,.12))}
.ludus-srv[data-skin=streamer] .ludus-srv-chev{height:20px;color:currentColor}
`;
  const CHEVRON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>';
  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Mounts the merged "connected to server + selector" control into `host`.
  //   skin: 'music' (Music, YouTube, Drive) or 'streamer' (the Movie trailer controls)
  //   compact: label is "Server 2 · 84 ms" instead of "Connected to Server 2"
  //   menuDirection: 'down' (top bars), 'up' (bottom control bars) or 'auto' (opens toward the side with more room)
  //   onChange(url, { reason, manual }): the active server changed (person's pick, failover or a faster server)
  //   onChoose(url, snapshot): the person picked a server and its check finished (the Proxy app reconnects here)
  //   monitor: which server list this control shows (default: the resolver servers; the proxy servers use LudusCore.servers.proxy.mountPicker)
  // Returns { setNote(state, text), clearNote(), destroy(), element }.
  function mountPicker(host, { skin = 'music', compact = false, menuDirection = 'down', onChange, onChoose, monitor: chosenMonitor } = {}) {
    const mon = chosenMonitor || monitor;
    const words = mon.words || { finding: 'Finding fastest server…', offline: 'Server unavailable', choose: 'Choose server', recheck: 'Re-check servers' };
    if (!document.getElementById('ludus-srv-style')) {
      const style = document.createElement('style'); style.id = 'ludus-srv-style'; style.textContent = PICKER_CSS; document.head.appendChild(style);
    }
    const root = document.createElement('div');
    root.className = 'ludus-srv'; root.dataset.skin = skin; root.dataset.dir = menuDirection === 'up' ? 'up' : 'down'; root.dataset.state = 'pending';
    root.innerHTML = `<button type="button" class="ludus-srv-pill" aria-haspopup="menu" aria-expanded="false" title="${escapeHtml(words.choose)}"><i></i><span class="ludus-srv-label">${escapeHtml(words.finding)}</span><span class="ludus-srv-chev">${CHEVRON}</span></button><div class="ludus-srv-menu" role="menu" hidden></div>`;
    host.appendChild(root);
    const pill = root.querySelector('.ludus-srv-pill'), text = root.querySelector('.ludus-srv-label'), menu = root.querySelector('.ludus-srv-menu');
    let note = null, lastActive = null;

    const healthText = server => server.state === 'checking' ? 'Checking…' : server.state === 'up' ? `Available · ${server.ms} ms` : server.state === 'down' ? 'Unavailable' : 'Not checked yet';
    function render(snap) {
      const current = snap.servers.find(server => server.url === snap.active);
      let state, line;
      if (note) { state = note.state; line = note.text; }
      else if (!current || current.state === 'unknown' || (snap.phase !== 'ready' && current.state === 'checking')) { state = 'pending'; line = words.finding; }
      else if (current.state === 'checking') { state = 'pending'; line = `Checking ${current.label}…`; }
      else if (current.state === 'up') { state = 'online'; line = compact ? `${current.label} · ${current.ms} ms` : `Connected to ${current.label}`; }
      else if (snap.phase === 'offline') { state = 'offline'; line = words.offline; }
      else { state = 'offline'; line = `${current.label} unavailable`; }
      root.dataset.state = state; text.textContent = line;
      pill.title = `${line} — ${words.choose.toLowerCase()}`;
      const fastest = snap.servers.filter(server => server.state === 'up').sort((a, b) => a.ms - b.ms)[0];
      menu.innerHTML = snap.servers.map(server => {
        const klass = [server.url === snap.active ? 'active' : ''].filter(Boolean).join(' ');
        const health = server.state === 'checking' ? '' : server.state;
        const detail = mon.describe ? mon.describe(server.url) : '';
        return `<button type="button" role="menuitem" data-url="${escapeHtml(server.url)}"${detail ? ` title="${escapeHtml(detail)}"` : ''} class="${klass}"><span>${escapeHtml(server.label)}${fastest && fastest.url === server.url && snap.servers.filter(s => s.state === 'up').length > 1 ? '<em>Fastest</em>' : ''}</span><small class="ludus-srv-health ${health === 'up' || health === 'down' ? health : ''}">${healthText(server)}</small></button>`;
      }).join('') + `<button type="button" class="ludus-srv-recheck" data-recheck="1">${escapeHtml(words.recheck)}</button>`;
      pill.hidden = !snap.servers.length;
    }
    const setOpen = open => {
      menu.hidden = !open; pill.setAttribute('aria-expanded', String(open));
      if (open && menuDirection === 'auto') { // open toward the side with room for the whole list; scroll the list if neither side fits
        let area = null; for (let node = root.parentElement; node && node !== document.body; node = node.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) { area = node.getBoundingClientRect(); break; } } // a scrolling panel clips the menu at its edges
        const box = root.getBoundingClientRect(), top = Math.max(0, area ? area.top : 0), bottom = Math.min(window.innerHeight, area ? area.bottom : window.innerHeight);
        const below = bottom - box.bottom - 12, above = box.top - top - 12, need = menu.offsetHeight;
        const up = below < need && above > below, room = up ? above : below;
        root.dataset.dir = up ? 'up' : 'down';
        menu.style.maxHeight = need > room ? `${Math.max(140, room)}px` : ''; menu.style.overflowY = need > room ? 'auto' : ''; menu.style.alignContent = need > room ? 'start' : '';
      }
    };
    pill.addEventListener('click', event => { event.stopPropagation(); setOpen(menu.hidden); });
    menu.addEventListener('click', event => {
      event.stopPropagation();
      const item = event.target.closest('button'); if (!item) return;
      setOpen(false);
      if (item.dataset.recheck) { mon.refresh(); return; }
      if (item.dataset.url) mon.choose(item.dataset.url).then(snap => { if (typeof onChoose === 'function') { try { onChoose(item.dataset.url, snap); } catch { /* app handler failed */ } } });
    });
    const outside = event => { if (!root.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('click', outside); document.addEventListener('keydown', escape);

    const unsubscribe = mon.subscribe((snap, reason) => {
      render(snap);
      if (lastActive !== null && snap.active !== lastActive && typeof onChange === 'function') {
        try { onChange(snap.active, { reason, manual: reason === 'manual' || reason === 'manual-result' }); } catch { /* app handler failed */ }
      }
      lastActive = snap.active;
    });
    return {
      element: root,
      setNote(state, line) { note = { state, text: line }; render(mon.snapshot()); },
      clearNote() { if (note) { note = null; render(mon.snapshot()); } },
      destroy() { unsubscribe(); document.removeEventListener('click', outside); document.removeEventListener('keydown', escape); root.remove(); },
    };
  }

  /* ───────────────────────────── 2. Loading protocol ───────────────────────────── */
  const tune = (root = document) => {
    root.querySelectorAll?.('img:not([loading])').forEach(image => {
      image.loading = image.closest('[data-ludus-eager]') ? 'eager' : 'lazy';
      image.decoding = 'async';
    });
    // Plain pages: don't download whole media files up front. Players that need the data right away
    // (YouTube's relay player) opt out with data-ludus-eager on the element or an ancestor.
    root.querySelectorAll?.('video[preload="auto"],audio[preload="auto"]').forEach(media => {
      if (!media.closest('[data-ludus-eager]')) media.preload = 'metadata';
    });
  };
  const startLoadingProtocol = () => {
    tune();
    new MutationObserver(entries => runWhenIdle(() => entries.forEach(({ addedNodes }) => addedNodes.forEach(node => {
      if (node.nodeType === 1) tune(node);
    })))).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', startLoadingProtocol, { once: true }) : startLoadingProtocol();
  window.LUDUS_LOADING = Object.freeze({ runWhenIdle, tune }); // kept so nothing that read the old global breaks

  /* ───────────────────────────── 3. Memory ───────────────────────────── */
  const trimHandlers = new Set();
  const heapRatio = () => {
    const info = performance && performance.memory;
    return info && info.jsHeapSizeLimit ? info.usedJSHeapSize / info.jsHeapSizeLimit : null;
  };
  const memory = {
    ratio: heapRatio,
    high: () => { const ratio = heapRatio(); return ratio !== null && ratio > 0.6; },
    // Register a function that drops this app's caches. Returns an unregister function.
    onTrim(fn) { trimHandlers.add(fn); return () => trimHandlers.delete(fn); },
    trim() { trimHandlers.forEach(fn => { try { fn(); } catch { /* one bad handler must not stop the rest */ } }); },
  };
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || !event.data || event.data.type !== 'ludus:trim') return;
    memory.trim();
  });

  /* ───────────────────────────── 4. App lifecycle (index page) ───────────────────────────── */
  // Sections whose app may be playing media; they are only protected while it really is playing.
  const MEDIA_SECTIONS = { 'app-music': 'music', 'app-movies': 'movie', 'app-youtube': 'youtube', 'app-files': 'files' };
  const PLAYING_STALE_MS = 45000; // the apps report every few seconds while playing; silence means it is not

  const playing = (shared.playing = shared.playing || {});
  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || typeof data !== 'object' || !['music', 'movie', 'youtube'].includes(data.source) || typeof data.paused !== 'boolean') return;
    playing[data.source] = { playing: !data.paused, at: Date.now() };
  });
  const isPlaying = key => { const entry = playing[key]; return Boolean(entry && entry.playing && Date.now() - entry.at < PLAYING_STALE_MS); };
  // Downloads: an app that is downloading must never be unloaded (its half-finished downloads would be lost). The apps report
  // their number of running downloads every second while any run ({ source, downloads }); silence for 90 s means they ended.
  const DOWNLOADING_STALE_MS = 90000; // generous: a hidden browser tab slows timers down a lot
  const downloading = (shared.downloading = shared.downloading || {});
  const movieOpen = (shared.movieOpen = shared.movieOpen || { open: false });
  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (['music', 'files', 'youtube', 'movie'].includes(data.source) && typeof data.downloads === 'number') downloading[data.source] = { count: data.downloads, at: Date.now() };
    if (data.source === 'ludus-movie') { if (data.action === 'playerOpened') movieOpen.open = true; else if (data.action === 'playerClosed') movieOpen.open = false; }
  });
  const isDownloading = key => { const entry = downloading[key]; return Boolean(entry && entry.count > 0 && Date.now() - entry.at < DOWNLOADING_STALE_MS); };

  const sectionOf = id => document.getElementById(id);
  const framesOf = id => [...(sectionOf(id)?.querySelectorAll('iframe, embed, object') || [])];
  const frameSrc = frame => (frame.tagName === 'OBJECT' ? frame.getAttribute('data') : frame.getAttribute('src')) || '';
  const isBlank = frame => { const src = frameSrc(frame); return !src || src.includes('about:blank'); };
  const setFrameSrc = (frame, value) => { if (frame.tagName === 'OBJECT') frame.data = value; else frame.src = value; };

  // An app is protected while it is playing audio/video, downloading something, or (Movies) has its player open.
  const isProtected = sectionId => { const key = MEDIA_SECTIONS[sectionId]; return Boolean(key && (isPlaying(key) || isDownloading(key) || (key === 'movie' && movieOpen.open))); };
  // Only frames that carry a data-src can be reloaded later, so only those are ever unloaded.
  const canSleep = frame => Boolean(frame.getAttribute('data-src')) && !isBlank(frame);

  function sleep(sectionId) {
    let count = 0;
    for (const frame of framesOf(sectionId)) if (canSleep(frame)) { setFrameSrc(frame, 'about:blank'); count++; }
    return count;
  }
  // Loads the app if it is asleep; resolves with its window once it has finished loading (or after 15 s).
  function wake(sectionId) {
    const frame = framesOf(sectionId)[0];
    if (!frame) return Promise.resolve(null);
    const started = (() => { const src = frame.getAttribute('data-src'); if (src && isBlank(frame)) { setFrameSrc(frame, src); return true; } return false; })();
    let alreadyLoaded = false;
    try { alreadyLoaded = !started && !isBlank(frame) && frame.contentDocument?.readyState === 'complete'; } catch { alreadyLoaded = true; }
    if (alreadyLoaded) return Promise.resolve(frame.contentWindow);
    return new Promise(resolve => {
      const finish = () => resolve(frame.contentWindow);
      frame.addEventListener('load', finish, { once: true });
      setTimeout(finish, 15000);
    });
  }
  // Mixer helper: if the app is asleep, wake it and hand it the message once it is ready.
  // Returns true when it took over (the caller should stop), false when the app was already awake.
  function deliver(sectionId, message) {
    const frame = framesOf(sectionId)[0];
    if (!frame || !isBlank(frame) || !frame.getAttribute('data-src')) return false;
    wake(sectionId).then(win => { if (win) setTimeout(() => win.postMessage(message, '*'), 300); });
    return true;
  }

  const activeSection = () => document.querySelector('.app-section.active-section');
  // Apps with their own full player don't need the index mixer floating on top of them (it only adds clutter there).
  const HIDE_MIXER_IN = new Set(['app-music']);
  const applyMixerVisibility = id => { if (document.body) document.body.classList.toggle('ludus-no-mixer', HIDE_MIXER_IN.has(id)); };
  // Apps are no longer put to sleep by a timer: they stay loaded until the person closes them or the page is under real memory/lag pressure.
  const onSectionChange = (previous, next) => { applyMixerVisibility(next); };

  function toast(text) {
    if (!document.body) return;
    const node = document.createElement('div');
    node.textContent = text;
    node.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(20,20,20,.92);color:#fff;padding:10px 20px;border-radius:12px;font-size:13px;z-index:99999;border:1px solid rgba(255,255,255,.15);backdrop-filter:blur(10px);pointer-events:none';
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 4000);
  }
  // Frees every background app that is not playing, and tells all apps to drop their caches.
  function relieve(reason) {
    const active = activeSection();
    let freed = 0;
    document.querySelectorAll('.app-section').forEach(section => {
      if (section === active || isProtected(section.id)) return;
      freed += sleep(section.id);
    });
    document.querySelectorAll('iframe').forEach(frame => { try { frame.contentWindow.postMessage({ type: 'ludus:trim' }, location.origin); } catch { /* not ready */ } });
    memory.trim();
    if (freed) toast('⚡ Freed up background apps to improve performance.');
    return { reason, freed };
  }

  function startMonitors() {
    // Lag: many slow frames in a row. A frame gap over 1.5 s means the tab was throttled in the background, not lag.
    const LAG_MS = 80, LAG_FRAMES = 8, COOLDOWN = 30000;
    let slow = 0, last = performance.now(), lastRelief = -COOLDOWN; // the first relief may happen right away
    const frame = now => {
      const delta = now - last; last = now;
      if (delta > 1500) slow = 0;
      else if (delta > LAG_MS) {
        slow++;
        if (slow >= LAG_FRAMES && now - lastRelief > COOLDOWN) { lastRelief = now; slow = 0; relieve('lag'); }
      } else slow = Math.max(0, slow - 1);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    // Memory (Chromium only): trim caches first, free background apps if it keeps climbing.
    let lastTrim = 0, lastHeapRelief = 0;
    setInterval(() => {
      const ratio = heapRatio(); if (ratio === null) return;
      const now = Date.now();
      if (ratio > 0.75 && now - lastHeapRelief > COOLDOWN) { lastHeapRelief = lastTrim = now; relieve('memory'); }
      else if (ratio > 0.6 && now - lastTrim > COOLDOWN) {
        lastTrim = now;
        document.querySelectorAll('iframe').forEach(f => { try { f.contentWindow.postMessage({ type: 'ludus:trim' }, location.origin); } catch { /* not ready */ } });
        memory.trim();
      }
    }, 15000);
  }
  const apps = {
    isProtected, isPlaying, sleep, wake, deliver, relieve, onSectionChange,
    status() {
      return [...document.querySelectorAll('.app-section')].map(section => ({
        id: section.id, active: section.classList.contains('active-section'),
        loaded: framesOf(section.id).some(frame => !isBlank(frame)), protected: isProtected(section.id),
      }));
    },
  };
  const startApps = () => {
    if (!isTop || !document.querySelector('.app-section')) return;
    if (!document.getElementById('ludus-core-style')) {
      const style = document.createElement('style'); style.id = 'ludus-core-style';
      style.textContent = 'body.ludus-no-mixer #mixer-dock{display:none!important}'; (document.head || document.documentElement).appendChild(style);
    }
    startMonitors();
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', startApps, { once: true }) : startApps();

  window.LudusCore = Object.freeze({
    version: '2026.10.21',
    isTop, isDeveloper, swControlled, isHidden, runWhenIdle, tune, store, isZrok,
    resolver: Object.freeze({
      urls, all, servers, label, active, remember, order, toResolveUrl, baseOf, headersFor,
      probe, markDown, healthOf, pickFastest, ready, request,
    }),
    servers: Object.freeze({
      monitor, mountPicker,
      // The Scramjet/Wisp proxy servers: the same monitor and control, on a list that is completely separate from the resolvers.
      proxy: Object.freeze({
        monitor: proxyMonitor,
        mountPicker: (host, options = {}) => mountPicker(host, { ...options, monitor: proxyMonitor }),
        ready: proxyReady,
      }),
    }),
    memory: Object.freeze(memory),
    apps: Object.freeze(apps),
  });
})();