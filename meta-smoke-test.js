// Headless smoke test for the meta systems: levels, coins, shop, boosters, progression.
/* global global, require, process */
'use strict';
const listeners = {};
function el(id) {
  return {
    id, textContent: '', innerHTML: '', className: '', style: {}, disabled: false,
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
  innerWidth: 1280, innerHeight: 720,
  localStorage: { getItem: () => null, setItem() {} },
  addEventListener() {},
};
global.requestAnimationFrame = cb => { rafCb = cb; };
global.addEventListener = () => {};
elements['game'] = {
  getContext: () => ctxProxy,
  width: 0, height: 0,
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
function click(x, y) { listeners['game'].pointerdown({ clientX: x, clientY: y, preventDefault() {} }); }
// fridge cell center helper (landscape 6x2 grid)
function cellPos(id) {
  const ids = ['lettuce', 'tomato', 'cucumber', 'onion', 'carrot', 'beef', 'egg', 'water', 'bun', 'cheese', 'orange', 'apple'];
  const i = ids.indexOf(id);
  const col = i % 6, row = (i / 6) | 0;
  return { x: 244 + 14 + col * 114 + 52, y: 268 + 42 + row * 152 + 70 };
}
const STA = { chop: { x: 355, y: 150 }, cook: { x: 595, y: 150 }, blend: { x: 835, y: 150 } };

// ---- fresh save ----
assert(G.save.coins === 100, 'new save starts with 100 coins');
assert(G.save.unlocked === 1, 'starts with level 1 unlocked');

// ---- shop ----
G.buyItem('heart');
assert(G.save.coins === 20 && G.save.inv.heart === 2, 'bought heart booster (100-80=20, qty 2)');
G.buyItem('sunset');
assert(G.save.coins === 20 && !G.save.themesOwned.includes('sunset'), 'cannot afford sunset theme (300 > 20)');

// ---- boosters consumed on level start ----
G.boosters.heart = true;
G.boosters.time = true;
G.startLevel(1);
assert(G.hearts === 4, 'extra heart booster applied (3+1)');
assert(G.timeLeft === 70, 'time booster applied (60+10)');
assert(G.save.inv.heart === 1 && G.save.inv.time === 0, 'boosters consumed from inventory');

// ---- play level 1 competently to completion ----
run(3.5);
assert(G.state === 'playing', 'countdown → playing');
let guard = 0;
while (G.state === 'playing' && guard < 300) {
  guard++;
  // 1) collect ready food first (drop whatever is in hand if needed)
  const readySt = G.stations.find(s => s.ready);
  if (readySt) {
    if (G.held) { click(480, 630); run(0.2); continue; }
    click(STA[readySt.id].x, STA[readySt.id].y);
    run(0.4);
    continue;
  }
  const o = G.orders.find(oo => oo.state === 'active' && oo.filled.length < 3);
  if (!o) { run(0.5); continue; }
  const recipe = { salad: ['lettuce', 'tomato', 'cucumber'], burger: ['bun', 'beef', 'cheese'] }[o.recipeId];
  const need = recipe.find(i => !o.filled.includes(i));
  // raw items go straight to the order
  if (need === 'bun' || need === 'cheese') {
    if (!G.held) { const p = cellPos(need); click(p.x, p.y); run(0.3); }
    else { click(480, 630); run(0.2); }
    continue;
  }
  const proc = { lettuce: 'chop', tomato: 'chop', cucumber: 'chop', beef: 'cook' }[need];
  const idx = { chop: 0, cook: 1, blend: 2 }[proc];
  const st = G.stations[idx];
  if (st.busy) { run(1.0); continue; }          // station working — just wait
  if (st.ready) { if (!G.held) { click(STA[proc].x, STA[proc].y); run(0.4); } else { click(480, 630); run(0.2); } continue; }
  if (!G.held) { const p = cellPos(need); click(p.x, p.y); }
  if (G.held === need) { click(STA[proc].x, STA[proc].y); run(0.4); }
  else run(0.3);
}
assert(G.state === 'levelEnd', 'level completed, state=levelEnd (got ' + G.state + ')');assert((G.save.stars[1] || 0) >= 1, 'earned at least 1 star on level 1');
assert(G.save.unlocked >= 2, 'level 2 unlocked');
assert(G.save.coins > 20, 'coins earned from level (' + G.save.coins + ')');
assert(G.level === 1, 'level counter is 1');

// ---- daily reward ----
const coinsBeforeDaily = G.save.coins;
const daily = G.dailyReward();
assert(daily >= 50 && G.save.coins === coinsBeforeDaily + daily, 'daily reward granted once (+' + daily + ')');
assert(G.dailyReward() === 0, 'daily reward cannot be claimed twice');

// ---- achievements ----
assert((G.save.stats.served || 0) >= 1, 'served stat tracked (' + G.save.stats.served + ')');
const coinsBeforeAch = G.save.coins;
assert(G.claimAch('first_serve') === true, 'first_serve achievement claimable');
assert(G.save.coins === coinsBeforeAch + 25, 'achievement reward paid (+25)');
assert(G.claimAch('first_serve') === false, 'achievement cannot be claimed twice');

console.log(fails === 0 ? 'META SMOKE TEST PASSED' : 'META SMOKE TEST FAILED (' + fails + ')');
process.exit(fails === 0 ? 0 : 1);
