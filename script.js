'use strict';

// ─── Ludus YouTube · app.js ─────────────────────────────────────────────────────────
// Hash-based router + all views: Home, Search, Watch, Channel
// ─────────────────────────────────────────────────────────────────────────────


/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */

function fmtDuration(secs) {
  if (!secs && secs !== 0) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

function fmtViews(n) {
  if (!n) return '';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B views';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M views';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K views';
  return n.toLocaleString() + ' views';
}

function fmtLikes(n) {
  if (!n) return '';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

function escHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function thumb(arr, minW = 300) {
  if (!arr?.length) return '';
  const sorted = [...arr].sort((a, b) => (b.width || 0) - (a.width || 0));
  const hit = sorted.find(t => (t.width || 0) >= minW) || sorted[0];
  return hit?.url || '';
}

function smallThumb(arr) {
  if (!arr?.length) return '';
  const m = arr.find(t => t.quality === 'medium' || (t.width >= 180 && t.width <= 380));
  return m ? m.url : arr[arr.length - 1]?.url || '';
}


/* ═══════════════════════════════════════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════════════════════════════════════ */

const _routes = {};

function route(path, handler) { _routes[path] = handler; }

function navigate(dest) {
  // dest can be '#/foo' or '/foo' — normalize, then dispatch directly (no URL change)
  const normalized = dest.startsWith('#') ? dest.slice(1) : dest;
  const sep    = normalized.indexOf('?');
  const path   = sep === -1 ? normalized : normalized.slice(0, sep);
  const qs     = sep === -1 ? '' : normalized.slice(sep + 1);
  dispatch(path, Object.fromEntries(new URLSearchParams(qs)));
}

function dispatch(path, params) {
  if (!path) path = '/';
  params = params || {};

  // Highlight active sidebar item — reads data-path attribute set in yt.html
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(a => {
    const aPath = a.dataset.path || '';
    a.classList.toggle('active', aPath === path || (path === '/' && aPath === '/'));
  });

  // Close mobile sidebar on every navigation
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
  }

  const handler = _routes[path] || _routes['*'];
  if (handler) handler(params);
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDER GENERATIONS — "close the other page" when a new one opens

   Every render function that makes an API call starts with
   `const myGen = beginRender();`, which bumps a shared counter AND tells
   api.js to abort whatever it was still fetching for the previous page.
   After each await, `if (isStale(myGen)) return;` skips touching the DOM
   if some other render call (a real navigation, a tab switch, a settings
   change) has started in the meantime — otherwise a slow response for a
   page the user already left could still paint over whatever they
   navigated to. Doesn't need any changes at call sites elsewhere (retry
   buttons, tab clicks, hashchange) — they just call the render function
   like normal, and it stamps its own generation.
   ═══════════════════════════════════════════════════════════════════════════ */

let _navGen = 0;
function beginRender() {
  LudusAPI.cancelPending();
  return ++_navGen;
}
function isStale(gen) { return gen !== _navGen; }


/* ═══════════════════════════════════════════════════════════════════════════
   DOM HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const $content = () => document.getElementById('content');
function setHTML(html) { $content().innerHTML = html; }

function skeletonGrid(n = 12) {
  return `<div class="video-grid">${Array(n).fill(0).map(() => `
    <div>
      <div class="skel" style="padding-top:56.25%;border-radius:10px;margin-bottom:10px"></div>
      <div class="skel" style="height:14px;margin-bottom:7px;width:88%"></div>
      <div class="skel" style="height:12px;width:58%"></div>
    </div>`).join('')}</div>`;
}

function skeletonRecs(n = 7) {
  return Array(n).fill(0).map(() => `
    <div style="display:flex;gap:10px;margin-bottom:12px">
      <div class="skel" style="width:126px;aspect-ratio:16/9;border-radius:6px;flex-shrink:0"></div>
      <div style="flex:1">
        <div class="skel" style="height:13px;margin-bottom:7px;width:90%"></div>
        <div class="skel" style="height:11px;width:60%"></div>
      </div>
    </div>`).join('');
}

let _retryFns = {};
function errState(msg, retryFn) {
  const id = 'r' + Date.now();
  if (retryFn) _retryFns[id] = retryFn;
  return `
    <div class="err-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div class="err-title">Something went wrong</div>
      <div class="err-msg">${escHTML(msg)}</div>
      ${retryFn ? `<button class="retry-btn" onclick="_retryFns['${id}']&&_retryFns['${id}']()">Try again</button>` : ''}
    </div>`;
}


/* ═══════════════════════════════════════════════════════════════════════════
   VIDEO CARD COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

function videoCard(v) {
  const th   = smallThumb(v.videoThumbnails);
  const dur  = v.liveNow
    ? `<span class="v-live">LIVE</span>`
    : v.lengthSeconds
      ? `<span class="v-dur">${fmtDuration(v.lengthSeconds)}</span>`
      : '';
  const views = v.viewCount ? fmtViews(v.viewCount) : (v.viewCountText || '');

  return `
    <div class="v-card" onclick="navigate('#/watch?v=${escHTML(v.videoId)}')">
      <div class="v-thumb">
        ${th ? `<img src="${escHTML(th)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : ''}
        ${dur}
      </div>
      <div class="v-info">
        <div class="v-title">${escHTML(v.title) || 'Untitled'}</div>
        <div class="v-meta">
          ${v.authorId
            ? `<a class="v-chan"
                 href="javascript:void(0)"
                 onclick="event.stopPropagation(); navigate('/channel?id=${escHTML(v.authorId)}')"
               >${escHTML(v.author)}</a>`
            : escHTML(v.author) || ''
          }
          ${views             ? ` · ${escHTML(views)}`           : ''}
          ${v.publishedText ? ` · ${escHTML(v.publishedText)}` : ''}
        </div>
      </div>
    </div>`;
}

function recCard(v) {
  const th = smallThumb(v.videoThumbnails);
  return `
    <div class="rec-card" onclick="navigate('#/watch?v=${escHTML(v.videoId)}')">
      <div class="rec-thumb-wrap">
        ${th ? `<img src="${escHTML(th)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : ''}
        ${v.lengthSeconds ? `<span class="rec-dur">${fmtDuration(v.lengthSeconds)}</span>` : ''}
      </div>
      <div class="rec-info">
        <div class="rec-title">${escHTML(v.title) || 'Untitled'}</div>
        <div class="rec-meta">
          ${escHTML(v.author) || ''}
          ${v.publishedText ? ` · ${escHTML(v.publishedText)}` : ''}
          ${v.viewCount     ? ` · ${fmtViews(v.viewCount)}`   : ''}
        </div>
      </div>
    </div>`;
}

function renderGrid(id, videos) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!videos?.length) {
    el.innerHTML = '<div class="empty-state">No videos found</div>';
    return;
  }
  el.innerHTML = videos.map(videoCard).join('');
}


/* ═══════════════════════════════════════════════════════════════════════════
   HOME VIEW  (personalized — recommendations + trending fallback)
   ═══════════════════════════════════════════════════════════════════════════ */

route('/', renderHome);

async function renderHome() {
  const myGen = beginRender();
  setHTML(`<div id="home-sections">${skeletonGrid(8)}</div>`);

  try {
    // Trending only, automatically — primary content either way. The
    // history-based "Because you watched" row below costs a full
    // search.list call per seed video (100 quota units apiece) inside
    // LudusAPI.recommendations(), so it's opt-in via a button instead of
    // firing automatically on every Home visit.
    const region = localStorage.getItem('ludusyt_region') || 'US';
    const trending = await LudusAPI.trending('default', region);
    if (isStale(myGen)) return;

    if (!trending.length) {
      setHTML(errState('Nothing to show right now', renderHome));
      return;
    }

    const history = getHistory();
    setHTML(`
      <div id="home-recs-slot"></div>
      <section class="home-section">
        <h2 class="row-title">Trending</h2>
        <div class="video-grid">${trending.slice(0, 12).map(videoCard).join('')}</div>
      </section>
    `);

    if (history.length) {
      const slot = document.getElementById('home-recs-slot');
      if (slot) slot.innerHTML = `
        <div class="home-recs-prompt">
          <span>Personalized picks based on your watch history cost extra API quota to load.</span>
          <button class="load-more-btn" id="load-home-recs">Show recommendations</button>
        </div>`;

      document.getElementById('load-home-recs')?.addEventListener('click', async function () {
        this.disabled = true;
        this.textContent = 'Loading…';
        const seeds = history.slice(0, 2);
        const results = await Promise.all(
          seeds.map(h => LudusAPI.recommendations(h.videoId).catch(() => null))
        );
        if (isStale(myGen)) return;

        const sections = results
          .filter(r => r?.videos?.length)
          .map(r => `
            <section class="home-section">
              <h2 class="row-title">Because you watched "${escHTML(r.title)}"</h2>
              <div class="video-grid">${r.videos.slice(0, 12).map(videoCard).join('')}</div>
            </section>`);

        const slotEl = document.getElementById('home-recs-slot');
        if (slotEl) slotEl.innerHTML = sections.join('') || '<div class="empty-state">No related videos found</div>';
      });
    }

  } catch (e) {
    if (isStale(myGen)) return;
    setHTML(errState(e.message, renderHome));
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   TRENDING VIEW — its own page, separate from Home. "All" and "Gaming" hit
   the YouTube Data API's videos.list?chart=mostPopular directly ("Gaming"
   adds videoCategoryId=20). There's no official "Music"/"Movies" trending
   chart in the Data API, so those tabs were dropped rather than faked.

   The other tabs (Sports, Cooking & Baking, Technology, Movies & TV) were
   never real trending categories — they're powered by a relevance-sorted
   search query instead, same as before. Same sandboxed-iframe playback
   either way; only the data source differs.
   ═══════════════════════════════════════════════════════════════════════════ */

route('/trending', renderTrending);

const TRENDING_TABS = [
  { id: 'default', label: 'All',              mode: 'trending', type: 'default' },
  { id: 'gaming',  label: 'Gaming',           mode: 'trending', type: 'gaming' },
  { id: 'sports',  label: 'Sports',           mode: 'search',   query: 'sports highlights' },
  { id: 'cooking', label: 'Cooking & Baking', mode: 'search',   query: 'cooking baking recipe' },
  { id: 'tech',    label: 'Technology',       mode: 'search',   query: 'tech review' },
  { id: 'movies',  label: 'Movies & TV',      mode: 'search',   query: 'movie trailer' },
];

function trendingTabsHTML(activeId) {
  return `
    <div class="tabs">
      ${TRENDING_TABS.map(t => `
        <button class="tab${t.id === activeId ? ' active' : ''}"
                onclick="navigate('#/trending?type=${t.id}')">
          ${t.label}
        </button>`).join('')}
    </div>`;
}

async function renderTrending(params = {}) {
  const myGen = beginRender();
  const tab = TRENDING_TABS.find(t => t.id === params.type) || TRENDING_TABS[0];

  setHTML(`
    <h1 class="page-title">Trending</h1>
    ${trendingTabsHTML(tab.id)}
    ${skeletonGrid()}
  `);

  try {
    let videos;
    if (tab.mode === 'trending') {
      const region = localStorage.getItem('ludusyt_region') || 'US';
      videos = await LudusAPI.trending(tab.type, region);
    } else {
      const results = await LudusAPI.search(tab.query, { sort_by: 'relevance' });
      videos = results.filter(r => !r.type || r.type === 'video');
    }
    if (isStale(myGen)) return;

    setHTML(`
      <h1 class="page-title">Trending</h1>
      ${trendingTabsHTML(tab.id)}
      <div id="vgrid" class="video-grid"></div>
    `);
    renderGrid('vgrid', videos);
  } catch (e) {
    if (isStale(myGen)) return;
    setHTML(errState(e.message, () => renderTrending(params)));
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   WATCH HISTORY
   ═══════════════════════════════════════════════════════════════════════════ */

const HISTORY_KEY = 'ludusyt_history';
const HISTORY_MAX = 60;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveHistory(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX))); }
  catch { /* storage full or unavailable — fail silently */ }
}

