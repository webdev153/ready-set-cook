// One-off: downscale the 1024x1024 ingredient sprites to 512x512 (drawn at <=74px in-game).
// Cuts the APK roughly in half. Usage: node scripts/downscale-sprites.js
'use strict';
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const DIR = 'assets/sorceress/sprites';
const OUT = 512;

for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.png')) continue;
  const p = path.join(DIR, f);
  const png = PNG.sync.read(fs.readFileSync(p));
  if (png.width <= OUT) { console.log(f, 'already small, skipped'); continue; }
  const step = png.width / OUT;
  const out = new PNG({ width: OUT, height: OUT });
  for (let y = 0; y < OUT; y++) {
    for (let x = 0; x < OUT; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      const sx0 = Math.floor(x * step), sy0 = Math.floor(y * step);
      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          const si = ((sy0 + dy) * png.width + (sx0 + dx)) * 4;
          r += png.data[si]; g += png.data[si + 1]; b += png.data[si + 2]; a += png.data[si + 3];
        }
      }
      const n = step * step, oi = (y * out.width + x) * 4;
      out.data[oi] = r / n; out.data[oi + 1] = g / n; out.data[oi + 2] = b / n; out.data[oi + 3] = a / n;
    }
  }
  fs.writeFileSync(p, PNG.sync.write(out));
  console.log(f + ': ' + png.width + 'x' + png.height + ' -> ' + OUT + 'x' + OUT + ' (' + fs.statSync(p).size + 'B)');
}
console.log('done');
