'use strict';
/* =====================================================================
   READY SET COOK! — a fast-paced 2D cooking game
   Pick ingredients → prep them at stations → fill order plates → serve!
   ===================================================================== */

// ------------------------- CONFIG -------------------------
// Logical layout per orientation (canvas pixels; the stage is scaled to fit any screen).
const LANDSCAPE = { W: 960, H: 640, ORDER_X: 14, ORDER_W: 216, ORDER_Y0: 58, ORDER_H: 178, ORDER_GAP: 12, AREA_X: 244, AREA_W: 702, STA_Y: 58, STA_H: 196, STA_W: 222, STA_GAP: 18, FRIDGE_Y: 268, FRIDGE_H: 358, CELLS: 6, CELL_GAP: 10 };
const PORTRAIT  = { W: 640, H: 960, ORDER_X: 14, ORDER_W: 216, ORDER_Y0: 58, ORDER_H: 178, ORDER_GAP: 12, AREA_X: 244, AREA_W: 396, STA_Y: 58, STA_H: 150, STA_W: 124, STA_GAP: 12, FRIDGE_Y: 222, FRIDGE_H: 724, CELLS: 3, CELL_GAP: 10 };
let L = null;
function computeLayout() {
  const vw = window.innerWidth || 1280, vh = window.innerHeight || 720;
  const base = vw < vh ? PORTRAIT : LANDSCAPE;
  const rows = Math.ceil(Object.keys(INGREDIENTS).length / base.CELLS);
  return Object.assign({}, base, {
    CELL_W: (base.AREA_W - 28 - base.CELL_GAP * (base.CELLS - 1)) / base.CELLS,
    CELL_H: (base.FRIDGE_H - 56 - (rows - 1) * base.CELL_GAP) / rows,
  });
}

const INGREDIENTS = {
  lettuce:  { name: 'Lettuce',  emoji: '🥬', proc: 'chop'  },
  tomato:   { name: 'Tomato',   emoji: '🍅', proc: 'chop'  },
  cucumber: { name: 'Cucumber', emoji: '🥒', proc: 'chop'  },
  onion:    { name: 'Onion',    emoji: '🧅', proc: 'chop'  },
  carrot:   { name: 'Carrot',   emoji: '🥕', proc: 'chop'  },
  beef:     { name: 'Beef',     emoji: '🥩', proc: 'cook'  },
  egg:      { name: 'Egg',      emoji: '🥚', proc: 'cook'  },
  water:    { name: 'Water',    emoji: '💧', proc: 'cook'  },
  bun:      { name: 'Bun',      emoji: '🍞', proc: 'none'  },
  cheese:   { name: 'Cheese',   emoji: '🧀', proc: 'none'  },
  orange:   { name: 'Orange',   emoji: '🍊', proc: 'blend' },
  apple:    { name: 'Apple',    emoji: '🍎', proc: 'blend' },
};

// accent colors used by the station action particles
const ING_COLORS = {
  lettuce: '#7cb342', tomato: '#e2574c', cucumber: '#8fbf5f', onion: '#a251ad',
  carrot: '#f2993a', beef: '#c26a52', egg: '#f2d24f', water: '#7ec8ff',
  bun: '#e0a25e', cheese: '#f2d24f', orange: '#f2993a', apple: '#e2574c',
};

const RECIPES = {
  salad:    { name: 'Garden Salad',     emoji: '🥗', items: ['lettuce', 'tomato', 'cucumber'] },
  burger:   { name: 'Cheeseburger',     emoji: '🍔', items: ['bun', 'beef', 'cheese'] },
  omelette: { name: 'Veggie Omelette',  emoji: '🍳', items: ['egg', 'cheese', 'onion'] },
  smoothie: { name: 'Fruit Smoothie',   emoji: '🥤', items: ['orange', 'apple'] },
  soup:     { name: 'Hearty Soup',      emoji: '🍲', items: ['water', 'carrot', 'onion'] },
};

const STATION_DEFS = [
  { id: 'chop',  emoji: '🔪', name: 'CHOP',  time: 0.9, items: ['lettuce', 'tomato', 'cucumber', 'onion', 'carrot'] },
  { id: 'cook',  emoji: '🍳', name: 'COOK',  time: 1.7, items: ['beef', 'egg', 'water'] },
  { id: 'blend', emoji: '🧊', name: 'BLEND', time: 1.1, items: ['orange', 'apple'] },
];

// serving a dish within FRESH_WINDOW seconds of it finishing earns a Fresh bonus
const FRESH_WINDOW = 4;
const FRESH_BONUS = 15;

const TIER_RECIPES = [
  ['salad', 'burger'],
  ['salad', 'burger', 'omelette', 'smoothie'],
  ['salad', 'burger', 'omelette', 'smoothie', 'soup'],
];
const LEVEL_NAMES = [
  'First Order', 'Salad Days', 'Double Shift', 'Big Lunch', 'Rush Hour',
  'Menu Expansion', 'Fruit Frenzy', 'Egg Hunt', 'Peak Service', 'Weekend Crowd',
  'Soup Season', 'Full House', 'Grand Opening', "Chef's Trial", 'Master Service',
];
const LEVELS = [];
for (let lv = 1; lv <= 15; lv++) {
  const tier = lv <= 5 ? 0 : lv <= 10 ? 1 : 2;
  LEVELS.push({
    name: LEVEL_NAMES[lv - 1],
    time: Math.round(61 - lv * 1.4),
    patience: Math.max(12, 27 - lv),
    spawnMin: Math.max(3.0, 5.6 - lv * .12),
    spawnMax: Math.max(1.6, 3.3 - lv * .08),
    recipes: TIER_RECIPES[tier],
    hearts: 3,
    secret: tier >= 1,
    star1: Math.round(850 + lv * 70),
    star2: Math.round(1700 + lv * 140),
    star3: Math.round(2700 + lv * 200),
  });
}
const MAX_ORDERS = 3;

const THEMES = {
  classic: { name: 'Classic', tint: 'rgba(0,0,0,0)', accent: '#5c3805' },
  sunset:  { name: 'Sunset',  tint: 'rgba(255,150,70,.16)', accent: '#c96a2e' },
  mint:    { name: 'Mint',    tint: 'rgba(90,190,150,.14)', accent: '#3e8a6d' },
  berry:   { name: 'Berry',   tint: 'rgba(160,80,170,.14)', accent: '#7d4a8f' },
};
const SHOP_ITEMS = [
  { id: 'time',  type: 'booster', name: 'Time +10s',      desc: 'Adds 10 seconds to the clock',          price: 50,  icon: 'assets/sorceress/ui/booster-time.png',  emoji: '⏳' },
  { id: 'heart', type: 'booster', name: 'Extra Heart',    desc: 'Start the level with an extra heart',   price: 80,  icon: 'assets/sorceress/ui/booster-heart.png', emoji: '❤️' },
  { id: 'slow',  type: 'booster', name: 'Slow Patience',  desc: 'Customers wait 30% longer',             price: 100, icon: 'assets/sorceress/ui/booster-slow.png',  emoji: '❄️' },
  { id: 'sunset', type: 'theme',  name: 'Sunset Kitchen', desc: 'Warm golden-hour kitchen theme',        price: 300, icon: 'assets/sorceress/themes/theme-sunset.png', emoji: '🌇' },
  { id: 'mint',   type: 'theme',  name: 'Mint Kitchen',   desc: 'Fresh mint-green kitchen theme',        price: 500, icon: 'assets/sorceress/themes/theme-mint.png',   emoji: '🌿' },
  { id: 'berry',  type: 'theme',  name: 'Berry Kitchen',  desc: 'Cozy berry-purple kitchen theme',       price: 800, icon: 'assets/sorceress/themes/theme-berry.png',  emoji: '🍇' },
];

// ------------------------- DOM / CANVAS -------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');
const rotateHint = document.getElementById('rotateHint');
let DPR = 1;

function applyCanvasSize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(L.W * DPR);
  canvas.height = Math.round(L.H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
function viewportSize() {
  // visualViewport = what the user can actually see (iOS Safari toolbars shrink it);
  // falling back to innerWidth/Height where unsupported
  const vv = window.visualViewport;
  return {
    w: (vv && vv.width) || window.innerWidth || 1280,
    h: (vv && vv.height) || window.innerHeight || 720,
  };
}
function fitStage() {
  const { w: vw, h: vh } = viewportSize();
  const s = Math.min(vw / L.W, vh / L.H);
  stage.style.width = Math.floor(L.W * s) + 'px';
  stage.style.height = Math.floor(L.H * s) + 'px';
  if (rotateHint) rotateHint.classList.toggle('show', L.W < L.H);
}
function onResize() {
  L = computeLayout();
  applyCanvasSize();
  fitStage();
}
L = computeLayout();
applyCanvasSize();
fitStage();
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 250)); // iOS settles late
if (window.visualViewport) {
  // toolbar collapsing/expanding on iOS fires resize AND scroll on the visual viewport
  window.visualViewport.addEventListener('resize', onResize);
  window.visualViewport.addEventListener('scroll', onResize);
}
// block pinch-zoom and any residual page panning (app is a fixed full-screen shell)
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchmove', e => {
  if (e.target === document.documentElement || e.target === document.body) e.preventDefault();
}, { passive: false });

const $ = id => document.getElementById(id);
const homeEl = $('home'), levelsEl = $('levels'), shopEl = $('shop'), resultsEl = $('results'), pauseEl = $('pause');
const bestScoreEl = $('bestScore'), bestFinalEl = $('bestFinal');
const homeCoinsEl = $('homeCoins'), levelsCoinsEl = $('levelsCoins'), shopCoinsEl = $('shopCoins');
const resTitleEl = $('resTitle'), starsEl = $('stars'), rankEl = $('rank'), finalScoreEl = $('finalScore'), coinsEl = $('coinsEarned');
const nextBtn = $('nextBtn'), retryBtn = $('retryBtn'), homeBtn = $('homeBtn');
const pauseBtn = $('pauseBtn'), resumeBtn = $('resumeBtn'), restartBtn = $('restartBtn'), pauseHomeBtn = $('pauseHomeBtn'), pauseInfoEl = $('pauseInfo');
const muteBtn = $('muteBtn');
const dailyBtn = $('dailyBtn'), dailyIcoEl = $('dailyIco'), dailyLabelEl = $('dailyLabel'), dailyStreakEl = $('dailyStreak');
const continueBtn = $('continueBtn'), welcomeLineEl = $('welcomeLine'), specialCardEl = $('specialCard');
const homeLevelEl = $('homeLevel'), homeStarsEl = $('homeStars');
const tutorialEl = $('tutorial');
const achEl = $('achiev'), achList = $('achList');

