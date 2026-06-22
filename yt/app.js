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
  // dest can be '#/foo' or '/foo' — normalize to hash without '#'
  const hash = dest.startsWith('#') ? dest.slice(1) : dest;
  window.location.hash = hash;
}

function dispatch() {
  const raw   = window.location.hash.slice(1) || '/';
  const sep   = raw.indexOf('?');
  const path  = sep === -1 ? raw : raw.slice(0, sep);
  const qs    = sep === -1 ? '' : raw.slice(sep + 1);
  const params = Object.fromEntries(new URLSearchParams(qs));

  // Highlight active sidebar item
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(a => {
    const href = a.getAttribute('href') || '';
    const aPath = href.startsWith('#') ? href.slice(1).split('?')[0] : href;
    a.classList.toggle('active', aPath === path || (path === '/' && aPath === '/'));
  });

  const handler = _routes[path] || _routes['*'];
  if (handler) handler(params);
}

window.addEventListener('hashchange', dispatch);


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
                 href="#/channel?id=${escHTML(v.authorId)}"
                 onclick="event.stopPropagation()"
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
  setHTML(`<div id="home-sections">${skeletonGrid(8)}</div>`);

  try {
    const history = getHistory();
    const sections = [];

    // ── "Because you watched …" — driven by Invidious's own per-video
    //    recommendations for the 1-2 most recently watched videos.
    const seeds = history.slice(0, 2);
    const seedResults = await Promise.all(
      seeds.map(h => LudusAPI.video(h.videoId).catch(() => null))
    );
    seedResults.forEach(data => {
      if (data?.recommendedVideos?.length) {
        sections.push({
          title: `Because you watched "${data.title}"`,
          videos: data.recommendedVideos,
        });
      }
    });

    // ── Always include trending — primary content for new users with no
    //    history yet, and a discovery row otherwise.
    const region = localStorage.getItem('ludusyt_region') || 'US';
    const trending = await LudusAPI.trending('default', region);
    sections.push({
      title: sections.length ? 'Trending' : 'Recommended for you',
      videos: trending,
    });

    if (!sections.some(s => s.videos.length)) {
      setHTML(errState('Nothing to show right now', renderHome));
      return;
    }

    setHTML(sections
      .filter(s => s.videos.length)
      .map(s => `
        <section class="home-section">
          <h2 class="row-title">${escHTML(s.title)}</h2>
          <div class="video-grid">${s.videos.slice(0, 12).map(videoCard).join('')}</div>
        </section>`)
      .join(''));

  } catch (e) {
    setHTML(errState(e.message, renderHome));
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   TRENDING VIEW — its own page, separate from Home. "All" and "Gaming" hit
   Invidious's real /trending endpoint with the exact lowercase "type"
   values it documents; a cache-busting param is added since some public
   instances are known to cache/ignore "type" and return identical results
   for every tab (iv-org/invidious#2982). "Music" and "Movies" trending
   types were dropped — most instances return sparse, stale, or
   duplicate-of-default results for them.

   The other tabs (Sports, Cooking & Baking, Technology, Movies & TV) aren't
   real Invidious trending categories — Invidious only supports
   default/music/gaming/movies, and "movies" wasn't reliable either — so
   these are powered by a relevance-sorted search query instead. Same
   sandboxed-iframe playback either way; only the data source differs.
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

    setHTML(`
      <h1 class="page-title">Trending</h1>
      ${trendingTabsHTML(tab.id)}
      <div id="vgrid" class="video-grid"></div>
    `);
    renderGrid('vgrid', videos);
  } catch (e) {
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

   /api/v1/popular is a real, still-supported Invidious endpoint, but each
   instance admin can disable it (it's expensive to keep fresh), and a lot
   of public instances do — in which case every instance LudusAPI cycles
   through can come back empty/erroring no matter what this app does. The
   retry button re-tries the full instance rotation; "Browse Trending
   instead" is the honest fallback when that rotation comes up empty.
   ═══════════════════════════════════════════════════════════════════════════ */

route('/popular', renderPopular);

async function renderPopular(params = {}) {
  setHTML(`<h1 class="page-title">Popular</h1>${skeletonGrid()}`);
  try {
    const videos = await LudusAPI.popular();
    if (!videos?.length) throw new Error('Every configured instance returned an empty popular feed.');
    setHTML(`<h1 class="page-title">Popular</h1><div id="vgrid" class="video-grid"></div>`);
    renderGrid('vgrid', videos);
  } catch (e) {
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
        Public Invidious instances can opt out of the Popular feed entirely
        (it's expensive to keep current) — if every instance you've got
        configured has it turned off, retrying won't help.
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
        const moreVids = more.filter(r => !r.type || r.type === 'video');
        document.getElementById('vgrid')
          ?.insertAdjacentHTML('beforeend', moreVids.map(videoCard).join(''));
        this.textContent = 'Load more';
        this.disabled = false;
      } catch {
        this.textContent = 'Failed — try again';
        this.disabled = false;
      }
    });

  } catch (e) {
    setHTML(errState(e.message, () => renderSearch(params)));
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   WATCH VIEW
   ═══════════════════════════════════════════════════════════════════════════ */

route('/watch', renderWatch);

async function renderWatch(params = {}) {
  const id = params.v;
  if (!id) { navigate('/'); return; }

  setHTML(`
    <div class="watch-layout">
      <div class="watch-main">
        <div class="player-wrap" id="ludus-player-wrap"></div>
        ${playerControlsHTML()}
        <div id="watch-meta">
          <div class="skel" style="height:22px;width:78%;margin-bottom:10px"></div>
          <div class="skel" style="height:13px;width:40%;margin-bottom:14px"></div>
          <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
            <div class="skel" style="width:40px;height:40px;border-radius:50%;flex-shrink:0"></div>
            <div style="flex:1"><div class="skel" style="height:13px;width:160px"></div></div>
          </div>
        </div>
      </div>
      <div>
        <div class="rec-header">Up Next</div>
        <div class="rec-list" id="rec-list">${skeletonRecs(8)}</div>
      </div>
    </div>
  `);

  // Mount the streaming player right away — playback doesn't depend on the
  // metadata API call below, so it keeps working even if every Invidious
  // metadata instance is down.
  mountPlayer(id);

  // Log to history immediately (videoId only); upgraded with title/thumbnail
  // below once metadata arrives, so a watch is never lost even if the
  // metadata API fails.
  addToHistory({ videoId: id });

  try {
    const data = await LudusAPI.video(id);
    const recs  = data.recommendedVideos || [];

    // ── Channel info ──────────────────────────────────────────────────────
    const avatarUrl = thumb(data.authorThumbnails, 48) || smallThumb(data.authorThumbnails);

    // ── Stats row ─────────────────────────────────────────────────────────
    const stats = [
      data.viewCount    ? fmtViews(data.viewCount)           : '',
      data.likeCount    ? `👍 ${fmtLikes(data.likeCount)}`   : '',
      data.publishedText ? data.publishedText                : '',
    ].filter(Boolean).map(s => `<span>${escHTML(s)}</span>`).join('');

    const metaEl = document.getElementById('watch-meta');
    if (metaEl) metaEl.innerHTML = `
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

    const recEl = document.getElementById('rec-list');
    if (recEl) recEl.innerHTML = recs.slice(0, 18).map(recCard).join('') || '<div class="empty-state">No recommendations</div>';

    // Upgrade the history stub now that we have title/thumbnail/author.
    addToHistory({
      videoId: id,
      title: data.title,
      author: data.author,
      authorId: data.authorId,
      thumbnail: thumb(data.videoThumbnails, 360) || smallThumb(data.videoThumbnails),
      lengthSeconds: data.lengthSeconds,
    });

    // ── Description expand ────────────────────────────────────────────────
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
    // Metadata failed — the player above keeps playing regardless.
    const metaEl = document.getElementById('watch-meta');
    if (metaEl) metaEl.innerHTML = errState(`Title & info unavailable: ${e.message}`, () => renderWatch(params));
    const recEl = document.getElementById('rec-list');
    if (recEl) recEl.innerHTML = '';
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   CHANNEL VIEW
   ═══════════════════════════════════════════════════════════════════════════ */

route('/channel', renderChannel);

async function renderChannel(params = {}) {
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

  // Close mobile sidebar when navigating
  window.addEventListener('hashchange', () => {
    if (isMobile()) sidebar.classList.remove('mobile-open');
  });
})();


/* ═══════════════════════════════════════════════════════════════════════════
   SETTINGS MODAL
   ═══════════════════════════════════════════════════════════════════════════ */

(function initSettings() {
  const modal      = document.getElementById('settings-modal');
  const overlay    = document.getElementById('modal-overlay');
  const instSelect = document.getElementById('instance-select');
  const regionSel  = document.getElementById('region-select');

  function open()  { modal.hidden = false; }
  function close() { modal.hidden = true;  }

  // Populate instance list
  LudusAPI.instances.forEach(inst => {
    const opt     = document.createElement('option');
    opt.value     = inst;
    opt.textContent = new URL(inst).hostname;
    if (inst === LudusAPI.getInstance()) opt.selected = true;
    instSelect.appendChild(opt);
  });

  // Load saved region
  regionSel.value = localStorage.getItem('ludusyt_region') || 'US';

  instSelect.addEventListener('change', () => {
    LudusAPI.setInstance(instSelect.value);
    // Re-sync the option in case instance rotated
    instSelect.value = LudusAPI.getInstance();
  });

  regionSel.addEventListener('change', () => {
    localStorage.setItem('ludusyt_region', regionSel.value);
  });

  document.getElementById('settings-btn').addEventListener('click', open);
  document.getElementById('close-settings').addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();


/* ═══════════════════════════════════════════════════════════════════════════
   INSTANCE STATUS BADGE  (init on load)
   ═══════════════════════════════════════════════════════════════════════════ */

(function initStatus() {
  const host = document.getElementById('instance-host');
  if (!host) return;
  try { host.textContent = new URL(LudusAPI.getInstance()).hostname; } catch {}
})();


/* ═══════════════════════════════════════════════════════════════════════════
   STREAMING — proxying 3rd-party embed servers for actual playback

   Three servers only, no extra/fallback tier. Every server (and every
   switch between them) is routed through Scramjet — the proxy toggle sits
   right next to the server dropdown and is on by default.
   ═══════════════════════════════════════════════════════════════════════════ */

const MAIN_SERVERS = [
  { id: 'pixora', name: 'Pixora', build: id => `https://inv.thepixora.com/embed/${id}?autoplay=1` },
  { id: 'melmac', name: 'Melmac', build: id => `https://iv.melmac.space/embed/${id}?autoplay=1` },
  { id: 'f5',     name: 'F5',     build: id => `https://invidious.f5.si/embed/${id}?autoplay=1` },
];

// Same locked-down sandbox Ludus Stream uses: the embedded page can run its
// own scripts and play video, but it cannot navigate this tab or pop new
// windows/tabs.
const LOCKED_SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-pointer-lock allow-fullscreen allow-forms';

// Scramjet — identical client config to Ludus Stream (movie.html): same
// prefix, same wisp endpoint, same file paths. If `$scramjetLoadController`
// isn't defined (e.g. the /p/scram/scramjet.all.js script tag in index.html
// 404'd because this app isn't on the same origin as the rest of the Ludus
// site), the proxy toggle simply has no effect — servers still load fine as
// plain sandboxed iframes either way.
let scramjet = null;
try {
  const { ScramjetController } = $scramjetLoadController();
  scramjet = new ScramjetController({
    prefix: "/scramjet/",
    wisp: "wss://wisp.mercurywork.shop/",
    files: {
      wasm: "/p/scram/scramjet.wasm.wasm",
      all:  "/p/scram/scramjet.all.js",
      sync: "/p/scram/scramjet.sync.js",
    }
  });
  scramjet.init();
} catch (e) {
  console.warn('[Ludus YouTube] Scramjet failed to init:', e);
}

let _currentVideoId = null;

function playerControlsHTML() {
  return `
    <div class="server-bar" id="serverControls">
      <div class="server-controls">
        <button class="server-dropdown-btn" id="serverDropdownBtn" onclick="toggleServerDropdown(event)">
          <span id="currentServerName">${escHTML(MAIN_SERVERS[0].name)}</span>
          <span class="chev">▼</span>
        </button>
        <div class="server-dropdown-menu" id="serverDropdownMenu">
          ${MAIN_SERVERS.map((s, i) => `
            <div class="server-dropdown-item${i === 0 ? ' active' : ''}" data-server="${s.id}"
                 onclick="selectMainServer('${s.id}', '${escHTML(s.name)}', this)">${escHTML(s.name)}</div>`).join('')}
        </div>
      </div>
      <div id="proxyToggle" class="proxy-toggle-wrap active">
        <div class="proxy-switch">
          <div class="proxy-switch-track"></div>
          <div class="proxy-switch-thumb"></div>
        </div>
        <span class="proxy-toggle-label">Route through Proxy</span>
      </div>
    </div>
  `;
}

function buildPlayerIframe(url) {
  return `<iframe src="${escHTML(url)}" width="100%" height="100%" style="border:none;"
            sandbox="${LOCKED_SANDBOX}" allowfullscreen
            allow="autoplay *; fullscreen *; picture-in-picture *; encrypted-media *"></iframe>`;
}

// Builds the embed URL for a server and, if the proxy toggle is on, runs it
// through Scramjet. Every server goes through this — there's no un-proxied
// path anymore.
function resolveStreamUrl(server, videoId) {
  const raw = server.build(videoId);
  const useProxy = document.getElementById('proxyToggle')?.classList.contains('active');
  if (useProxy && scramjet) {
    try { return location.origin + scramjet.encodeUrl(raw); }
    catch (err) { console.warn('[Ludus YouTube] Proxy encoding failed:', err); }
  }
  return raw;
}

function mountPlayer(videoId) {
  _currentVideoId = videoId;
  const wrap = document.getElementById('ludus-player-wrap');
  if (wrap) wrap.innerHTML = buildPlayerIframe(resolveStreamUrl(MAIN_SERVERS[0], videoId));

  document.querySelectorAll('.server-dropdown-item').forEach(i => i.classList.remove('active'));
  const first = document.querySelector(`.server-dropdown-item[data-server="${MAIN_SERVERS[0].id}"]`);
  if (first) first.classList.add('active');
  const nameEl = document.getElementById('currentServerName');
  if (nameEl) nameEl.textContent = MAIN_SERVERS[0].name;
}

function selectMainServer(serverId, name, el) {
  document.querySelectorAll('.server-dropdown-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  const nameEl = document.getElementById('currentServerName');
  if (nameEl) nameEl.textContent = name;
  document.getElementById('serverDropdownMenu')?.classList.remove('open');

  const server = MAIN_SERVERS.find(s => s.id === serverId);
  if (!server || !_currentVideoId) return;
  const wrap = document.getElementById('ludus-player-wrap');
  if (wrap) wrap.innerHTML = buildPlayerIframe(resolveStreamUrl(server, _currentVideoId));
}

function toggleServerDropdown(e) {
  e.stopPropagation();
  document.getElementById('serverDropdownMenu')?.classList.toggle('open');
}

// Proxy toggle (re-mounts the current server through/around Scramjet) +
// outside-click handling — registered once via delegation.
(function initServerControlsGlobalHandlers() {
  document.addEventListener('click', e => {
    const proxyTgl = e.target.closest('#proxyToggle');
    if (proxyTgl) {
      proxyTgl.classList.toggle('active');
      if (_currentVideoId) {
        const activeItem = document.querySelector('.server-dropdown-item.active');
        const server = MAIN_SERVERS.find(s => s.id === activeItem?.dataset.server) || MAIN_SERVERS[0];
        const wrap = document.getElementById('ludus-player-wrap');
        if (wrap) wrap.innerHTML = buildPlayerIframe(resolveStreamUrl(server, _currentVideoId));
      }
      return;
    }
    if (!e.target.closest('#serverControls')) {
      document.getElementById('serverDropdownMenu')?.classList.remove('open');
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.getElementById('serverDropdownMenu')?.classList.remove('open');
  });
})();


/* ═══════════════════════════════════════════════════════════════════════════
   BOOTSTRAP
   ═══════════════════════════════════════════════════════════════════════════ */

dispatch();
