// Headless smoke test for Ready Set Cook — stubs DOM/canvas, drives the game loop.
/* global global, require, process */
'use strict';
const listeners = {};
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
// start above the real clock so the first-frame dt is positive (avoids stalling countdown)
let simT = 1000000;
global.window = {
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
function click(x, y) {
  const e = { clientX: x, clientY: y, preventDefault() {} };
  listeners['game'].pointerdown(e);
  listeners['window'].pointerup(e);
}

// layout helpers (mirror game.js constants)
const ING_IDS = ['lettuce', 'tomato', 'cucumber', 'onion', 'carrot', 'beef', 'egg', 'water', 'bun', 'cheese', 'orange', 'apple'];
const RECIPE_ITEMS = { salad: ['lettuce', 'tomato', 'cucumber'], burger: ['bun', 'beef', 'cheese'], omelette: ['egg', 'cheese', 'onion'], smoothie: ['orange', 'apple'], soup: ['water', 'carrot', 'onion'] };
function fridgePos(id) { const i = ING_IDS.indexOf(id); const col = i % 6, row = (i / 6) | 0; return { x: 258 + col * 114 + 52, y: row === 0 ? 380 : 532 }; }
const STA_X = { chop: 355, cook: 595, blend: 835 };
function clickIng(id) { const p = fridgePos(id); click(p.x, p.y); }
function clickSta(id) { click(STA_X[id], 150); }
function feedOrder(o) {
  const needed = RECIPE_ITEMS[o.recipeId].filter(i => !o.filled.includes(i));
  for (const ing of needed) {
    const proc = INGREDIENTS_PROC[ing];
    const idx = { chop: 0, cook: 1, blend: 2 }[proc];
    // free a ready station first (only with an empty hand)
    if (G.stations[idx] && G.stations[idx].ready && !G.held) { clickSta(proc); run(0.3); }
    clickIng(ing);
    if (G.held === ing) {
      clickSta(proc); run(2.6);
      if (G.stations[idx].ready && !G.held) { clickSta(proc); run(0.3); }  // collect the finished food
    }
  }
}
const INGREDIENTS_PROC = { lettuce: 'chop', tomato: 'chop', cucumber: 'chop', onion: 'chop', carrot: 'chop', beef: 'cook', egg: 'cook', water: 'cook', orange: 'blend', apple: 'blend' };

// ---- title → countdown → playing ----
assert(G.state === 'title', 'starts on title screen');
G.newGame();
assert(G.state === 'countdown', 'newGame → countdown');
run(3.5);
assert(G.state === 'playing', 'countdown → playing');

// ---- pause menu (P key + button) ----
listeners['window'].keydown({ key: 'p' });
assert(G.paused === true, 'P key pauses the game');
elements['resumeBtn'].click();
assert(G.paused === false, 'resume button unpauses');
elements['pauseBtn'].click();
assert(G.paused === true, 'pause button pauses');
elements['resumeBtn'].click();
assert(G.paused === false, 'resumed again');
assert(G.orders.length >= 1, 'first order spawned (' + G.orders.map(o => o.recipeId).join(',') + ')');
const startScore = G.score;

// ---- chop lettuce at the chop station ----
const needsLettuce = G.orders.some(o => o.recipeId === 'salad');
clickIng('lettuce');
assert(G.held === 'lettuce', 'picked lettuce');
clickSta('chop');
assert(G.stations[0].busy && G.stations[0].item === 'lettuce', 'chop station working on lettuce');
run(1.3);
assert(G.stations[0].busy === false && G.stations[0].ready === true, 'chop station finished — food waits to be served');
clickSta('chop');   // collect the finished lettuce
run(0.3);
if (needsLettuce) assert(G.orders.some(o => o.filled.includes('lettuce')), 'collecting served lettuce to an order plate');
else console.log('ok: lettuce collected — no order needs it');
assert(G.stations[0].ready === false && G.stations[0].item === null, 'station cleared after collect');

// ---- wrong station returns the item to the fridge ----
clickIng('onion');                    // nobody needs onion in round 1 — pure mechanics test
assert(G.held === 'onion', 'picked onion');
clickSta('blend');                    // wrong for onion
assert(G.held === null, 'wrong station rejected — item returns to the fridge');
clickIng('onion');                    // grab it again
assert(G.held === 'onion', 're-picked onion after return');
clickSta('chop');                     // right station
run(1.3);
assert(G.stations[0].busy === false && G.stations[0].ready === true, 'onion chopped — waiting to be served');
// one tap: collect the ready onion AND start chopping a new lettuce
clickIng('lettuce');
assert(G.held === 'lettuce', 'picked lettuce');
clickSta('chop');
assert(G.stations[0].ready === false && G.stations[0].busy && G.stations[0].item === 'lettuce', 'one tap collected the onion and started the lettuce');
assert(G.held === null, 'held lettuce consumed by the station');
run(1.3);
assert(G.stations[0].busy === false && G.stations[0].ready === true, 'second lettuce chopped');
run(5);                                // let the ready lettuce sit past the fresh window + burn window
assert(G.stations[0].ready === true && G.stations[0].item === 'lettuce', 'chop station food never burns');
assert((G.save.stats.burned || 0) === 0, 'no burns on the chop station');

// ---- tapping a ready station with a held item serves the old + starts the new ----
clickIng('beef');
assert(G.held === 'beef', 'picked beef');
const freshBefore = G.save.stats.freshServes || 0;
clickSta('chop');                     // chop is READY (lettuce, sat 5s+) — held beef is for the cook station
assert(G.stations[0].ready === false && G.stations[0].item === null, 'ready food collected even while holding an item');
assert(G.held === 'beef', 'wrong-station item stays in hand');
assert((G.save.stats.freshServes || 0) === freshBefore, 'late serve earns no fresh bonus');
clickSta('cook');
assert(G.stations[1].busy && G.stations[1].item === 'beef', 'cook station working on beef');
clickIng('beef');
assert(G.held === 'beef', 'picked second beef');
clickSta('cook');
assert(G.held === null, 'busy station rejected — item returns to the fridge');
run(2.1);
assert(G.stations[1].busy === false && G.stations[1].ready === true, 'cook finished — steak ready');
clickSta('cook');                       // collect the steak → beef lands on the burger order
run(0.3);

// ---- serve: feed every active order whatever it still needs ----
for (const o of G.orders.slice()) if (o.state === 'active') feedOrder(o);
run(0.2);
assert(G.score > startScore, 'a dish was served, score increased (' + G.score + ')');
assert((G.save.stats.maxCombo || 0) >= 1, 'combo recorded (maxCombo=' + G.save.stats.maxCombo + ')');
assert((G.save.stats.freshServes || 0) >= 1, 'a prompt serve earned the fresh bonus (freshServes=' + G.save.stats.freshServes + ')');

// ---- burning: food left too long on the station is lost ----
clickIng('beef');
assert(G.held === 'beef', 'picked beef for the burn test');
clickSta('cook');
assert(G.stations[1].busy && G.stations[1].item === 'beef', 'held item cooks once the station is free');
run(2.1);
assert(G.stations[1].busy === false && G.stations[1].ready === true, 'fresh steak ready for the burn test');
run(11);
assert(G.stations[1].ready === false && G.stations[1].item === null, 'food burned after 10s idle');
assert((G.save.stats.burned || 0) >= 1, 'burn recorded in stats');

// ---- long run: patience expiry + hearts + game over path ----
run(120);
assert(G.hearts >= 0 && G.hearts <= 3, 'hearts tracked: ' + G.hearts);
run(30);
console.log('final state:', G.state, '| score:', G.score, '| hearts:', G.hearts, '| orders:', G.orders.length);
console.log(fails === 0 ? 'SMOKE TEST PASSED' : 'SMOKE TEST FAILED (' + fails + ')');
process.exit(fails === 0 ? 0 : 1);
