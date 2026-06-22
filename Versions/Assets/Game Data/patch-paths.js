// ============================================================
// patch-paths.js
// Rewrites all cdn.jsdelivr.net/gh/freebuisness URLs in script.js
// to point to your local copies instead.
//
// Usage: node patch-paths.js
// Run this from the same folder as script.js
// ============================================================

const fs = require('fs');
const path = require('path');

const INPUT  = './script.js';
const OUTPUT = './script.js';   // overwrites in-place; change if you want a backup

// Adjust these to match where you cloned/downloaded the repos
// relative to wherever your script.js is served from
const HTML_LOCAL_PATH   = './Versions/Assets/Games/html';
const COVERS_LOCAL_PATH = './Versions/Assets/Games/covers';

let src = fs.readFileSync(INPUT, 'utf8');

// Replace game HTML paths
src = src.replace(
  /https:\/\/cdn\.jsdelivr\.net\/gh\/freebuisness\/html@main\//g,
  HTML_LOCAL_PATH + '/'
);

// Replace cover image paths
src = src.replace(
  /https:\/\/cdn\.jsdelivr\.net\/gh\/freebuisness\/covers@main\//g,
  COVERS_LOCAL_PATH + '/'
);

fs.writeFileSync(OUTPUT, src, 'utf8');

console.log('Patched! CDN URLs replaced with local paths in script.js');

// Quick sanity check
const remaining = (src.match(/cdn\.jsdelivr\.net\/gh\/freebuisness/g) || []).length;
if (remaining > 0) {
  console.warn(`Warning: ${remaining} freebuisness CDN URLs still remain — check manually.`);
} else {
  console.log('All freebuisness CDN URLs have been replaced.');
}
