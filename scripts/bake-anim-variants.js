// One-off: bake ingredient variants of the AutoSprite animations by masked compositing.
// Takes the base sheet (e.g. knife+tomato) and pastes the real ingredient sprite into
// the exact pixels where the base food was visible, per frame — so the motion, knife,
// board and blade occlusion stay identical. Output: assets/sorceress/autosprite/small/<name>.png
'use strict';
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const COLS = 8, FR = 240, FRAMES = 46;
const DIR = 'assets/sorceress/autosprite/small';
const SPR = 'assets/sorceress/sprites';

function readSheet(name) { return PNG.sync.read(fs.readFileSync(path.join(DIR, name + '.png'))); }
function writeSheet(name, png) { fs.writeFileSync(path.join(DIR, name + '.png'), PNG.sync.write(png)); }

function frameBox(png, idx, test) {
  const sx = (idx % COLS) * FR, sy = Math.floor(idx / COLS) * FR;
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, n = 0;
  for (let y = 0; y < FR; y++) for (let x = 0; x < FR; x++) {
    const i = ((sy + y) * png.width + (sx + x)) * 4;
    if (png.data[i + 3] > 40 && test(png.data[i], png.data[i + 1], png.data[i + 2], y)) {
      n++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return n ? { minX, minY, maxX, maxY } : null;
}

// Paste sprite over every frame pixel that passes `loose` inside the strict bbox.
// Pass 2: tint leftover base-food pixels toward the sprite's average color so no
// tomato/orange remains, while keeping the scene's shading and outline.
function compositeVariant(baseName, outName, spriteFile, strict, loose) {
  const sheet = readSheet(baseName);
  const spr = PNG.sync.read(fs.readFileSync(path.join(SPR, spriteFile)));
  let ar = 0, ag = 0, ab = 0, an = 0;
  for (let i = 0; i < spr.data.length; i += 4) {
    if (spr.data[i + 3] > 60) { ar += spr.data[i]; ag += spr.data[i + 1]; ab += spr.data[i + 2]; an++; }
  }
  const avr = ar / an, avg = ag / an, avb = ab / an;
  for (let idx = 0; idx < FRAMES; idx++) {
    const box = frameBox(sheet, idx, strict);
    if (!box) continue;
    const sx = (idx % COLS) * FR, sy = Math.floor(idx / COLS) * FR;
    const bw = box.maxX - box.minX, bh = box.maxY - box.minY;
    // cover-scale the sprite to the box (crop overflow, clipped by the mask)
    const scale = Math.max((bw * 0.96) / spr.width, (bh * 0.96) / spr.height);
    const dw = Math.max(2, Math.round(spr.width * scale)), dh = Math.max(2, Math.round(spr.height * scale));
    const dx0 = Math.round(box.minX + (bw - dw) / 2), dy0 = Math.round(box.minY + (bh - dh) / 2);
    for (let y = 0; y < FR; y++) for (let x = 0; x < FR; x++) {
      const i = ((sy + y) * sheet.width + (sx + x)) * 4;
      if (sheet.data[i + 3] <= 40) continue;
      if (!loose(sheet.data[i], sheet.data[i + 1], sheet.data[i + 2], y)) continue;
      const sxp = Math.floor(((x - dx0) / dw) * spr.width);
      const syp = Math.floor(((y - dy0) / dh) * spr.height);
      if (sxp < 0 || sxp >= spr.width || syp < 0 || syp >= spr.height) continue;
      const si = (syp * spr.width + sxp) * 4;
      const sa = spr.data[si + 3] / 255;
      if (sa >= 0.15) {
        // pass 1: paste the sprite pixel
        sheet.data[i]     = Math.round(spr.data[si] * sa + sheet.data[i] * (1 - sa));
        sheet.data[i + 1] = Math.round(spr.data[si + 1] * sa + sheet.data[i + 1] * (1 - sa));
        sheet.data[i + 2] = Math.round(spr.data[si + 2] * sa + sheet.data[i + 2] * (1 - sa));
        sheet.data[i + 3] = 255;
      } else {
        // pass 2: tint leftover base-food pixels toward the sprite's average color
        sheet.data[i]     = Math.round(avr * .72 + sheet.data[i] * .28);
        sheet.data[i + 1] = Math.round(avg * .72 + sheet.data[i + 1] * .28);
        sheet.data[i + 2] = Math.round(avb * .72 + sheet.data[i + 2] * .28);
        sheet.data[i + 3] = 255;
      }
    }
  }
  writeSheet(outName, sheet);
  console.log('baked', outName, '(' + fs.statSync(path.join(DIR, outName + '.png')).size + ' bytes)');
}

// ---- CHOP: tomato sits on the board at the bottom (y > 100); knife handle is the tiny red cluster above ----
const tomatoStrict = (r, g, b, y) => r > 130 && r > g * 1.6 && r > b * 1.6 && y > 100;
const tomatoLoose  = (r, g, b, y) => r > 120 && r > g * 1.3 && r > b * 1.3 && y > 100;
for (const veg of ['lettuce', 'cucumber', 'onion', 'carrot']) {
  compositeVariant('anim-chop', 'anim-chop-' + veg, veg + '.png', tomatoStrict, tomatoLoose);
}

// ---- BLEND: replace the orange jug contents with an apple (jug interior only, above the base) ----
const orangeStrict = (r, g, b, y) => r > 150 && r > g * 1.15 && g > b * 1.6 && y < 176;
const orangeLoose  = (r, g, b, y) => r > 130 && r > g * 1.1 && g > b * 1.4 && y < 176;
compositeVariant('anim-blend', 'anim-blend-apple', 'apple.png', orangeStrict, orangeLoose);

console.log('done');
