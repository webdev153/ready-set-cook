// Copies the web app into mobile/www for the Capacitor Android build.
// Excludes assets the game never loads (full-res keyed sheets, green-screen
// sprites, source MP4s) to keep the APK small.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'mobile', 'www');

const COPY_DIRS = [
  'assets/fonts',
  'assets/sorceress/levels',
  'assets/sorceress/sprites',
  'assets/sorceress/ui',
  'assets/sorceress/themes',
  'assets/sorceress/audio',
  'assets/sorceress/autosprite',
];
const COPY_FILES = [
  'index.html',
  'game.js',
  'style.css',
  'manifest.json',
  'assets/sorceress/icon-512.png',
  'assets/sorceress/background.png',
];
const SKIP = new Set([
  'assets/sorceress/autosprite/anim-chop.png',
  'assets/sorceress/autosprite/anim-blend.png',
  'assets/sorceress/autosprite/anim-fry.png',
  'assets/sorceress/autosprite/anim-fry-egg.png',
  'assets/sorceress/autosprite/anim-boil.png',
  'assets/sorceress/autosprite/chop-lettuce-keyed-1785900232035.png',
  'assets/sorceress/autosprite/chop-cucumber-keyed-1785900588012.png',
  'assets/sorceress/autosprite/chop-lettuce-keyed-1785900985555.png',
  'assets/sorceress/autosprite/chop-cucumber-keyed-1785901455870.png',
]);

// never ship source media: green-screen mp4s, full-res keyed sheets, raw sprite PNGs
for (const f of fs.readdirSync(path.join(ROOT, 'assets/sorceress/autosprite'))) {
  if (/\.mp4$|keyed-/.test(f)) SKIP.add('assets/sorceress/autosprite/' + f);
}
for (const f of fs.readdirSync(path.join(ROOT, 'assets/sorceress/anim'))) {
  SKIP.add('assets/sorceress/anim/' + f);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function copyDir(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  const dst = path.join(OUT, rel);
  fs.mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(src)) {
    const p = rel + '/' + f;
    if (SKIP.has(p) || f.endsWith('.mp4')) continue;
    const st = fs.statSync(path.join(src, f));
    if (st.isDirectory()) { copyDir(p); continue; }
    fs.copyFileSync(path.join(src, f), path.join(dst, f));
    n++;
  }
  console.log('  copied', rel + '/ (' + n + ' files)');
}

for (const d of COPY_DIRS) copyDir(d);
for (const f of COPY_FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) { console.warn('  MISSING', f); continue; }
  fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true });
  fs.copyFileSync(src, path.join(OUT, f));
}
// skip heavy keyed sheets inside the autosprite dir that aren't in SKIP (any *-keyed-*.png)
for (const f of fs.readdirSync(path.join(OUT, 'assets/sorceress/autosprite'))) {
  if (/keyed-/.test(f)) fs.rmSync(path.join(OUT, 'assets/sorceress/autosprite', f), { force: true });
}
// the small/ dir is inside autosprite and should stay — it was copied by copyDir before cleanup.
const size = (dir) => {
  let s = 0;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) s += size(p); else s += fs.statSync(p).size;
  }
  return s;
};
console.log('mobile/www ready —', (size(OUT) / 1024 / 1024).toFixed(1) + ' MB');
