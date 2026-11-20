# Ludus speed: what the test found and what was done

## The finding (F23 "Add Expires headers")
Your HAR shows every file answered by **Surge** with `Cache-Control: public, max-age=0, must-revalidate`, which means
"re-ask the server on every visit" (the server then replies 304, but that still costs a round trip: 0.4–0.8 s each in
the test). The tester grades exactly that header.

**Surge does not let a site change its cache headers**, so no file in the site can raise that grade while it is hosted on
Surge. Two real ways to fix the grade:

1. **Host with a CDN that honours headers.** The project already has `wrangler.jsonc` for Cloudflare. Deploying there
   (`npx wrangler deploy`) uses the `_headers` file in this folder: HTML, `sw.js` and `ludus-servers.js` are always
   re-checked; stamped code is cached for a year; game thumbnails for 30 days. Netlify and Cloudflare Pages read the same file.
2. **Put Cloudflare (free) in front of Surge** and set a Browser Cache TTL.

Until then, the service-worker cache below gives returning visitors the same benefit on Surge.

## What changed
| File | Change |
|---|---|
| `sw-static-cache.js` (new) + `sw.js` | Returning visitors get your own scripts/styles (stamped `?v=`) and `/Versions/Assets/Pictures/` thumbnails from the browser's copy instantly; each is re-checked in the background after 6 h (code) / 24 h (images). **Never** cached: pages, `ludus-servers.js` (server list), `sw.js`, `/p/*`, proxied traffic, Range requests. Hard reload bypasses it. |
| `tools/stamp-assets.mjs` (new) | Puts a content hash on each first-party script/stylesheet reference (`script.js?v=0f8872b179`), so a changed file is always a new URL. Never stamps `ludus-servers.js`, `sw.js` or `/p/*`. |
| `_headers` (new) | Cache rules for Cloudflare/Netlify (ignored by Surge). |
| `index.html` | `ludus-servers.js` and `ludus-core.js` moved out of `<head>` (they were blocking first paint); preconnect to the image and analytics hosts. |
| `style.css` | Login/tour background: 2564 px q80 (223 KB) → 1280 px q60. It sits under a 30 px blur and a dark overlay, so nothing visible changes. |
| `budget.json` (new) | Performance budget for Lighthouse. |

## Every deploy
1. `node tools/stamp-assets.mjs` (use `--check` to only verify; it exits 1 if a stamp is stale).
2. Deploy. Add `tools`, `PERFORMANCE.md`, `budget.json` to `.surgeignore` so they aren't published.

If you forget step 1, nothing breaks: the service worker re-checks stamped files in the background, so the new version
arrives one load late. `ludus-servers.js` is never cached, so changing the server list always takes effect immediately.

## Turning the cache off
Delete the `importScripts("/sw-static-cache.js")` line in `sw.js` (or the file itself): the worker goes back to caching nothing.

## Lighthouse
- Quickest: Chrome DevTools → **Lighthouse** tab → Analyze (mobile and desktop), or pagespeed.web.dev.
- Command line (needs Node): `npx lighthouse https://mathmaster-tx.surge.sh --budget-path=budget.json --view`
- Compare a first visit with a second visit: the second should show the stamped files and thumbnails served from the service worker.
