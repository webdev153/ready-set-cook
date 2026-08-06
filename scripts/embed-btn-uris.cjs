// One-off: embed the kawaii button skins into style.css as data URIs so they
// render even when PNG file fetches fail / are cached stale (border-image with
// a broken url silently falls back to a transparent border + square gradient).
'use strict';
const fs = require('fs');
const uris = JSON.parse(fs.readFileSync('scripts/btn-data-uris.json', 'utf8'));
let css = fs.readFileSync('style.css', 'utf8');
let done = 0;
for (const [name, uri] of Object.entries(uris)) {
  const old = "url('assets/sorceress/ui/" + name + ".png') 56 fill round";
  if (!css.includes(old)) continue; // skin not wired to a rule yet (e.g. spare btn-gold)
  css = css.split(old).join('url(' + uri + ') 56 fill round');
  console.log('embedded', name);
  done++;
}
fs.writeFileSync('style.css', css);
console.log('done,', done, 'skin(s) embedded');
const remaining = (css.match(/border-image: url\('assets\/sorceress\/ui\/[^']+\.png'\)/g) || []).length;
console.log('file-path border-image refs remaining:', remaining);
