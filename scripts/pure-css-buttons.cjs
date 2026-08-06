// Replace the border-image-based button skins with pure-CSS kawaii buttons.
// The user's browser ignores border-image entirely (even with data URIs), so the
// kawaii look must come from gradients + borders + inset shadows — zero image deps.
'use strict';
const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const NEW = {
  '.btn.primary': `  font-size: 27px;
  letter-spacing: 2px;
  padding: 15px 74px;
  color: #fff;
  background: linear-gradient(180deg, #ff9a70 0%, #ef5b4c 52%, #d94a3d 100%);
  border: 3px solid #4a2f1c;
  border-radius: 26px;
  box-shadow: 0 6px 0 #a93a2c, 0 14px 28px rgba(0,0,0,.35), inset 0 4px 0 rgba(255,255,255,.38), inset 0 -10px 0 rgba(0,0,0,.14);
  text-shadow: 0 2px 0 rgba(0,0,0,.28);
  animation: playBreathe 2.2s ease-in-out infinite;
}`,
  '.btn.secondary': `  font-size: 20px;
  padding: 11px 48px;
  color: #fff;
  background: linear-gradient(180deg, #8fd46a 0%, #4c9e6a 55%, #3e7a52 100%);
  border: 3px solid #2f5a3c;
  border-radius: 22px;
  box-shadow: 0 5px 0 #2c6444, 0 10px 20px rgba(0,0,0,.28), inset 0 4px 0 rgba(255,255,255,.38), inset 0 -10px 0 rgba(0,0,0,.14);
  text-shadow: 0 2px 0 rgba(0,0,0,.28);
}`,
  '.btn.alt': `  color: #fff;
  background: linear-gradient(180deg, #8fd46a 0%, #4c9e6a 55%, #3e7a52 100%);
  border: 3px solid #2f5a3c;
  border-radius: 22px;
  box-shadow: 0 6px 0 #2c6444, 0 10px 20px rgba(0,0,0,.3), inset 0 4px 0 rgba(255,255,255,.38), inset 0 -10px 0 rgba(0,0,0,.14);
  text-shadow: 0 2px 0 rgba(0,0,0,.28);
}`,
};

function replaceRule(css, selector, newBody) {
  const start = css.indexOf(selector + ' {');
  if (start < 0) { console.error('NOT FOUND:', selector); process.exit(1); }
  // find the block's closing brace (rules contain no nested braces)
  let depth = 0, end = start;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return css.slice(0, start) + selector + ' {\n' + newBody + '\n' + css.slice(end);
}

let out = css;
for (const [sel, body] of Object.entries(NEW)) out = replaceRule(out, sel, body);
// drop the now-obsolete comment about data URIs
out = out.split('/* The kawaii skins are embedded as data URIs (cannot 404). The border color,\n   radius and inset shadows double as a fully-kawaii fallback: if border-image\n   is ever unsupported, the button still shows an outlined glossy rounded shape,\n   never a square. */').join('/* pure-CSS kawaii buttons: gradient body, dark outline, glossy highlight —\n   no image dependencies, render identically in every browser */');
fs.writeFileSync('style.css', out);
console.log('replaced 3 button rules; border-image refs left:', (out.match(/border-image/g) || []).length);
