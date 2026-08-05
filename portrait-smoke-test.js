// Headless smoke test for PORTRAIT layout (390x844 phone) — stubs DOM/canvas, drives the game loop.
/* global global, require, process */
'use strict';
const listeners = {};
function el(id) {
  return {
    id, textContent: '', innerHTML: '', className: '', style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild() {},
    addEventListener(t, fn) { (listeners[id] ||= {})[t] = fn; },
    click() { const l = listeners[id] && listeners[id].click; if (l) l({}); },
  };
}
const elements = {};
global.document = {
  getElementById: id => elements[id] ||= el(id),
  createElement: () => el('dyn'),
  addEventListener() {},
};
const ctxProxy = new Proxy({}, {
  get(t, prop) {
    if (prop === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (prop === 'measureText') return () => ({ width: 10 });
    return () => undefined;
  },
  set() { return true; },
});
let rafCb = null;
let simT = 0;
global.window = {
  innerWidth: 390, innerHeight: 844, devicePixelRatio: 3,
  localStorage: { getItem: () => null, setItem() {} },
  addEventListener() {},
};
global.requestAnimationFrame = cb => { rafCb = cb; };
global.addEventListener = () => {};
elements['game'] = {
  getContext: () => ctxProxy,
  width: 0, height: 0,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 585 }),
  addEventListener(t, fn) { (listeners['game'] ||= {})[t] = fn; },
};

require('./game.js');
const G = window.__rsc;
let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL: ' + msg); } else console.log('ok: ' + msg); }
function run(seconds) {
  const steps = Math.max(1, Math.round(seconds / 0.0167));
  for (let i = 0; i < steps; i++) { simT += 16.7; rafCb(simT); }
}
function click(lx, ly) {
  const s = 390 / 640; // stage fit scale: canvas CSS px per logical px
  listeners['game'].pointerdown({ clientX: lx * s, clientY: ly * s, preventDefault() {} });
}

// ---- portrait layout selected ----
assert(G.L.W === 640 && G.L.H === 960, 'portrait layout active (640x960 logical)');
assert(G.L.CELLS === 3, 'fridge uses 3 columns in portrait');

// ---- title → playing ----
G.newGame();
run(3.5);
assert(G.state === 'playing', 'countdown → playing');
assert(G.orders.length >= 1, 'order spawned: ' + (G.orders[0] && G.orders[0].recipeId));

// ---- chop lettuce at the chop station ----
click(316, 344);                       // lettuce
assert(G.held === 'lettuce', 'picked lettuce in portrait');
click(306, 133);                       // chop station (portrait: 244..368, y 58..208)
assert(G.stations[0].busy && G.stations[0].item === 'lettuce', 'chop station working');
run(1.3);
assert(G.stations[0].busy === false && G.stations[0].ready === true, 'chop station finished — ready');

// ---- wrong station keeps item ----
click(316, 344);                       // lettuce again
click(442, 133);                       // cook station → wrong for lettuce
assert(G.held === 'lettuce', 'wrong station rejected in portrait');
click(60, 900);                        // empty space clears the hand
assert(G.held === null, 'clicking empty space clears held item');
click(306, 133);                       // collect the ready lettuce (wasted if no order needs it)
run(0.3);
assert(G.stations[0].ready === false, 'station cleared after collect');

// ---- feed a full order (salad if present, else burger) → serve ----
const salad = G.orders.find(o => o.recipeId === 'salad');
if (salad) {
  click(316, 344); click(306, 133); run(1.4); click(306, 133); run(0.3);   // lettuce → chop → collect
  click(442, 344); click(306, 133); run(1.4); click(306, 133); run(0.3);   // tomato → chop → collect
  click(568, 344); click(306, 133); run(1.4); click(306, 133); run(0.3);   // cucumber → chop → collect
} else {
  click(568, 515); click(442, 133); run(2.2); click(442, 133); run(0.3);   // beef → cook → collect
  click(568, 687);                              // bun (raw)
  click(316, 858);                              // cheese (raw)
}
run(0.3);
assert(G.score > 0, 'a dish was served, score=' + G.score);

// ---- hearts still tracked after a long run ----
run(40);
assert(G.hearts >= 0 && G.hearts <= 3, 'hearts tracked: ' + G.hearts);
console.log('portrait final: state=' + G.state + ' score=' + G.score + ' hearts=' + G.hearts);
console.log(fails === 0 ? 'PORTRAIT SMOKE TEST PASSED' : 'PORTRAIT SMOKE TEST FAILED (' + fails + ')');
process.exit(fails === 0 ? 0 : 1);
