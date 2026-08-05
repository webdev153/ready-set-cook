// Generates Android launcher icons + splash screens for the Capacitor APK
// from the game's 512x512 icon (assets/sorceress/icon-512.png).
// - legacy mipmap ic_launcher / ic_launcher_round: icon resized to density size
// - adaptive foreground: icon scaled to 66% on a transparent canvas
// - splash drawables: icon centered on the game's dark background (#241a12)
'use strict';
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ICON = 'assets/sorceress/icon-512.png';
const RES = 'mobile/android/app/src/main/res';
const BG = [36, 26, 18]; // #241a12

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const SPLASH = {
  'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800], 'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280],
  'drawable': [480, 320],
};

function resize(src, size) {
  const out = new PNG({ width: size, height: size });
  const step = src.width / size;
  for (let fy = 0; fy < size; fy++) for (let fx = 0; fx < size; fx++) {
    let r = 0, g = 0, b = 0, a = 0;
    const sx0 = Math.floor(fx * step), sy0 = Math.floor(fy * step);
    for (let dy = 0; dy < step; dy++) for (let dx = 0; dx < step; dx++) {
      const si = ((sy0 + dy) * src.width + (sx0 + dx)) * 4;
      r += src.data[si]; g += src.data[si + 1]; b += src.data[si + 2]; a += src.data[si + 3];
    }
    const n = step * step, oi = (fy * size + fx) * 4;
    // clamp: non-integer steps can push averages over 255, which would wrap the Uint8 buffer
    out.data[oi] = Math.min(255, r / n);
    out.data[oi + 1] = Math.min(255, g / n);
    out.data[oi + 2] = Math.min(255, b / n);
    out.data[oi + 3] = Math.min(255, a / n);
  }
  return out;
}

function pasteCentered(canvas, icon, scale) {
  const size = Math.round(canvas.width * scale);
  const small = resize(icon, size);
  const ox = (canvas.width - size) >> 1, oy = (canvas.height - size) >> 1;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const si = (y * size + x) * 4;
    const a = small.data[si + 3] / 255;
    if (a === 0) continue;
    const di = ((oy + y) * canvas.width + (ox + x)) * 4;
    canvas.data[di] = small.data[si] * a + canvas.data[di] * (1 - a);
    canvas.data[di + 1] = small.data[si + 1] * a + canvas.data[di + 1] * (1 - a);
    canvas.data[di + 2] = small.data[si + 2] * a + canvas.data[di + 2] * (1 - a);
    canvas.data[di + 3] = Math.min(255, canvas.data[di + 3] + small.data[si + 3] * (1 - canvas.data[di + 3] / 255));
  }
}

const icon = PNG.sync.read(fs.readFileSync(ICON));

// legacy icons
for (const [d, size] of Object.entries(LEGACY)) {
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    const p = path.join(RES, `mipmap-${d}`, name);
    fs.writeFileSync(p, PNG.sync.write(resize(icon, size)));
  }
}
// adaptive foregrounds (icon at 66% — safe zone of the adaptive mask)
for (const [d, size] of Object.entries(FOREGROUND)) {
  const canvas = new PNG({ width: size, height: size });
  pasteCentered(canvas, icon, 0.66);
  fs.writeFileSync(path.join(RES, `mipmap-${d}`, 'ic_launcher_foreground.png'), PNG.sync.write(canvas));
}
// splash screens: dark bg + icon at ~26% of the short side
for (const [dir, [w, h]] of Object.entries(SPLASH)) {
  const canvas = new PNG({ width: w, height: h });
  for (let i = 0; i < canvas.data.length; i += 4) {
    canvas.data[i] = BG[0]; canvas.data[i + 1] = BG[1]; canvas.data[i + 2] = BG[2]; canvas.data[i + 3] = 255;
  }
  pasteCentered(canvas, icon, 0.26);
  fs.writeFileSync(path.join(RES, dir, 'splash.png'), PNG.sync.write(canvas));
}
console.log('icons + splash generated');
