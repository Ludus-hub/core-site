/*
 * Ludus server directory — the one source of truth for every built-in
 * YouTube resolver and proxy transport server.  Do not repeat an address in
 * an app: use window.LudusServers.youtube / .proxy instead.
 */
(() => {
  'use strict';

  const YT_CUSTOM_KEY = 'ludus_custom_yt_servers';
  const PROXY_CUSTOM_KEY = 'ludus_custom_proxy_servers';
  const PROXY_ACTIVE_KEY = 'ludus_active_proxy_server';
  const LEGACY_YT_CUSTOM_KEY = 'ludus_music_custom_resolver';
  const LEGACY_PROXY_CONFIG_KEY = 'ludus_cfg';

  const builtInYoutube = [
    'https://louisiana-century-shareware-dad.trycloudflare.com/resolve',

  ];
  const builtInProxy = [
    
    
    'wss://admin.proxy.hydrovolter.com/scramjet/wisp/',
    'wss://wisp.mercurywork.shop/',
  ];

  const storage = {
    get(key, fallback = '') { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} },
    remove(key) { try { localStorage.removeItem(key); } catch {} },
  };
  const unique = list => [...new Set(list.filter(Boolean))];
  const localHost = host => /^(localhost|127(?:\.\d+){3}|\[?::1\]?|10(?:\.\d+){3}|192\.168(?:\.\d+){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2})$/i.test(host);
  const normalizeYoutube = value => {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHost(url.hostname))) return '';
      url.search = ''; url.hash = '';
      url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/resolve$/, '') + '/resolve';
      return url.href;
    } catch { return ''; }
  };
  const normalizeProxy = value => {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'wss:' && !(url.protocol === 'ws:' && localHost(url.hostname))) return '';
      url.search = ''; url.hash = '';
      url.pathname = url.pathname.replace(/\/+$/, '') + '/';
      return url.href;
    } catch { return ''; }
  };
  const parse = (value, normalize) => unique(String(value || '').split(/[\n,]/).map(normalize).filter(Boolean));
  const entries = (prefix, urls) => urls.map((url, index) => Object.freeze({ id: `${prefix}-${index + 1}`, label: `${prefix === 'yt' ? 'Server' : 'Proxy'} ${index + 1}`, url }));

  function migrate() {
    if (!storage.get(YT_CUSTOM_KEY) && storage.get(LEGACY_YT_CUSTOM_KEY)) storage.set(YT_CUSTOM_KEY, storage.get(LEGACY_YT_CUSTOM_KEY));
    if (!storage.get(PROXY_CUSTOM_KEY)) {
      try {
        const legacy = JSON.parse(storage.get(LEGACY_PROXY_CONFIG_KEY, '{}'));
        const saved = normalizeProxy(legacy?.wispUrl);
        if (saved && !builtInProxy.includes(saved)) storage.set(PROXY_CUSTOM_KEY, saved);
        if (saved) storage.set(PROXY_ACTIVE_KEY, saved);
      } catch {}
    }
  }
  migrate();

  const makeDirectory = ({ type, builtIn, key, normalize, activeKey = '' }) => {
    const custom = () => parse(storage.get(key), normalize);
    const urls = () => unique([...builtIn.map(normalize), ...custom()]);
    const all = () => entries(type, urls());
    const notify = () => {
      try { window.dispatchEvent(new CustomEvent('ludus:servers-changed', { detail: { type, servers: all() } })); } catch {}
    };
    const saveCustom = values => {
      const list = unique(values.map(normalize).filter(Boolean));
      if (list.length) storage.set(key, list.join(',')); else storage.remove(key);
      notify();
      return list;
    };
    return Object.freeze({
      builtIn: () => entries(type, builtIn.map(normalize)),
      all,
      urls,
      custom,
      normalize,
      add(raw) { return saveCustom([...custom(), ...parse(raw, normalize)]); },
      remove(url) { const normal = normalize(url); return saveCustom(custom().filter(item => item !== normal)); },
      replace(raw) { return saveCustom(parse(raw, normalize)); },
      active() {
        const list = urls();
        const selected = activeKey ? normalize(storage.get(activeKey)) : '';
        return list.includes(selected) ? all().find(item => item.url === selected) : all()[0] || null;
      },
      select(url) {
        const normal = normalize(url);
        if (!activeKey || !urls().includes(normal)) return this.active();
        storage.set(activeKey, normal); notify();
        return all().find(item => item.url === normal) || null;
      },
    });
  };

  const youtube = makeDirectory({ type: 'yt', builtIn: builtInYoutube, key: YT_CUSTOM_KEY, normalize: normalizeYoutube });
  const proxyBase = makeDirectory({ type: 'proxy', builtIn: builtInProxy, key: PROXY_CUSTOM_KEY, normalize: normalizeProxy, activeKey: PROXY_ACTIVE_KEY });

  // ── Proxy server health: the same idea as the YouTube resolvers ─────────────────────────────────────────────
  // Every proxy (Wisp) server is probed by opening a WebSocket and timing it. Results are cached for everyone (all apps and
  // frames read the same cache), servers that do not answer are marked unavailable for a while, and the FASTEST available
  // server is the one every app connects to. A server the person chose by hand is only skipped while it is known to be down.
  const HEALTH_KEY = 'ludus_proxy_health', PIN_KEY = 'ludus_proxy_pinned';
  const HEALTH_FRESH_MS = 60000, DOWN_FOR_MS = 120000, PROBE_TIMEOUT_MS = 4500;
  const readHealth = () => { try { return JSON.parse(storage.get(HEALTH_KEY, '{}')) || {}; } catch { return {}; } };
  const writeHealth = value => storage.set(HEALTH_KEY, JSON.stringify(value));
  const probeOnce = url => new Promise(resolve => {
    let done = false, socket, timer; const started = performance.now();
    const finish = ok => { if (done) return; done = true; clearTimeout(timer); try { socket?.close(); } catch {} resolve(ok ? { ok: true, ms: Math.max(1, Math.round(performance.now() - started)), at: Date.now() } : { ok: false, at: Date.now() }); };
    try { socket = new WebSocket(url); } catch { return finish(false); }
    timer = setTimeout(() => finish(false), PROBE_TIMEOUT_MS);
    socket.onopen = () => finish(true); socket.onerror = () => finish(false); socket.onclose = () => finish(false);
  });
  // One probe per server at a time (shared by refresh() and the monitor in ludus-core.js); every result goes to the shared cache.
  const probing = new Map();
  const probe = (rawUrl, { force = false, maxAge = HEALTH_FRESH_MS } = {}) => {
    const url = proxyBase.normalize(rawUrl); if (!url) return Promise.resolve({ ok: false, at: Date.now() });
    const hit = readHealth()[url];
    if (!force && hit && Date.now() - hit.at < maxAge) return Promise.resolve(hit);
    if (probing.has(url)) return probing.get(url);
    const promise = probeOnce(url).then(record => { const next = readHealth(); next[url] = record; writeHealth(next); return record; }).finally(() => probing.delete(url));
    probing.set(url, promise); return promise;
  };
  let refreshing = null;
  const refresh = (force = false) => {
    const urls = proxyBase.urls(); if (!urls.length) return Promise.resolve({});
    const health = readHealth();
    if (!force && urls.every(url => health[url] && Date.now() - health[url].at < HEALTH_FRESH_MS)) return Promise.resolve(health);
    if (refreshing) return refreshing;
    refreshing = Promise.all(urls.map(url => probe(url, { force }))).then(() => {
      try { window.dispatchEvent(new CustomEvent('ludus:servers-changed', { detail: { type: 'proxy', servers: status() } })); } catch {}
      return readHealth();
    }).finally(() => { refreshing = null; });
    return refreshing;
  };
  const isDown = (health, url) => { const record = health[url]; return Boolean(record && !record.ok && Date.now() - record.at < DOWN_FOR_MS); };
  const status = () => { const health = readHealth(); return proxyBase.all().map(item => ({ ...item, available: !isDown(health, item.url), ms: health[item.url]?.ok ? health[item.url].ms : null, checked: Boolean(health[item.url]) })); };
  // The server every app should use right now.
  const bestProxy = () => {
    const health = readHealth(), list = proxyBase.all(), pinned = proxyBase.normalize(storage.get(PIN_KEY));
    if (pinned && list.some(item => item.url === pinned) && !isDown(health, pinned)) return list.find(item => item.url === pinned);
    const up = list.filter(item => !isDown(health, item.url));
    const measured = up.filter(item => health[item.url]?.ok).sort((a, b) => health[a.url].ms - health[b.url].ms);
    return measured[0] || up[0] || list[0] || null;
  };
  const markFailed = url => { const normal = proxyBase.normalize(url); if (!normal) return; const health = readHealth(); health[normal] = { ok: false, at: Date.now() }; writeHealth(health); };
  let startedWith = '';
  const proxy = Object.freeze({
    ...proxyBase,
    active: bestProxy,
    select(url) { const normal = proxyBase.normalize(url); if (!proxyBase.urls().includes(normal)) return bestProxy(); storage.set(PIN_KEY, normal); storage.set(PROXY_ACTIVE_KEY, normal); return bestProxy(); },
    unpin() { storage.remove(PIN_KEY); },
    pinned: () => proxyBase.normalize(storage.get(PIN_KEY)) || '',
    refresh, status, markFailed, probe,
    // The server this page is actually connected to (set by the page once it has decided; defaults to the best one at load).
    connected: () => startedWith,
    markConnected(url) {
      const normal = proxyBase.normalize(url);
      if (normal && proxyBase.urls().includes(normal) && normal !== startedWith) {
        startedWith = normal;
        try { window.dispatchEvent(new CustomEvent('ludus:servers-changed', { detail: { type: 'proxy', servers: status() } })); } catch {}
      }
      return startedWith;
    },
    reportFailure() { markFailed(startedWith); showFailoverPill(); },
  });
  startedWith = (proxy.active() || {}).url || ''; // the server this page was started with
  const directory = Object.freeze({ youtube, proxy, keys: Object.freeze({ youtube: YT_CUSTOM_KEY, proxy: PROXY_CUSTOM_KEY, activeProxy: PROXY_ACTIVE_KEY }) });

  // ── "Load with another server" — only for pages that load the proxy (movies, chat, insta, drive, ...), never the Proxy app ─────
  // A small pill appears when the server this page started with stops answering. It never shows an address.
  const pageUsesProxy = () => Boolean(document.querySelector('script[src*="scramjet.all"]')) && !/^\/p(\/|$)/.test(location.pathname);
  const proxyInUse = () => {
    try { if (typeof window.conduitEnabled === 'function') return Boolean(window.conduitEnabled()); } catch {}
    const toggle = document.getElementById('conduitToggle'); return toggle ? toggle.classList.contains('active') : true;
  };
  function showFailoverPill() {
    if (document.getElementById('ludus-failover-pill') || !document.body) return;
    const pill = document.createElement('div'); pill.id = 'ludus-failover-pill'; pill.setAttribute('role', 'alert');
    pill.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 24px);padding:9px 10px 9px 14px;border-radius:999px;background:rgba(18,20,26,.94);border:1px solid rgba(255,255,255,.16);color:#fff;font:600 12.5px system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45)';
    const text = document.createElement('span'); text.textContent = 'The proxy server is not responding.';
    const button = document.createElement('button'); button.type = 'button';
    button.style.cssText = 'border:0;border-radius:999px;padding:7px 12px;background:linear-gradient(135deg,#00c9ff,#92fe9d);color:#06121a;font:800 12px system-ui,sans-serif;cursor:pointer;white-space:nowrap';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '\u00d7'; close.setAttribute('aria-label', 'Dismiss');
    close.style.cssText = 'border:0;background:transparent;color:rgba(255,255,255,.6);font:700 16px system-ui,sans-serif;cursor:pointer;padding:0 4px';
    const hasOther = () => status().some(item => item.url !== startedWith && item.available);
    const label = () => { button.textContent = hasOther() ? 'Load with another server' : 'Try again'; };
    label();
    button.onclick = async () => {
      button.disabled = true; button.textContent = 'Checking servers...';
      markFailed(startedWith); await refresh(true);
      const next = bestProxy();
      if (next && next.url !== startedWith) { location.reload(); return; } // the page restarts on the fastest server that answers
      const again = await probeOnce(startedWith);
      if (again.ok) { const health = readHealth(); health[startedWith] = again; writeHealth(health); location.reload(); return; }
      text.textContent = 'No proxy server is available right now.'; button.disabled = false; label(); button.textContent = 'Try again';
    };
    close.onclick = () => pill.remove();
    pill.append(text, button, close); document.body.appendChild(pill);
  }
  function watchProxy() {
    if (!pageUsesProxy()) return;
    const check = async () => {
      if (!proxyInUse() || document.hidden) return;
      const health = await refresh();
      if (startedWith && isDown(health, startedWith)) showFailoverPill();
      else document.getElementById('ludus-failover-pill')?.remove();
    };
    setTimeout(check, 3500); setInterval(check, 45000);
  }
  // Keep the shared health cache warm for every app (the page that hosts the apps does this once; others reuse it).
  const warmProxyHealth = () => { if (window.top === window && !(window.LudusNet && window.LudusNet.light)) setTimeout(() => refresh().catch(() => {}), 2500); };
  if (document.readyState === 'complete') { watchProxy(); warmProxyHealth(); }
  else window.addEventListener('load', () => { watchProxy(); warmProxyHealth(); }, { once: true });

  window.LudusServers = directory;
  // Compatibility aliases for the existing shared resolver client.
  window.LUDUS_RESOLVERS = Object.freeze(youtube.builtIn());
  window.LUDUS_RESOLVER_URLS = Object.freeze(youtube.builtIn().map(item => item.url));
  window.LUDUS_RESOLVER_URL = window.LUDUS_RESOLVER_URLS[0] || '';
  window.LUDUS_PROXY_SERVERS = Object.freeze(proxy.builtIn());
  window.ludusResolverInfo = url => youtube.all().find(item => item.url === normalizeYoutube(url)) || null;
  window.ludusProxyInfo = url => proxy.all().find(item => item.url === normalizeProxy(url)) || null;

  // ── Developer server map (moved here from resolver-servers.js) ──────────────────────────────
  const resolvers = youtube.builtIn();
  const normalize = (url) => String(url || '').replace(/\/+$/, '');

  // The inspector is developer-only and injected here so every active app gets
  // the identical, source-of-truth server identity map.
  // One developer rule and one "active server" rule for the whole site, both owned by ludus-core.js.
  const isDeveloper = () => Boolean(window.LudusCore && window.LudusCore.isDeveloper());
  const activeResolver = () => normalize(window.LudusCore ? window.LudusCore.resolver.active() : window.LUDUS_RESOLVER_URL);
  const updateInspector = (panel) => {
    const active = activeResolver();
    const rows = panel.querySelector('.ludus-resolver-inspector__rows');
    rows.replaceChildren(...resolvers.map((resolver) => {
      const row = document.createElement('div');
      row.className = 'ludus-resolver-inspector__row';
      const hostname = new URL(resolver.url).hostname;
      const current = normalize(resolver.url) === active;
      row.innerHTML = `<strong>${resolver.label}${current ? ' · Active' : ''}</strong><span>${hostname}</span><code></code>`;
      row.querySelector('code').textContent = resolver.url;
      return row;
    }));
  };
  const mountInspector = () => {
    // The root page owns this fixed panel. Resolver apps run inside iframes,
    // so mounting there as well produced stacked duplicate developer maps.
    if (window.top !== window || !isDeveloper() || document.getElementById('ludus-resolver-inspector')) return;
    const style = document.createElement('style');
    style.textContent = `#ludus-resolver-inspector{position:fixed;right:12px;bottom:12px;z-index:2147483647;max-width:min(430px,calc(100vw - 24px));padding:8px 10px;color:#dbeafe;background:#07111fef;border:1px solid #1e40af;border-radius:10px;font:12px/1.35 system-ui,sans-serif;box-shadow:0 8px 30px #0008}#ludus-resolver-inspector summary{cursor:pointer;color:#93c5fd;font-weight:700}.ludus-resolver-inspector__rows{display:grid;gap:7px;margin-top:9px}.ludus-resolver-inspector__row{display:grid;gap:1px;padding-top:6px;border-top:1px solid #1e3a5f}.ludus-resolver-inspector__row span{color:#bfdbfe}.ludus-resolver-inspector__row code{overflow-wrap:anywhere;color:#94a3b8;font:11px/1.25 ui-monospace,monospace}`;
    const panel = document.createElement('details');
    panel.id = 'ludus-resolver-inspector';
    panel.innerHTML = '<summary>Developer server map</summary><div class="ludus-resolver-inspector__rows"></div>';
    panel.addEventListener('toggle', () => updateInspector(panel));
    document.head.append(style);
    document.body.append(panel);
    updateInspector(panel);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountInspector, { once: true });
  else mountInspector();
})();