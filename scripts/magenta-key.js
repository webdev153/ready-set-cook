// One-off: chroma-key magenta-backdrop AutoSprite clips locally (the Corridor Key
// cloud service mis-detects the darkened magenta video bg and eats green food).
// Pipeline: ffmpeg -> frames -> per-frame border color -> soft key + alpha falloff
// -> pack 8x6 grid at 240px frames -> assets/sorceress/autosprite/small/<name>.png
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PNG } = require('pngjs');

const TMP = '/tmp/magkey';
const COLS = 8, ROWS = 6, OUT = 240;

function avgBorder(png) {
  let r = 0, g = 0, b = 0, n = 0;
  const m = 8;
  for (let y = 0; y < png.height; y += 2) for (let x = 0; x < png.width; x += 2) {
    if (x > m && x < png.width - m && y > m && y < png.height - m) continue;
    const i = (y * png.width + x) * 4;
    r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]; n++;
  }
  return [r / n, g / n, b / n];
}

function keyFrame(png, key) {
  const [kr, kg, kb] = key;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    const dist = Math.abs(r - kr) + Math.abs(g - kg) + Math.abs(b - kb);
    let a = (dist - 55) / 95;            // 0 at dist<=55, 1 at dist>=150
    a = Math.max(0, Math.min(1, a));
    // despill: pull leftover magenta fringe toward neutral
    if (a < 1 && dist < 230) {
      const spill = 1 - a;
      png.data[i]     = Math.min(255, r + (g - r) * spill * .6);
      png.data[i + 2] = Math.min(255, b + (g - b) * spill * .6);
    }
    png.data[i + 3] = Math.round(png.data[i + 3] * a);
  }
}

function processClip(mp4, outName) {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  execSync(`ffmpeg -y -loglevel error -i "${mp4}" "${TMP}/f%04d.png"`);
  const frames = fs.readdirSync(TMP).filter(f => f.endsWith('.png')).sort();
  const N = Math.min(46, frames.length);
  const idxs = [];
  for (let i = 0; i < N; i++) idxs.push(Math.min(frames.length - 1, Math.round(i * frames.length / N)));
  // key each frame against its own border color
  for (let f = 0; f < idxs.length; f++) {
    const i = idxs[f];
    const png = PNG.sync.read(fs.readFileSync(path.join(TMP, frames[i])));
    keyFrame(png, avgBorder(png));
    fs.writeFileSync(path.join(TMP, 'k' + f + '.png'), PNG.sync.write(png));
  }
  // pack into a grid at 240px frames (averaging downsample)
  const grid = new PNG({ width: COLS * OUT, height: ROWS * OUT });
  for (let f = 0; f < N; f++) {
    const png = PNG.sync.read(fs.readFileSync(path.join(TMP, 'k' + f + '.png')));
    const step = png.width / OUT;
    const gx = (f % COLS) * OUT, gy = Math.floor(f / COLS) * OUT;
    for (let fy = 0; fy < OUT; fy++) for (let fx = 0; fx < OUT; fx++) {
      let r = 0, g = 0, b = 0, a = 0;
      const sx0 = Math.floor(fx * step), sy0 = Math.floor(fy * step);
      for (let dy = 0; dy < step; dy++) for (let dx = 0; dx < step; dx++) {
        const si = ((sy0 + dy) * png.width + (sx0 + dx)) * 4;
        r += png.data[si]; g += png.data[si + 1]; b += png.data[si + 2]; a += png.data[si + 3];
      }
      const n = step * step, oi = ((gy + fy) * grid.width + (gx + fx)) * 4;
      grid.data[oi] = r / n; grid.data[oi + 1] = g / n; grid.data[oi + 2] = b / n; grid.data[oi + 3] = a / n;
    }
  }
  const dst = path.join('assets/sorceress/autosprite/small', outName + '.png');
  fs.writeFileSync(dst, PNG.sync.write(grid));
  console.log(outName, '->', dst, fs.statSync(dst).size + 'B', '(' + N + ' frames)');
}

processClip('assets/sorceress/autosprite/chop-lettuce-1785900168475.mp4', 'anim-chop-lettuce');
processClip('assets/sorceress/autosprite/chop-cucumber-1785900227100.mp4', 'anim-chop-cucumber');
console.log('done');
