#!/usr/bin/env node
/*
 * stamp-assets.mjs — gives every first-party script and stylesheet a content-hash version in the pages that load it.
 *
 *   node tools/stamp-assets.mjs            stamp (rewrites  script.js  ->  script.js?v=3fa91c2b0d  in the HTML pages)
 *   node tools/stamp-assets.mjs --check    only report; exit code 1 if any stamp is out of date (use before deploying)
 *   node tools/stamp-assets.mjs <siteDir>  use a different site folder (default: the folder above tools/)
 *
 * Why: a file can only be cached for a long time safely if its URL changes whenever its content does. The hash is taken
 * from the file's bytes, so editing script.js changes the stamp and every browser fetches the new file; unchanged files
 * keep their stamp and stay cached. Run it before every deploy.
 *
 * Never stamped (must always be fresh): ludus-servers.js (the server directory), sw.js, sw-static-cache.js.
 * Left alone on purpose: anything under /p/ (the Scramjet proxy bundle).
 * Pages scanned: *.html in the site root and in Versions/Assets/Apps/.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const siteArg = args.find(arg => !arg.startsWith('--'));
const root = path.resolve(siteArg || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const NEVER = new Set(['ludus-servers.js', 'resolver-servers.js', 'sw.js', 'sw-static-cache.js']);

const pages = [];
for (const dir of [root, path.join(root, 'Versions', 'Assets', 'Apps')]) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) if (/\.html?$/i.test(name)) pages.push(path.join(dir, name));
}

const hashOf = new Map();
const fileHash = file => {
  if (!hashOf.has(file)) hashOf.set(file, crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 10));
  return hashOf.get(file);
};

const TAG = /<(script|link)\b[^>]*>/gi;
let changed = 0, stampedFiles = new Set();
const stale = [];

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const out = html.replace(TAG, tag => {
    const isLink = /^<link/i.test(tag);
    if (isLink && !/\brel\s*=\s*["']stylesheet["']/i.test(tag)) return tag;
    const attr = isLink ? 'href' : 'src';
    const match = tag.match(new RegExp(`\\b${attr}\\s*=\\s*"([^"]*)"`, 'i'));
    if (!match) return tag;
    const value = match[1];
    if (!value || /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value) || /^(?:data|blob|javascript):/i.test(value)) return tag;
    const [pathPart, query = ''] = value.split('?');
    if (!/\.(?:m?js|css)$/i.test(pathPart) || NEVER.has(path.basename(pathPart))) return tag;
    if (/(?:^|\/)p\//.test(pathPart)) return tag; // the proxy bundle (/p/…) is left exactly as it is
    const file = pathPart.startsWith('/') ? path.join(root, pathPart) : path.resolve(path.dirname(page), pathPart);
    if (!fs.existsSync(file)) { console.warn(`  ! ${path.relative(root, page)}: ${pathPart} not found, left alone`); return tag; }
    const params = new URLSearchParams(query);
    const wanted = fileHash(file);
    stampedFiles.add(path.relative(root, file).split(path.sep).join('/'));
    if (params.get('v') === wanted) return tag;
    stale.push(`${path.relative(root, page)}: ${pathPart}  ${params.get('v') || '(no stamp)'} -> ${wanted}`);
    params.set('v', wanted);
    return tag.replace(value, `${pathPart}?${params.toString()}`);
  });
  if (out !== html) { changed++; if (!checkOnly) fs.writeFileSync(page, out); }
}

if (stale.length) {
  console.log(`${checkOnly ? 'Out of date' : 'Updated'} (${stale.length} reference${stale.length === 1 ? '' : 's'} in ${changed} page${changed === 1 ? '' : 's'}):`);
  stale.forEach(line => console.log('  ' + line));
} else console.log(`All stamps are current (${stampedFiles.size} files, ${pages.length} pages checked).`);

// Keep the cache rules honest: every stamped root-level file should be listed as long-lived in _headers.
const headersFile = path.join(root, '_headers');
if (fs.existsSync(headersFile)) {
  const rules = fs.readFileSync(headersFile, 'utf8');
  const missing = [...stampedFiles].filter(file => !file.includes('/') && !new RegExp(`^/${file.replace('.', '\\.')}\\s*$`, 'm').test(rules));
  if (missing.length) console.log(`\nNote: these stamped files have no long-cache rule in _headers yet: ${missing.join(', ')}`);
}
if (checkOnly && stale.length) { console.log('\nRun without --check to fix, then deploy.'); process.exit(1); }