// ------------------------- AUDIO (WebAudio synth) -------------------------
let actx = null, muted = false;
function ensureAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume();
}
function tone(f, dur, type = 'sine', vol = 0.18, slideTo = null, delay = 0) {
  if (muted || !actx) return;
  const t0 = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(actx.destination);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
function noise(dur, vol = 0.15, freq = 3000, delay = 0) {
  if (muted || !actx) return;
  const t0 = actx.currentTime + delay;
  const len = Math.max(1, Math.floor(actx.sampleRate * dur));
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = actx.createBufferSource(); src.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = actx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(actx.destination);
  src.start(t0);
}
const SFX = {
  pick()  { tone(600, .05, 'triangle', .2); tone(900, .07, 'triangle', .15, 1100, .03); },
  plop()  { tone(340, .09, 'sine', .25, 520); },
  chop()  { noise(.05, .22, 2500); noise(.05, .18, 3200, .09); },
  cook()  { noise(1.2, .09, 1700); for (let i = 0; i < 6; i++) noise(.03, .1, 4200, i * .19); },
  blend() { tone(72, 1.2, 'sawtooth', .07, 95); tone(145, 1.2, 'square', .035, 175); },
  done()  { tone(700, .08, 'triangle', .2); tone(1050, .1, 'triangle', .15, 0, .07); },
  serve() { if (playMp3('serve')) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, .13, 'triangle', .22, 0, i * .07)); tone(1568, .22, 'sine', .12, 0, .3); },
  buzz()  { if (playMp3('buzz')) return; tone(150, .22, 'square', .14, 95); },
  heart() { if (playMp3('heart')) return; tone(300, .25, 'sawtooth', .14, 110); tone(200, .3, 'sawtooth', .12, 80, .15); },
  tick()  { tone(950, .04, 'square', .09); },
  beep()  { tone(440, .14, 'sine', .2); },
  go()    { tone(523, .1, 'triangle', .22); tone(784, .18, 'triangle', .22, 0, .1); tone(1046, .38, 'triangle', .24, 0, .25); },
  fanfare(){ [523, 659, 784].forEach((f, i) => tone(f, .3, 'triangle', .2, 0, i * .12)); [659, 784, 1046].forEach((f, i) => tone(f, .42, 'triangle', .2, 0, .5 + i * .13)); },
};
muteBtn.addEventListener('click', () => { muted = !muted; muteBtn.textContent = muted ? '🔇' : '🔊'; if (musicEl) musicEl.muted = muted; });

// ------------------------- ASSETS (generated art + audio) -------------------------
const ASSET = {
  bg: 'assets/sorceress/background.png',
  sprites: {
    lettuce: 'assets/sorceress/sprites/lettuce.png',
    tomato: 'assets/sorceress/sprites/tomato.png',
    cucumber: 'assets/sorceress/sprites/cucumber.png',
    onion: 'assets/sorceress/sprites/onion.png',
    carrot: 'assets/sorceress/sprites/carrot.png',
    beef: 'assets/sorceress/sprites/beef.png',
    egg: 'assets/sorceress/sprites/egg.png',
    water: 'assets/sorceress/sprites/water.png',
    bun: 'assets/sorceress/sprites/bun.png',
    cheese: 'assets/sorceress/sprites/cheese.png',
    orange: 'assets/sorceress/sprites/orange.png',
    apple: 'assets/sorceress/sprites/apple.png',
    salad: 'assets/sorceress/sprites/salad.png',
    burger: 'assets/sorceress/sprites/burger.png',
    omelette: 'assets/sorceress/sprites/omelette.png',
    smoothie: 'assets/sorceress/sprites/smoothie.png',
    soup: 'assets/sorceress/sprites/soup.png',
    chop: 'assets/sorceress/sprites/chop.png',
    cook: 'assets/sorceress/sprites/cook.png',
    blend: 'assets/sorceress/sprites/blend.png',
    // processed results (chopped / cooked) — used by stations once processing finishes
    'chop-lettuce': 'assets/sorceress/sprites/chop-lettuce.png',
    'chop-tomato': 'assets/sorceress/sprites/chop-tomato.png',
    'chop-cucumber': 'assets/sorceress/sprites/chop-cucumber.png',
    'chop-onion': 'assets/sorceress/sprites/chop-onion.png',
    'chop-carrot': 'assets/sorceress/sprites/chop-carrot.png',
    'cook-beef': 'assets/sorceress/sprites/cook-beef.png',
    'cook-egg': 'assets/sorceress/sprites/cook-egg.png',
  },
  // ingredient → processed-result sprite key (whole raw sprite is the fallback)
  processed: {
    lettuce: 'chop-lettuce',
    tomato: 'chop-tomato',
    cucumber: 'chop-cucumber',
    onion: 'chop-onion',
    carrot: 'chop-carrot',
    beef: 'cook-beef',
    egg: 'cook-egg',
  },
  anims: {
    'anim-chop': 'assets/sorceress/autosprite/small/anim-chop.png',
    'anim-chop-lettuce': 'assets/sorceress/autosprite/small/anim-chop-lettuce.png',
    'anim-chop-cucumber': 'assets/sorceress/autosprite/small/anim-chop-cucumber.png',
    'anim-chop-onion': 'assets/sorceress/autosprite/small/anim-chop-onion.png',
    'anim-chop-carrot': 'assets/sorceress/autosprite/small/anim-chop-carrot.png',
    'anim-blend': 'assets/sorceress/autosprite/small/anim-blend.png',
    'anim-blend-apple': 'assets/sorceress/autosprite/small/anim-blend-apple.png',
    'anim-fry': 'assets/sorceress/autosprite/small/anim-fry.png',
    'anim-fry-egg': 'assets/sorceress/autosprite/small/anim-fry-egg.png',
    'anim-boil': 'assets/sorceress/autosprite/small/anim-boil.png',
  },
  music: 'assets/sorceress/audio/music.mp3',
  sfx: {
    serve: 'assets/sorceress/audio/serve.mp3',
    buzz: 'assets/sorceress/audio/buzz.mp3',
    heart: 'assets/sorceress/audio/heart.mp3',
  },
};
const IMG = {};
function loadImg(key, src) {
  if (typeof Image === 'undefined') return;
  const im = new Image();
  im.decoding = 'async';      // don't block main thread while decoding
  im.onload = () => { IMG[key] = im; };
  im.src = src;
}
loadImg('bg', ASSET.bg);
for (const k of Object.keys(ASSET.sprites)) loadImg(k, ASSET.sprites[k]);
// anim sheets: only the two base action sheets eagerly; per-ingredient variants
// (and fry/boil) lazy-load on first use in startStationProc — keeps startup light
for (const k of ['anim-chop', 'anim-blend']) loadImg(k, ASSET.anims[k]);

// AutoSprite keyed sheets: 8 cols x 6 rows of 240px frames, 46 valid frames, ~15 fps source
const ANIM_META = { cols: 8, rows: 6, frames: 46, frame: 240, fps: 15 };
const ANIM_FOR = {
  chop:  { lettuce: 'anim-chop-lettuce', tomato: 'anim-chop', cucumber: 'anim-chop-cucumber', onion: 'anim-chop-onion', carrot: 'anim-chop-carrot' },
  blend: { orange: 'anim-blend', apple: 'anim-blend-apple' },
  cook:  { beef: 'anim-fry', egg: 'anim-fry-egg', water: 'anim-boil' },
};
const ANIM_BASE = { chop: 'anim-chop', blend: 'anim-blend' };
function animSheetFor(s) {
  const map = ANIM_FOR[s.id];
  if (!map) return null;
  let key = map[s.item] || null;
  if (!key) return null;
  if (!IMG[key]) {
    // variant not loaded yet — fall back to the station's base sheet if available
    const base = ANIM_BASE[s.id];
    if (base && IMG[base]) key = base;
  }
  return key;
}
function drawAnimSheet(sheet, t, cx, cy, size) {
  const m = ANIM_META;
  const idx = Math.floor(t * m.fps) % m.frames;
  const sx = (idx % m.cols) * m.frame, sy = Math.floor(idx / m.cols) * m.frame;
  ctx.drawImage(sheet, sx, sy, m.frame, m.frame, cx - size / 2, cy - size / 2, size, size);
}

const SFXA = {};
let musicEl = null;
if (typeof Audio !== 'undefined') {
  for (const k of Object.keys(ASSET.sfx)) {
    const a = new Audio(ASSET.sfx[k]);
    a.volume = 0.85;
    SFXA[k] = a;
  }
  musicEl = new Audio(ASSET.music);
  musicEl.loop = true;
  musicEl.volume = 0.4;
  musicEl.preload = 'none';   // don't download the track until the first tap starts it
}
function playMp3(id) {
  if (muted) return false;
  const a = SFXA[id];
  if (!a || a.readyState < 1) return false;
  try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) { return false; }
  return true;
}
function startMusic() {
  if (!musicEl || muted) return;
  try { musicEl.play().catch(() => {}); } catch (e) { /* no audio */ }
}

// ------------------------- STATE -------------------------
let state = 'title';            // title | countdown | playing | gameOver | levelEnd
let score = 0, hearts = 3, combo = 0, level = 1, timeLeft = 0;
let patienceMult = 1;
let boosters = { time: false, heart: false, slow: false };
let orders = [], selectedIdx = null, held = null;
let stations = [], nextSpawn = 0, cdT = 0, cdWord = '';
let parts = [], floaters = [], shakeT = 0, shakeMag = 0, paused = false;
let heartPopT = 0; // >0 while the hearts HUD plays its bounce
let mouse = { x: -100, y: -100 };
let regions = [];
let secretRecipe = null;
let lastTickSec = 99;
let orderIdSeq = 1;

const best = {
  get() { try { return +window.localStorage.getItem('rsc_best') || 0; } catch (e) { return 0; } },
  set(v) { try { window.localStorage.setItem('rsc_best', v); } catch (e) { /* storage unavailable */ } },
};

// persistent save: progression, coins, inventory, theme, meta-progression
function defaultSave() {
  return {
    unlocked: 1, stars: {}, coins: 100,
    inv: { time: 1, heart: 1, slow: 1 },
    theme: 'classic', themesOwned: [],
    stats: { served: 0, maxCombo: 0, star3s: 0, perfects: 0, burned: 0, freshServes: 0 },
    achClaimed: [],
    lastDaily: '', dailyStreak: 0,
    tut: 0, // highest level whose in-game tutorial was completed (1-4)
  };
}
let save = defaultSave();
try {
  const raw = window.localStorage.getItem('rsc_save_v2');
  if (raw) save = Object.assign(defaultSave(), JSON.parse(raw));
} catch (e) { /* fresh save */ }
function persist() { try { window.localStorage.setItem('rsc_save_v2', JSON.stringify(save)); } catch (e) { /* storage unavailable */ } }

