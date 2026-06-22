// ─── Ludus YouTube · _worker.js ──────────────────────────────────────────────────────
// Cloudflare Worker that proxies /api/v1/* to a working Invidious instance.
//
// WHY: Public Invidious instances don't send CORS headers for arbitrary
// browser origins, so the browser blocks fetches from our workers.dev domain.
// By routing requests through this worker (server-side), CORS is irrelevant —
// the worker fetches from Invidious and re-serves the response with the
// correct Access-Control-Allow-Origin header added.
//
// NOTE: yt/api.js currently calls Invidious instances directly
// (cross-origin) rather than through this worker's own /api/v1/ route, since
// the public instances it's configured with already send permissive CORS
// headers. This file is kept as a ready-to-use fallback/CORS-proxy, not
// because anything currently depends on it.
//
// TWO WAYS TO DEPLOY THIS PROJECT:
//
//   A) As its own standalone Cloudflare Worker, owning a whole domain:
//        1. Keep this file (and wrangler.toml) at the true project root.
//        2. wrangler.toml already has: main = "_worker.js", [assets] directory = "./"
//        3. wrangler deploy
//      `index.html` and `yt/` sit alongside this file; ASSETS serves them.
//
//   B) As a SUBFOLDER inside a bigger site (e.g. yoursite.com/youtube/):
//        Just drop `index.html` and `yt/` into that subfolder of
//        whatever's already serving the rest of the site. Don't bring this
//        file or wrangler.toml along — they're only meaningful if this app
//        owns its own Worker/domain. Every reference in index.html into
//        yt/ is a relative path, so it works unchanged at any subpath.
//        The one exception is the Scramjet `<script src="/p/scram/...">`
//        tag, which is intentionally root-absolute — it expects that shared
//        infra to already exist at the true site root.
// ─────────────────────────────────────────────────────────────────────────────

const INSTANCES = [
  'https://inv.nadeko.net',
  'https://iv.melmac.space',
  'https://invidious.nerdvpn.de',
  'https://invidious.perennialte.ch',
  'https://invidious.lunar.icu',
  'https://yewtu.be',
  'https://iv.ggtyler.dev',
  'https://invidious.privacyredirect.com',
];

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Preferred-Instance',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Proxy all Invidious API calls through this worker
    if (url.pathname.startsWith('/api/v1/')) {
      return proxyInvidious(request, url);
    }

    // All other requests → serve the static site assets
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};

async function proxyInvidious(request, url) {
  // Honour the client's preferred instance (used for manual switching in UI)
  const preferred = request.headers.get('X-Preferred-Instance');
  const ordered   = preferred
    ? [preferred, ...INSTANCES.filter(i => i !== preferred)]
    : INSTANCES;

  const pathAndQuery = url.pathname + url.search;

  for (const instance of ordered) {
    try {
      const upstream = await fetch(`${instance}${pathAndQuery}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LudusYouTube/1.0)',
          'Accept':     'application/json',
        },
        signal: AbortSignal.timeout(9000),
      });

      // Skip non-OK or non-JSON responses and try the next instance
      if (!upstream.ok) continue;
      const ct = upstream.headers.get('Content-Type') || '';
      if (!ct.includes('json') && !ct.includes('javascript')) continue;

      const body = await upstream.text();

      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type':   'application/json; charset=utf-8',
          'Cache-Control':  'public, max-age=60, stale-while-revalidate=30',
          'X-LudusYT-Instance': instance,
          ...CORS,
        },
      });
    } catch {
      // Network error or timeout — try next instance
      continue;
    }
  }

  return new Response(
    JSON.stringify({ error: 'All Invidious instances unreachable' }),
    {
      status:  503,
      headers: { 'Content-Type': 'application/json', ...CORS },
    }
  );
}
