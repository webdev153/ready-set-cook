// One-off: downscale AutoSprite keyed sheets (960px frames) to 240px frames for mobile.
// Usage: node scripts/downscale-anim.js
'use strict';
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const FRAME = 960, OUT = 240, COLS = 8, ROWS = 6;
const files = ['anim-chop', 'anim-blend', 'anim-fry', 'anim-fry-egg', 'anim-boil'];
const SRC = 'assets/sorceress/autosprite';
const DST = 'assets/sorceress/autosprite/small';

fs.mkdirSync(DST, { recursive: true });

for (const f of files) {
  const png = PNG.sync.read(fs.readFileSync(path.join(SRC, f + '.png')));
  const out = new PNG({ width: COLS * OUT, height: ROWS * OUT });
  const step = FRAME / OUT; // 4
  for (let fy = 0; fy < ROWS * OUT; fy++) {
    for (let fx = 0; fx < COLS * OUT; fx++) {
      // average the 4x4 source block
      let r = 0, g = 0, b = 0, a = 0;
      const sx0 = Math.floor(fx * step), sy0 = Math.floor(fy * step);
      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          const si = ((sy0 + dy) * png.width + (sx0 + dx)) * 4;
          r += png.data[si]; g += png.data[si + 1]; b += png.data[si + 2]; a += png.data[si + 3];
        }
      }
      const n = step * step;
      const oi = (fy * out.width + fx) * 4;
      out.data[oi] = r / n; out.data[oi + 1] = g / n; out.data[oi + 2] = b / n; out.data[oi + 3] = a / n;
    }
  }
  const dstPath = path.join(DST, f + '.png');
  fs.writeFileSync(dstPath, PNG.sync.write(out));
  console.log(f + ': ' + png.width + 'x' + png.height + ' -> ' + out.width + 'x' + out.height + ' (' + fs.statSync(dstPath).size + ' bytes)');
}