// ------------------------- HELPERS -------------------------
function rr(x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
function text(str, x, y, size, color = '#fff', align = 'center', weight = 700) {
  ctx.font = `${weight} ${size}px Fredoka, 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function addFloater(x, y, str, color = '#ffd76a', size = 22) {
  floaters.push({ x, y, str, color, size, t: 0, life: 1.1 });
}
function burst(x, y, colors, n = 18, spd = 260) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = rand(spd * .3, spd);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: rand(.5, .9), max: .9, size: rand(3, 7), color: colors[(Math.random() * colors.length) | 0] });
  }
}
function spawnPart(o) {
  if (parts.length > 380) return;
  parts.push(Object.assign({ life: .6, max: .6, size: 4, color: '#fff', grav: 480, vx: 0, vy: 0, shape: 'circle', rot: 0, vrot: 0 }, o));
}
function shake(mag = 8, t = .35) { shakeT = t; shakeMag = mag; }

// ------------------------- GAME FLOW -------------------------
function newGame() { startLevel(1); }
function startLevel(n) {
  level = n;
  const cfg = LEVELS[level - 1];
  score = 0; combo = 0;
  hearts = cfg.hearts + (boosters.heart ? 1 : 0);
  heartPopT = 0.5;
  timeLeft = cfg.time + (boosters.time ? 10 : 0);
  patienceMult = boosters.slow ? 1.3 : 1;
  for (const b of ['time', 'heart', 'slow']) if (boosters[b] && save.inv[b] > 0) { save.inv[b]--; persist(); }
  boosters = { time: false, heart: false, slow: false };
  orders = []; selectedIdx = null; held = null;
  stations = STATION_DEFS.map(d => ({ ...d, busy: false, ready: false, burning: false, idleT: 0, burnFxT: 0, progress: 0, item: null, soundT: 0, hitT: 0, steamT: 0, sizzleT: 0, splashT: 0 }));
  parts = []; floaters = [];
  secretRecipe = null;
  const pool = cfg.recipes.slice();
  if (cfg.secret && pool.length > 2) secretRecipe = pool[(Math.random() * pool.length) | 0];
  state = 'countdown';
  cdT = 3.3; cdWord = '';
  nextSpawn = 0;
  lastTickSec = 99;
  hideTutorial();
  startTutorial(n);
  showOverlay(null);
  renderCoins();
  requestWakeLock();
}
function startRound(r) { startLevel(r); } // legacy alias

// ------------------------- TUTORIAL (teach by playing, no walls of text) -------------------------
// Levels 1-4 each show ONE contextual hint. It disappears the moment the
// player performs the taught action (or after a timeout, so it never lingers).
const TUTORIALS = {
  1: { msg: '👆 Tap a food in the fridge to grab it',                       until: () => held != null },
  2: { msg: '👆 With a food in hand, tap the right station (🔪 CHOP for veggies)', until: () => stations.some(s => s.busy) },
  3: { msg: '👆 Finished food glows on the station — tap it to serve!',     until: () => (save.stats.served || 0) > tutServed },
  4: { msg: '⚡ Fresh Bonus! Serve finished food right away!',                 until: () => (save.stats.freshServes || 0) > tutFresh },
};
let tutTimer = 0, tutServed = 0, tutFresh = 0;
function startTutorial(n) {
  if (!tutorialEl || n > 4 || (save.tut || 0) >= n) return;
  const t = TUTORIALS[n];
  if (!t) return;
  tutServed = save.stats.served || 0;
  tutFresh = save.stats.freshServes || 0;
  tutorialEl.textContent = t.msg;
  tutorialEl.hidden = false;
  tutTimer = 14; // auto-dismiss fallback
}
function updateTutorial(dt) {
  if (!tutorialEl || tutorialEl.hidden) return;
  const t = TUTORIALS[level];
  if (!t) { tutorialEl.hidden = true; return; }
  tutTimer -= dt;
  if (tutTimer <= 0 || t.until()) {
    tutorialEl.hidden = true;
    if (level > (save.tut || 0)) { save.tut = level; persist(); }
  }
}
function hideTutorial() { if (tutorialEl) tutorialEl.hidden = true; }

// ------------------------- AMBIENT (menu life: steam + floating dust) -------------------------
// Tiny drifting motes + soft steam puffs drawn on the canvas behind the home
// overlay — the kitchen visibly steams and shimmers while the player is in menus.
let ambPuffs = [], ambDust = [];
function updateAmbient(dt) {
  if (state !== 'title') { ambPuffs = []; ambDust = []; return; }
  if (ambPuffs.length < 5 && Math.random() < dt * 2.2) {
    ambPuffs.push({ x: rand(L.W * .12, L.W * .88), y: L.H + 14, r: rand(16, 34), vx: rand(-8, 8), vy: rand(-40, -22), a: rand(.05, .11), t: 0, life: rand(4, 6.5) });
  }
  for (const p of ambPuffs) { p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt; }
  ambPuffs = ambPuffs.filter(p => p.t < p.life);
  if (ambDust.length < 14 && Math.random() < dt * 3) {
    ambDust.push({ x: rand(0, L.W), y: rand(0, L.H), r: rand(1, 2.4), vx: rand(-10, 10), vy: rand(-16, -6), a: rand(.05, .15), t: 0, life: rand(5, 9) });
  }
  for (const p of ambDust) { p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt; }
  ambDust = ambDust.filter(p => p.t < p.life);
}
function drawAmbient() {
  if (state !== 'title' || !ambDust.length && !ambPuffs.length) return;
  const t = performance.now() / 1000;
  for (const p of ambDust) {
    ctx.globalAlpha = p.a * (1 - p.t / p.life) * (0.7 + 0.3 * Math.sin(t * 3 + p.x));
    ctx.fillStyle = '#fff7ea';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of ambPuffs) {
    const k = p.t / p.life;
    ctx.globalAlpha = p.a * (1 - k) * (0.6 + 0.4 * Math.sin(t * 2 + p.x));
    const pr = p.r * (1 + k * 1.6);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr);
    g.addColorStop(0, 'rgba(255,255,255,.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, pr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function spawnOrder() {
  const cfg = LEVELS[level - 1];
  const inQueue = new Set(orders.map(o => o.recipeId));
  let candidates = cfg.recipes.filter(id => !inQueue.has(id));
  if (!candidates.length) candidates = cfg.recipes.filter(id => !inQueue.has(id) || true).slice(0, 1);
  let pick;
  const secretFree = secretRecipe && !inQueue.has(secretRecipe);
  if (secretFree && Math.random() < 0.35) pick = secretRecipe;
  else pick = candidates[(Math.random() * candidates.length) | 0];
  const special = secretRecipe === pick;
  const maxPat = Math.round(cfg.patience * patienceMult);
  orders.push({
    id: orderIdSeq++,
    recipeId: pick,
    patience: maxPat,
    maxPatience: maxPat,
    filled: [],
    state: 'active',     // active | celebrate | expired
    t: 0, anim: 0, special,
  });
  // lazy-load the dish sprite — the patience timer gives it time to arrive (emoji fallback until then)
  if (!IMG[pick] && ASSET.sprites[pick]) loadImg(pick, ASSET.sprites[pick]);
}

function orderNeeds(o, ingId) {
  return RECIPES[o.recipeId].items.includes(ingId) && !o.filled.includes(ingId);
}
function removeOrder(o) {
  const i = orders.indexOf(o);
  if (selectedIdx === i) selectedIdx = null;
  else if (selectedIdx > i) selectedIdx--;
  orders.splice(i, 1);
}
function activeOrders() { return orders.filter(o => o.state === 'active'); }

function placeItem(ingId) {
  let target = null;
  if (selectedIdx != null && orders[selectedIdx] && orders[selectedIdx].state === 'active' && orderNeeds(orders[selectedIdx], ingId)) {
    target = orders[selectedIdx];
  }
  if (!target) target = orders.find(o => o.state === 'active' && orderNeeds(o, ingId));
  if (!target) { SFX.buzz(); addFloater(mouse.x, mouse.y - 40, 'Nobody wants that!', '#ff9d8a', 16); return false; }
  target.filled.push(ingId);
  SFX.plop();
  const idx = orders.indexOf(target);
  burst(L.ORDER_X + L.ORDER_W / 2, L.ORDER_Y0 + idx * (L.ORDER_H + L.ORDER_GAP) + 30, ['#8fd46a', '#ffd76a', '#ff8a5c', '#7ec8ff'], 10, 160);
  if (target.filled.length === RECIPES[target.recipeId].items.length) completeOrder(target);
  return true;
}

function completeOrder(o) {
  o.state = 'celebrate'; o.t = 0;
  combo++;
  save.stats.served = (save.stats.served || 0) + 1;
  save.stats.maxCombo = Math.max(save.stats.maxCombo || 0, combo);
  const mult = Math.min(1 + 0.5 * (combo - 1), 4);
  let pts = Math.round((100 + o.patience * 3) * mult);
  if (o.special) pts = Math.round(pts * 1.5);
  score += pts;
  const idx = orders.indexOf(o);
  const cx = L.ORDER_X + L.ORDER_W / 2, cy = L.ORDER_Y0 + idx * (L.ORDER_H + L.ORDER_GAP) + 40;
  burst(cx, cy, ['#ffd76a', '#ff9d8a', '#8fd46a', '#7ec8ff', '#d9a6ff'], 26, 300);
  addFloater(cx, cy - 20, `+${pts}`, o.special ? '#d9a6ff' : '#ffd76a', o.special ? 26 : 24);
  if (o.special) { addFloater(cx, cy + 8, '⭐ SECRET DISH ×1.5!', '#d9a6ff', 15); }
  if (combo >= 2) addFloater(cx, cy + 34, `🔥 COMBO ×${combo}`, '#ff8a5c', 16);
  SFX.serve(); buzzPhone(12);
  shake(3, .15);
  nextSpawn = Math.min(nextSpawn, timeLeft - 0.8);
}

function expireOrder(o) {
  o.state = 'expired'; o.t = 0;
  hearts--; combo = 0;
  heartPopT = 0.5;
  const idx = orders.indexOf(o);
  const cx = L.ORDER_X + L.ORDER_W / 2, cy = L.ORDER_Y0 + idx * (L.ORDER_H + L.ORDER_GAP) + 40;
  burst(cx, cy, ['#666', '#999', '#444'], 14, 180);
  addFloater(cx, cy, '💔 Order lost!', '#ff8a8a', 18);
  SFX.heart(); shake(9, .4); buzzPhone(60);
  if (selectedIdx != null && orders[selectedIdx] === o) selectedIdx = null;
  if (hearts <= 0) {
    state = 'gameOver';
    releaseWakeLock();
    setTimeout(() => showResults(false), 900);
  }
}

function rankFor(sc) {
  return sc >= 9000 ? '👑 Master Chef' : sc >= 6500 ? 'Head Chef' : sc >= 4200 ? 'Sous Chef' : sc >= 2200 ? 'Line Cook' : sc >= 900 ? 'Home Cook' : 'Burnt Toast 🔥';
}

function showResults(success, stars = 0, coinsEarned = 0) {
  hideTutorial();
  if (success) {
    const b = best.get();
    if (score > b) best.set(score);
    bestFinalEl.textContent = Math.max(b, score);
    resTitleEl.textContent = stars >= 3 ? '⭐ PERFECT SERVICE!' : '👨‍🍳 LEVEL COMPLETE!';
  } else {
    resTitleEl.textContent = 'OUT OF HEARTS! 💔';
    bestFinalEl.textContent = best.get();
  }
  starsEl.innerHTML = '';
  for (let i = 1; i <= 3; i++) {
    const s = document.createElement('span');
    s.className = 's' + (i <= stars ? ' on' : '');
    s.textContent = '⭐';
    s.style.animationDelay = (i * 0.35) + 's';
    starsEl.appendChild(s);
  }
  rankEl.textContent = 'Rank: ' + rankFor(score);
  finalScoreEl.textContent = score;
  coinsEl.textContent = coinsEarned > 0 ? '+' + coinsEarned + ' 🪙 coins earned' : '';
  nextBtn.style.display = (success && level < LEVELS.length) ? '' : 'none';
  nextBtn.textContent = 'NEXT LEVEL ▶';
  SFX.fanfare();
  showOverlay('results');
}

function levelComplete() {
  state = 'levelEnd';
  releaseWakeLock();
  const cfg = LEVELS[level - 1];
  const stars = score >= cfg.star3 ? 3 : score >= cfg.star2 ? 2 : score >= cfg.star1 ? 1 : 0;
  const old = save.stars[level] || 0;
  save.stars[level] = Math.max(old, stars);
  if (stars > 0 && level >= save.unlocked && level < LEVELS.length) save.unlocked = level + 1;
  const coins = Math.floor(score / 10) + stars * 25;
  save.coins += coins;
  if (stars === 3) save.stats.star3s = (save.stats.star3s || 0) + 1;
  if (hearts >= 3) save.stats.perfects = (save.stats.perfects || 0) + 1;
  persist();
  showResults(true, stars, coins);
}

// ------------------------- STATIONS -------------------------
function startStationProc(s, ingId) {
  s.item = ingId; s.busy = true; s.progress = 0;
  s.soundT = 0.35; s.hitT = 0.6; s.steamT = 0; s.sizzleT = 0.2; s.splashT = 0.2;
  // lazily load the ingredient-specific animation sheet (keeps initial load light)
  const map = ANIM_FOR[s.id];
  if (map && map[ingId] && !IMG[map[ingId]] && ASSET.anims[map[ingId]]) loadImg(map[ingId], ASSET.anims[map[ingId]]);
  // lazily load the processed-result sprite (chopped/cooked) — plenty of time while it cooks
  const pkey = ASSET.processed[ingId];
  if (pkey && !IMG[pkey] && ASSET.sprites[pkey]) loadImg(pkey, ASSET.sprites[pkey]);
  if (s.id === 'chop') SFX.chop();
  else if (s.id === 'cook') SFX.cook();
  else SFX.blend();
}

function stationCenter(s) {
  const i = stations.indexOf(s);
  return { x: L.AREA_X + i * (L.STA_W + L.STA_GAP) + L.STA_W / 2, y: L.STA_Y + L.STA_H * 0.62 };
}

function chopHitFx(s) {
  s.hitT = 1;
  const c = stationCenter(s);
  const col = ING_COLORS[s.item] || '#8fd46a';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (Math.random() - .5) * 1.7;
    const sp = rand(90, 260);
    spawnPart({ x: c.x + rand(-14, 14), y: c.y - 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rand(.35, .6), max: .6, size: rand(2.5, 5.5), color: col, shape: 'chunk', grav: 640, rot: Math.random() * 6, vrot: rand(-14, 14) });
  }
}

function cookFx(s) {
  const c = stationCenter(s);
  spawnPart({ x: c.x + rand(-16, 16), y: c.y - 40, vx: rand(-12, 12), vy: rand(-34, -16), life: rand(.7, 1.2), max: 1.2, size: rand(5, 9), color: 'rgba(255,255,255,.9)', shape: 'steam', grav: -14, grow: 1.5 });
}

function sizzleFx(s) {
  s.hitT = 1;
  const c = stationCenter(s);
  spawnPart({ x: c.x + rand(-24, 24), y: c.y + 16, vx: rand(-50, 50), vy: rand(-130, -60), life: rand(.3, .5), max: .5, size: rand(2, 4.5), color: Math.random() < .5 ? '#f2b134' : '#ff8a3c', grav: 720 });
}

function blendSplashFx(s) {
  const c = stationCenter(s);
  const col = ING_COLORS[s.item] || '#7ec8ff';
  spawnPart({ x: c.x + rand(-10, 10), y: c.y - 34, vx: rand(-55, 55), vy: rand(-120, -60), life: rand(.4, .6), max: .6, size: rand(2.5, 5), color: col, grav: 660 });
}

function burnSmokeFx(s) {
  const c = stationCenter(s);
  spawnPart({ x: c.x + rand(-12, 12), y: c.y - 14, vx: rand(-10, 10), vy: rand(-48, -32), life: rand(.8, 1.4), max: 1.4, size: rand(7, 13), color: 'rgba(58,48,42,.85)', shape: 'smoke', grav: -40, grow: 30 });
}

function updateStations(dt) {
  for (const s of stations) {
    if (s.hitT > 0) s.hitT = Math.max(0, s.hitT - dt * 3.4);
    if (!s.busy) {
      // ready food: serve it promptly for the Fresh bonus — only the cook station burns
      if (s.ready) {
        s.idleT += dt;
        if (s.id === 'cook') {
          if (!s.burning && s.idleT >= 6) {
          s.burning = true; s.burnFxT = 0;
          const c = stationCenter(s);
          addFloater(c.x, c.y - 44, '🔥 Burning!', '#e2574c', 16);
          SFX.buzz(); shake(2, .15);
        }
        if (s.burning) {
          s.burnFxT -= dt;
          if (s.burnFxT <= 0) { s.burnFxT = 0.18; burnSmokeFx(s); }
          if (s.idleT >= 10) {
            s.ready = false; s.burning = false; s.item = null;
            save.stats.burned = (save.stats.burned || 0) + 1;
            persist();
            const c = stationCenter(s);
            addFloater(c.x, c.y - 20, '💨 Burned!', '#8a8a8a', 18);
            buzzPhone(40);
            burst(c.x, c.y, ['#555', '#777', '#333'], 12, 140);
          }
        }
      }
      }
      continue;
    }
    s.progress += dt;
    // ambient process sounds
    s.soundT -= dt;
    if (s.soundT <= 0) {
      s.soundT = s.id === 'chop' ? 0.35 : s.id === 'blend' ? 0.45 : 0.95;
      if (s.id === 'chop') { noise(0.05, 0.11, 2600); chopHitFx(s); }
      else if (s.id === 'blend') tone(72, 0.14, 'sawtooth', 0.045, 95);
    }
    // cook: steam + sizzle cadence
    if (s.id === 'cook') {
      s.steamT -= dt;
      if (s.steamT <= 0) { s.steamT = 0.14; cookFx(s); }
      s.sizzleT -= dt;
      if (s.sizzleT <= 0) { s.sizzleT = rand(.35, .6); sizzleFx(s); }
    }
    // blend: splash cadence
    if (s.id === 'blend') {
      s.splashT -= dt;
      if (s.splashT <= 0) { s.splashT = 0.5; blendSplashFx(s); }
    }
    const def = STATION_DEFS.find(d => d.id === s.id);
    if (s.progress >= def.time && !s.ready) {
      // done — the food sits on the station until the player collects it
      s.busy = false; s.ready = true; s.idleT = 0; s.burning = false;
      SFX.done();
      const c = stationCenter(s);
      burst(c.x, c.y - 8, [ING_COLORS[s.item] || '#fff', '#ffffff'], 10, 170);
    }
  }
}

// tap a station with a finished item → serve it to the order that wants it
function collectStation(s) {
  if (!s.ready) return;
  const ing = s.item;
  const fresh = s.idleT <= FRESH_WINDOW;
  const ok = placeItem(ing);
  s.ready = false; s.burning = false; s.item = null; s.idleT = 0;
  if (ok && fresh) {
    score += FRESH_BONUS;
    save.stats.freshServes = (save.stats.freshServes || 0) + 1;
    const c = stationCenter(s);
    addFloater(c.x, c.y - 58, `✨ FRESH +${FRESH_BONUS}`, '#8fd46a', 15);
    burst(c.x, c.y - 10, ['#8fd46a', '#c8ff9a'], 6, 120);
  }
  if (!ok) addFloater(mouse.x, mouse.y - 40, 'Wasted — nobody wanted it!', '#ff9d8a', 14);
}

// ------------------------- UPDATE -------------------------
function update(dt) {
  if (paused) return;
  // particles / floaters / shake always animate
  for (const p of parts) {
    p.life -= dt;
    p.vy += (p.grav || 480) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.vrot) p.rot += p.vrot * dt;
  }
  parts = parts.filter(p => p.life > 0);
  for (const f of floaters) { f.t += dt; f.y -= 34 * dt; }
  floaters = floaters.filter(f => f.t < f.life);
  if (shakeT > 0) shakeT -= dt;
  if (heartPopT > 0) heartPopT -= dt;

  // menu ambience: steam + dust keep the kitchen alive behind the home screen
  updateAmbient(dt);

  // keep clearing finished tickets even after game over
  if (state === 'gameOver') {
    for (const o of orders) {
      if (o.state === 'celebrate' || o.state === 'expired') {
        o.t += dt;
        if (o.t >= (o.state === 'celebrate' ? 0.5 : 0.7)) orders.splice(orders.indexOf(o), 1);
      }
    }
    return;
  }

  if (state === 'countdown') {
    cdT -= dt;
    const word = cdT > 2.2 ? 'Ready…' : cdT > 1.1 ? 'Set…' : cdT > 0 ? 'COOK!' : '';
    if (word !== cdWord && word) { cdWord = word; if (word === 'COOK!') SFX.go(); else SFX.beep(); }
    if (cdT <= 0) {
      state = 'playing';
      spawnOrder();
      nextSpawn = timeLeft - rand(1.0, 1.8);
    }
    return;
  }

  if (state !== 'playing') return;

  // round timer
  timeLeft -= dt;
  const sec = Math.ceil(timeLeft);
  if (sec <= 5 && sec >= 0 && sec !== lastTickSec && sec > 0) { lastTickSec = sec; SFX.tick(); }
  if (timeLeft <= 0) { timeLeft = 0; levelComplete(); return; }

  // orders
  for (const o of orders) {
    o.anim = Math.min(1, o.anim + dt * 3);
    if (o.state === 'active') {
      o.patience -= dt;
      if (o.patience <= 0) expireOrder(o);
    } else if (o.state === 'celebrate') {
      o.t += dt;
      if (o.t >= 0.5) removeOrder(o);
    } else if (o.state === 'expired') {
      o.t += dt;
      if (o.t >= 0.7) removeOrder(o);
    }
  }
  if (selectedIdx != null && (!orders[selectedIdx] || orders[selectedIdx].state !== 'active')) selectedIdx = null;
  if (selectedIdx != null) {
    const sel = orders[selectedIdx];
    if (sel && sel.state !== 'active') selectedIdx = null;
  }

  // spawning
  if (activeOrders().length < MAX_ORDERS && timeLeft < nextSpawn) {
    spawnOrder();
    const cfg = LEVELS[level - 1];
    nextSpawn = timeLeft - rand(cfg.spawnMin, cfg.spawnMax);
    if (nextSpawn < 0.6) nextSpawn = 0.6;
  }

  updateStations(dt);
  updateTutorial(dt);
}

// ------------------------- RENDER -------------------------
function drawBackground() {
  const bg = IMG.bg;
  if (bg) {
    const s = Math.max(L.W / bg.width, L.H / bg.height);
    const dw = bg.width * s, dh = bg.height * s;
    // subtle parallax on the menu: the kitchen leans gently toward the cursor
    let ox = 0, oy = 0;
    if (state === 'title') {
      const mdx = Math.max(0, (dw - L.W) / 2), mdy = Math.max(0, (dh - L.H) / 2);
      ox = clamp((mouse.x - L.W / 2) * .03, -mdx, mdx);
      oy = clamp((mouse.y - L.H / 2) * .02, -mdy, mdy);
    }
    ctx.drawImage(bg, (L.W - dw) / 2 - ox, (L.H - dh) / 2 - oy, dw, dh);
    // theme tint so the HUD/panels stay readable and the kitchen matches the player's theme
    ctx.fillStyle = THEMES[save.theme].tint;
    ctx.fillRect(0, 0, L.W, L.H);
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, L.H);
  g.addColorStop(0, '#f8ead2');
  g.addColorStop(0.72, '#f3dfbc');
  g.addColorStop(0.73, '#e9cd9c');
  g.addColorStop(1, '#e2c190');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, L.W, L.H);
  // checker floor
  const ty = 470, ts = 44;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, ty, L.W, L.H - ty); ctx.clip();
  for (let row = 0; ty + row * ts < L.H; row++) {
    for (let col = 0; col * ts < L.W + ts; col++) {
      ctx.fillStyle = (row + col) % 2 ? '#dcbc87' : '#e6ca9b';
      ctx.fillRect(col * ts - 22, ty + row * ts, ts, ts);
    }
  }
  ctx.restore();
}

function drawHUD() {
  // score + level
  const accent = THEMES[save.theme].accent;
  text('LEVEL ' + level + '/' + LEVELS.length, 20, 22, 13, '#a5712f', 'left', 600);
  text('SCORE ' + score, 20, 44, 22, accent, 'left');
  if (combo >= 2) text('🔥 ×' + combo, 132, 44, 18, '#e2574c', 'left');
  // timer — the most important resource, so it dominates the HUD
  const t = Math.max(0, timeLeft);
  const low = t <= 5;
  ctx.save();
  rr(L.W / 2 - 71, 7, 142, 46, 23);
  ctx.fillStyle = low ? (Math.floor(t * 4) % 2 ? '#c0392b' : '#e2574c') : accent;
  ctx.fill();
  text(Math.ceil(t) + '', L.W / 2, 31, 30, '#fff');
  ctx.restore();
  // hearts — pop + shine whenever health changes
  const hs = '❤️'.repeat(Math.max(0, hearts)) + '🖤'.repeat(Math.max(0, 3 - Math.max(0, hearts)));
  ctx.save();
  if (heartPopT > 0) {
    const p = heartPopT / 0.5;
    const s = 1 + Math.sin((0.5 - p) * Math.PI) * 0.45;
    ctx.translate(L.W - 60, 30);
    ctx.scale(s, s);
    ctx.translate(-(L.W - 60), -30);
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 18 * p;
  }
  text(hs, L.W - 18, 30, 24, '#fff', 'right');
  ctx.restore();
  // next star goal
  if (state === 'playing') {
    const cfg = LEVELS[level - 1];
    const target = score < cfg.star1 ? cfg.star1 : score < cfg.star2 ? cfg.star2 : cfg.star3;
    if (score < cfg.star3) text('⭐ ' + target, 20, 66, 11.5, '#a5712f', 'left', 600);
  }
  // secret dish hint
  if (secretRecipe && state === 'playing') {
    text('⭐ SECRET DISH: ' + RECIPES[secretRecipe].name, L.W - 18, 54, 13, '#8a5fd0', 'right', 600);
  }
}

function drawTicket(o, x, y) {
  const r = RECIPES[o.recipeId];
  const special = o.special;
  const active = o.state === 'active';
  const slide = 1 - Math.min(1, o.anim);
  const sx = x + slide * 120;

  // patience color
  const pct = clamp(o.patience / o.maxPatience, 0, 1);
  const pcol = pct > .5 ? '#6fbf57' : pct > .25 ? '#f2b134' : '#e2574c';

  ctx.save();
  ctx.translate(sx, y);
  if (o.state === 'expired') {
    ctx.globalAlpha = Math.max(0, 1 - o.t / 0.7);
    ctx.rotate((Math.random() - .5) * o.t * 1.2);
  }
  if (o.state === 'celebrate') {
    const s = 1 + o.t * .15;
    ctx.translate(L.ORDER_W / 2, 40); ctx.scale(s, s); ctx.translate(-L.ORDER_W / 2, -40);
  }

  // paper
  ctx.save();
  rr(0, 0, L.ORDER_W, L.ORDER_H, 12);
  ctx.fillStyle = special ? '#fff3d1' : '#fffaf0';
  ctx.fill();
  ctx.lineWidth = special ? 4 : 2.5;
  ctx.strokeStyle = special ? '#d9a6ff' : '#d9b98a';
  ctx.stroke();
  ctx.restore();

  // patience bar
  rr(10, L.ORDER_H - 16, L.ORDER_W - 20, 9, 5);
  ctx.fillStyle = '#e8d9bd';
  ctx.fill();
  if (active) {
    rr(10, L.ORDER_H - 16, (L.ORDER_W - 20) * pct, 9, 5);
    ctx.fillStyle = pcol;
    ctx.fill();
  } else if (o.state === 'celebrate') {
    rr(10, L.ORDER_H - 16, L.ORDER_W - 20, 9, 5);
    ctx.fillStyle = '#8fd46a';
    ctx.fill();
  }

  // dish
  const pulse = special ? 1 + Math.sin(performance.now() / 220) * .07 : 1;
  ctx.save();
  ctx.translate(L.ORDER_W / 2, 42);
  ctx.scale(pulse, pulse);
  const dimg = IMG[o.recipeId];
  if (dimg) ctx.drawImage(dimg, -27, -27, 54, 54);
  else text(r.emoji, 0, 0, 44);
  ctx.restore();
  text(r.name, L.ORDER_W / 2, 76, 13.5, '#5c3805', 'center', 600);
  if (special) text('⭐ SECRET DISH', L.ORDER_W / 2, 93, 11, '#8a5fd0', 'center', 600);

  // slots
  const items = r.items;
  const slotW = 44, total = items.length * slotW + (items.length - 1) * 8;
  let sxx = (L.ORDER_W - total) / 2;
  const sy = 106;
  for (const ing of items) {
    const filled = o.filled.includes(ing);
    ctx.save();
    rr(sxx, sy, slotW, slotW, 9);
    ctx.fillStyle = filled ? '#d9f2c8' : '#f3e8d2';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.setLineDash(filled ? [] : [4, 3]);
    ctx.strokeStyle = filled ? '#6fbf57' : '#d9b98a';
    ctx.stroke();
    ctx.setLineDash([]);
    const simg = IMG[ing];
    if (simg) {
      ctx.globalAlpha = filled ? 1 : 0.45;
      ctx.drawImage(simg, sxx + (slotW - 36) / 2, sy + (slotW - 36) / 2, 36, 36);
    } else {
      ctx.globalAlpha = filled ? 1 : 0.45;
      text(INGREDIENTS[ing].emoji, sxx + slotW / 2, sy + slotW / 2 + 1, 26);
    }
    ctx.restore();
    sxx += slotW + 8;
  }

  // selected marker
  if (active && orders[selectedIdx] === o) {
    rr(0, 0, L.ORDER_W, L.ORDER_H, 12);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f2b134';
    ctx.stroke();
    text('▶', -16, 70, 22, '#e2574c');
  }
  ctx.restore();
}

function drawIcon(id, size) {
  const img = IMG[id];
  if (img) ctx.drawImage(img, -size / 2, -size / 2, size, size);
  else text(STATION_DEFS.find(d => d.id === id).emoji, 0, 0, size * .8);
}
function drawIng(id, size) {
  const img = IMG[id];
  if (img) ctx.drawImage(img, -size / 2, -size / 2, size, size);
  else text(INGREDIENTS[id].emoji, 0, 0, size * .8);
}
function drawFlame(cx, baseY, k, t) {
  const cols = ['#ff8a3c', '#ffb13c', '#ffd76a'];
  for (let i = 0; i < 3; i++) {
    const h = (9 + Math.sin(t * 11 + i * 2.1) * 4) * k;
    const bw = Math.max(2, (7 - i * 1.8)) * k;
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.moveTo(cx - bw, baseY);
    ctx.quadraticCurveTo(cx - bw * .3, baseY - h * .8, cx, baseY - h);
    ctx.quadraticCurveTo(cx + bw * .3, baseY - h * .8, cx + bw, baseY);
    ctx.closePath();
    ctx.fill();
  }
}

function drawStation(s, x, y) {
  const def = s;
  const w = L.STA_W, h = L.STA_H;
  // scale inner metrics from the 196px-tall design so narrow portrait stations still fit
  const k = h / 196;
  const pal = { chop: ['#dff0d0', '#7cb342'], cook: ['#ffdddd', '#ef5350'], blend: ['#d9e9ff', '#42a5f5'] }[s.id];
  ctx.save();
  // shadow
  rr(x + 3, y + 6, w, h, 16);
  ctx.fillStyle = 'rgba(92,56,5,.18)';
  ctx.fill();
  // body
  rr(x, y, w, h, 16);
  ctx.fillStyle = pal[0];
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = pal[1];
  ctx.stroke();

  // label
  text(def.name, x + w / 2, y + 34 * k, 20 * Math.min(k, 1), '#5c3805');

  // items hint
  const emojis = def.items.map(i => INGREDIENTS[i].emoji).join(' ');
  text(emojis, x + w / 2, y + 54 * k, 13 * Math.min(k, 1), 'rgba(92,56,5,.65)', 'center', 500);

  if (s.busy) {
    // progress
    const p = clamp(s.progress / def.time, 0, 1);
    rr(x + 18, y + 66 * k, w - 36, 14 * k, 7);
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.fill();
    rr(x + 18, y + 66 * k, (w - 36) * p, 14 * k, 7);
    ctx.fillStyle = pal[1];
    ctx.fill();

    const cx = x + w / 2, cy = y + 122 * k;
    const t = performance.now() / 1000;

    // animated sprite sheet for this action (AutoSprite), procedural fallback below
    const sheet = IMG[animSheetFor(s)] || null;
    if (sheet) {
      const size = Math.min(118 * k, w - 20);
      ctx.save();
      if (s.id === 'blend') {
        // the sheet already shakes — just center it
        drawAnimSheet(sheet, t, cx, cy + 2 * k, size);
        rr(x + w - 52 * k, y + 8 * k, 40 * k, 40 * k, 10);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.save();
        ctx.translate(x + w - 32 * k, y + 28 * k);
        drawIng(s.item, 30 * k);
        ctx.restore();
      } else if (s.id === 'cook') {
        drawAnimSheet(sheet, t, cx, cy + 6 * k, size);
      } else {
        drawAnimSheet(sheet, t, cx, cy + 8 * k, size);
      }
      ctx.restore();
    } else if (s.id === 'chop') {
      // vegetable bounces + pops on each knife hit
      ctx.save();
      ctx.translate(cx, cy - 6 * k * s.hitT);
      ctx.rotate(Math.sin(t * 60) * .12 + (Math.random() - .5) * .1 * s.hitT);
      const pop = 1 + .3 * s.hitT;
      ctx.scale(pop, pop);
      drawIng(s.item, 56 * k);
      ctx.restore();
      // knife-swing flash
      if (s.hitT > .05) {
        ctx.save();
        ctx.globalAlpha = s.hitT;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5 * k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy - 6 * k, 27 * k, -Math.PI * 1.12, -Math.PI * .38);
        ctx.stroke();
        ctx.restore();
      }
    } else if (s.id === 'cook') {
      // flickering flame under the pan
      drawFlame(cx, cy + 46 * k, k, t);
      // pan + food, bouncing on each sizzle
      ctx.save();
      ctx.translate(cx, cy + 4 * k * s.hitT);
      ctx.rotate((Math.random() - .5) * .05 * s.hitT);
      drawIcon(s.id, Math.min(88 * k, w - 64));
      ctx.save();
      ctx.translate(0, -2 * k);
      ctx.scale(1 + .12 * s.hitT, 1 + .12 * s.hitT);
      drawIng(s.item, 40 * k);
      ctx.restore();
      ctx.restore();
    } else {
      // blender shakes while it blends
      ctx.save();
      ctx.translate(cx + (Math.random() - .5) * 3.5 * k, cy + (Math.random() - .5) * 3.5 * k);
      ctx.rotate(Math.sin(t * 22) * .05);
      drawIcon(s.id, Math.min(80 * k, w - 56));
      ctx.restore();
      // swirling contents, colored by the ingredient
      const col = ING_COLORS[s.item] || '#8fd46a';
      for (let i = 0; i < 6; i++) {
        const a = t * 5.5 + i * Math.PI / 3;
        ctx.save();
        ctx.globalAlpha = .85;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 15 * k, cy + 4 * k + Math.sin(a) * 15 * k, 3.6 * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // ingredient badge (top-right)
      rr(x + w - 52 * k, y + 8 * k, 40 * k, 40 * k, 10);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.save();
      ctx.translate(x + w - 32 * k, y + 28 * k);
      drawIng(s.item, 30 * k);
      ctx.restore();
    }
  } else if (s.ready) {
    // finished food waits on the station — collect it before it burns
    const cx = x + w / 2, cy = y + 122 * k;
    const t = performance.now() / 1000;
    const pulse = 1 + Math.sin(t * 5) * .06;
    ctx.save();
    ctx.strokeStyle = s.burning
      ? `rgba(226,87,76,${.55 + Math.sin(t * 8) * .3})`
      : `rgba(111,191,87,${.45 + Math.sin(t * 5) * .2})`;
    ctx.lineWidth = 4 * k;
    ctx.beginPath();
    ctx.arc(cx, cy, 42 * k * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (s.burning) {
      ctx.save();
      ctx.globalAlpha = .4 + Math.sin(t * 10) * .15;
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(cx, cy, 34 * k, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      text('🔥 BURNING!', cx, cy + 60 * k, 14 * Math.min(k, 1), '#e2574c', 'center', 700);
    } else {
      text('READY — TAP TO SERVE!', cx, cy + 60 * k, 12 * Math.min(k, 1), '#6fbf57', 'center', 700);
    }
    // processed (chopped/cooked) sprite when we have one, whole ingredient otherwise
    const doneKey = ASSET.processed[s.item];
    const dimg = doneKey ? IMG[doneKey] : null;
    if (dimg) ctx.drawImage(dimg, cx - 28 * k, cy - 28 * k, 56 * k, 56 * k);
    else drawIng(s.item, 56 * k);
    if (!s.burning) {
      // twinkle sparkles — the dish is ready to grab
      for (let i = 0; i < 3; i++) {
        const sa = t * 2.2 + i * 2.1;
        const sr = 46 * k * pulse;
        const sx = cx + Math.cos(sa) * sr, sy = cy + Math.sin(sa * 1.3) * sr * .55;
        const tw = Math.max(0, Math.sin(t * 6 + i * 2));
        ctx.save();
        ctx.globalAlpha = tw * .9;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 5 * k); ctx.lineTo(sx + 1.6 * k, sy - 1.6 * k); ctx.lineTo(sx + 5 * k, sy);
        ctx.lineTo(sx + 1.6 * k, sy + 1.6 * k); ctx.lineTo(sx, sy + 5 * k);
        ctx.lineTo(sx - 1.6 * k, sy + 1.6 * k); ctx.lineTo(sx - 5 * k, sy);
        ctx.lineTo(sx - 1.6 * k, sy - 1.6 * k); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  } else {
    // idle bob + gentle life: the cook station steams, the blender wobbles
    const bob = Math.sin(performance.now() / 500 + x) * 4;
    const icon = Math.min(88 * k, w - 64);
    const iimg = IMG[s.id];
    const cx0 = x + w / 2, cy0 = y + 122 * k + bob;
    const tt = performance.now() / 1000;
    ctx.save();
    if (s.id === 'blend') {
      // slow idle wobble that swells and fades on a long cycle
      ctx.translate(cx0, cy0);
      ctx.rotate(Math.sin(tt * 1.2) * .05 * Math.max(0, Math.sin(tt * .35)));
      ctx.translate(-cx0, -cy0);
    }
    if (iimg) ctx.drawImage(iimg, cx0 - icon / 2, cy0 - icon / 2, icon, icon);
    else text(def.emoji, cx0, cy0, 54 * k);
    ctx.restore();
    if (s.id === 'cook') {
      // lazy steam wisps rising off the stove
      for (let i = 0; i < 2; i++) {
        const ph = (tt * .5 + i * .5) % 1;
        const sy = y + 118 * k - ph * 46 * k;
        const sx = cx0 + Math.sin(tt * 1.3 + i * 3) * 9 * k;
        ctx.save();
        ctx.globalAlpha = (1 - ph) * .15;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(sx, sy, 8 * k * (1 + ph), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }
  text(s.busy ? 'Working…' : s.ready ? 'SERVE ME!' : 'Ready', x + w / 2, y + h - 22 * k, 14 * Math.min(k, 1), s.ready ? (s.burning ? '#e2574c' : '#6fbf57') : pal[1], 'center', 600);
  ctx.restore();
}

function drawFridge() {
  const x = L.AREA_X, y = L.FRIDGE_Y, w = L.AREA_W, h = L.FRIDGE_H;
  ctx.save();
  rr(x + 4, y + 6, w, h, 18);
  ctx.fillStyle = 'rgba(92,56,5,.18)';
  ctx.fill();
  rr(x, y, w, h, 18);
  ctx.fillStyle = '#f2f7fc';
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#7ea8cc';
  ctx.stroke();
  text('🧊 FRIDGE — PICK AN INGREDIENT', x + w / 2, y + 24, 15, '#3d5d80', 'center', 600);

  const ingIds = Object.keys(INGREDIENTS);
  const needed = new Set();
  for (const o of activeOrders()) for (const i of RECIPES[o.recipeId].items) needed.add(i);
  const now = performance.now();

  ingIds.forEach((id, i) => {
    const col = i % L.CELLS, row = (i / L.CELLS) | 0;
    const cx = x + 14 + col * (L.CELL_W + L.CELL_GAP);
    const cy = y + 42 + row * (L.CELL_H + 12);
    const isHeld = held === id;
    const pulse = needed.has(id) ? 1 + Math.sin(now / 240) * .05 : 1;
    const heldPop = isHeld ? 1.06 + Math.sin(now / 170) * .02 : 1;
    ctx.save();
    rr(cx, cy, L.CELL_W, L.CELL_H, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = isHeld ? 4 : needed.has(id) ? 3 : 1.5;
    ctx.strokeStyle = isHeld ? '#f2b134' : needed.has(id) ? '#6fbf57' : '#d8e4ee';
    ctx.stroke();
    if (needed.has(id) && !isHeld) {
      ctx.save();
      rr(cx, cy, L.CELL_W, L.CELL_H, 12);
      ctx.strokeStyle = `rgba(111,191,87,${.35 + Math.sin(now / 240) * .2})`;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();
    }
    if (isHeld) {
      ctx.save();
      rr(cx, cy, L.CELL_W, L.CELL_H, 12);
      ctx.strokeStyle = `rgba(242,177,52,${.5 + Math.sin(now / 170) * .25})`;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
    }
    ctx.translate(cx + L.CELL_W / 2, cy + L.CELL_H / 2);
    ctx.scale(pulse * heldPop, pulse * heldPop);
    const cimg = IMG[id];
    if (cimg) ctx.drawImage(cimg, -37, -47, 74, 74);
    else text(INGREDIENTS[id].emoji, 0, -9, 42);
    ctx.restore();
    text(INGREDIENTS[id].name, cx + L.CELL_W / 2, cy + L.CELL_H - 13, 12, isHeld ? '#c9822a' : '#3d5d80', 'center', 600);
  });
  ctx.restore();
}

function drawOverlays() {
  // held item at cursor
  if (held && state === 'playing') {
    ctx.save();
    ctx.translate(mouse.x, mouse.y + 8);
    ctx.globalAlpha = .9;
    const himg = IMG[held];
    if (himg) ctx.drawImage(himg, -22, -22, 44, 44);
    else text(INGREDIENTS[held].emoji, 0, 0, 40);
    rr(-24, 26, 48, 18, 9);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fill();
    text('→ station?', 0, 35.5, 10, '#fff');
    ctx.restore();
  }
  // countdown
  if (state === 'countdown') {
    ctx.save();
    ctx.fillStyle = 'rgba(38,24,12,.45)';
    ctx.fillRect(0, 0, L.W, L.H);
    const word = cdT > 2.2 ? 'Ready…' : cdT > 1.1 ? 'Set…' : 'COOK!';
    const age = word === 'COOK!' ? 1.1 - cdT : word === 'Set…' ? 2.2 - cdT : 3.3 - cdT;
    const scale = Math.min(1, Math.max(0, age / .25));
    ctx.translate(L.W / 2, L.H / 2);
    ctx.scale(scale, scale);
    text(word, 0, 0, word === 'COOK!' ? 110 : 76, word === 'COOK!' ? '#ffd76a' : '#fff7ea');
    ctx.restore();
    // level name + star goals
    const cfg = LEVELS[level - 1];
    text('Level ' + level + ' — ' + cfg.name, L.W / 2, L.H / 2 + 74, 22, '#fff7ea');
    text('⭐ ' + cfg.star1 + '   ⭐⭐ ' + cfg.star2 + '   ⭐⭐⭐ ' + cfg.star3, L.W / 2, L.H / 2 + 104, 15, '#ffd76a', 'center', 600);
    // today's menu card
    const recipes = cfg.recipes;
    const panelW = Math.min(320, L.W - 40), panelH = 40 + recipes.length * 22;
    const px = L.W / 2, py = Math.min(L.H / 2 + 122, L.H - panelH - 14);
    ctx.save();
    rr(px - panelW / 2, py, panelW, panelH, 14);
    ctx.fillStyle = 'rgba(255,250,240,.94)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(92,56,5,.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    text('🍽 TODAY\u2019S MENU', px, py + 18, 13, '#5c3805', 'center', 700);
    recipes.forEach((rid, i) => {
      text(RECIPES[rid].emoji + '  ' + RECIPES[rid].name, px, py + 38 + i * 22, 14, '#3d5d80', 'center', 600);
    });
    ctx.restore();
  }
}

function render() {
  ctx.save();
  if (shakeT > 0) {
    ctx.translate((Math.random() - .5) * shakeMag, (Math.random() - .5) * shakeMag);
  }
  drawBackground();
  drawAmbient();
  drawHUD();

  // stations
  stations.forEach((s, i) => {
    drawStation(s, L.AREA_X + i * (L.STA_W + L.STA_GAP), L.STA_Y);
    regions.push({ x: L.AREA_X + i * (L.STA_W + L.STA_GAP), y: L.STA_Y, w: L.STA_W, h: L.STA_H, kind: 'station', ref: s });
  });

  drawFridge();
  // fridge cells
  const ingIds = Object.keys(INGREDIENTS);
  ingIds.forEach((id, i) => {
    const col = i % L.CELLS, row = (i / L.CELLS) | 0;
    const cx = L.AREA_X + 14 + col * (L.CELL_W + L.CELL_GAP);
    const cy = L.FRIDGE_Y + 42 + row * (L.CELL_H + 12);
    regions.push({ x: cx, y: cy, w: L.CELL_W, h: L.CELL_H, kind: 'ingredient', ref: id });
  });

  // tickets (bottom → top so slide-ins overlap correctly)
  for (let i = orders.length - 1; i >= 0; i--) {
    drawTicket(orders[i], L.ORDER_X, L.ORDER_Y0 + i * (L.ORDER_H + L.ORDER_GAP));
    regions.push({ x: L.ORDER_X, y: L.ORDER_Y0 + i * (L.ORDER_H + L.ORDER_GAP), w: L.ORDER_W, h: L.ORDER_H, kind: 'ticket', ref: i });
  }

  // particles
  for (const p of parts) {
    const frac = clamp(p.life / p.max, 0, 1);
    if (p.shape === 'chunk') {
      ctx.globalAlpha = frac;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .7);
      ctx.restore();
    } else if (p.shape === 'steam') {
      ctx.globalAlpha = frac * .35;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + (1 - frac) * (p.grow || 1.4)), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = frac;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // floaters
  for (const f of floaters) {
    ctx.globalAlpha = clamp(1 - f.t / f.life, 0, 1);
    text(f.str, f.x, f.y, f.size, f.color, 'center', 700);
  }
  ctx.globalAlpha = 1;

  drawOverlays();
  ctx.restore();
}

// ------------------------- INPUT -------------------------
function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (L.W / rect.width), y: (e.clientY - rect.top) * (L.H / rect.height) };
}

function handleClick(x, y) {
  ensureAudio();
  if (state !== 'playing') return;

  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      if (r.kind === 'ingredient') {
        const ing = INGREDIENTS[r.ref];
        if (held === r.ref) { held = null; return; }
        if (ing.proc === 'none') { placeItem(r.ref); SFX.pick(); }
        else { held = r.ref; SFX.pick(); }
        return;
      }
      if (r.kind === 'station') {
        const def = STATION_DEFS.find(d => d.id === r.ref.id);
        if (r.ref.ready) {
          // the previous item is done — serve it and accept the next one in one tap
          collectStation(r.ref);
          if (held && def.id === INGREDIENTS[held].proc) {
            startStationProc(r.ref, held); held = null;
          } else if (held) {
            SFX.buzz(); shake(3, .15); buzzPhone(45);
            addFloater(x, y - 30, 'Wrong station!', '#ff9d8a', 15);
          }
          return;
        }
        if (held) {
          const def = STATION_DEFS.find(d => d.id === r.ref.id);
          if (def.id !== INGREDIENTS[held].proc) {
            SFX.buzz(); shake(3, .15); buzzPhone(45);
            addFloater(x, y - 30, 'Wrong station!', '#ff9d8a', 15);
          } else if (r.ref.busy) {
            SFX.buzz(); buzzPhone(30);
            addFloater(x, y - 30, 'Station busy — wait!', '#ffd76a', 14);
          } else {
            startStationProc(r.ref, held); held = null;
          }
        } else {
          SFX.buzz(); shake(2, .12);
          addFloater(x, y - 30, 'Grab an ingredient first!', '#ffd76a', 14);
        }
        return;
      }
      if (r.kind === 'ticket') {
        const o = orders[r.ref];
        if (o && o.state === 'active') {
          selectedIdx = (selectedIdx === r.ref) ? null : r.ref;
          SFX.pick();
        }
        return;
      }
    }
  }
  // empty space
  if (held) held = null;
}

canvas.addEventListener('pointermove', e => { mouse = canvasPos(e); });
// window-level move so the menu parallax still tracks the cursor over overlays
window.addEventListener('pointermove', e => {
  const rect = stage.getBoundingClientRect();
  mouse = { x: (e.clientX - rect.left) * (L.W / rect.width), y: (e.clientY - rect.top) * (L.H / rect.height) };
});
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  ensureAudio();
  startMusic();
  const p = canvasPos(e);
  mouse = p;
  handleClick(p.x, p.y);
});
canvas.addEventListener('contextmenu', e => { e.preventDefault(); held = null; });
window.addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') { muteBtn.click(); return; }
  if (e.key === 'Escape') { held = null; return; }
  if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
});
// auto-pause when the app loses focus (tab switch / phone call)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing' && !paused) togglePause();
});

pauseBtn.addEventListener('click', () => { ensureAudio(); togglePause(); });
resumeBtn.addEventListener('click', () => { togglePause(); });
restartBtn.addEventListener('click', () => { ensureAudio(); startMusic(); startLevel(level); });
pauseHomeBtn.addEventListener('click', () => { paused = false; state = 'title'; showOverlay('home'); });
dailyBtn.addEventListener('click', () => { ensureAudio(); dailyReward(); });
$('homeAchBtn').addEventListener('click', () => showOverlay('achiev'));
$('achBackBtn').addEventListener('click', () => showOverlay('home'));

// Android back button (Capacitor): pause during gameplay, else home, else exit.
try {
  const capApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (capApp) {
    capApp.addListener('backButton', () => {
      if (state === 'playing') {
        if (!paused) togglePause();
        else { paused = false; state = 'title'; showOverlay('home'); }
      } else if (state !== 'title') {
        showOverlay('home');
      }
    });
  }
} catch (e) { /* web preview: no Capacitor */ }

// ------------------------- UI (menus, levels, shop) -------------------------
function showOverlay(id) {
  for (const el of [homeEl, levelsEl, shopEl, resultsEl, pauseEl, achEl]) el.classList.remove('show');
  if (!id) return;
  const target = id === 'home' ? homeEl : id === 'levels' ? levelsEl : id === 'shop' ? shopEl : id === 'pause' ? pauseEl : id === 'achiev' ? achEl : resultsEl;
  target.classList.add('show');
  renderCoins();
  renderDaily();
  buildAch();
  renderHome();
}

function togglePause() {
  if (state !== 'playing') return;
  paused = !paused;
  if (paused) {
    hideTutorial();
    pauseInfoEl.textContent = 'Level ' + level + ' — ' + LEVELS[level - 1].name;
    showOverlay('pause');
  } else {
    showOverlay(null);
  }
}

// ------------------------- MOBILE (Capacitor APK) -------------------------
// Android back button: pause during play, resume when paused, exit anywhere else
try {
  const capApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (capApp) capApp.addListener('backButton', () => {
    if (state === 'playing') togglePause();
    else capApp.exitApp();
  });
} catch (e) { /* web preview — no Capacitor */ }

// screen wake lock: keep the display on while a level is running
let wakeLock = null;
function requestWakeLock() {
  try {
    if (!navigator.wakeLock || wakeLock) return;
    navigator.wakeLock.request('screen').then(l => { wakeLock = l; }).catch(() => {});
  } catch (e) { /* unsupported */ }
}
function releaseWakeLock() {
  if (wakeLock) { try { wakeLock.release(); } catch (e) { /* already released */ } wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state === 'playing') requestWakeLock();
});

function buzzPhone(pattern) {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* no haptics */ }
}
function coinPop(el) {
  if (!el || el._popBusy) return;
  el._popBusy = true;
  el.classList.remove('pop');
  void el.offsetWidth; // restart the animation
  el.classList.add('pop');
  setTimeout(() => { el.classList.remove('pop'); el._popBusy = false; }, 400);
}
function renderCoins() {
  const c = '' + save.coins;
  if (homeCoinsEl.textContent !== c) coinPop(homeCoinsEl.parentElement);
  if (levelsCoinsEl.textContent !== c) coinPop(levelsCoinsEl.parentElement);
  if (shopCoinsEl.textContent !== c) coinPop(shopCoinsEl.parentElement);
  homeCoinsEl.textContent = c;
  levelsCoinsEl.textContent = c;
  shopCoinsEl.textContent = c;
}
function buyItem(id) {
  const it = SHOP_ITEMS.find(i => i.id === id);
  if (!it || save.coins < it.price) { SFX.buzz(); return; }
  save.coins -= it.price;
  if (it.type === 'booster') save.inv[it.id] = (save.inv[it.id] || 0) + 1;
  else save.themesOwned.push(it.id);
  persist();
  SFX.serve();
  buildShop();
  renderBoosterStrip();
  renderCoins();
}

// ------------------------- DAILY REWARD -------------------------
function todayStr() { return new Date().toDateString(); }
function dailyAmount() { return Math.min(50 + (save.dailyStreak || 0) * 10, 150); }
function renderDaily() {
  if (!dailyBtn) return;
  const claimed = save.lastDaily === todayStr();
  dailyBtn.disabled = claimed;
  dailyIcoEl.textContent = claimed ? '✅' : '🎁';
  dailyLabelEl.textContent = claimed ? 'Claimed' : '+' + dailyAmount();
  const st = save.dailyStreak || 0;
  dailyStreakEl.textContent = st > 0 ? '🔥' + st : '';
  dailyBtn.title = claimed ? 'Claimed — come back tomorrow!' : 'Claim your daily reward!';
}

// home screen: welcome line, continue button, progress cards, today's special
const SPECIALS = [
  { dish: '🍜 Spicy Udon',      promo: '2× Coin Event' },
  { dish: '🍔 Double Burger',   promo: '2× Combo Points' },
  { dish: '🥤 Smoothie Hour',   promo: 'Fresh Bonus ×2' },
  { dish: '🍲 Hearty Soup',     promo: 'Extra Patience' },
  { dish: '🥗 Garden Fresh',    promo: '3× Serve Bonus' },
];
function renderHome() {
  const hasProgress = save.unlocked > 1 || Object.keys(save.stars || {}).length > 0;
  continueBtn.hidden = !hasProgress;
  if (hasProgress) {
    continueBtn.textContent = 'Continue · Level ' + save.unlocked;
    welcomeLineEl.textContent = 'Welcome Back, Chef!';
  } else {
    welcomeLineEl.textContent = 'Welcome, Chef!';
  }
  let totalStars = 0;
  for (const k in (save.stars || {})) totalStars += save.stars[k];
  homeLevelEl.textContent = save.unlocked;
  homeStarsEl.textContent = totalStars;
  const s = SPECIALS[new Date().getDate() % SPECIALS.length];
  specialCardEl.textContent = `Today's Special · ${s.dish} — ${s.promo}`;
  bestScoreEl.textContent = best.get();
}
function dailyReward() {
  if (save.lastDaily === todayStr()) { SFX.buzz(); return 0; }
  const amt = dailyAmount();
  save.coins += amt;
  save.dailyStreak = (save.dailyStreak || 0) + 1;
  save.lastDaily = todayStr();
  persist();
  SFX.serve();
  coinPop(dailyBtn);
  renderDaily();
  renderCoins();
  buildAch();
  return amt;
}

// ------------------------- ACHIEVEMENTS -------------------------
// cur()/goal() power the progress bars on locked cards (0 → locked, filled → claimable)
const ACHIEVEMENTS = [
  { id: 'first_serve',  emoji: '🍽️', name: 'First Serve',       desc: 'Serve your very first dish',          reward: 25,  cur: () => save.stats.served || 0,    goal: () => 1 },
  { id: 'serve_25',     emoji: '🍛', name: 'Busy Bee',           desc: 'Serve 25 dishes',                     reward: 50,  cur: () => save.stats.served || 0,    goal: () => 25 },
  { id: 'serve_100',    emoji: '👑', name: 'Service Legend',     desc: 'Serve 100 dishes',                    reward: 150, cur: () => save.stats.served || 0,    goal: () => 100 },
  { id: 'combo5',       emoji: '🔥', name: 'On Fire',            desc: 'Reach a ×5 combo',                    reward: 75,  cur: () => save.stats.maxCombo || 0,  goal: () => 5 },
  { id: 'combo10',      emoji: '🌋', name: 'Unstoppable',        desc: 'Reach a ×10 combo',                   reward: 200, cur: () => save.stats.maxCombo || 0,  goal: () => 10 },
  { id: 'star3',        emoji: '⭐', name: 'Three Stars!',       desc: 'Earn 3 stars on any level',           reward: 50,  cur: () => save.stats.star3s || 0,    goal: () => 1 },
  { id: 'perfect',      emoji: '💖', name: 'Flawless Shift',     desc: 'Finish a level with all hearts',      reward: 100, cur: () => save.stats.perfects || 0,  goal: () => 1 },
  { id: 'no_burn',      emoji: '🧯', name: 'Fire Marshal',       desc: 'Serve 10 dishes without burning any', reward: 75,  cur: () => Math.min(save.stats.served || 0, 10), goal: () => 10, cond: () => (save.stats.served || 0) >= 10 && !save.stats.burned },
  { id: 'themed',       emoji: '🎨', name: 'Interior Decorator', desc: 'Own all 3 kitchen themes',            reward: 100, cur: () => save.themesOwned.length,    goal: () => 3 },
  { id: 'rich',         emoji: '💰', name: 'Well Funded',        desc: 'Hold 500 coins at once',              reward: 150, cur: () => Math.min(save.coins, 500),  goal: () => 500 },
  { id: 'all_levels',   emoji: '🗺️', name: 'Full Menu',          desc: 'Unlock level 15',                     reward: 300, cur: () => Math.min(save.unlocked, 15), goal: () => 15 },
];
function buildAch() {
  if (!achList) return;
  achList.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const row = document.createElement('div');
    const claimed = save.achClaimed.includes(a.id);
    const unlocked = a.cond ? a.cond() : a.cur() >= a.goal();
    row.className = 'ach-row' + (claimed ? ' done' : '');
    let action, progress = '';
    if (claimed) {
      action = '<span class="ach-status done">✔ Claimed</span>';
    } else if (unlocked) {
      action = `<button class="btn small ach-claim" data-id="${a.id}">CLAIM +${a.reward} 🪙</button>`;
    } else {
      action = '<span class="ach-status locked">🔒</span>';
      const cur = Math.min(a.cur(), a.goal());
      const pct = Math.round(cur / a.goal() * 100);
      progress = `<div class="ach-progress"><span>${cur} / ${a.goal()}</span><div class="ach-bar"><div class="ach-bar-fill" style="width:${pct}%"></div></div></div>`;
    }
    row.innerHTML = `
      <div class="ach-main">
        <div class="ach-head"><span class="ach-emoji">${a.emoji}</span><div class="ach-info"><b>${a.name}</b><span>${a.desc}</span></div></div>
        ${progress}
      </div>
      <div class="ach-side"><span class="ach-reward">${a.reward} 🪙</span>${action}</div>`;
    const btn = row.querySelector('button');
    if (btn) btn.addEventListener('click', () => claimAch(a.id));
    achList.appendChild(row);
  }
}
function claimAch(id) {
  const a = ACHIEVEMENTS.find(x => x.id === id);
  const unlocked = a && (a.cond ? a.cond() : a.cur() >= a.goal());
  if (!a || !unlocked || save.achClaimed.includes(id)) { SFX.buzz(); return false; }
  save.achClaimed.push(id);
  save.coins += a.reward;
  persist();
  SFX.serve();
  buildAch();
  renderCoins();
  return true;
}
function buildLevelGrid() {
  const grid = $('levelGrid');
  grid.innerHTML = '';
  for (let lv = 1; lv <= LEVELS.length; lv++) {
    const unlocked = lv <= save.unlocked;
    const stars = save.stars[lv] || 0;
    const cfg = LEVELS[lv - 1];
    const isCurrent = lv === save.unlocked;
    const b = document.createElement('button');
    b.className = 'level-btn' + (unlocked ? '' : ' locked') + (isCurrent ? ' current' : '');
    b.innerHTML = `<span class="lv-num">${lv}</span><span class="lv-dish">${unlocked ? RECIPES[cfg.recipes[0]].emoji : '🔒'}</span><span class="lv-name">${cfg.name}</span><span class="lv-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>${isCurrent ? '<span class="lv-current">CURRENT</span>' : ''}`;
    b.disabled = !unlocked;
    if (unlocked) b.addEventListener('click', () => { ensureAudio(); startMusic(); startLevel(lv); });
    grid.appendChild(b);
  }
}
function buildShop() {
  const list = $('shopList');
  list.innerHTML = '';
  for (const it of SHOP_ITEMS) {
    const row = document.createElement('div');
    let action;
    if (it.type === 'booster') {
      const qty = save.inv[it.id] || 0;
      row.className = 'shop-item';
      action = `<button class="btn small shop-buy" data-id="${it.id}">BUY <img src="assets/sorceress/ui/coin.png" alt="" class="coin-mini">${it.price}</button>`;
      row.innerHTML = `<img src="${it.icon}" alt="" class="si-icon" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"><span class="si-emoji">${it.emoji}</span><div class="si-info"><b>${it.name}</b><span>${it.desc}</span></div><div class="si-side">${qty > 0 ? `<span class="si-owned">✔ ×${qty}</span>` : ''}${action}</div>`;
    } else {
      const owned = save.themesOwned.includes(it.id);
      const equipped = save.theme === it.id;
      row.className = 'shop-item theme';
      if (equipped) action = `<button class="btn small alt2" disabled>✓ Equipped</button>`;
      else if (owned) action = `<button class="btn small alt2" data-id="${it.id}">USE THEME</button>`;
      else action = `<button class="btn small shop-buy" data-id="${it.id}">BUY <img src="assets/sorceress/ui/coin.png" alt="" class="coin-mini">${it.price}</button>`;
      row.innerHTML = `
        <div class="si-theme"><img src="${it.icon}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="si-emoji">${it.emoji}</span></div>
        <div class="si-info"><b>${it.name}</b><span>${it.desc}</span></div>
        <div class="si-side">${owned && !equipped ? '<span class="si-owned">✔ Owned</span>' : ''}${action}</div>`;
    }
    const btn = row.querySelector('button');
    if (btn && !btn.disabled) {
      btn.addEventListener('click', () => {
        if (it.type === 'booster') buyItem(it.id);
        else if (save.themesOwned.includes(it.id)) { save.theme = it.id; persist(); SFX.pick(); buildShop(); }
        else buyItem(it.id);
      });
    }
    list.appendChild(row);
  }
}
function renderBoosterStrip() {
  const strip = $('boosterStrip');
  if (!strip) return;
  strip.innerHTML = '';
  for (const b of ['time', 'heart', 'slow']) {
    const it = SHOP_ITEMS.find(i => i.id === b);
    const qty = save.inv[b] || 0;
    const chip = document.createElement('button');
    chip.className = 'booster-chip' + (boosters[b] ? ' on' : '') + (qty <= 0 ? ' empty' : '');
    chip.innerHTML = `<img src="${it.icon}" alt="" onerror="this.style.display='none'"><span class="bc-name">${it.name}</span><b>×${qty}</b>`;
    chip.disabled = qty <= 0;
    chip.addEventListener('click', () => { if ((save.inv[b] || 0) > 0) { boosters[b] = !boosters[b]; SFX.pick(); renderBoosterStrip(); } });
    strip.appendChild(chip);
  }
}
function openLevels() { buildLevelGrid(); renderBoosterStrip(); renderCoins(); showOverlay('levels'); }
function openShop() { buildShop(); renderCoins(); showOverlay('shop'); }

