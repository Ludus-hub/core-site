# Ludus site: handoff

Updated after the download-engine verification round and the merge of the 2026-10-29 build (section 2b). Everything below is what exists in the delivered files, what was verified and how,
and what is still to do. If you only have a minute: section 3 (download engine, now done and verified) and section 4 (what is left).

## 1. Project at a glance

- Static site hosted on **Surge** (`mathmaster-tx.surge.sh`). Surge forces `Cache-Control: max-age=0, must-revalidate`
  and cannot be configured (so the "Add Expires headers" speed-test grade cannot be fixed from the files; see `PERFORMANCE.md`).
- `index.html` hosts apps as same-origin iframes: Music (`music.html`), Movies (`movie.html`), YouTube (`yt.html`),
  Drive (`file-all.html`, includes the yt-mp4 downloader), Calculator, proxy (`p/`), chat.
- A Node "resolver" (`yt.js`, runs on the owner's PC with yt-dlp, exposed through zrok/Cloudflare tunnels) serves
  `/health /search /mix /resolve /stream /lyrics /credits /info /quizlet`. Servers are listed in **one** file:
  `ludus-servers.js`.
- `ludus-core.js` is the one shared script every page loads (resolver client, server monitor + picker, loading protocol,
  app lifecycle, memory trim).
- Line endings differ per file and were preserved: CRLF = music.html, movie.html, file-all.html, script.js, index.html,
  chat.html, insta.html, style.css; LF = yt.html, auth.js, ludus-core.js, sw*.js, yt.js. Edit with a tool that keeps them.
- **Every deploy:** `node tools/stamp-assets.mjs` (adds `?v=<hash>` to first-party script/css references; `--check` to verify).
  Re-run after editing ANY js/css that is stamped (`script.js auth.js ludus-core.js style.css`). Delivered pages are stamped
  for the delivered files.

## 2. DONE (all rounds), by area, with verification status

Verification key: **T** = automated test passed in headless Chromium or Node; **S** = syntax-checked only; **U** = untested.

### Shared core and servers
- `ludus-core.js` (new, replaces `loading-protocol.js`): resolver client (stored server validated against the list; shared health
  cache; per-request failover; zrok header; visible banner if the list is missing), server **monitor** (checks all servers + speed,
  connects to fastest, re-checks every 30 s, hysteresis, manual pick respected) and shared **picker** component (skins
  `music` and `streamer`), app lifecycle (lazy frames, idle unload, lag/heap relief, `deliver()` wakes a sleeping app for the
  mixer, mixer hidden while Music is open via body class `ludus-no-mixer`), memory trim registry. **T** (coretest 17, appstest 24, montest 13).
- `ludus-servers.js`: data only + developer inspector. No app keeps its own server URLs any more. **T**
- "music app setup" (the owner's term) = what the monitor/picker does; Music, Movie, YouTube, Drive all use it. **T**

### Apps
- **Music (`music.html`)**: shared picker; search/mix/lyrics go through core failover; zrok songs stream directly (service worker adds
  the header) with automatic fallback to the old buffered-Blob route; preview URL no longer clobbers the playing song; caches capped;
  parent updates throttled; hidden-frame DOM updates skipped; smart **Previous** (>30 s restarts); **queue drag-and-drop** (grip handle,
  mouse/touch, autoscroll, arrow buttons kept); **History** page (day groups, play counts, Play all, Clear); **download progress tray**;
  **folder-backed downloads** (users with a linked backup folder keep only metadata in the browser; audio is read from the folder
  per play into memory and released when the next song starts; verified-then-evicted from IndexedDB; users without a folder keep
  the 256 MB IndexedDB behaviour); lyrics **provider dropdown** (per song) + **default provider** in Settings; **songwriter credits** footer;
  nav no longer wraps. **T** (folder 11, newfeatures 15 before the engine rewrite, prevlyrics 9, lyrics2 13, drag).
- **Music download engine**: see section 3 (written, only smoke-tested).
- **Movie (`movie.html`)**: trailer player builds the full streamer interface first, then loads the video into it; shared streamer-skin
  server picker inside the controls; failure shows Try again + picker stays usable; picking a server reloads the video. **T**
- **YouTube (`yt.html`)**: merged status+selector (music skin), "connected to server" no longer cut off; player starts on the fastest
  server and falls back in speed order; per-request failover; startup failure no longer cached forever. **T**
- **Drive (`file-all.html`)**: tunnel traffic bypasses Conduit; shared picker; **yt-mp4 retry**: per-item Retry + "Retry all failed (N)", one
  shared queue (retries never overlap a running batch, they use the quality/language selected at retry time). **T**
- **Index (`index.html`, `script.js`)**: Music/Movies/YouTube/Calculator frames load on first open (`about:blank` + `data-src`);
  the old lag-recovery and idle blocks removed (core owns them); mixer commands wake sleeping apps; `ludus-servers.js` and
  `ludus-core.js` moved out of `<head>`; preconnects added. **T** (indextest)
- **Mixer −10/+10 (latest change, U visually)**: only the index mixer's YouTube/Movie buttons were changed: text `−10` / `+10` with class
  `m-btn m-seek` (CSS in `style.css`, accent colour, 10.5 px, weight 800, like Music's `.seek-jump`). The Music app's own buttons, the
  YouTube relay player and the Movie trailer controls were put back to their ORIGINAL text. (An earlier attempt with reload-style SVG
  icons was reverted at the owner's request.)

### Resolver (`yt.js`, version string `proxy-v5`)
- Shared job runner: TTL cache, in-flight de-dupe, concurrency cap 3 (`YT_MAX_JOBS`), 60 s process timeout (`YT_JOB_TIMEOUT_MS`),
  queue limit 40. `/health` reports load + `lyricProviders`. **T** (spawn counts, concurrency peak = 3).
- **Lyrics**: SimpMusic removed. Auto chain = LRCLIB, then YouTube captions, then backups from `lyrics-providers.json` (hot-reloaded).
  Generic backup adapter understands LRC text, Apple-style TTML and common JSON shapes. **T** (lyrtest 10 + chain test against a local mock).
  The file ships with **empty URLs** for `lrcred`, `qapple`, `bini` (see section 4, item 1).
- **Credits (`/credits`)**: reads "Composer / Lyricist / Writer / Songwriter / Author" lines from the video description first
  (YouTube Music "Provided to YouTube by" uploads; costs no extra request because the info is already cached for playback),
  MusicBrainz as fallback (rate-limited 1/s, 24 h cache; failures not cached). **T** (parser + end-to-end through the real server;
  MusicBrainz tested only against mocked responses, never live).
- CORS preflight cache `Access-Control-Max-Age: 7200` (chunked downloads make many requests). Range already supported by `/stream`.

### Delivery / caching
- `sw.js` + new `sw-static-cache.js`: repeat-visit cache for root-level `?v=` scripts/styles and `/Versions/Assets/Pictures/` only; never pages,
  `ludus-servers.js`, `sw.js`, `/p/*`, proxied URLs, Range or cross-origin. Refreshes in the background after 6 h/24 h. Remove the
  `importScripts("/sw-static-cache.js")` line in `sw.js` to disable. **T** (13 checks with real `sw.js` and a stubbed Scramjet).
- `tools/stamp-assets.mjs`, `_headers` (Cloudflare/Netlify only), `budget.json` (Lighthouse), `PERFORMANCE.md`. **T** (stamp tool); Lighthouse never run.
- `style.css`: login background image 2564px/q80 → 1280px/q60 (it sits under a 30 px blur).
- `auth.js`: resolver keys excluded from cloud saves; autosave only when something changed (fingerprint of synced localStorage minus
  `ludus_music_playback`, a game is open, or 10 min), pauses 30 min after a "too large" error, waits when heap is high. **S/T**

### Bugs found and fixed along the way (so nobody re-introduces them)
1. Music downloads always asked **Server 1** (`state.resolver`) so a dead Server 1 cost 30 s per song.
2. A **stalled download hung forever** (no read timeout).
3. A song over 32 MB threw `StorageFullError` and the batch loop treated it as "storage is full" and **stopped the whole batch**.
4. Lyrics lookups tried every server in turn at 15 s each (up to 60 s for a song without lyrics) inside each download.
5. `yt.html` cached a failed startup health check forever; developer URL overrides never took effect.
6. Lag recovery had a 30 s cooldown from page load (first relief blocked); frames without `data-src` could be unloaded unrecoverably.
7. Stale "removed server" kept being tried first because of the saved `ludus_active_resolver`.
8. Movie player: the loader covered the controls, so a failing server left no way to switch.
9. Music cloud-save/`ludus_music_offline_*`: credits/lyrics lines carry `writers`; `rememberLyrics` preserves them.
10. Credits via MusicBrainz alone were unreliable for the owner ("credits aren't there"): description parsing added as primary source.
    Remember: the owner must **redeploy and restart `yt.js`** or `/credits` does not exist (an old resolver returns 404 and the footer stays empty).
11. **Download engine fetched the first 1 MB alone** just to learn the file size, so chunking gave ~53% of single-stream time instead of ~25%.
    Fixed: the first answer's headers (`Content-Range`, or `Content-Length` on a 200) start the other pieces at once (now 29%).
12. **The 8-piece pool starved the rest of the app.** Browsers allow 6 connections per server (HTTP/1.1), so extra pieces queued inside the browser and
    every other request to the resolver (search, play, lyrics, server-monitor probes) waited ~3 s behind a piece. Fixed: `CHUNK_CONNECTIONS = 5` leaves one free.
13. **Stop did not fully stop:** pieces already queued behind the pool still started after Stop (`fetchRange` ignored an already-aborted signal). Fixed.
14. Servers without Range support lost the percentage/total in the tray; and the tray said "Finding the stream…" during the whole download (the engine never
    switched the label to "Downloading"). Fixed.
15. Mixer `−10` / `+10` buttons: the `.m-btn.m-seek` style (10.5px, bold) lost to the generic `button:not(.dock-btn):not(.viewer-btn-spot)` rule on
    specificity, so it never applied. Fixed in `style.css` (selector now matches the generic rule's `:not()` guards). The resting colour stays white because
    `#mixer-dock button.m-btn { color:#fff }` (accent colour on hover) is deliberate and was left alone.

### 2b. Merged from the 2026-10-29 build (this round)
Taken from `Ludus_Site_completed_2026-10-29.zip` into the download-engine build. Verified in headless Chromium (**T**) unless noted.
- **`ludus-servers.js`** (replaces `resolver-servers.js`, which is now a placeholder): one directory for YouTube resolver servers AND proxy (Wisp) servers;
  personal servers are stored under `ludus_custom_yt_servers` / `ludus_custom_proxy_servers` (old `ludus_music_custom_resolver` and `ludus_cfg.wispUrl` are migrated).
  The developer server map (inspector) was kept and now lives at the end of this file. **T**
- **Proxy fix:** every Scramjet user (chat, insta, Music, Movie, YouTube, Drive, index Proxy settings, `p/index.html`) takes its Wisp URL from
  `LudusServers.proxy.active()` instead of a hard-coded address; `p/index.html` is the fixed proxy browser (needs `/ludus-servers.js` and your existing `/p/scram/`). **T** (directory, settings UI); **U** against a live Wisp server.
- **Settings → Shared Server Directory** in `index.html` (add resolver / proxy servers for every app). **T**
- **Calculator + GPA:** `Versions/Assets/Apps/calc.html` replaced by the new version. **T** (loads; GPA UI present; its CDN libs need internet).
- **yt.html:** "← Back" button on the watch page, leaving the watch page stops playback. **T** (functions present; **U** visually).
- **music.html:** play button and per-song download button show a spinner instead of "…". **U** visually.
- **NOT taken on purpose:** the circular-arrow SVG icons for the 10-second buttons (the owner had reverted those; text `−10`/`+10` stays), and the older music.html download/lyrics code (the new engine and provider list stay).
- **Bug fixed: download tray ran off the right edge.** The tray is a CSS grid whose single column was sized to the longest no-wrap title, so cards grew wider than the screen
  (726 px at a 338 px viewport) and the title never got its ellipsis. Fix: `grid-template-columns: minmax(0,1fr)`, `min-width:0`/`max-width:100%` on the cards, left/right insets with safe-area, long status/failure text wraps. **T** (cards now 314 px at 338 px, 360 px max at wide sizes, ellipsis active).

### 2c. Round 3: yt-mp4 uses the Music downloader, credits from third parties, faster startup
- **yt-mp4 (`file-all.html`) now uses the Music engine design:** parallel 1 MB range pieces (5 connections), each piece retried alone with a 20 s stall watchdog,
  video and audio of one file download at the same time, two files at once, a failed file retries with a fresh link (3 attempts), single-threaded ffmpeg mux is the only serial step.
  Tested in headless Chromium with a mock resolver that returned a 503 for one piece and cut the connection in the middle of another: all four streams arrived byte-identical. **T**
  Not tested: real ffmpeg (a recording fake was used) and real YouTube streams. **U**
- **Credits in yt-mp4:** each file gets a `/credits` lookup in the background; names are written into the file (`composer`, `comment`, plus `title`/`artist`) and shown in the job row. **T** (tags passed to ffmpeg); **U** (that players show them).
- **Resolver (`yt.js`, delivered separately):** `/credits` now tries YouTube description -> MusicBrainz + Genius (together, MusicBrainz preferred) -> every enabled entry in `credits-providers.json`
  (hot-reloaded, any JSON API, `{title}` `{artist}` templates, dotted path with `*`). The answer carries `tried` (what each source returned) so coverage is easy to see. `/resolve` also returns `author` and `duration`.
  "Artist - Song" titles are split before lookup. If every source errors the answer is not cached. **T** with mocked MusicBrainz/Genius. **U**: the real Genius/MusicBrainz were not reachable from the test machine.
- **Startup:** `auth.js` (Firebase, four scripts from gstatic.com) was a module script, so it held back `DOMContentLoaded` and every page feature waited for it. Now: `preconnect` + `modulepreload` fetch it all in parallel from the first moment,
  it only RUNS after the page is ready, and the few buttons that need it wait for it instead of failing. Measured with stand-in Firebase files on a throttled link: page ready 860 -> 639 ms at 1 MB/s, 607 -> 460 ms at 6 MB/s. **T** (relative, estimated file sizes).
  `tools/stamp-assets.mjs` now also stamps `rel="modulepreload"` links to our own files.
- **Not done (ideas):** load Firestore/Realtime Database only after a user is detected (about half of the Firebase bytes, but `auth.js` uses them in many places); cache the versioned Firebase files in the service worker.

### 2d. Round 4, batch A (5 items; verified in headless Chromium, 26 checks)
- **Apps stay open while busy:** `LudusCore.apps.isProtected` now also covers running downloads (Music and the Drive/yt-mp4 converter report `{source, downloads}` every second; silence for 90 s = finished) and an open Movies player. Idle unloading AND the lag/memory relief skip those apps. **T** (message handling + real unload path); **U** with real long downloads.
- **Proxy fastest server + failover (`ludus-servers.js`):** every Wisp server is probed (WebSocket open time), cached for all apps (`ludus_proxy_health`, 60 s), unreachable ones are "unavailable" for 2 min, and `LudusServers.proxy.active()` is the fastest available one (a server picked by hand is used unless it is down). Pages that load the proxy (not `/p/`) show a pill "The proxy server is not responding. [Load with another server]" when their server stops answering; it reloads onto the fastest working one and never shows an address. **T** with local fast/slow/dead servers. **U** against real Wisp servers.
- **Movies, developer:** developers get every server (9) whether the proxy switch is on or off; everyone else keeps the proxy-on (8) / proxy-off (3) sets. **T**
- **Movie dock toggle:** Settings > Viewing Controls > Movie Player. ON = old behaviour (dock slides to the top and collapses). OFF = dock stays put, is hidden behind the movie while it plays and returns when it closes. **T**
- **Settings:** removed the Performance tab (idle auto-close still runs with its defaults: on, 60 s, unload), Game Library Defaults and Movies App Defaults. **T**
- **Still to do from the round-4 list:** shared server directory UI (blank, several entries), tab-disguise presets (many + custom), credits (all games, APIs and services), calculator (final-exam grade + unweighted GPA), startup/slow-connection mode.

### 2e. Round 4, batch B (verified in headless Chromium; 94 checks across 5 suites)
- **Calculator (`Versions/Assets/Apps/calc.html`):** new "Final Exam Needed" section in the Grade calculator (Trimester or Semester; term average fills in from Term 1-3 or can be typed; exam weight and goal are custom numbers; also shows what is needed for a 90 / 80 / 70). Needed = (goal - average x (1 - weight)) / weight. The GPA calculator now has a current UNWEIGHTED GPA field next to the weighted one, each averaged with its own calculated GPA. New inputs sit at the end of each tool so saved tabs restore correctly. **T** (14 checks)
- **Idle auto-close removed completely** (core timers, settings, keys). Apps stay loaded; memory/lag relief still skips apps that are playing, downloading or have the Movies player open. The dock Home button now closes the open game. **T**
- **Settings > Your Servers:** blank lists for YouTube/Music and proxy servers, any number of entries (paste several, comma/newline separated), each removable; no built-in servers, labels or counts are shown. **T** (8 checks)
- **Light mode / startup:** Settings > Viewing Controls > Connection (Auto / Light / Full). Light loads only style, script and sign-in: no pictures (game tiles are plain until "Load pictures" is tapped), no analytics, no background proxy probing, apps and the game collection list load only when opened. Auto turns it on for data-saver / slow / under 2.5 Mbps connections and for a day after a very slow start. Credits moved out of script.js to `credits-data.js` (loaded when the Credits tab opens; script.js 314 KB -> 244 KB). Analytics and Firebase hints no longer compete with the core. At a true 1 Mbps: page ready 3345 -> 2457 ms (full) / 1086 ms (light), first paint 1472 -> 752 ms (light). Firebase and analytics were stand-in files of estimated size. **T**
- **Mobile proxy: `p/mobile.html`, a SEPARATE file from `p/index.html`.** Phone-sized layout (bottom bar, tab switcher, bottom sheets, 44 px+ targets), same Scramjet engine, fastest-server selection, shared bookmarks/history/shortcuts/settings keys, same restriction (YouTube is sent to the dedicated YouTube app, "Proceed Anyways" continues), popup guard, tabs restored after a reload. Phones (touch + width <= 820 px) open it automatically from the Proxy app; `p/index.html` is unchanged except that it now uses the fastest proxy server. **T** with a stand-in Scramjet; **U** against the real engine. There is no adult-content filter in either proxy file.
- **Still to do:** tab-disguise presets (many + custom), comprehensive credits (all games, APIs, services).

## 3. DONE: Music download engine (verified)

Problem reported: ~10 hours to download ~30 songs; sometimes stops after one fails. Owner suggested borrowing from yt-mp4 (finding: yt-mp4 is
fast mainly because it does only resolve + fetch per item; Music did a lot more per song, serially).

Implemented in `music.html` (search for `// ── Download engine`):
- `netPool` (songs at once; Settings → "Songs downloaded at once", key `ludus_music_download_parallel`, default 3), `cpuPool` (compression, 1),
  `chunkPool` (`CHUNK_CONNECTIONS` = 5 range requests in flight overall; see bug 12 for why not more), `extrasPool` (lyrics/video/folder copy, 2).
- `downloadChunked`: the first request is `Range: bytes=0-1048575`. As soon as its **headers** arrive they give the total size (`Content-Range`; on a 200
  answer, `Content-Length`), the tray switches to "Downloading", the free-space check (`beforeBody`) runs, and up to 4 more 1 MB pieces start in parallel while the
  first is still arriving. Each piece has a 20 s no-data watchdog and 3 tries (backoff 0.6 s × attempt); a 200 answer (no Range support) is one stream;
  403/404/410 → song-level retry with a fresh link; `TooLargeError` (>32 MB) is refused from the headers alone and is a normal failure, not "storage full".
  The first real error wins; aborts it causes are ignored. Stop aborts queued pieces too.
- `downloadSong`: 3 attempts, 3 s then 6 s waits, never retries permanent errors (unavailable/private/etc.).
- `storeDownload` (compress in its own queue, then save; compression is OFF by default), `scheduleExtras` (mirror to folder immediately, lyrics fast mode, optional video).
- `runDownloadBatch` / `savePlaylistOffline`: everything queued at once; failures never stop the batch; only Stop or a really full store does;
  tray job card lists failed songs with reasons and **Retry failed**; single failed downloads get a row **Retry** button. The "Stop · N of M done" count
  now counts only songs that actually finished.

Verification (all against `tests/browser/mock.js`, see section 5; timings are against the mock, never against the live resolver):

| Check | Result |
|---|---|
| Speed (4 MB at ~300 KB/s per connection) | 4.0 s vs 14.1 s single stream = 29%; sha-256 of saved bytes equals the server's |
| Flaky pieces (first request of each piece 500/reset) | saved, exact bytes (sha-256) |
| Piece that goes silent | 20 s watchdog, retried, saved in ~21 s; byte counter never exceeds total |
| Batch of 6 (1 always failing, 1 "40 MB", 4 good) | 4 saved, 2 listed with reasons, batch not halted; the 40 MB song costs 1 request; Retry failed works after the server is fixed |
| Stop (tray button and the Download-all button) | connections closed, nothing new starts, no partial song saved, card says stopped |
| Stop while pieces are queued | no request starts after Stop (the ORIGINAL engine started one: bug 13) |
| Responsiveness | a `/health` request during a saturated batch takes ~20 ms (the original engine: ~3000 ms: bug 12) |
| Settings `#download-parallel` | persists across reload; 1 → one song at a time, 3 → three |
| Single-download Retry | failure shows reason + Retry; works after the server is fixed |
| Hung stream + Stop | Stop ends it in < 3 s |

Final regression on the delivered files: unit 85/85 (`coretest 17, appstest 24, montest 13, mbtest 16, lyrtest 10, wfp 5`), browser `smoke` OK (no JS errors),
`folder 11, prevlyrics 9, lyrics2 13, indextest 13, newfeatures 15`, `downloads` 69 (ten suites). `tests/newfeatures.js` stall test was rewritten (see below).

Known limits / decisions for the owner:
- **Time to give up on a stream that never delivers is NOT measured.** By arithmetic: each piece tries 3 × 20 s (+1.8 s backoff) ≈ 62 s, and a song gets 3 attempts
  with 3 s and 6 s waits ≈ 3 min 15 s, holding one of the 3 song slots. A *transient* stall recovers in ~21 s (measured). `tests/browser/giveup.js` measures it
  (`run.sh giveup 290`); it was fixed after a failed first attempt but has NOT been run. If 3 minutes is too long, lower `CHUNK_RETRIES` for stalls only.
- `CHUNK_CONNECTIONS = 5` trades ~1/6 of peak parallelism for a responsive app. Hosts served over HTTP/2 have no 6-connection limit, so there 6-8 would also be safe.
- "Retry failed" is also offered when every failure is permanent (e.g. over 32 MB), where retrying can never succeed.
- Several static strings in `music.html` (Settings help text, the Download-all tooltip) still say **1 GB**; the code limit is `OFFLINE_MAX_BYTES` = **256 MB**
  (the live storage meter and error toasts use the constant and are correct). Not changed: the owner must say which limit is intended.

## 4. TO DO (not started or blocked)

1. **Backup lyrics endpoints (blocked on the owner).** Owner wants **lrc.red, QApple, Bini Lyrics, am-lyrics** as backups used only if YouTube and
   LRCLIB fail. I could not verify any of those APIs from the sandbox (no network; QApple not found at all; lrc.red/Bini request formats not
   documented in what I could read). Done: am-lyrics is integrated client-side as the last resort (loaded from
   `cdn.jsdelivr.net/npm/@uimaxbai/am-lyrics@1.5.6`, attributes `song-title song-artist song-album song-duration(ms) query highlight-color`, property
   `currentTime` in ms, event `line-click` with `detail.timestamp` in ms; tested only against a stub element, **not the real component**; its README says
   it uses the LyricsPlus API with an Apple Music fallback, so do not claim it covers lrc.red/Bini). For lrc.red / QApple / Bini: ask the owner for the
   request URL pattern and a sample response for each and fill `lyrics-providers.json` (placeholders `{title} {artist} {album} {duration} {durationMs}
   {query} {videoId}`; answer may be LRC, TTML or JSON). Blank entries are hidden from the dropdown.
2. **Startup speed (NOT STARTED).** Owner: first load is slow and sometimes times out so even `script.js` doesn't arrive; target "decent on 1-3 Mbit/s";
   plus a Settings option to choose which apps load first or not at all. Findings so far (from the Pingdom HAR): HTML 69 KB raw/15 KB gz; `script.js` 315 KB
   raw/71 KB gz (parser-blocking at end of body; contains a huge games array around line 3170); `style.css` 72 KB raw; `auth.js` 13 KB which imports Firebase
   modules from gstatic (serial waterfall after auth.js arrives); Google Tag Manager 181 KB loaded `async` in head (competes for bandwidth); login
   background image (already shrunk); Surge TTFB 0.4–0.8 s per request. Ideas, roughly by value/risk:
   a. Load GTM after `load` + idle (the `dataLayer` stub already queues events); skip on Save-Data.
   b. `<link rel="modulepreload">` for `auth.js` and its Firebase imports + preconnect to gstatic, to remove the serial waterfall.
   c. Move the games data out of `script.js` into a separate async file (render the first cards from a small chunk); check how `script.js` consumes it.
   d. Boot watchdog and retry: tiny inline script that retries `script.js`/`ludus-core.js` on error and shows a "slow connection, tap to retry" message after ~15 s.
   e. Startup profile in Settings: Auto (uses `navigator.connection.effectiveType/saveData`), Lite, Standard, Full; per-app "preload in background after startup"
      with an order, and "never preload"; default = nothing preloaded (apps already lazy-load). Natural home: `ludus-core.js` `apps` + `script.js` settings UI
      (existing idle-settings code is the pattern; keys `ludus_idle_*`).
   f. Measure with Chromium CDP `Network.emulateNetworkConditions` (~1.5 Mbit/s, 150 ms RTT); third-party hosts can be mapped to a local HTTPS server with
      `--host-resolver-rules` + `--ignore-certificate-errors` so throttling applies. `route.fulfill` bypasses throttling, so do not use it for timing.
   g. Minifying JS/CSS would help but needs a trusted minifier (none available offline); do not hand-roll one.
3. Optional: measure the give-up time of the download engine on a dead stream (`run.sh giveup 290`; see section 3, "Known limits").
4. Optional: run Lighthouse (DevTools tab or `npx lighthouse https://mathmaster-tx.surge.sh --budget-path=budget.json --view`) before/after startup work.
5. If hosting moves to Cloudflare: deploy with `_headers`; the Expires-header grade then passes.

## 5. Test harness (in `Ludus_test_harness.zip`)

Plain Node scripts + Playwright (Chromium). **Run `tests/setup.sh` first**: it creates the layout the scripts expect (they have hard-coded paths): site at
`/home/claude/site/Ludus Site`, browser scripts in `/tmp/pw`, unit tests in `/tmp`, fake yt-dlp in `/tmp/yttest`, source symlinks in `/home/claude/out`
(`ludus-core.js sw.js sw-static-cache.js ludus-servers.js yt.js`), Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, Playwright at
`/home/claude/.npm-global/lib/node_modules/playwright`. Adjust those if your machine differs. Background servers do not survive between shell calls in that
sandbox: start and stop them inside the same command (`run.sh` does).
- Unit (Node): `coretest.js appstest.js montest.js mbtest.js lyrtest.js wfp.js` (85 checks).
- Browser: `./run.sh <suite> <timeout-seconds> [suite args]` starts a static server (18080) + `mock.js` (18777), runs `<suite>.js`, stops both.
  Suites: `smoke folder prevlyrics lyrics2 newfeatures indextest downloads`. `downloads` takes suite names: `speed flaky hang batch stop settings retry queued stall responsive`
  (e.g. `./run.sh downloads 200 speed flaky hang batch queued responsive stall`, then `./run.sh downloads 200 stop settings retry`; ~4 min in total).
  `giveup.js` is a single 3-minute measurement, not a pass/fail suite. `mixer-visual.js` prints/captures the mixer −10/+10 buttons (`mixer.png`).
  `runfolder.sh`/`runall.sh`/`runui.sh` (older runners) use real `yt.js` with the fake yt-dlp on 18765/18766; `runsw.sh` tests the service worker.
- `mock.js` is a fake resolver that serves real bytes. Older ids: `P…` playable WAV (Range), `Q…` WAV streamed slowly, `Y…` half then silence (ignores Range),
  `S…` slow garbage, `Z…` half then silence; other ids = 330 KB deterministic. **Added for the download engine** (first letter picks the behaviour; ids are 11 chars):
  `G…` fast ranged 2.5 MB, `T…` ranged 4 MB at ~300 KB/s per connection, `F…` ranged 3 MB where the first request for each piece fails (500 / reset),
  `H…` ranged 3 MB where the first request for the 2nd piece sends half its bytes then goes silent, `L…` claims 40 MB (never sends it),
  `X…` ranged 2.5 MB answering 500 until `/_unblock?id=`. Bytes are deterministic, so tests compare sha-256 (`/_sha?id=`). `/_stats` (open/peak connections,
  peak songs, every request with its Range header and time) and `/_reset` let tests measure concurrency instead of guessing.
- Known harness notes: use `serviceWorkers: 'block'` when loading `index.html` (Scramjet's worker hangs navigation offline); the drag test can flake when run
  after other UI suites (timing only). The Scramjet proxy bundle (`/p/scram/`) is not part of the site zip, so `Core bundle not loaded — check /p/scram/ deployment`
  can appear as a JS error: environment noise (the new suites filter exactly that message). `#resolver-settings` is not mouse-clickable in the default layout:
  click it with `page.evaluate(() => document.querySelector('#resolver-settings').click())`. The mixer −10/+10 buttons are inside the movie section, hidden
  until a movie plays; `indextest` reads them without showing them.

## 6. Deploy checklist
1. Copy the site files over the site (see `DEPLOY.txt` in the site zip). Delete `loading-protocol.js` if still present.
2. Put `yt.js` **and** `lyrics-providers.json` on the resolver PC, restart `yt.js` (needed for caching, lyrics chain, `/credits`, CORS cache).
3. `node tools/stamp-assets.mjs --check` (re-run without `--check` after any js/css edit).
4. Add `tools PERFORMANCE.md budget.json _headers HANDOFF.md` to `.surgeignore`.
