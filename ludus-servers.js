/*
 * Google-compatible Ludus resolver directory.
 *
 * This is the single source of truth for YouTube resolver addresses.  It is
 * intentionally limited to direct resolver traffic; proxy transport is not
 * part of the Google build.
 */
(() => {
  'use strict';

  const YOUTUBE_CUSTOM_KEY = 'ludus_custom_yt_servers';
  const LEGACY_CUSTOM_KEY = 'ludus_music_custom_resolver';
  const builtInYoutube = [
    'https://louisiana-century-shareware-dad.trycloudflare.com/resolve',
  ];
  const storage = {
    get: (key, fallback = '') => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch {} },
    remove: key => { try { localStorage.removeItem(key); } catch {} },
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
  const parse = value => unique(String(value || '').split(/[\n,]/).map(normalizeYoutube).filter(Boolean));
  const entries = urls => urls.map((url, index) => Object.freeze({ id: `yt-${index + 1}`, label: `Server ${index + 1}`, url }));

  if (!storage.get(YOUTUBE_CUSTOM_KEY) && storage.get(LEGACY_CUSTOM_KEY)) {
    storage.set(YOUTUBE_CUSTOM_KEY, storage.get(LEGACY_CUSTOM_KEY));
  }
  const custom = () => parse(storage.get(YOUTUBE_CUSTOM_KEY));
  const urls = () => unique([...builtInYoutube.map(normalizeYoutube), ...custom()]);
  const all = () => entries(urls());
  const notify = () => {
    try { window.dispatchEvent(new CustomEvent('ludus:servers-changed', { detail: { type: 'yt', servers: all() } })); } catch {}
  };
  const saveCustom = values => {
    const list = unique(values.map(normalizeYoutube).filter(Boolean));
    if (list.length) storage.set(YOUTUBE_CUSTOM_KEY, list.join(',')); else storage.remove(YOUTUBE_CUSTOM_KEY);
    notify();
    return list;
  };
  const youtube = Object.freeze({
    builtIn: () => entries(builtInYoutube.map(normalizeYoutube)),
    all, urls, custom, normalize: normalizeYoutube,
    add: raw => saveCustom([...custom(), ...parse(raw)]),
    remove: url => saveCustom(custom().filter(item => item !== normalizeYoutube(url))),
    replace: raw => saveCustom(parse(raw)),
    active: () => all()[0] || null,
    select: url => all().find(item => item.url === normalizeYoutube(url)) || youtube.active(),
  });

  // Kept as a harmless compatibility surface for shared code. Google never
  // supplies an active proxy endpoint.
  const proxy = Object.freeze({ all: () => [], urls: () => [], active: () => null, status: () => [], refresh: async () => ({}), probe: async () => ({ ok: false }), connected: () => '', markConnected: () => '', reportFailure: () => {} });
  window.LudusServers = Object.freeze({ youtube, proxy, keys: Object.freeze({ youtube: YOUTUBE_CUSTOM_KEY }) });
  window.LUDUS_RESOLVERS = Object.freeze(youtube.builtIn());
  window.LUDUS_RESOLVER_URLS = Object.freeze(youtube.builtIn().map(item => item.url));
  window.LUDUS_RESOLVER_URL = window.LUDUS_RESOLVER_URLS[0] || '';
  window.ludusResolverInfo = url => youtube.all().find(item => item.url === normalizeYoutube(url)) || null;
})();
