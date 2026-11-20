// Saves one 64px PNG per tab preset into Versions/Assets/Pictures/Tab-Icons/
//
//   node get-tab-icons.js            download every icon that is missing
//   node get-tab-icons.js --force    download everything again
//   node get-tab-icons.js --list     print the names/files only (no internet needed)
//
// Needs Node 18 or newer and an internet connection, and only has to be run once (again if you add a site).
// It reads the SITES list out of script.js, so the list lives in one place. Put it next to script.js.
// Icons come from Google's favicon service (the same one the browser uses for tab icons), because it is the
// one free favicon service that is official-ish, returns real PNGs and tells apart pages on the same domain
// (Docs vs Sheets). Anything that fails is listed at the end with the file name to drop in by hand.

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'Versions', 'Assets', 'Pictures', 'Tab-Icons');
const force = process.argv.includes('--force');
const listOnly = process.argv.includes('--list');

// Must match iconSlug() in script.js
const iconSlug = name => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function readSites() {
    const src = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
    const m = src.match(/const SITES = (\[[\s\S]*?\r?\n\s*\]);/);
    if (!m) throw new Error('Could not find the SITES list in script.js');
    return new Function('return ' + m[1])().map(s => ({ name: s[0], file: iconSlug(s[0]) + '.png', page: s[3] }));
}

const isPng = buf => buf.length > 100 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;

async function fetchIcon(page) {
    const urls = [
        'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=64&url=' + encodeURIComponent(page),
        'https://www.google.com/s2/favicons?sz=64&domain=' + new URL(page).host
    ];
    for (const url of urls) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
                if (!res.ok) continue; // a 404 here means "no icon found", not a real picture
                const buf = Buffer.from(await res.arrayBuffer());
                if (isPng(buf)) return buf;
            } catch (e) { /* try again, then the next source */ }
        }
    }
    return null;
}

async function main() {
    const sites = readSites();
    if (listOnly) {
        console.log('Put these files in ' + path.relative(__dirname, OUT) + path.sep + '\n');
        sites.forEach(s => console.log(s.file.padEnd(28) + s.name.padEnd(22) + s.page));
        console.log('\n' + sites.length + ' icons');
        return;
    }
    fs.mkdirSync(OUT, { recursive: true });
    const todo = sites.filter(s => force || !fs.existsSync(path.join(OUT, s.file)));
    console.log(sites.length - todo.length + ' already there, ' + todo.length + ' to download');
    const failed = [];
    let next = 0, done = 0;
    const worker = async () => {
        while (next < todo.length) {
            const s = todo[next++];
            const buf = await fetchIcon(s.page);
            if (buf) { fs.writeFileSync(path.join(OUT, s.file), buf); console.log('  ok      ' + s.file); }
            else { failed.push(s); console.log('  FAILED  ' + s.file); }
            done++;
        }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    console.log('\nSaved ' + (todo.length - failed.length) + ' of ' + todo.length + ' into ' + path.relative(__dirname, OUT));
    if (failed.length) {
        console.log('\nCould not get these. Save a PNG for each with exactly this file name, then they will work too:');
        failed.forEach(s => console.log('  ' + s.file.padEnd(28) + s.page));
    }
}

main().catch(e => { console.error(e.message); process.exit(1); });
