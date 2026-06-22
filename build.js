/**
 * build.js — copies Scramjet v2 dist files into public/p/scram/
 *
 * Run once when upgrading @mercuryworkshop/scramjet.
 * For normal deploys the pre-built scram/ folder in p/ is sufficient.
 */
import { createRequire } from "module";
import { cpSync, mkdirSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const require  = createRequire(import.meta.url);
const { scramjetPath } = require("@mercuryworkshop/scramjet/path");

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir    = join(__dirname, "public", "proxy", "scram");

mkdirSync(outDir, { recursive: true });

let copied = 0;
for (const entry of readdirSync(scramjetPath)) {
  if (entry.endsWith(".map") || entry.endsWith(".d.ts")) continue;
  if (statSync(join(scramjetPath, entry)).isDirectory())  continue;
  cpSync(join(scramjetPath, entry), join(outDir, entry));
  console.log(`  ✓ ${entry}`);
  copied++;
}
console.log(`\nBuild complete — ${copied} files → public/p/scram/`);
