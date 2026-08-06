// ASCII-map a screenshot for quick layout analysis
'use strict';
const fs = require('fs');
const { PNG } = require('pngjs');
const f = process.argv[2];
const png = PNG.sync.read(fs.readFileSync(f));
console.log('size:', png.width + 'x' + png.height);
const W = 78, H = 30;
let out = '';
for (let y = 0; y < H; y++) {
  let row = '';
  for (let x = 0; x < W; x++) {
    const i = (Math.floor(y * png.height / H) * png.width + Math.floor(x * png.width / W)) * 4;
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    if (r < 60 && g < 50 && b < 40) row += '#';
    else if (r > 190 && g < 130 && b < 110 && r > g) row += 'R';
    else if (g > 130 && g > r + 20 && g > b + 30) row += 'G';
    else if (r > 200 && g > 150 && b < 110) row += 'O';
    else if (r > 150 && g > 150 && b > 150) row += 'w';
    else if (r < 110 && g < 95 && b < 85) row += '+';
    else if (r > 225 && g > 210) row += '.';
    else row += 'o';
  }
  out += row + '\n';
}
console.log(out);