// PLAY / Continue jump straight into the next level — players came to cook.
// Level Select stays available for replaying / picking any unlocked level.
function playNow() { ensureAudio(); startMusic(); startLevel(Math.min(save.unlocked, LEVELS.length)); }
$('homePlayBtn').addEventListener('click', playNow);
$('continueBtn').addEventListener('click', playNow);
$('homeLevelsBtn').addEventListener('click', () => { ensureAudio(); startMusic(); openLevels(); });
$('homeShopBtn').addEventListener('click', () => { ensureAudio(); startMusic(); openShop(); });
$('levelsBackBtn').addEventListener('click', () => showOverlay('home'));
$('shopBackBtn').addEventListener('click', () => showOverlay('home'));
$('retryBtn').addEventListener('click', () => { ensureAudio(); startMusic(); startLevel(level); });
$('nextBtn').addEventListener('click', () => { ensureAudio(); startMusic(); startLevel(level + 1); });
$('homeBtn').addEventListener('click', () => { showOverlay('home'); });

// ------------------------- LOOP -------------------------
renderHome();
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  regions = [];
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// dev/debug hooks (used by automated smoke tests)
window.__rsc = {
  get state() { return state; },
  get orders() { return orders; },
  get stations() { return stations; },
  get held() { return held; },
  get score() { return score; },
  get hearts() { return hearts; },
  get combo() { return combo; },
  get L() { return L; },
  get level() { return level; },
  get timeLeft() { return timeLeft; },
  get paused() { return paused; },
  get save() { return save; },
  get boosters() { return boosters; },
  newGame, startLevel, startRound, buyItem, showOverlay,
  dailyReward, claimAch, collectStation,
};
