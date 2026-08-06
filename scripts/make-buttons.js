// Draws the kawaii button skins programmatically (edge-to-edge, 9-slice-safe).
// AI-generated button art came back centered in the canvas with transparent
// margins, which breaks border-image slicing — this gives us exact control.
// Design: rounded rect flush to the canvas edges (corners at the corners),
// dark brown outline, top highlight band, bottom shade — matches the game's
// flat-cartoon style. Slice = 56px (corner radius).
'use strict';
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SIZE = 256, RADIUS = 56, OUTLINE = 9;

const SKINS = {
  'btn-primary': { top: [255, 138, 92], mid: [239, 91, 76], bottom: [205, 64, 52] },
  'btn-green':   { top: [124, 191, 99], mid: [76, 158, 106], bottom: [60, 132, 88] },
  'btn-gold':    { top: [255, 215, 106], mid: [242, 177, 52], bottom: [207, 142, 30] },
};
const OUTLINE_COLOR = [74, 47, 28];   // dark brown, matches the food sprites' outlines
const HIGHLIGHT = [255, 255, 255];

function inRoundedRect(x, y, inset) {
  const x0 = inset, y0 = inset, x1 = SIZE - inset, y1 = SIZE - inset;
  const r = Math.max(0, RADIUS - inset);
  if (x < x0 || y < y0 || x >= x1 || y >= y1) return false;
  // corner tests
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r || (cx > x0 + r - 1 && cx < x1 - r + 1) || (cy > y0 + r - 1 && cy < y1 - r + 1);
}

function blend(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

for (const [name, skin] of Object.entries(SKINS)) {
  const png = new PNG({ width: SIZE, height: SIZE });
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      if (inRoundedRect(x, y, 0)) {
        // inside the outline stroke (flush to the tile edges → 9-slice corners are exact)
        png.data[i] = OUTLINE_COLOR[0]; png.data[i + 1] = OUTLINE_COLOR[1]; png.data[i + 2] = OUTLINE_COLOR[2]; png.data[i + 3] = 255;
      }
      if (inRoundedRect(x, y, OUTLINE)) {
        // inside the fill → vertical gradient + highlight band + bottom shade
        const t = y / SIZE;
        let c = t < 0.5 ? blend(skin.top, skin.mid, t * 2) : blend(skin.mid, skin.bottom, (t - 0.5) * 2);
        if (y < 34) c = blend(c, HIGHLIGHT, 0.30 * (1 - y / 34));       // top highlight
        if (y > SIZE - 34) c = blend(c, [0, 0, 0], 0.22 * ((y - (SIZE - 34)) / 34)); // bottom shade
        png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = 255;
      }
      // everything else stays transparent
    }
  }
  fs.writeFileSync(path.join('assets/sorceress/ui', name + '.png'), PNG.sync.write(png));
  console.log(name + '.png written');
}
console.log('done — slice at 56px, border-width 20px in CSS');
