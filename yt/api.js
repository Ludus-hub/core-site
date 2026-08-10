'use strict';

// ─── Ludus YouTube · api.js ─────────────────────────────────────────────────
// Wraps the official YouTube Data API v3 for METADATA ONLY — title cards,
// search, trending, channel pages. Actual playback does NOT go through this
// layer: the player embeds a dedicated streaming server directly (see
// MAIN_SERVERS in app.js), the same way Ludus Stream (movie.html) hands
// playback off to third-party embeds instead of routing video bytes through
// its own API. Whatever happens below — every key exhausted, every backup
// down — playback is never affected.
//
// ── Three tiers, in order ────────────────────────────────────────────────
//   1. Google's YouTube Data API, rotating across API_KEYS below. Each key
//      gets used until IT reports quotaExceeded, then the next one takes
//      over. Once every key is spent for the day, tier 1 is done until the
//      quota clock rolls over — see "Daily reset" below.
//   2. A handful of public Invidious-style instances (FALLBACK_INSTANCES),
//      queried directly for the same data. Best-effort only: these are
//      community-run boxes that come and go, and some don't send
//      Access-Control-Allow-Origin on every endpoint, so any given call can
//      just fail — this tier tries each instance in turn and moves on.
//   3. Nothing left to try. The caller gets an error whose message points
//      the person at Watch History (pure localStorage, zero API calls) —
//      see _finalError() below.
//
// ── About the API keys ───────────────────────────────────────────────────
// These are *client-side* keys — anyone who opens dev tools or views page
// source can read them out of this file. That's the normal, documented way
// to call the YouTube Data API from a browser-only app (there's no server
// to keep a secret on), but it also means every visitor to this site shares
// the same small pool of keys, so two things are worth doing in Google
// Cloud Console under "APIs & Services → Credentials" for each one:
//   1. API restrictions  → limit it to "YouTube Data API v3" only.
//   2. Application restrictions → "Websites" → add the exact origin(s)
//      this app is served from, so a copied key stops working elsewhere.
// Quota: each key's free tier is 10,000 units/day, and — same caveat as
// before — that's shared across every visitor using it, not per-visitor.
// There's no backend here to keep a real cross-visitor counter, so the
// "used" figure tracked per key below is only this one browser's own
// running total; it stops THIS tab from single-handedly re-spending a key
// it already personally burned through, but it can't see (or prevent)
// other visitors doing the same to the same key at the same time. The real
// 403 quotaExceeded response from Google is what actually and reliably
// marks a key dead for the day — the local counter is just a way to avoid
// firing off a request that's almost certainly going to fail.
const API_KEYS = [
  'AIzaSyDOwb7RzCaEmGCE-326vbGqzPzmHcvyBpM',
  'AIzaSyC0dsrSGIoh-bwNDeLp_oWglY9ybYKzQk4',
  'AIzaSyDZaaEbJPunml3y543D-2hyGR7asqOzGqw',
  'AIzaSyA_whBQY6oCAdlrkFLHzCMsc5ut4HrhpQw',
  'AIzaSyBHCLpYR7Jw_Em7kRGrrR-5vaf08iDIWFY',
  'AIzaSyB0yKkuTOmOnIPxz2Q7xuEjVJmrI-Obli4',
];
const API_BASE   = 'https://www.googleapis.com/youtube/v3';
const TIMEOUT_MS = 8000;

// search.list is 100 units/call; everything else this app calls
// (videos.list, channels.list, commentThreads.list, playlistItems.list)
// is 1 unit/call.
const ENDPOINT_COST     = { search: 100 };
const DAILY_UNIT_BUDGET = 10000; // Google's real per-key daily ceiling

// ── Daily reset ("go back to the first key in the morning") ────────────
// Google resets Data API quota at midnight *Pacific* time, not UTC — so
// the local "day" boundary used to decide when to reset every key and
// rewind back to API_KEYS[0] is computed in America/Los_Angeles instead of
// the browser's own timezone or a plain UTC cutoff. That keeps "tomorrow"
// here lined up with when the keys actually refill, rather than drifting
// by up to several hours the way a UTC-day check would.
function _todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()); // en-CA formats as YYYY-MM-DD directly
}

const QUOTA_STORAGE_KEY = 'ludusyt_quota_v2';

