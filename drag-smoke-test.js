// Drag-mechanics regression suite: press-drag-release for ingredients AND
// drag-the-dish-to-the-customer serving (the Ready-Set-Cook feel).
/* global global, require, process */
'use strict';
const listeners = {};
const elements = {};
function el(id) {
  return {
    id, textContent: '', innerHTML: '', className: '', style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild() {},
    querySelector() { return null; },
    addEventListener(t, fn) { (listeners[id] ||= {})[t] = fn; },
    click() { const l = listeners[id] && listeners[id].click; if (l) l({}); },
  };
}
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
// start above the real clock so the first-frame dt is positive (avoids stalling countdown)
let simT = 1000000;
global.window = {
  innerWidth: 1280, innerHeight: 720,
  localStorage: { getItem: () => null, setItem() {} },
  addEventListener(t, fn) { (listeners['window'] ||= {})[t] = fn; },
};
global.requestAnimationFrame = cb => { rafCb = cb; };
global.addEventListener = () => {};
elements['stage'] = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 640 }), style: {} };
elements['game'] = {
  getContext: () => ctxProxy,
  width: 960, height: 640,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 640 }),
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
const ING_IDS = ['lettuce', 'tomato', 'cucumber', 'onion', 'carrot', 'beef', 'egg', 'water', 'bun', 'cheese', 'orange', 'apple'];
function fridgePos(id) { const i = ING_IDS.indexOf(id); const col = i % 6, row = (i / 6) | 0; return { x: 258 + col * 114 + 52, y: row === 0 ? 380 : 532 }; }
const STA_X = { chop: 355, cook: 595, blend: 835 };
const TICKET = { x: 14 + 216 / 2, y: 58 + 178 / 2 }; // order 0 center
function down(x, y) { listeners['game'].pointerdown({ clientX: x, clientY: y, preventDefault() {} }); }
function move(x, y) { listeners['game'].pointermove({ clientX: x, clientY: y }); }
function up(x, y) { listeners['window'].pointerup({ clientX: x, clientY: y }); }
function drag(fromX, fromY, toX, toY, via) {
  down(fromX, fromY);
  for (const p of via || []) move(p.x, p.y);
  move(toX, toY);
  up(toX, toY);
}

G.startLevel(1);
run(4.2); // countdown → playing, first order out
assert(G.state === 'playing', 'drag test: playing');
const order = G.orders.find(o => o.state === 'active');
assert(!!order, 'drag test: an order is active');

// ---- drag an ingredient from the fridge to the chop station ----
const p = fridgePos(order.recipeId === 'salad' ? 'lettuce' : 'lettuce');
drag(p.x, p.y, STA_X.chop, 150, [{ x: p.x + 30, y: p.y - 20 }]);
assert(G.stations[0].busy && G.stations[0].item === 'lettuce', 'drag: lettuce dropped on chop station');

// ---- drag a finished dish from the station to the customer ticket ----
run(1.6);
assert(G.stations[0].ready, 'drag: chop finished');
const target = G.orders.find(o => o.state === 'active' && o.recipeId === 'salad');
assert(!!target, 'drag: a salad order is up');
const tIdx = G.orders.indexOf(target);
const tY = 58 + tIdx * (178 + 12) + 89; // ticket center (order region layout)
drag(STA_X.chop, 150, 122, tY, [{ x: STA_X.chop + 40, y: 160 }]);
run(0.3);
assert(G.stations[0].ready === false, 'drag: station cleared after drag-serve');
assert(target.filled.includes('lettuce'), 'drag: lettuce landed on the salad order');

// ---- a drag released over empty space returns the dish (no serve) ----
const c2 = fridgePos('beef');
drag(c2.x, c2.y, STA_X.cook, 150, [{ x: c2.x + 20, y: c2.y - 10 }]);
assert(G.stations[1].busy && G.stations[1].item === 'beef', 'drag: beef dropped on cook station');
run(3);
assert(G.stations[1].ready, 'drag: beef cooked');
const score2 = G.score;
drag(STA_X.cook, 150, 900, 620, [{ x: STA_X.cook + 50, y: 180 }]); // release over empty space
run(0.3);
assert(G.stations[1].ready === true, 'drag: dish returned to station after empty release');
assert(G.score === score2, 'drag: no score from an empty release');

// ---- dragging a dish onto a ticket that does NOT need it returns it ----
const salad = G.orders.find(o => o.state === 'active' && o.recipeId === 'salad');
drag(STA_X.cook, 150, 122, tY, [{ x: STA_X.cook + 50, y: 180 }]); // beef onto the salad ticket
run(0.3);
assert(G.stations[1].ready === true, 'drag: wrong-ticket dish returned to the station');
assert(!(salad && salad.filled.includes('beef')), 'drag: wrong ticket not served');
assert(G.score === score2, 'drag: no score from a wrong ticket');

// ---- quick tap on a ready station still auto-serves ----
down(STA_X.cook, 150); up(STA_X.cook, 150);
run(0.3);
assert(G.stations[1].ready === false, 'drag: quick tap still auto-serves');

console.log(fails ? `DRAG SMOKE TEST FAILED (${fails})` : 'DRAG SMOKE TEST PASSED');
process.exit(fails ? 1 : 0);