// Logs a watch immediately on play (videoId only) and is called again once
// metadata arrives to fill in title/thumbnail/author — merges rather than
// overwrites so a video is never lost from history just because the
// metadata API was down.
function addToHistory(entry) {
  if (!entry?.videoId) return;
  const list = getHistory();
  const idx = list.findIndex(h => h.videoId === entry.videoId);
  const merged = { ...(idx !== -1 ? list[idx] : {}), ...entry, watchedAt: Date.now() };
  if (idx !== -1) list.splice(idx, 1);
  list.unshift(merged);
  saveHistory(list);
}

function removeHistoryItem(videoId) {
  saveHistory(getHistory().filter(h => h.videoId !== videoId));
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function fmtAgo(ts) {
  if (!ts) return '';
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function historyCard(h) {
  const dur = h.lengthSeconds ? `<span class="v-dur">${fmtDuration(h.lengthSeconds)}</span>` : '';
  return `
    <div class="v-card">
      <div onclick="navigate('#/watch?v=${escHTML(h.videoId)}')">
        <div class="v-thumb">
          ${h.thumbnail ? `<img src="${escHTML(h.thumbnail)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : ''}
          ${dur}
        </div>
        <div class="v-info">
          <div class="v-title">${escHTML(h.title) || 'Untitled'}</div>
          <div class="v-meta">
            ${escHTML(h.author) || ''}${h.author ? ' · ' : ''}Watched ${fmtAgo(h.watchedAt)}
          </div>
        </div>
      </div>
      <button class="hist-remove-btn" title="Remove from history"
              onclick="event.stopPropagation(); removeHistoryItem('${escHTML(h.videoId)}')">✕</button>
    </div>`;
}

route('/history', renderHistory);

function renderHistory() {
  const list = getHistory();

  if (!list.length) {
    setHTML(`
      <div class="history-head">
        <h1 class="page-title">Watch History</h1>
      </div>
      <div class="empty-state">Videos you watch will show up here.</div>
    `);
    return;
  }

  setHTML(`
    <div class="history-head">
      <h1 class="page-title">Watch History</h1>
      <button class="load-more-btn" onclick="clearHistory()">Clear history</button>
    </div>
    <div class="video-grid">${list.map(historyCard).join('')}</div>
  `);
}



/* ═══════════════════════════════════════════════════════════════════════════
   POPULAR VIEW

   The Data API only exposes one "most popular" chart, so this now hits the
   same videos.list?chart=mostPopular endpoint Trending → All does — Popular
   and Trending → All will show essentially the same list. Kept as its own
   page since the sidebar links here separately; a real failure at this
   point is a network/quota issue rather than a per-instance opt-out.
   ═══════════════════════════════════════════════════════════════════════════ */

route('/popular', renderPopular);

async function renderPopular(params = {}) {
  const myGen = beginRender();
  setHTML(`<h1 class="page-title">Popular</h1>${skeletonGrid()}`);
  try {
    const videos = await LudusAPI.popular();
    if (isStale(myGen)) return;
    if (!videos?.length) throw new Error('The API returned an empty popular feed.');
    setHTML(`<h1 class="page-title">Popular</h1><div id="vgrid" class="video-grid"></div>`);
    renderGrid('vgrid', videos);
  } catch (e) {
    if (isStale(myGen)) return;
    setHTML(popularErrState(e.message, () => renderPopular(params)));
  }
}

function popularErrState(msg, retryFn) {
  const id = 'r' + Date.now();
  _retryFns[id] = retryFn;
  return `
    <div class="err-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div class="err-title">Popular feed unavailable</div>
      <div class="err-msg">
        ${escHTML(msg)}<br><br>
        This is usually a network hiccup, or the YouTube Data API key has
        hit its daily quota — quota resets at midnight Pacific time.
      </div>
      <div style="display:flex;gap:10px;margin-top:6px">
        <button class="retry-btn" onclick="_retryFns['${id}']&&_retryFns['${id}']()">Try again</button>
        <button class="retry-btn" style="background:var(--card);color:var(--text2);border:1px solid var(--border)"
                onclick="navigate('/trending')">Browse Trending instead</button>
      </div>
    </div>`;
}


/* ═══════════════════════════════════════════════════════════════════════════
   SEARCH VIEW
   ═══════════════════════════════════════════════════════════════════════════ */

route('/search', renderSearch);

async function renderSearch(params = {}) {
  const myGen = beginRender();
  const q = (params.q || '').trim();
  if (!q) { navigate('/'); return; }

  let page = parseInt(params.page) || 1;

  setHTML(`
    <div class="search-header">
      <div class="search-query">Results for &ldquo;${escHTML(q)}&rdquo;</div>
    </div>
    ${skeletonGrid(9)}
  `);

  try {
    const results = await LudusAPI.search(q, { page, sort_by: params.sort || 'relevance' });
    if (isStale(myGen)) return;
    const videos  = results.filter(r => !r.type || r.type === 'video');

    setHTML(`
      <div class="search-header">
        <div class="search-query">Results for &ldquo;${escHTML(q)}&rdquo;</div>
        <div class="result-count">${videos.length} results (page ${page})</div>
      </div>
      <div id="vgrid" class="video-grid"></div>
      <div class="load-more-wrap">
        <button class="load-more-btn" id="load-more">Load more</button>
      </div>
    `);
    renderGrid('vgrid', videos);

    document.getElementById('load-more').addEventListener('click', async function () {
      this.disabled = true;
      this.textContent = 'Loading…';
      try {
        page++;
        const more = await LudusAPI.search(q, { page, sort_by: params.sort || 'relevance' });
        if (isStale(myGen)) return;
        const moreVids = more.filter(r => !r.type || r.type === 'video');
        document.getElementById('vgrid')
          ?.insertAdjacentHTML('beforeend', moreVids.map(videoCard).join(''));
        this.textContent = 'Load more';
        this.disabled = false;
      } catch {
        if (isStale(myGen)) return;
        this.textContent = 'Failed — try again';
        this.disabled = false;
      }
    });

  } catch (e) {
    if (isStale(myGen)) return;
    setHTML(errState(e.message, () => renderSearch(params)));
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   WATCH VIEW
   ═══════════════════════════════════════════════════════════════════════════ */

route('/watch', renderWatch);

// Both the title/description/channel row AND the recommendations rail are
// gated behind their own button (see the lazy-load-card markup below)
// instead of fetching automatically — recommendations in particular is the
// single most expensive call this app makes (a 1-unit videos.list lookup
// plus a 100-unit search.list call on tier 1), so a video page the person
// only wants for playback now costs 0 API quota by default.
async function renderWatch(params = {}) {
  const myGen = beginRender();
  const id = params.v;
  if (!id) { navigate('/'); return; }

  setHTML(`
    <div class="watch-layout">
      <div class="watch-main">
        <div class="player-wrap" id="ludus-player-wrap"></div>
        ${playerControlsHTML()}
        <div id="watch-meta">
          <div class="lazy-load-card">
            <p>Title, description, and channel info aren't loaded automatically, to save API quota.</p>
            <button class="retry-btn" id="load-info-btn">Load video info</button>
          </div>
        </div>
      </div>
      <div>
        <div class="rec-header">Up Next</div>
        <div class="rec-list" id="rec-list">
          <div class="lazy-load-card">
            <p>Recommendations cost extra API quota — load them only if you want them.</p>
            <button class="retry-btn" id="load-recs-btn">Load recommendations</button>
          </div>
        </div>
      </div>
    </div>
  `);

  // Mount the streaming player right away — playback doesn't depend on the
  // metadata API at all, so it keeps working even if every key above and
  // both backup tiers are down.
  mountPlayer(id);

  // Log to history immediately (videoId only); upgraded with title/thumbnail
  // once "Load video info" is used, so a watch is never lost even if the
  // metadata API fails or the person never clicks either button.
  addToHistory({ videoId: id });

  // Shared with loadRecommendations() below so clicking it after "Load
  // video info" doesn't re-spend the 1-unit videos.list lookup
  // recommendations() would otherwise need just to find this video's title/tags.
  let _seedTitle = null;

  async function loadVideoInfo() {
    const metaEl = document.getElementById('watch-meta');
    if (metaEl) metaEl.innerHTML = `
      <div class="skel" style="height:22px;width:78%;margin-bottom:10px"></div>
      <div class="skel" style="height:13px;width:40%;margin-bottom:14px"></div>
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
        <div class="skel" style="width:40px;height:40px;border-radius:50%;flex-shrink:0"></div>
        <div style="flex:1"><div class="skel" style="height:13px;width:160px"></div></div>
      </div>`;

    try {
      const data = await LudusAPI.video(id);
      if (isStale(myGen)) return;
      _seedTitle = data.title;

      const avatarUrl = thumb(data.authorThumbnails, 48) || smallThumb(data.authorThumbnails);
      const stats = [
        data.viewCount     ? fmtViews(data.viewCount)         : '',
        data.likeCount     ? `👍 ${fmtLikes(data.likeCount)}` : '',
        data.publishedText ? data.publishedText               : '',
      ].filter(Boolean).map(s => `<span>${escHTML(s)}</span>`).join('');

      const el = document.getElementById('watch-meta');
      if (el) el.innerHTML = `
        <h1 class="video-title">${escHTML(data.title) || 'Untitled'}</h1>
        <div class="video-stats">${stats}</div>

        ${data.authorId ? `
          <div class="channel-row" onclick="navigate('#/channel?id=${escHTML(data.authorId)}')">
            ${avatarUrl
              ? `<img class="chan-avatar" src="${escHTML(avatarUrl)}" alt="" onerror="this.style.visibility='hidden'">`
              : `<div class="chan-avatar"></div>`}
            <div>
              <div class="chan-name">${escHTML(data.author) || ''}</div>
              ${data.subCountText ? `<div class="chan-subs">${escHTML(data.subCountText)}</div>` : ''}
            </div>
          </div>` : ''}

        ${data.description ? `
          <div class="desc-wrap">
            <div class="desc-text clamp" id="desc-text">${escHTML(data.description)}</div>
            <button class="expand-btn" id="expand-btn">Show more</button>
          </div>` : ''}
      `;

      // Upgrade the history stub now that we have title/thumbnail/author.
      addToHistory({
        videoId: id,
        title: data.title,
        author: data.author,
        authorId: data.authorId,
        thumbnail: thumb(data.videoThumbnails, 360) || smallThumb(data.videoThumbnails),
        lengthSeconds: data.lengthSeconds,
      });

      const expandBtn = document.getElementById('expand-btn');
      if (expandBtn) {
        expandBtn.addEventListener('click', function () {
          const txt = document.getElementById('desc-text');
          if (!txt) return;
          const open = txt.classList.toggle('clamp');
          this.textContent = open ? 'Show more' : 'Show less';
        });
        // Start collapsed; toggle to 'clamp' is already applied
        expandBtn.textContent = 'Show more';
      }
    } catch (e) {
      if (isStale(myGen)) return;
      // Metadata failed — the player above keeps playing regardless.
      const el = document.getElementById('watch-meta');
      if (el) el.innerHTML = errState(`Title & info unavailable: ${e.message}`, loadVideoInfo);
    }
  }

  async function loadRecommendations() {
    const recEl = document.getElementById('rec-list');
    if (recEl) recEl.innerHTML = skeletonRecs(8);

    try {
      const data = await LudusAPI.recommendations(id, { seedTitle: _seedTitle });
      if (isStale(myGen)) return;
      const el = document.getElementById('rec-list');
      if (el) el.innerHTML = (data.videos || []).slice(0, 18).map(recCard).join('') || '<div class="empty-state">No recommendations</div>';
    } catch (e) {
      if (isStale(myGen)) return;
      const el = document.getElementById('rec-list');
      if (el) el.innerHTML = errState(e.message, loadRecommendations);
    }
  }

  document.getElementById('load-info-btn')?.addEventListener('click', loadVideoInfo, { once: true });
  document.getElementById('load-recs-btn')?.addEventListener('click', loadRecommendations, { once: true });
}


/* ═══════════════════════════════════════════════════════════════════════════
   CHANNEL VIEW
   ═══════════════════════════════════════════════════════════════════════════ */

route('/channel', renderChannel);

async function renderChannel(params = {}) {
  const myGen = beginRender();
  const id = params.id;
  if (!id) { navigate('/'); return; }

  setHTML(`
    <div class="channel-header">
      <div class="skel" style="width:72px;height:72px;border-radius:50%;flex-shrink:0"></div>
      <div style="flex:1">
        <div class="skel" style="height:20px;width:200px;margin-bottom:8px"></div>
        <div class="skel" style="height:13px;width:110px"></div>
      </div>
    </div>
    ${skeletonGrid(8)}
  `);

  try {
    const [ch, vdata] = await Promise.all([
      LudusAPI.channel(id),
      LudusAPI.channelVideos(id),
    ]);
    if (isStale(myGen)) return;

    const avatarUrl = thumb(ch.authorThumbnails, 72) || smallThumb(ch.authorThumbnails);
    const videos    = vdata.videos || vdata || [];

    setHTML(`
      <div class="channel-header">
        ${avatarUrl
          ? `<img class="ch-avatar" src="${escHTML(avatarUrl)}" alt="" onerror="this.style.visibility='hidden'">`
          : `<div class="ch-avatar"></div>`}
        <div>
          <div class="ch-name">${escHTML(ch.author) || ''}</div>
          ${ch.subCountText  ? `<div class="ch-subs">${escHTML(ch.subCountText)} subscribers</div>` : ''}
          ${ch.description   ? `<div class="ch-desc">${escHTML(ch.description)}</div>` : ''}
        </div>
      </div>
      <h2 class="page-title" style="font-size:16px;margin-bottom:16px">Videos</h2>
      <div id="vgrid" class="video-grid"></div>
    `);
    renderGrid('vgrid', videos);

  } catch (e) {
    if (isStale(myGen)) return;
    setHTML(errState(e.message, () => renderChannel(params)));
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   404 FALLBACK
   ═══════════════════════════════════════════════════════════════════════════ */

route('*', () => navigate('/'));


/* ═══════════════════════════════════════════════════════════════════════════
   SEARCH BAR
   ═══════════════════════════════════════════════════════════════════════════ */

(function initSearch() {
  const input   = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  const sugEl   = document.getElementById('suggestions');
  let   timer;

  function doSearch() {
    const q = input.value.trim();
    if (!q) return;
    hideSuggestions();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  function hideSuggestions() { sugEl.hidden = true; }

  input.addEventListener('input', function () {
    const q = this.value.trim();
    clearBtn.hidden = !q;

    clearTimeout(timer);
    if (!q) { hideSuggestions(); return; }

    timer = setTimeout(async () => {
      try {
        const data = await LudusAPI.suggestions(q);
        const list = data?.suggestions || [];
        if (!list.length) { hideSuggestions(); return; }

        sugEl.innerHTML = list.slice(0, 8).map(s => `
          <div class="sug-item" data-q="${escHTML(s)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            ${escHTML(s)}
          </div>`).join('');
        sugEl.hidden = false;

        sugEl.querySelectorAll('.sug-item').forEach(item => {
          item.addEventListener('click', () => {
            input.value = item.dataset.q;
            clearBtn.hidden = false;
            hideSuggestions();
            navigate(`/search?q=${encodeURIComponent(item.dataset.q)}`);
          });
        });
      } catch { /* suggestions are best-effort */ }
    }, 320);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter')  { doSearch(); }
    if (e.key === 'Escape') { hideSuggestions(); }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.hidden = true;
    hideSuggestions();
    input.focus();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#search-wrap')) hideSuggestions();
  });
})();


/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR TOGGLE
   ═══════════════════════════════════════════════════════════════════════════ */

(function initSidebarToggle() {
  const toggle  = document.getElementById('toggle-sidebar');
  const sidebar = document.getElementById('sidebar');
  const isMobile = () => window.innerWidth <= 768;

  toggle.addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  // Mobile sidebar closes via dispatch() on every navigate call
})();


/* ═══════════════════════════════════════════════════════════════════════════
   SETTINGS MODAL
   ═══════════════════════════════════════════════════════════════════════════ */

(function initSettings() {
  const modal     = document.getElementById('settings-modal');
  const overlay   = document.getElementById('modal-overlay');
  const regionSel = document.getElementById('region-select');

  function open()  { modal.hidden = false; }
  function close() { modal.hidden = true;  }

  // Load saved region
  regionSel.value = localStorage.getItem('ludusyt_region') || 'US';

  regionSel.addEventListener('change', () => {
    localStorage.setItem('ludusyt_region', regionSel.value);
  });

  document.getElementById('settings-btn').addEventListener('click', open);
  document.getElementById('close-settings').addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();


/* ═══════════════════════════════════════════════════════════════════════════
   API STATUS BADGE  (init on load)
   ═══════════════════════════════════════════════════════════════════════════ */

(function initStatus() {
  const host = document.getElementById('instance-host');
  if (host) host.textContent = LudusAPI.getInstance();
})();


/* ═══════════════════════════════════════════════════════════════════════════
   STREAMING — routing 3rd-party embed servers for actual playback

   Four servers, no extra/fallback tier. Every server (and every switch
   between them) is routed through the conduit — the conduit toggle sits right
   next to the server dropdown and is on by default.
   ═══════════════════════════════════════════════════════════════════════════ */

// 'melmac' (iv.melmac.space) was dropped — it's TLS-handshaking with a
// straight EOF through Scramjet (hyper "tls handshake eof"), which means
// the instance itself is rejecting/dropping Scramjet's connection at the
// TLS layer. That's not something fixable from this app's code — it's
// either the instance's TLS config or something about how it's blocking
// proxied connections — so it's out rather than "fixed". 'pixora' and
// 'chocomoo' are out per request. Same for any instance here in the
// future: if Scramjet can't complete a TLS handshake with it, no
// client-side change here will help; swap it for a different instance
// instead.
// The first option is your own Cloudflare-tunnelled resolver. It returns a
// CORS-safe, proxied M4A URL from the local yt-dlp resolver. The remaining
// Invidious embeds remain available as automatic and manual fallbacks.
const RELAY_RESOLVER_URL = localStorage.getItem('ludusyt_stream_relay_url') ||
  'https://tokyo-suspended-sorts-prot.trycloudflare.com/resolve';
const MAIN_SERVERS = [
  { id: 'relay',      name: 'Ludus Relay', type: 'relay' },
  { id: 'f5',         name: 'F5',         build: id => `https://invidious.f5.si/embed/${id}?autoplay=1` },
  { id: 'nadeko',     name: 'Nadeko',     build: id => `https://inv.nadeko.net/embed/${id}?autoplay=1` },
  { id: 'tiekoetter', name: 'Tiekoetter', build: id => `https://invidious.tiekoetter.com/embed/${id}?autoplay=1` },
  { id: 'zoomer',     name: 'Zoomerville',build: id => `https://inv.zoomerville.com/embed/${id}?autoplay=1` },
];

// Same locked-down sandbox Ludus Stream uses: the embedded page can run its
// own scripts and play video, but it cannot navigate this tab or pop new
// windows/tabs.
const LOCKED_SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-pointer-lock allow-fullscreen allow-forms';

// Conduit client setup — registers the service worker and inits the
// client before any URL encoding so tunnelled requests are intercepted correctly.
let _sc = null;
let _scResolve, _scReject;
const _conduitReady = new Promise((res, rej) => {
  _scResolve = res;
  _scReject  = rej;
});

(async () => {
  try {
    if (typeof $scramjetLoadController !== 'function') {
      throw new Error('Core bundle not loaded — check /p/scram/ deployment.');
    }
    const { ScramjetController } = $scramjetLoadController();
    _sc = new ScramjetController({
      prefix: "/scramjet/",
      wisp: "wss://nebulaproxy.io/wisp/",
      files: {
        wasm: "/p/scram/scramjet.wasm.wasm",
        all:  "/p/scram/scramjet.all.js",
        sync: "/p/scram/scramjet.sync.js",
      }
    });
    // Register and await the service worker BEFORE init — it intercepts
    // all tunnelled requests; without it active first every tunnelled URL returns 404.
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
    }
    await _sc.init();
    _scResolve(_sc);
  } catch (e) {
    console.warn('[Ludus] Conduit init error:', e);
    _scReject(e);
  }
})();

let _currentVideoId = null;

function playerControlsHTML() {
  return `
    <div class="server-bar" id="serverControls">
      <div class="server-controls">
        <button class="server-dropdown-btn" id="serverDropdownBtn" type="button" aria-expanded="false" aria-controls="serverDropdownMenu">
          <span id="currentServerName">${escHTML(MAIN_SERVERS[0].name)}</span>
          <span class="chev">▼</span>
        </button>
        <div class="server-dropdown-menu" id="serverDropdownMenu" role="menu">
          ${MAIN_SERVERS.map((s, i) => `
            <button class="server-dropdown-item${i === 0 ? ' active' : ''}" type="button" role="menuitem" data-server="${s.id}" data-server-name="${escHTML(s.name)}">${escHTML(s.name)}</button>`).join('')}
        </div>
      </div>
      <button id="conduitToggle" class="cduit-toggle-wrap active" type="button" aria-pressed="true">
        <div class="cduit-switch">
          <div class="cduit-switch-track"></div>
          <div class="cduit-switch-thumb"></div>
        </div>
        <span class="cduit-toggle-label">Route through Conduit</span>
      </button>
    </div>
  `;
}

function buildPlayerIframe(url) {
  const iframeId = 'yt-iframe-' + Date.now();
  return {
    html: `
      <div class="yt-player-loader" id="yt-player-loader">
        <div class="yt-player-loader-spinner"></div>
        <span class="yt-player-loader-label">Connecting via conduit…</span>
      </div>
      <iframe id="${iframeId}" src="${escHTML(url)}" width="100%" height="100%" style="border:none;"
              sandbox="${LOCKED_SANDBOX}" allowfullscreen
              allow="autoplay *; fullscreen *; picture-in-picture *; encrypted-media *"></iframe>`,
    iframeId,
  };
}

function buildRelayPlayer(videoUrl, audioUrl, title, videoFormats = [], captions = []) {
  const qualityOptions = videoFormats.map((format, index) =>
    `<option value="${index}"${format.url === videoUrl ? ' selected' : ''}>${escHTML(format.qualityLabel || 'Auto')} MP4</option>`
  ).join('');
  const captionOptions = captions.map((caption, index) =>
    `<option value="${index}">${escHTML(caption.label || caption.language)}</option>`
  ).join('');
  return {
    html: `
      <div class="yt-player-loader" id="yt-player-loader">
        <div class="yt-player-loader-spinner"></div>
        <span class="yt-player-loader-label">Buffering video through Ludus Relay…</span>
      </div>
      <div class="relay-player" id="yt-relay-player">
        <div class="relay-player-title">${escHTML(title || 'YouTube video')}</div>
        <video id="yt-relay-video" class="relay-player-video" crossorigin="anonymous" muted playsinline
               preload="auto" src="${escHTML(videoUrl)}"></video>
        <audio id="yt-relay-audio" crossorigin="anonymous" preload="auto" src="${escHTML(audioUrl)}"></audio>
        <div class="relay-controls" aria-label="Video controls">
          <div class="relay-controls-row">
            <button type="button" class="relay-control relay-play" data-relay-action="toggle" aria-label="Play">▶</button>
            <button type="button" class="relay-control relay-skip" data-relay-action="back" aria-label="Back 10 seconds">−10</button>
            <button type="button" class="relay-control relay-skip" data-relay-action="forward" aria-label="Forward 10 seconds">+10</button>
            <span class="relay-time" id="yt-relay-time">0:00 / 0:00</span>
            <input class="relay-seek" id="yt-relay-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek">
            <label class="relay-volume" title="Volume"><span>VOL</span><input id="yt-relay-volume" type="range" min="0" max="1" value="1" step="0.01" aria-label="Volume"></label>
            <select class="relay-quality" id="yt-relay-quality" aria-label="Video quality" title="Video quality">${qualityOptions}</select>
            <select class="relay-captions" id="yt-relay-captions" aria-label="Subtitles" title="Subtitles"><option value="">CC off</option>${captionOptions}</select>
            <select class="relay-speed" id="yt-relay-speed" aria-label="Playback speed">
              <option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option>
            </select>
            <button type="button" class="relay-control" data-relay-action="pip" aria-label="Picture in picture">▣</button>
            <button type="button" class="relay-control" data-relay-action="fullscreen" aria-label="Fullscreen">⛶</button>
          </div>
        </div>
      </div>`,
    videoId: 'yt-relay-video',
  };
}

function wirePlayerLoader(wrap) {
  const loader = wrap.querySelector('#yt-player-loader');
  const media = wrap.querySelector('iframe, video');
  if (!loader || !media) return;
  const loadedEvent = media.tagName === 'VIDEO' ? 'canplay' : 'load';
  media.addEventListener(loadedEvent, () => {
    loader.classList.add('yt-fade-out');
    setTimeout(() => loader.remove(), 320);
  }, { once: true });
}

function relayEndpoint(videoId) {
  const base = RELAY_RESOLVER_URL.replace(/\/+$/, '');
  return `${base}?v=${encodeURIComponent(videoId)}&type=video`;
}

function qualityRank(format) {
  const match = String(format.qualityLabel || '').match(/(\d+)p/);
  return Number(match?.[1] || 0) * 10000000 + Number(format.bitrate || 0);
}

// The relay is always first. It produces a direct, proxied audio stream;
// every remaining source preserves the existing Invidious + Conduit route.
async function resolveStreamUrl(server, videoId) {
  if (server.type === 'relay') {
    const response = await fetch(relayEndpoint(videoId), { signal: AbortSignal.timeout(30000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Ludus Relay returned HTTP ${response.status}`);
    const formats = data.adaptiveFormats || [];
    const videoFormats = formats
      .filter(f => f.url && String(f.type || '').startsWith('video/mp4'))
      .sort((a, b) => qualityRank(b) - qualityRank(a));
    const video = videoFormats[0];
    const audio = formats
      .filter(f => f.url && String(f.type || '').startsWith('audio/mp4'))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    if (!video || !audio) throw new Error('Ludus Relay returned no compatible MP4 video and audio streams');
    return { kind: 'relay', videoUrl: video.url, audioUrl: audio.url, videoFormats, captions: data.captions || [], title: data.title || 'YouTube video' };
  }

  const raw = server.build(videoId);
  const useRoute = document.getElementById('conduitToggle')?.classList.contains('active');
  if (useRoute) {
    try {
      const sc = await _conduitReady;
      return { kind: 'iframe', url: location.origin + sc.encodeUrl(raw) };
    } catch (err) {
      console.warn('[Ludus] Route encoding failed:', err);
    }
  }
  return { kind: 'iframe', url: raw };
}

let _activeRelay = null;

function relayTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  return `${mins}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

async function requestRelayFullscreen(player) {
  try {
    await player?.requestFullscreen?.();
    // Browsers may reject orientation locking; fullscreen still succeeds.
    await screen.orientation?.lock?.('landscape');
  } catch (_) { /* keep the regular fullscreen fallback silent */ }
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) screen.orientation?.unlock?.();
});

function postRelayState() {
  if (!_activeRelay || window.parent === window) return;
  const { video, audio, title } = _activeRelay;
  window.parent.postMessage({
    source: 'youtube',
    title,
    paused: video.paused,
    volume: audio.volume,
    currentTime: video.currentTime || 0,
    duration: video.duration || 0,
  }, '*');
}

// Parent Ludus mixer commands. The app posts its state above and accepts the
// same transport actions as the existing Movies player.
window.addEventListener('message', event => {
  const data = event.data;
  if (!data || data.target !== 'youtube' || !_activeRelay) return;
  const { video, audio, setVolume, seekTo } = _activeRelay;
  switch (data.action) {
    case 'setVolume': setVolume(data.volume); break;
    case 'togglePlay': video.paused ? video.play().catch(() => {}) : video.pause(); break;
    case 'seekBack': seekTo(video.currentTime - 10); break;
    case 'seekForward': seekTo(video.currentTime + 10); break;
    case 'seekTo': seekTo((Number(data.progress) / 100) * video.duration); break;
    case 'setPlaybackRate':
      video.playbackRate = Number(data.rate) || 1;
      audio.playbackRate = video.playbackRate;
      break;
  }
  postRelayState();
});

function wireRelaySync(wrap, onFailure, title = 'YouTube video', videoFormats = [], captions = []) {
  const video = wrap.querySelector('#yt-relay-video');
  const audio = wrap.querySelector('#yt-relay-audio');
  if (!video || !audio) return;
  const player = wrap.querySelector('#yt-relay-player');
  const play = wrap.querySelector('.relay-play');
  const seek = wrap.querySelector('#yt-relay-seek');
  const volume = wrap.querySelector('#yt-relay-volume');
  const quality = wrap.querySelector('#yt-relay-quality');
  const captionSelect = wrap.querySelector('#yt-relay-captions');
  const speed = wrap.querySelector('#yt-relay-speed');
  const time = wrap.querySelector('#yt-relay-time');
  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    onFailure?.();
  };
  const syncTime = () => {
    if (Math.abs(video.currentTime - audio.currentTime) > 0.35) audio.currentTime = video.currentTime;
  };
  const updateControls = () => {
    if (play) { play.textContent = video.paused ? '▶' : '❚❚'; play.setAttribute('aria-label', video.paused ? 'Play' : 'Pause'); }
    if (seek && Number.isFinite(video.duration) && !seek.matches(':active')) seek.value = String(Math.round((video.currentTime / video.duration) * 1000) || 0);
    if (time) time.textContent = `${relayTime(video.currentTime)} / ${relayTime(video.duration)}`;
  };
  const setVolume = value => {
    const next = Math.max(0, Math.min(1, Number(value)));
    audio.volume = next;
    if (volume) volume.value = String(next);
    postRelayState();
  };
  const seekTo = seconds => {
    if (Number.isFinite(video.duration)) video.currentTime = Math.max(0, Math.min(video.duration, Number(seconds) || 0));
  };
  _activeRelay = { video, audio, title, setVolume, seekTo, videoFormats, captions };

  video.addEventListener('play', () => { audio.play().catch(fail); updateControls(); postRelayState(); });
  video.addEventListener('pause', () => { audio.pause(); updateControls(); postRelayState(); });
  video.addEventListener('seeking', syncTime);
  video.addEventListener('timeupdate', () => { syncTime(); updateControls(); postRelayState(); });
  video.addEventListener('loadedmetadata', () => { updateControls(); postRelayState(); });
  video.addEventListener('ratechange', () => { audio.playbackRate = video.playbackRate; if (speed) speed.value = String(video.playbackRate); });
  video.addEventListener('ended', () => { audio.pause(); audio.currentTime = 0; updateControls(); postRelayState(); });
  video.addEventListener('error', fail, { once: true });
  audio.addEventListener('error', fail, { once: true });

  wrap.addEventListener('click', event => {
    const action = event.target.closest('[data-relay-action]')?.dataset.relayAction;
    if (!action) return;
    if (action === 'toggle') video.paused ? video.play().catch(fail) : video.pause();
    if (action === 'back') seekTo(video.currentTime - 10);
    if (action === 'forward') seekTo(video.currentTime + 10);
    if (action === 'fullscreen') requestRelayFullscreen(player || video);
    if (action === 'pip') video.requestPictureInPicture?.().catch(() => {});
  });
  seek?.addEventListener('input', () => seekTo((Number(seek.value) / 1000) * video.duration));
  volume?.addEventListener('input', () => setVolume(volume.value));
  speed?.addEventListener('change', () => { video.playbackRate = Number(speed.value); audio.playbackRate = video.playbackRate; });
  quality?.addEventListener('change', () => {
    const next = _activeRelay?.videoFormats?.[Number(quality.value)];
    if (!next?.url || next.url === video.currentSrc) return;
    const wasPlaying = !video.paused;
    const position = video.currentTime || 0;
    video.src = next.url;
    video.load();
    video.addEventListener('loadedmetadata', () => {
      seekTo(position);
      if (wasPlaying) video.play().catch(fail);
    }, { once: true });
  });
  captionSelect?.addEventListener('change', () => {
    video.querySelectorAll('track[data-ludus-caption]').forEach(track => track.remove());
    const caption = captions[Number(captionSelect.value)];
    if (!caption?.url) return;
    const track = document.createElement('track');
    track.dataset.ludusCaption = 'true';
    track.kind = 'subtitles';
    track.srclang = caption.language || 'en';
    track.label = caption.label || caption.language || 'Subtitles';
    track.src = caption.url;
    track.default = true;
    track.addEventListener('load', () => { track.track.mode = 'showing'; }, { once: true });
    video.appendChild(track);
  });
  updateControls();
}

function loadingPlayerHTML(label = 'Connecting…') {
  return `<div class="yt-player-loader" id="yt-player-loader">
    <div class="yt-player-loader-spinner"></div>
    <span class="yt-player-loader-label" id="yt-player-loader-label">${escHTML(label)}</span>
  </div>`;
}

async function mountResolvedPlayer(server, videoId, allowFallback = false) {
  const wrap = document.getElementById('ludus-player-wrap');
  if (!wrap) return;
  wrap.innerHTML = loadingPlayerHTML(server.type === 'relay' ? 'Connecting to Ludus Relay…' : 'Initialising conduit…');
  try {
    const resolved = await resolveStreamUrl(server, videoId);
    const player = resolved.kind === 'relay'
      ? buildRelayPlayer(resolved.videoUrl, resolved.audioUrl, resolved.title, resolved.videoFormats, resolved.captions)
      : buildPlayerIframe(resolved.url);
    wrap.innerHTML = player.html;
    wirePlayerLoader(wrap);

    if (resolved.kind === 'relay' && allowFallback) {
      wireRelaySync(wrap, () => {
        console.warn('[Ludus] Relay stream failed; falling back to Invidious.');
        mountResolvedPlayer(MAIN_SERVERS[1], videoId, false);
      }, resolved.title, resolved.videoFormats, resolved.captions);
    } else if (resolved.kind === 'relay') {
      wireRelaySync(wrap, undefined, resolved.title, resolved.videoFormats, resolved.captions);
    }
  } catch (error) {
    if (allowFallback) {
      console.warn('[Ludus] Relay unavailable; falling back to Invidious:', error);
      return mountResolvedPlayer(MAIN_SERVERS[1], videoId, false);
    }
    wrap.innerHTML = `<div class="yt-player-error">${escHTML(error.message || 'Unable to start playback.')}</div>`;
  }
}

async function mountPlayer(videoId) {
  _currentVideoId = videoId;
  await mountResolvedPlayer(MAIN_SERVERS[0], videoId, true);

  document.querySelectorAll('.server-dropdown-item').forEach(i => i.classList.remove('active'));
  const first = document.querySelector(`.server-dropdown-item[data-server="${MAIN_SERVERS[0].id}"]`);
  if (first) first.classList.add('active');
  const nameEl = document.getElementById('currentServerName');
  if (nameEl) nameEl.textContent = MAIN_SERVERS[0].name;
}

async function selectMainServer(serverId, name, el) {
  document.querySelectorAll('.server-dropdown-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  const nameEl = document.getElementById('currentServerName');
  if (nameEl) nameEl.textContent = name;
  document.getElementById('serverDropdownMenu')?.classList.remove('open');

  const server = MAIN_SERVERS.find(s => s.id === serverId);
  if (!server || !_currentVideoId) return;
  await mountResolvedPlayer(server, _currentVideoId, server.type === 'relay');
}

// Conduit toggle (re-mounts the current server through/around Scramjet) +
// outside-click handling — registered once via delegation.
(function initServerControlsGlobalHandlers() {
  document.addEventListener('click', e => {
    const dropdownButton = e.target.closest('#serverDropdownBtn');
    if (dropdownButton) {
      const menu = document.getElementById('serverDropdownMenu');
      const open = !menu?.classList.contains('open');
      menu?.classList.toggle('open', open);
      dropdownButton.setAttribute('aria-expanded', String(open));
      return;
    }
    const serverItem = e.target.closest('.server-dropdown-item');
    if (serverItem) {
      selectMainServer(serverItem.dataset.server, serverItem.dataset.serverName, serverItem);
      return;
    }
    const cTgl = e.target.closest('#conduitToggle');
    if (cTgl) {
      cTgl.classList.toggle('active');
      cTgl.setAttribute('aria-pressed', String(cTgl.classList.contains('active')));
      if (_currentVideoId) {
        const activeItem = document.querySelector('.server-dropdown-item.active');
        const server = MAIN_SERVERS.find(s => s.id === activeItem?.dataset.server) || MAIN_SERVERS[0];
        // The relay already proxies audio itself; Conduit only applies to
        // the retained third-party iframe fallbacks.
        if (server.type !== 'relay') mountResolvedPlayer(server, _currentVideoId, false);
      }
      return;
    }
    if (!e.target.closest('#serverControls')) {
      document.getElementById('serverDropdownMenu')?.classList.remove('open');
      document.getElementById('serverDropdownBtn')?.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.getElementById('serverDropdownMenu')?.classList.remove('open');
  });
})();


/* ═══════════════════════════════════════════════════════════════════════════
   BOOTSTRAP
   ═══════════════════════════════════════════════════════════════════════════ */

dispatch('/');