const LudusAPI = (() => {

  /* ═══════════════════════════════════════════════════════════════════════
     NAVIGATION CANCELLATION — "close the other page"

     app.js calls cancelPending() at the start of every page render. That
     aborts whatever tier-1/tier-2 requests are still in flight from
     whichever page the person just left, so a stale search/trending/video
     call doesn't keep burning quota and bandwidth for a page nobody's
     looking at anymore, and its result can't land on top of the new page
     once it does resolve. Every fetch below races against this signal in
     addition to its own per-request timeout.
     ═══════════════════════════════════════════════════════════════════════ */
  let _genController = new AbortController();

  function cancelPending() {
    _genController.abort();
    _genController = new AbortController();
  }

  function _combineSignals(a, b) {
    if (typeof AbortSignal.any === 'function') return AbortSignal.any([a, b]);
    if (a.aborted || b.aborted) { const c = new AbortController(); c.abort(); return c.signal; }
    const merged = new AbortController();
    const onAbort = () => merged.abort();
    a.addEventListener('abort', onAbort, { once: true });
    b.addEventListener('abort', onAbort, { once: true });
    return merged.signal;
  }

  // ── quota bookkeeping ────────────────────────────────────────────────
  function _freshQuotaState() {
    return { day: _todayKey(), activeIndex: 0, keys: API_KEYS.map(() => ({ used: 0, exhausted: false })) };
  }

  function _loadQuotaState() {
    try {
      const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
      const parsed = raw && JSON.parse(raw);
      if (parsed && parsed.day === _todayKey() && Array.isArray(parsed.keys) && parsed.keys.length === API_KEYS.length) {
        return parsed;
      }
    } catch { /* corrupt/missing — fall through to a fresh state */ }
    // New day, first run ever, or the API_KEYS list changed size since the
    // last visit — either way, everyone starts back at key 0.
    return _freshQuotaState();
  }

  function _saveQuotaState() {
    try { localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(_quota)); } catch {}
  }

  let _quota = _loadQuotaState();

  function _advanceKey() {
    _quota.activeIndex = (_quota.activeIndex + 1) % API_KEYS.length;
    _saveQuotaState();
  }

  function _quotaExceededError() {
    const e = new Error('This key is out of quota for today.');
    e.quotaExceeded = true;
    return e;
  }

  function _allKeysExhaustedError() {
    const e = new Error(`All ${API_KEYS.length} API keys are out of quota for today.`);
    e.allKeysExhausted = true;
    return e;
  }

  // Recognizes Google's real "you're out of quota" response shape so a
  // genuine 403/429 gets treated as a reason to rotate to the next key,
  // rather than surfacing as a generic/confusing error.
  function _isQuotaError(status, data) {
    if (status !== 403 && status !== 429) return false;
    const reason = data?.error?.errors?.[0]?.reason || '';
    const msg    = data?.error?.message || '';
    return /quota/i.test(reason) || /quota/i.test(msg) || data?.error?.status === 'RESOURCE_EXHAUSTED';
  }

  function _setStatus(state) {
    const dot  = document.querySelector('.status-dot');
    const host = document.getElementById('instance-host');
    const cls  = state === 'ok' ? 'ok' : state === 'fallback' ? 'warn' : 'err';
    if (dot) dot.className = 'status-dot ' + cls;
    if (host) {
      host.textContent =
        state === 'ok'        ? 'YouTube Data API' :
        state === 'fallback'  ? 'backup servers (limited)' :
        state === 'exhausted' ? 'out of API tokens — try History' :
        'connection error';
    }
  }

  // ── tier 1: Google Data API, one key at a time ──────────────────────────
  async function _rawRequest(endpoint, params, apiKey, navSignal) {
    const qs  = new URLSearchParams({ ...params, key: apiKey }).toString();
    const url = `${API_BASE}/${endpoint}?${qs}`;
    const timeoutCtrl = new AbortController();
    const timer = setTimeout(() => timeoutCtrl.abort(), TIMEOUT_MS);
    try {
      const res  = await fetch(url, { signal: _combineSignals(timeoutCtrl.signal, navSignal) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (_isQuotaError(res.status, data)) throw _quotaExceededError();
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }
      return data;
    } catch (e) {
      if (e.quotaExceeded) throw e;
      if (e.name === 'AbortError') {
        if (navSignal.aborted) {
          const ne = new Error('Navigated away before this request finished.');
          ne.navCancelled = true;
          throw ne;
        }
        throw new Error(`timed out after ${TIMEOUT_MS}ms`);
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  // Tries the active key; on a real quota error it marks that key
  // exhausted, advances to the next one, and immediately retries the same
  // call — up to once per key — before finally giving up. A non-quota
  // error (bad request, timeout, 5xx) is NOT a reason to rotate keys, since
  // switching keys won't fix a malformed request or a network hiccup; it's
  // thrown straight up instead.
  async function _get(endpoint, params = {}) {
    _quota = _loadQuotaState(); // pick up the day rolling over, or spend from another tab
    const cost = ENDPOINT_COST[endpoint] || 1;
    const navSignal = _genController.signal;

    for (let tries = 0; tries < API_KEYS.length; tries++) {
      const idx = _quota.activeIndex;
      const keyState = _quota.keys[idx];

      if (keyState.exhausted || keyState.used + cost > DAILY_UNIT_BUDGET) {
        keyState.exhausted = true;
        _advanceKey();
        continue;
      }

      try {
        const data = await _rawRequest(endpoint, params, API_KEYS[idx], navSignal);
        keyState.used += cost;
        _saveQuotaState();
        _setStatus('ok');
        return data;
      } catch (e) {
        if (e.navCancelled) throw e; // page was abandoned — stop, don't rotate or fall back
        if (e.quotaExceeded) {
          keyState.exhausted = true;
          _saveQuotaState();
          _advanceKey();
          continue;
        }
        _setStatus('err');
        throw e;
      }
    }

    // Every key was exhausted (or hit its local cap) without a single
    // successful call.
    _setStatus('exhausted');
    throw _allKeysExhaustedError();
  }

  // ── tier 2: public Invidious-style instances (metadata only), last resort ─
  // Same community instances Ludus Stream's player embeds pull from for
  // playback (see MAIN_SERVERS in app.js) — they mirror YouTube's metadata
  // independently of Google's API, so search/trending/video info can keep
  // working with zero Data API quota left. Their normalized shape
  // (videoId, videoThumbnails, authorId, lengthSeconds, ...) is what
  // _normalizeVideo() below already converts Google's responses into, so
  // most of these pass straight through with little or no reshaping.
  // Not guaranteed: instances rotate, go down, or don't send CORS headers
  // on any given day. Every call here is wrapped and moves on to the next
  // instance rather than surfacing a raw network error.
  const FALLBACK_INSTANCES = [
    'https://invidious.f5.si',
    'https://inv.nadeko.net',
    'https://invidious.tiekoetter.com',
    'https://inv.zoomerville.com',
  ];

  async function _fallbackGet(path, params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') clean[k] = v; });
    const qs = new URLSearchParams(clean).toString();
    const navSignal = _genController.signal;

    for (const base of FALLBACK_INSTANCES) {
      const timeoutCtrl = new AbortController();
      const timer = setTimeout(() => timeoutCtrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${base}/api/v1/${path}${qs ? '?' + qs : ''}`, {
          signal: _combineSignals(timeoutCtrl.signal, navSignal),
        });
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = await res.json().catch(() => null);
        if (data && !data.error) return data;
      } catch {
        clearTimeout(timer);
        if (navSignal.aborted) { const ne = new Error('cancelled'); ne.navCancelled = true; throw ne; }
        // CORS block, timeout, DNS failure, instance down, etc — try the next one
      }
    }
    return null; // every instance failed
  }

  // ── tier 3: nothing worked ────────────────────────────────────────────
  function _finalError(primaryErr) {
    const cause = primaryErr?.allKeysExhausted
      ? 'every API key has hit its daily limit'
      : `the YouTube Data API request failed (${primaryErr?.message || 'unknown error'})`;
    const e = new Error(
      `Search, trending, and video info are unavailable right now — ${cause}, and the backup servers ` +
      "didn't respond either. Your Watch History still works without any API — open it from the sidebar " +
      "to rewatch anything you've already seen, and playback isn't affected by any of this either way."
    );
    e.allExhausted = true;
    return e;
  }

  // Runs the primary (tier-1) call; on failure, tries the tier-2 fallback;
  // if that also comes up empty, throws the tier-3 "check your History"
  // error. A navigation-cancel short-circuits straight through every
  // stage — the page is gone, so there's no point spending backup-server
  // requests on it either.
  async function _withFallback(primary, fallback) {
    try {
      return await primary();
    } catch (primaryErr) {
      if (primaryErr.navCancelled) throw primaryErr;
      let fb = null;
      try { fb = await fallback(); }
      catch (fbErr) { if (fbErr?.navCancelled) throw fbErr; }
      if (fb != null) { _setStatus('fallback'); return fb; }
      _setStatus(primaryErr.allKeysExhausted ? 'exhausted' : 'err');
      throw _finalError(primaryErr);
    }
  }

  // ── format helpers ─────────────────────────────────────────────────────
  function _isoDurationToSeconds(iso) {
    if (!iso) return 0;
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
    if (!m) return 0;
    const [, h, mi, s] = m;
    return (Number(h) || 0) * 3600 + (Number(mi) || 0) * 60 + (Number(s) || 0);
  }

  function _thumbs(thumbnails) {
    // YouTube gives named buckets (default/medium/high/standard/maxres);
    // the rest of this app just wants a flat array of {url,width,height}.
    if (!thumbnails) return [];
    return Object.values(thumbnails)
      .filter(Boolean)
      .map(t => ({ url: t.url, width: t.width, height: t.height }));
  }

  function _fmtPublished(iso) {
    if (!iso) return '';
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const day  = 86400000;
    if (diff < day) return 'today';
    const days = Math.floor(diff / day);
    if (days < 31)  return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
    return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? '' : 's'} ago`;
  }

  function _fmtCompact(n) {
    n = Number(n);
    if (!n) return '';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  // Normalizes a videos.list / search.list item into the video-card shape
  // the rest of the app expects (title, videoThumbnails, author, ...) —
  // the same shape tier-2's Invidious-style responses already use natively.
  function _normalizeVideo(item) {
    const id = typeof item.id === 'string' ? item.id : item.id?.videoId;
    const sn = item.snippet || {};
    const cd = item.contentDetails || {};
    const st = item.statistics || {};
    return {
      videoId: id,
      title: sn.title,
      description: sn.description,
      videoThumbnails: _thumbs(sn.thumbnails),
      author: sn.channelTitle,
      authorId: sn.channelId,
      authorThumbnails: [],
      lengthSeconds: _isoDurationToSeconds(cd.duration),
      liveNow: sn.liveBroadcastContent === 'live',
      viewCount: st.viewCount !== undefined ? Number(st.viewCount) : undefined,
      likeCount: st.likeCount !== undefined ? Number(st.likeCount) : undefined,
      publishedText: _fmtPublished(sn.publishedAt),
    };
  }

  // search.list / playlistItems.list don't return duration or view counts —
  // one batched videos.list call (1 unit, up to 50 ids) fills those in so
  // cards can still show a duration badge and view count.
  async function _hydrate(items) {
    const ids = items.map(i => (typeof i.id === 'string' ? i.id : i.id?.videoId)).filter(Boolean);
    if (!ids.length) return [];
    let byId = {};
    try {
      const data = await _get('videos', { part: 'contentDetails,statistics', id: ids.join(',') });
      (data.items || []).forEach(v => { byId[v.id] = v; });
    } catch { /* best-effort — cards just render without duration/views */ }
    return items.map(item => {
      const vid = typeof item.id === 'string' ? item.id : item.id?.videoId;
      return _normalizeVideo({
        ...item,
        contentDetails: byId[vid]?.contentDetails,
        statistics: byId[vid]?.statistics,
      });
    });
  }

  const CATEGORY_IDS = { gaming: '20' }; // only 'default' and 'gaming' are ever requested by app.js

  // "Load more" in app.js calls search(q, {page: N}) with N incrementing by
  // exactly one, in order, for the same query — never skipping or going
  // backwards. That lets a plain nextPageToken cache stand in for Data API
  // v3's token-based paging without app.js needing to know about tokens.
  const _searchPages = new Map(); // `${q}::${sort}` -> { page, nextPageToken }

  async function _search(q, { sort_by, page = 1, channelId } = {}) {
    const params = {
      part: 'snippet',
      type: 'video',
      maxResults: 25,
      order: sort_by === 'upload_date' ? 'date' : 'relevance',
    };
    if (q) params.q = q;
    if (channelId) { params.channelId = channelId; params.order = 'date'; }

    const key = `${channelId || ''}::${q}::${sort_by || ''}`;
    if (page > 1) {
      const prev = _searchPages.get(key);
      if (prev?.nextPageToken) params.pageToken = prev.nextPageToken;
    }

    const data = await _get('search', params);
    _searchPages.set(key, { page, nextPageToken: data.nextPageToken });
    return _hydrate(data.items || []);
  }

  // Caches the tags/title a video() lookup already paid 1 unit for (or,
  // when tier-2 handled the video() call, the full recommendedVideos list
  // it hands back for free) so a later, separate recommendations() call
  // for the same video — from the "Load recommendations" button — doesn't
  // have to re-spend that lookup. Session-only; not persisted.
  const _seedCache = new Map(); // videoId -> { title, tags } | { title, videos }

  return {
    cancelPending,

    // No "instance" concept with a fixed key list — kept as no-ops so the
    // settings UI / status badge don't need to special-case the data source.
    getInstance: () => 'YouTube Data API',
    setInstance: () => {},
    refreshInstances: async () => [],
    get instances() { return []; },

    // ── Data endpoints ──────────────────────────────────────────────────
    trending: (type = 'default', region = 'US') => _withFallback(
      async () => {
        const params = { part: 'snippet,contentDetails,statistics', chart: 'mostPopular', regionCode: region, maxResults: 50 };
        if (CATEGORY_IDS[type]) params.videoCategoryId = CATEGORY_IDS[type];
        const data = await _get('videos', params);
        return (data.items || []).map(_normalizeVideo);
      },
      async () => {
        const data = await _fallbackGet('trending', { region, type: CATEGORY_IDS[type] ? 'gaming' : undefined });
        return Array.isArray(data) ? data.filter(d => !d.type || d.type === 'video') : null;
      }
    ),

    popular: () => _withFallback(
      async () => {
        const data = await _get('videos', { part: 'snippet,contentDetails,statistics', chart: 'mostPopular', regionCode: 'US', maxResults: 50 });
        return (data.items || []).map(_normalizeVideo);
      },
      async () => {
        const data = await _fallbackGet('trending', { region: 'US' });
        return Array.isArray(data) ? data.filter(d => !d.type || d.type === 'video') : null;
      }
    ),

    search: (q, params = {}) => _withFallback(
      () => _search(q, params),
      async () => {
        const data = await _fallbackGet('search', { q, sort_by: params.sort_by, page: params.page || 1, type: 'video' });
        return Array.isArray(data) ? data.filter(d => d.type === 'video') : null;
      }
    ),

    // Data API v3 has no official autocomplete/suggest endpoint — this
    // degrades gracefully (empty list) instead of throwing. No quota cost,
    // so no fallback tier needed.
    suggestions: async () => ({ suggestions: [] }),

    // Base video info only — title, description, stats, channel row.
    // Does NOT fetch recommended videos; call recommendations(id)
    // separately (the watch page gates that behind its own button, since
    // it's the single most expensive call in the app — see app.js).
    video: (id) => _withFallback(
      async () => {
        const data = await _get('videos', { part: 'snippet,contentDetails,statistics', id });
        const v = data.items?.[0];
        if (!v) throw new Error('Video not found');
        const norm = _normalizeVideo(v);
        _seedCache.set(id, { title: norm.title, tags: v.snippet?.tags || [] });

        let authorThumbnails = [];
        let subCountText;
        try {
          const ch = await _get('channels', { part: 'snippet,statistics', id: v.snippet.channelId });
          const chItem = ch.items?.[0];
          authorThumbnails = _thumbs(chItem?.snippet?.thumbnails);
          if (chItem?.statistics && !chItem.statistics.hiddenSubscriberCount) {
            subCountText = _fmtCompact(chItem.statistics.subscriberCount) + ' subscribers';
          }
        } catch { /* best-effort */ }

        return { ...norm, authorThumbnails, subCountText };
      },
      async () => {
        const data = await _fallbackGet(`videos/${id}`);
        if (!data || !data.videoId) return null;
        if (data.recommendedVideos?.length) _seedCache.set(id, { title: data.title, videos: data.recommendedVideos });
        return {
          videoId: data.videoId, title: data.title, description: data.description,
          videoThumbnails: data.videoThumbnails || [], author: data.author, authorId: data.authorId,
          authorThumbnails: data.authorThumbnails || [], lengthSeconds: data.lengthSeconds,
          liveNow: !!data.liveNow, viewCount: data.viewCount, likeCount: data.likeCount,
          publishedText: data.publishedText,
          subCountText: typeof data.subCountText === 'string' ? data.subCountText
            : (typeof data.subCount === 'number' ? _fmtCompact(data.subCount) + ' subscribers' : undefined),
        };
      }
    ),

    // "Related videos": approximated with a relevance search seeded by the
    // video's own tags/title, since Data API v3 dropped the official
    // related-video param in 2023. Costs a full search.list call (100
    // units) on tier 1 — pass {seedTitle, seedTags} if a caller already has
    // them (e.g. from a prior video() call this session) to skip the extra
    // 1-unit videos.list lookup otherwise needed to fetch them.
    recommendations: (id, opts = {}) => _withFallback(
      async () => {
        const cached = _seedCache.get(id);
        if (cached?.videos?.length) return { title: cached.title, videos: cached.videos };

        let title = opts.seedTitle || cached?.title;
        let tags  = opts.seedTags  || cached?.tags;
        if (!title && !tags) {
          const data = await _get('videos', { part: 'snippet', id });
          const v = data.items?.[0];
          if (!v) throw new Error('Video not found');
          title = v.snippet?.title;
          tags  = v.snippet?.tags;
          _seedCache.set(id, { title, tags });
        }

        const seed = (tags?.slice(0, 3).join(' ') || title || '').slice(0, 100);
        if (!seed) return { title, videos: [] };
        const rel = await _get('search', { part: 'snippet', type: 'video', q: seed, maxResults: 20 });
        const videos = await _hydrate((rel.items || []).filter(i => i.id?.videoId !== id));
        return { title, videos };
      },
      async () => {
        const cached = _seedCache.get(id);
        if (cached?.videos?.length) return { title: cached.title, videos: cached.videos };
        const data = await _fallbackGet(`videos/${id}`);
        if (!data) return null;
        return { title: data.title, videos: data.recommendedVideos || [] };
      }
    ),

    comments: (id, sort = 'top') => _withFallback(
      async () => {
        const data = await _get('commentThreads', {
          part: 'snippet', videoId: id, maxResults: 50,
          order: sort === 'new' ? 'time' : 'relevance',
        });
        return {
          comments: (data.items || []).map(c => {
            const s = c.snippet.topLevelComment.snippet;
            return {
              author: s.authorDisplayName,
              authorThumbnails: s.authorProfileImageUrl ? [{ url: s.authorProfileImageUrl }] : [],
              content: s.textDisplay,
              publishedText: _fmtPublished(s.publishedAt),
              likeCount: s.likeCount,
            };
          }),
        };
      },
      async () => {
        const data = await _fallbackGet(`comments/${id}`, { sort_by: sort });
        if (!data?.comments) return null;
        return {
          comments: data.comments.map(c => ({
            author: c.author,
            authorThumbnails: c.authorThumbnails || [],
            content: c.content || c.contentHtml || '',
            publishedText: c.publishedText || '',
            likeCount: c.likeCount,
          })),
        };
      }
    ),

    channel: (id) => _withFallback(
      async () => {
        const data = await _get('channels', { part: 'snippet,statistics', id });
        const c = data.items?.[0];
        if (!c) throw new Error('Channel not found');
        return {
          author: c.snippet?.title,
          authorId: c.id,
          authorThumbnails: _thumbs(c.snippet?.thumbnails),
          subCountText: c.statistics && !c.statistics.hiddenSubscriberCount
            ? _fmtCompact(c.statistics.subscriberCount) : '',
          description: c.snippet?.description,
        };
      },
      async () => {
        const data = await _fallbackGet(`channels/${id}`);
        if (!data) return null;
        return {
          author: data.author, authorId: data.authorId || id,
          authorThumbnails: data.authorThumbnails || [],
          subCountText: typeof data.subCount === 'number' ? _fmtCompact(data.subCount) : (data.subCountText || ''),
          description: data.description || data.descriptionHtml || '',
        };
      }
    ),

    channelVideos: (id, page = 1) => _withFallback(
      async () => ({ videos: await _search(null, { page, channelId: id }) }),
      async () => {
        const data = await _fallbackGet(`channels/${id}/videos`, { page });
        return data?.videos ? { videos: data.videos } : null;
      }
    ),

    playlist: (id) => _withFallback(
      async () => {
        const data = await _get('playlistItems', { part: 'snippet,contentDetails', playlistId: id, maxResults: 50 });
        const items = (data.items || [])
          .filter(it => it.contentDetails?.videoId)
          .map(it => ({ id: { videoId: it.contentDetails.videoId }, snippet: it.snippet }));
        return { videos: await _hydrate(items) };
      },
      async () => {
        const data = await _fallbackGet(`playlists/${id}`);
        return data?.videos ? { videos: data.videos } : null;
      }
    ),
  };
})();
