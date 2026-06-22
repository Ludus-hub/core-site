'use strict';

// ─── Ludus YouTube · api.js ─────────────────────────────────────────────────
// Wraps the Invidious public API for METADATA ONLY — title cards, search,
// trending, channel pages, comments. Actual playback does NOT go through
// this layer: the player embeds a dedicated streaming server directly
// (see the MAIN_SERVERS / EXTRA_SERVERS lists in app.js), the same way
// Ludus Stream (movie.html) hands playback off to third-party embeds
// instead of routing video bytes through its own API.
// ─────────────────────────────────────────────────────────────────────────────

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.privacydev.net',
  'https://iv.melmac.space',
  'https://invidious.perennialte.ch',
  'https://invidious.incogniweb.net',
  'https://invidious.lunar.icu',
];

const LudusAPI = (() => {
  const TIMEOUT_MS = 10000;
  let _instance = localStorage.getItem('ludusyt_instance') || INVIDIOUS_INSTANCES[0];

  function getInstance() { return _instance; }

  function setInstance(url) {
    _instance = url;
    localStorage.setItem('ludusyt_instance', url);
    _updateStatusUI();
  }

  function _updateStatusUI() {
    const host = document.getElementById('instance-host');
    if (host) {
      try { host.textContent = new URL(_instance).hostname; } catch {}
    }
  }

  async function _request(path, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `${_instance}/api/v1/${path}${qs ? '?' + qs : ''}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function _call(path, params = {}) {
    // Try current instance first; on failure, cycle through all others
    const ordered = [_instance, ...INVIDIOUS_INSTANCES.filter(i => i !== _instance)];
    let lastErr;
    for (const inst of ordered) {
      _instance = inst;
      try {
        const result = await _request(path, params);
        // Persist working instance
        localStorage.setItem('ludusyt_instance', _instance);
        _updateStatusUI();
        const dot = document.querySelector('.status-dot');
        if (dot) { dot.className = 'status-dot ok'; }
        return result;
      } catch (e) {
        lastErr = e;
        console.warn(`[Ludus YouTube] ${inst} failed: ${e.message}`);
      }
    }
    const dot = document.querySelector('.status-dot');
    if (dot) { dot.className = 'status-dot err'; }
    throw new Error(`All Invidious instances unreachable. Last error: ${lastErr?.message || 'unknown'}`);
  }

  return {
    getInstance,
    setInstance,
    instances: INVIDIOUS_INSTANCES,

    // ── Data endpoints ───────────────────────────────────────────────────────
    // Some public instances cache/ignore `type` and return identical
    // results for every tab (iv-org/invidious#2982) — a changing query
    // string defeats most naive caching layers in front of them.
    trending : (type = 'default', region = 'US') =>
                 _call('trending', { type, region, _: Date.now() }),

    popular  : () => _call('popular'),

    search   : (q, params = {}) =>
                 _call('search', { q, type: 'video', ...params }),

    suggestions: (q) => _call('search/suggestions', { q }),

    // local=true rewrites stream URLs to proxy through Invidious server
    video    : (id, local = true) =>
                 _call(`videos/${id}`, local ? { local: 'true' } : {}),

    comments : (id, sort = 'top') =>
                 _call(`comments/${id}`, { sort_by: sort }),

    channel  : (id) => _call(`channels/${id}`),

    channelVideos: (id, page = 1) =>
                 _call(`channels/${id}/videos`, { page }),

    playlist : (id, page = 1) => _call(`playlists/${id}`, { page }),
  };
})();
