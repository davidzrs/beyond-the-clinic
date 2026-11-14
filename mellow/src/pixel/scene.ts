// The campfire and stage scenes, ported line-for-line from the web prototype.
// Everything draws into a PixelCtx, so web and Android show identical pixels.
import { PixelCtx } from './raster';

export type Seat = { x: number; y: number; s: number };
export type Layout = {
  key: string; W: number; H: number; hz: number; shore: number; moon: [number, number]; aur: [number, number];
  fire?: [number, number]; fs?: number; tent?: { x: number; base: number; h: number; hw: number };
  posts?: [number, number][]; lights?: [[number, number], [number, number], number]; seats?: Seat[];
  trees?: [number, number, number, number][]; bushes?: [number, number][]; stump?: [number, number];
};

export const LAYOUTS: Record<'wide' | 'tall' | 'full' | 'stage', Layout> = {
  wide: {
    key: 'wide', W: 320, H: 180, hz: 96, shore: 108, moon: [258, 24], aur: [46, 7], fire: [160, 141], fs: 1,
    tent: { x: 244, base: 124, h: 30, hw: 20 }, posts: [[60, 126]], lights: [[24, 60], [296, 60], 14],
    seats: [{ x: 120, y: 123, s: 40 }, { x: 200, y: 123, s: 40 }, { x: 98, y: 162, s: 46 }, { x: 222, y: 162, s: 46 }],
    trees: [[8, 196, 150, 52], [36, 192, 104, 40], [312, 198, 156, 54], [290, 192, 98, 40]], bushes: [[0, 184], [64, 188], [258, 188], [322, 184]],
  },
  tall: {
    key: 'tall', W: 216, H: 300, hz: 132, shore: 148, moon: [166, 40], aur: [72, 9], fire: [108, 228], fs: 1.05,
    tent: { x: 178, base: 168, h: 24, hw: 16 }, posts: [[34, 188]], lights: [[8, 98], [208, 98], 12],
    seats: [{ x: 66, y: 208, s: 48 }, { x: 150, y: 208, s: 48 }, { x: 54, y: 270, s: 56 }, { x: 162, y: 270, s: 56 }],
    trees: [[2, 318, 150, 64], [214, 320, 156, 66]], bushes: [[0, 300], [216, 302]],
  },
  // Full-screen portrait (phone campfire tab): more sky, bigger marshmallows, room at the bottom for buttons.
  full: {
    key: 'full', W: 216, H: 440, hz: 164, shore: 182, moon: [168, 52], aur: [82, 10], fire: [108, 270], fs: 1.1,
    tent: { x: 184, base: 210, h: 26, hw: 17 }, posts: [[30, 230]], lights: [[8, 120], [208, 120], 12],
    seats: [{ x: 62, y: 250, s: 50 }, { x: 154, y: 250, s: 50 }, { x: 50, y: 314, s: 58 }, { x: 166, y: 314, s: 58 }],
    trees: [[2, 430, 196, 70], [214, 434, 202, 72]], bushes: [[0, 440], [216, 442]],
  },
  stage: {
    key: 'stage', W: 160, H: 160, hz: 86, shore: 98, moon: [122, 24], aur: [40, 6], stump: [80, 134],
    posts: [[30, 128], [124, 128]], trees: [[4, 178, 112, 44], [156, 180, 118, 46]], bushes: [[0, 162], [160, 164]],
  },
};

type C = PixelCtx;
function rng(s: number) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function P(c: C, x: number, y: number, w: number, h: number, col: string) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
function line(c: C, x0: number, y0: number, x1: number, y1: number, col: string, th = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; P(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, th, th, col); } }
const TREE_N = { dark: '#0b1220', mid: '#121d33', light: '#1f3256', trunk: '#1a131e', trunkHi: '#2e2333' };
const TREE_D = { dark: '#2F6E43', mid: '#3F8C52', light: '#63AF63', trunk: '#6A4A33', trunkHi: '#8B6447' };
let TREE = TREE_N;
let DAY = false; // set by buildScene; the daytime scene follows the app's day theme
function pine(c: C, cx: number, base: number, h: number, trunk: number) {
  const top = base - h, fh = h - trunk;
  P(c, cx - 1, base - trunk - 2, 3, trunk + 2, TREE.trunk); P(c, cx - 1, base - trunk - 2, 1, trunk + 2, TREE.trunkHi);
  for (let j = 0; j < fh; j++) {
    const tier = j % 10, w = Math.floor(tier * 0.95 + j * 0.22) + 1, y = top + j;
    P(c, cx - w, y, w * 2 + 1, 1, TREE.mid); P(c, cx - w, y, Math.max(1, Math.floor(w * 0.55)), 1, TREE.light);
    const dx = Math.ceil(w * 0.35); P(c, cx + dx, y, w - dx + 1, 1, TREE.dark); if (tier === 9) P(c, cx - w, y, w * 2 + 1, 1, TREE.dark);
  }
}
function inPool(L: Layout, x: number, y: number) { if (!L.fire) return false; const [fx, fy] = L.fire, rx = L.W * 0.34, ry = (L.H - L.shore) * 0.42, dx = (x - fx) / rx, dy = (y - fy - 2) / ry; return dx * dx + dy * dy < 1.05; }

function drawBackDay(c: C, L: Layout) {
  const { W, H, hz } = L;
  const SKY = ['#3E8EDA', '#4996DE', '#559FE2', '#62A8E6', '#70B1E9', '#7FBBEC', '#8FC5EF', '#A0CFF1', '#B2D9F3', '#C3E3F5'];
  P(c, 0, 0, W, H, SKY[SKY.length - 1]); const bh = Math.ceil(hz / SKY.length); SKY.forEach((col, i) => P(c, 0, i * bh, W, bh, col));
  for (let i = 1; i < SKY.length; i++) { const y = i * bh; for (let x = 0; x < W; x++) { if (x % 2 === 0) P(c, x, y - 1, 1, 1, SKY[i]); else P(c, x, y, 1, 1, SKY[i - 1]); } }
  const [mx, my] = L.moon, mr = (L.key === 'stage' ? 7 : 9) + 1;
  for (let i = -mr * 2; i <= mr * 2; i++) for (let j = -mr * 2; j <= mr * 2; j++) {
    const d = Math.sqrt(i * i + j * j);
    if (d <= mr) P(c, mx + i, my + j, 1, 1, d <= mr - 2 ? '#FFF7C2' : '#FFE27A');
    else if (d <= mr * 2.1 && ((i + j) & 1)) P(c, mx + i, my + j, 1, 1, 'rgba(255,244,190,' + (0.35 * (1 - (d - mr) / (mr * 1.1))).toFixed(3) + ')');
  }
}
function drawBack(c: C, L: Layout) {
  if (DAY) { drawBackDay(c, L); return; }
  const { W, H, hz } = L;
  const SKY = ['#0a0e22', '#0e132d', '#121836', '#171d40', '#1d224a', '#242754', '#2d2c5d', '#373265', '#42386c', '#4d3e70'];
  P(c, 0, 0, W, H, SKY[SKY.length - 1]); const bh = Math.ceil(hz / SKY.length); SKY.forEach((col, i) => P(c, 0, i * bh, W, bh, col));
  for (let i = 1; i < SKY.length; i++) { const y = i * bh; for (let x = 0; x < W; x++) { if (x % 2 === 0) P(c, x, y - 1, 1, 1, SKY[i]); else P(c, x, y, 1, 1, SKY[i - 1]); } }
  const r = rng(7), n = Math.floor(W * hz / 240); for (let i = 0; i < n; i++) { const v = r(); P(c, r() * W, r() * (hz - 14), 1, 1, v > .8 ? '#fff4d6' : v > .45 ? '#a9a8d4' : '#6e6da4'); }
  const [mx, my] = L.moon, mr = L.key === 'stage' ? 7 : 9;
  for (let i = -mr * 2; i <= mr * 2; i++) for (let j = -mr * 2; j <= mr * 2; j++) {
    const d = Math.sqrt(i * i + j * j);
    if (d <= mr) P(c, mx + i, my + j, 1, 1, d <= mr - 2 ? '#f6eed4' : '#e3d7b2');
    else if (d <= mr * 1.9 && ((i + j) & 1)) P(c, mx + i, my + j, 1, 1, 'rgba(244,236,208,' + (0.14 * (1 - (d - mr) / (mr * 0.9))).toFixed(3) + ')');
  }
  P(c, mx - 3, my - 2, 2, 2, '#dccfa6'); P(c, mx + 2, my + 2, 3, 2, '#dccfa6'); P(c, mx - 1, my + 4, 2, 1, '#dccfa6');
}
function tent(c: C, L: Layout) {
  const { x: tx, base: tb, h: th, hw } = L.tent!, ty = tb - th;
  line(c, tx + hw * 0.4, ty + th * 0.45, tx + hw + 9, tb + 1, '#8a7a60'); line(c, tx - hw * 0.4, ty + th * 0.45, tx - hw - 9, tb + 1, '#8a7a60'); P(c, tx + hw + 8, tb, 2, 2, '#4a3a30'); P(c, tx - hw - 10, tb, 2, 2, '#4a3a30');
  for (let y = ty; y <= tb; y++) { const w = Math.round(hw * (y - ty) / th); for (let x = tx - w; x <= tx + w; x++) { let col = x < tx ? '#e6d7b4' : '#b9a888'; if (x === tx - w || x === tx + w) col = '#2a2038'; else if (x === tx) col = '#a8987a'; P(c, x, y, 1, 1, col); } }
  const dt = ty + Math.round(th * 0.34);
  for (let y = dt; y <= tb; y++) { const w = Math.round(hw * 0.44 * (y - dt) / (tb - dt)); for (let x = tx - w; x <= tx + w; x++) { const warm = y > tb - th * 0.42 && ((x + y) & 1); P(c, x, y, 1, 1, warm ? '#ffb35a' : (y > tb - th * 0.42 ? '#6a3a28' : '#3a2622')); } P(c, tx - w - 1, y, 1, 1, '#f4ead5'); }
  P(c, tx - hw - 1, tb + 1, hw * 2 + 3, 1, '#2a2038'); P(c, tx, ty - 5, 1, 5, '#6b4a33'); P(c, tx + 1, ty - 5, 4, 1, '#e88a96'); P(c, tx + 1, ty - 4, 3, 1, '#e88a96'); P(c, tx + 1, ty - 3, 1, 1, '#e88a96');
}
function post(c: C, x: number, b: number) {
  P(c, x - 1, b - 31, 4, 32, '#2a2038'); P(c, x, b - 30, 2, 30, '#4a3a30'); P(c, x, b - 30, 1, 30, '#6b5442'); P(c, x, b - 31, 8, 2, '#4a3a30'); P(c, x + 6, b - 29, 1, 2, '#2a2038');
  P(c, x + 4, b - 27, 5, 1, '#3a2e28'); P(c, x + 4, b - 26, 5, 6, '#ffc66b'); P(c, x + 5, b - 25, 2, 2, '#fff2c0'); P(c, x + 4, b - 20, 5, 1, '#3a2e28');
}
function seatLog(c: C, x: number, y: number, w: number) {
  const x0 = Math.round(x - w / 2);
  P(c, x0 + 2, y + 6, w - 2, 2, 'rgba(0,0,0,.3)'); P(c, x0 - 1, y - 1, w + 2, 8, '#2a2038'); P(c, x0, y, w, 6, '#5e3b24'); P(c, x0, y, w, 1, '#a87444'); P(c, x0, y + 1, w, 1, '#7d5130');
  for (let i = 5; i < w - 5; i += 7) P(c, x0 + i, y + 3, 3, 1, '#43281a'); for (let i = 8; i < w - 6; i += 9) P(c, x0 + i, y + 4, 2, 1, '#6b4428');
  P(c, x0, y, 4, 6, '#c08a5a'); P(c, x0 + 1, y + 2, 2, 2, '#9a6a40'); P(c, x0 + w - 4, y, 4, 6, '#c08a5a'); P(c, x0 + w - 3, y + 2, 2, 2, '#9a6a40');
}
function firepit(c: C, L: Layout) {
  const [fx, fy] = L.fire!, s = L.fs!, rx = 20 * s, ry = 7 * s;
  P(c, fx - rx + 3, fy - 2, rx * 2 - 6, 5, '#24150f');
  const stones: [number, number, boolean][] = []; for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2; stones.push([fx + Math.cos(ang) * rx, fy + 1 + Math.sin(ang) * ry, Math.sin(ang) > 0]); }
  const st = ([x, y, front]: [number, number, boolean]) => { P(c, x - 3, y - 2, 7, 5, '#2a2038'); P(c, x - 2, y - 1, 5, 3, front ? '#6e6a80' : '#55526a'); P(c, x - 2, y - 1, 5, 1, front ? '#c4a48e' : '#7a7790'); P(c, x + 2, y, 1, 2, '#45425a'); };
  stones.filter((q) => !q[2]).forEach(st);
  line(c, fx - 12 * s, fy + 2, fx - 1, fy - 14 * s, '#2a1a12', 3); line(c, fx + 12 * s, fy + 2, fx + 1, fy - 14 * s, '#2a1a12', 3);
  line(c, fx - 11 * s, fy + 1, fx - 1, fy - 13 * s, '#8a5a35', 2); line(c, fx + 11 * s, fy + 1, fx + 1, fy - 13 * s, '#6b4428', 2); line(c, fx - 9 * s, fy + 3, fx + 9 * s, fy - 6 * s, '#5e3b24', 2);
  stones.filter((q) => q[2]).forEach(st);
}
function stump(c: C, L: Layout) {
  const [sx, sy] = L.stump!, rx = 28, ry = 6, top = sy - 8;
  P(c, sx - rx - 8, sy + 7, 10, 3, '#2a2038'); P(c, sx + rx - 2, sy + 7, 10, 3, '#2a2038'); P(c, sx - rx - 7, sy + 7, 9, 2, '#5e3b24'); P(c, sx + rx - 1, sy + 7, 9, 2, '#5e3b24');
  for (let y = top; y <= sy + 9; y++) { const w = rx + (y > sy + 4 ? Math.floor((y - sy - 4) * 1.5) : 0); P(c, sx - w - 1, y, w * 2 + 3, 1, '#2a2038'); P(c, sx - w, y, w * 2 + 1, 1, '#5e3b24'); for (let k = -w + 4; k < w - 1; k += 6) P(c, sx + k, y, 1, 1, '#43281a'); P(c, sx - w, y, 4, 1, '#7d5130'); P(c, sx + w - 5, y, 5, 1, '#4a2e1c'); }
  for (let i = -rx - 2; i <= rx + 2; i++) for (let j = -ry - 2; j <= ry + 2; j++) {
    const d = (i * i) / (rx * rx) + (j * j) / (ry * ry);
    if (d <= 1) { const rr = Math.sqrt(d); P(c, sx + i, top + j, 1, 1, rr > 0.86 ? '#9a6a40' : (Math.floor(rr * 6) % 2 ? '#c49060' : '#dcae7e')); }
    else if (d <= 1.22) P(c, sx + i, top + j, 1, 1, '#2a2038');
  }
  P(c, sx - 1, top, 2, 1, '#9a6a40'); P(c, sx + rx - 9, sy - 2, 3, 4, '#d9604f'); P(c, sx + rx - 10, sy - 3, 5, 1, '#f08a6a'); P(c, sx + rx - 9, sy + 2, 1, 2, '#f4ead5');
}
function bush(c: C, x: number, y: number, rad: number) {
  for (let i = -rad; i <= rad; i++) for (let j = -rad; j <= rad; j++) { const d = i * i + j * j * 1.4; if (d <= rad * rad) { const lit = i < -rad * 0.2 && j < -rad * 0.2; P(c, x + i, y + j, 1, 1, DAY ? (lit ? '#6DBB5B' : '#4F9A47') : (lit ? '#1d3328' : '#0f1c16')); } }
  const r = rng(x * 7 + y); for (let k = 0; k < 4; k++) P(c, x + (r() - 0.5) * rad, y - rad * 0.3 + (r() - 0.5) * rad * 0.6, 1, 1, '#c8564a');
}
function drawFront(c: C, L: Layout) {
  const { W, H, hz, shore } = L; const r = rng(31);
  const K = DAY
    ? { m1: '#8EA9D9', m1t: '#F4F8FF', m1h: '#B9CCEE', m2: '#7392C8', far: '#3F7F5C', water: '#5BADE1', refl: '#4C98C9', streak: '#93D4F5', edge: '#E9D6A0', GB: ['#93D36C', '#88CB64', '#7DC25C', '#73B955', '#69B04E'], top: '#A8DE80', pool: ['#D9B57D', '#CBA46B', '#DEC28F', '#C9AE78'], blade: ['#5FA244', '#A9DE80'], string: '#6B5444' }
    : { m1: '#23254e', m1t: '#3b3c72', m1h: '#55578f', m2: '#1b1e43', far: '#121933', water: '#18214b', refl: '#111838', streak: '#24316c', edge: '#1d2a3a', GB: ['#203629', '#1c3025', '#182a21', '#13221b', '#0f1c16'], top: '#2f4e3c', pool: ['#4a4236', '#3d372e', '#2f3b31', '#2f3b31'], blade: ['#2e4b39', '#0f1c16'], string: '#2a2038' };
  for (let x = 0; x < W; x++) { const y = Math.floor(hz - 22 + 9 * Math.sin(x / 37 + 0.5) + 6 * Math.sin(x / 13 + 1.3) + 2 * Math.sin(x / 4)); P(c, x, y, 1, hz - y, K.m1); P(c, x, y, 1, DAY && y < hz - 25 ? 3 : 1, K.m1t); if (y < hz - 24) P(c, x, y + (DAY ? 3 : 1), 1, 1, K.m1h); }
  for (let x = 0; x < W; x++) { const y = Math.floor(hz - 10 + 4 * Math.sin(x / 23 + 2) + 2 * Math.sin(x / 7)); P(c, x, y, 1, hz - y, K.m2); }
  const far: [number, number][] = []; for (let x = -2; x < W + 2; x += 3 + (r() * 4 | 0)) far.push([x, 5 + (r() * 10 | 0)]);
  far.forEach(([x, h]) => { for (let j = 0; j < h; j++) { const w = Math.floor(j * 0.32); P(c, x - w, hz - h + j, w * 2 + 1, 1, K.far); } });
  P(c, 0, hz, W, shore - hz, K.water);
  far.forEach(([x, h]) => { for (let j = 0; j < h; j++) { const w = Math.floor(j * 0.32), y = hz + (h - 1 - j); if (y >= shore - 1) continue; for (let k = -w; k <= w; k++) if (((x + k + y) & 1) === 0) P(c, x + k, y, 1, 1, K.refl); } });
  for (let i = 0; i < W * 0.5; i++) P(c, r() * W, hz + 3 + r() * (shore - hz - 5), 2 + r() * 6, 1, K.streak);
  P(c, 0, shore - 1, W, DAY ? 3 : 1, K.edge);
  const GB = K.GB, gh = H - shore;
  GB.forEach((col, i) => P(c, 0, shore + Math.floor(i * gh / GB.length), W, Math.ceil(gh / GB.length) + 1, col));
  for (let i = 1; i < GB.length; i++) { const y = shore + Math.floor(i * gh / GB.length); for (let x = 0; x < W; x += 2) P(c, x + (i & 1), y - 1, 1, 1, GB[i]); }
  P(c, 0, shore + (DAY ? 2 : 0), W, 1, K.top);
  if (L.fire) {
    const [fx, fy] = L.fire, rx = W * 0.34, ry = (H - shore) * 0.42;
    for (let y = shore + 1; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x - fx) / rx, dy = (y - fy - 2) / ry, d = dx * dx + dy * dy; if (d >= 1) continue;
      let col: string | null = null;
      if (DAY) { if (d < 0.82) col = ((x * 3 + y * 5) % 11 === 0) ? K.pool[1] : d < 0.3 ? K.pool[0] : K.pool[2]; else if ((x + y) & 1) col = K.pool[3]; }
      else if (d < 0.26) col = ((x * 3 + y * 5) % 11 === 0) ? K.pool[0] : K.pool[1]; else if (d < 0.32) col = ((x + y) & 1) ? K.pool[1] : K.pool[2]; else if (d < 0.8) col = K.pool[2]; else if ((x + y) & 1) col = K.pool[3];
      if (col) P(c, x, y, 1, 1, col);
    }
  }
  for (let i = 0; i < W * (H - shore) / 110; i++) { const x = r() * W | 0, y = shore + 3 + (r() * (H - shore - 3) | 0); if (inPool(L, x, y)) continue; const col = r() > .5 ? K.blade[0] : K.blade[1]; P(c, x, y, 1, 2, col); P(c, x + 1, y - 1, 1, 2, col); if (r() > .6) P(c, x - 1, y, 1, 1, col); }
  const FL = ['#e88a96', '#ffd36b', '#f4ead5', '#a595d4'];
  for (let i = 0; i < W / 14; i++) { const x = r() * W | 0, y = shore + 6 + (r() * (H - shore - 10) | 0); if (inPool(L, x, y)) continue; P(c, x, y, 1, 2, '#3f7a5a'); P(c, x, y - 1, 1, 1, FL[i % 4]); if (i % 3 === 0) { P(c, x - 1, y - 1, 1, 1, FL[i % 4]); P(c, x + 1, y - 1, 1, 1, FL[i % 4]); } }
  if (L.lights) { const [[x1, y1], [x2, y2], sag] = L.lights; for (let x = x1; x <= x2; x++) { const t = (x - x1) / (x2 - x1); P(c, x, y1 + (y2 - y1) * t + sag * (1 - (2 * t - 1) ** 2), 1, 1, K.string); } }
  if (L.tent) tent(c, L);
  (L.posts || []).forEach(([x, b]) => post(c, x, b));
  if (L.fire) firepit(c, L);
  (L.seats || []).forEach((s) => seatLog(c, s.x, s.y - 3, Math.round(s.s * 0.86)));
  if (L.stump) stump(c, L);
  (L.trees || []).forEach(([x, b, h, tr]) => pine(c, x, b, h, tr));
  (L.bushes || []).forEach(([x, y], i) => bush(c, x, y, i % 2 ? 12 : 16));
  [[0.12, 0.88], [0.86, 0.9]].forEach(([qx, qy]) => { const x = Math.round(W * qx), y = Math.round(H * qy); if (inPool(L, x, y)) return; P(c, x, y - 3, 4, 2, '#c8564a'); P(c, x + 1, y - 3, 1, 1, '#f4ead5'); P(c, x + 1, y - 1, 2, 2, '#e8dccc'); });
}
function bulbs(L: Layout) { if (!L.lights) return [] as [number, number][]; const [[x1, y1], [x2, y2], sag] = L.lights, a: [number, number][] = []; for (let x = x1 + 12; x <= x2 - 12; x += 12) { const t = (x - x1) / (x2 - x1); a.push([x, Math.round(y1 + (y2 - y1) * t + sag * (1 - (2 * t - 1) ** 2)) + 1]); } return a; }
function twinkles(L: Layout) { const r = rng(99), a: [number, number, number][] = []; for (let i = 0; i < Math.floor(L.W / 22); i++) a.push([r() * L.W | 0, r() * (L.hz - 30) | 0, r() * 6]); return a; }
function makeGlow(L: Layout, par: number) {
  const g = new PixelCtx(L.W, L.H); const spots: [number, number, number, number, number, string][] = [];
  if (L.fire) { const [fx, fy] = L.fire; spots.push([fx, fy - 10, L.W * 0.36 * (DAY ? 0.6 : 1), (L.H - L.shore) * 0.6 * (DAY ? 0.6 : 1) + 14, DAY ? 0.12 : 0.26, '255,130,50']); }
  if (!DAY) (L.posts || []).forEach(([x, b]) => spots.push([x + 6, b - 23, 16, 14, 0.22, '255,190,100']));
  if (L.tent && !DAY) { const t = L.tent; spots.push([t.x, t.base - 5, t.hw * 0.8, 9, 0.2, '255,150,70']); }
  if (L.stump) spots.push([L.stump[0], L.stump[1] - 34, 44, 44, 0.08, '255,210,160']);
  spots.forEach(([cx, cy, rx, ry, a, rgb]) => {
    for (let i = -Math.ceil(rx); i <= rx; i++) for (let j = -Math.ceil(ry); j <= ry; j++) {
      if ((i + j + par) & 1) continue; const d = (i * i) / (rx * rx) + (j * j) / (ry * ry);
      if (d < 1) { g.fillStyle = 'rgba(' + rgb + ',' + (a * Math.pow(1 - d, 1.3)).toFixed(3) + ')'; g.fillRect(Math.round(cx + i), Math.round(cy + j), 1, 1); }
    }
  });
  return g;
}
function aurora(c: C, L: Layout, t: number) {
  const [base, amp] = L.aur;
  for (let x = 0; x < L.W; x++) {
    const y0 = base + Math.sin(x * 0.03 + t * 0.22) * amp + Math.sin(x * 0.011 - t * 0.13) * amp * 1.3;
    const len = Math.max(4, 12 + 7 * Math.sin(x * 0.07 + t * 0.5) + 5 * Math.sin(x * 0.19 - t * 0.8)), br = 0.5 + 0.5 * Math.sin(x * 0.045 + t * 0.7);
    for (let j = 0; j < len; j++) {
      if (j > len * 0.45 && ((x + j) & 1)) continue; const k = j / len, a = (1 - k) * 0.42 * br; if (a < 0.02) continue;
      c.fillStyle = 'rgba(' + (j < 2 ? '170,255,210' : k < 0.55 ? '80,220,150' : '150,110,235') + ',' + a.toFixed(2) + ')'; c.fillRect(x, Math.round(y0 - j), 1, 1);
    }
  }
}

export type SceneCache = { back: PixelCtx; front: PixelCtx; glow: PixelCtx[]; tw: [number, number, number][]; bulbs: [number, number][]; day: boolean };
export function buildScene(L: Layout, day = false): SceneCache {
  DAY = day; TREE = day ? TREE_D : TREE_N;
  const back = new PixelCtx(L.W, L.H), front = new PixelCtx(L.W, L.H);
  drawBack(back, L); drawFront(front, L);
  const K = { back, front, glow: [makeGlow(L, 0), makeGlow(L, 1)], tw: twinkles(L), bulbs: bulbs(L), day };
  DAY = false; TREE = TREE_N;
  return K;
}

export function drawFrame(c: C, L: Layout, K: SceneCache, t: number) {
  const f = Math.floor(t * 10);
  c.copyFrom(K.back);
  if (K.day) { dayFrame(c, L, K, t, f); return; }
  K.tw.forEach(([x, y, o]) => { const b = Math.sin(t * 1.6 + o); if (b > 0.3) P(c, x, y, 1, 1, b > 0.8 ? '#ffffff' : '#fff4d6'); if (b > 0.85) { P(c, x - 1, y, 1, 1, 'rgba(255,244,214,.5)'); P(c, x + 1, y, 1, 1, 'rgba(255,244,214,.5)'); } });
  aurora(c, L, t); c.drawImage(K.front, 0, 0);
  const [mx] = L.moon; for (let y = L.hz + 2; y < L.shore - 1; y += 2) { const w = 3 + Math.round(Math.sin(t * 2 + y * 0.9) * 2) + (y - L.hz) * 0.2; P(c, mx - w / 2 + Math.sin(t + y) * 1.5, y, w, 1, 'rgba(244,236,208,.32)'); }
  const bc = ['#ffc66b', '#e88a96', '#86c094', '#a595d4', '#8fb4e6']; K.bulbs.forEach(([x, y], i) => { const on = Math.sin(t * 1.8 + i * 0.9) > -0.4; P(c, x, y, 2, 2, on ? bc[i % 5] : '#3a3350'); if (on) P(c, x, y, 1, 1, '#fff6dc'); });
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.max(0.6, Math.min(1, 0.86 + 0.1 * Math.sin(t * 7) + 0.05 * Math.sin(t * 17))); c.drawImage(K.glow[f & 1], 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  (L.posts || []).forEach(([x, b], i) => { const fl = Math.sin(t * 9 + i * 3) > 0; P(c, x + 5, b - 25, 2, 2, fl ? '#fff2c0' : '#ffe0a0'); P(c, x + 4, b - 23, 5, 2, fl ? '#ffd27a' : '#ffc66b'); });
  if (L.fire) {
    const [fx, fy] = L.fire, s = L.fs!, r = rng(f * 13 + 7);
    for (let i = -10; i <= 10; i++) if (r() > .35) P(c, fx + i * s, fy - 1, 1, 1, r() > .5 ? '#ff7a3a' : '#c23a22');
    const cols = ['#a82e22', '#e0552a', '#f7952f', '#ffcf5c', '#fff2b8'];
    for (let k = 0; k < 5; k++) { const hw = (13 - k * 2.4) * s, hh = (38 - k * 6.6) * s; for (let i = -Math.floor(hw); i <= Math.floor(hw); i++) { const fall = 1 - Math.pow(Math.abs(i) / (hw + 1), 1.25), h = Math.floor(hh * fall * (0.68 + r() * 0.44)); if (h > 0) P(c, fx + i, fy - 3 - h, 1, h, cols[k]); } }
    for (let k = 0; k < 3; k++) { const ph = (t * 1.4 + k * 0.33) % 1; if (ph < 0.6) P(c, fx + Math.sin(t * 4 + k * 2) * 5 * s, fy - 26 * s - ph * 16 * s, 2, 2, ph < 0.3 ? '#ffcf5c' : '#f7952f'); }
    for (let k = 0; k < 9; k++) { const ph = (t * 0.42 + k * 0.111) % 1; P(c, fx + Math.sin(k * 2.3 + t * 1.7) * (3 + ph * 14), fy - 34 * s - ph * 60 * s, 1, 1, ph < 0.4 ? '#ffe08a' : ph < 0.75 ? '#e88a4a' : '#7a3a2a'); }
    for (let k = 0; k < 6; k++) { const ph = (t * 0.1 + k / 6) % 1; const a = (1 - ph) * 0.18; if (a > 0.02) P(c, fx + Math.sin(ph * 5 + k) * 6 + ph * 14, fy - 48 * s - ph * 70 * s, 2 + ph * 3, 2 + ph * 2, 'rgba(180,170,200,' + a.toFixed(2) + ')'); }
  }
  for (let i = 0; i < 9; i++) { const x = (i + 0.5) / 9 * L.W + Math.sin(t * 0.5 + i * 1.7) * 10, y = L.shore + (L.H - L.shore) * 0.3 + Math.sin(t * 0.8 + i * 2.1) * 9 + (i % 3) * 9; if (L.fire && Math.abs(x - L.fire[0]) < 34) continue; if (Math.sin(t * 2.2 + i * 1.3) > -0.1) { P(c, x, y, 1, 1, '#e8f7a0'); P(c, x - 1, y, 1, 1, 'rgba(232,247,160,.3)'); } }
}

// Daytime: drifting clouds, birds, a sparkling lake, softer fire and butterflies instead of fireflies.
function cloud(c: C, x: number, y: number, s: number) {
  const W = '#FFFFFF', SH = '#DCEAF7';
  P(c, x, y, 18 * s, 4 * s, W); P(c, x + 3 * s, y - 3 * s, 9 * s, 3 * s, W); P(c, x + 9 * s, y - 5 * s, 6 * s, 3 * s, W); P(c, x + 13 * s, y - 2 * s, 4 * s, 2 * s, W);
  P(c, x + 1, y + 4 * s - 1, 18 * s - 2, 1, SH);
}
function dayFrame(c: C, L: Layout, K: SceneCache, t: number, f: number) {
  const { W, H, hz, shore } = L;
  [[0.05, 0.16, 2.2, 1.2], [0.5, 0.08, 1.8, 0.9], [0.78, 0.34, 1.5, 1.6], [0.28, 0.46, 1.3, 1.1], [0.92, 0.6, 1.1, 1.4], [0.6, 0.66, 1, 0.8]].forEach(([bx, by, s, sp]) => {
    const span = W + 40, x = ((bx * span + t * sp) % span) - 30; cloud(c, x, Math.round(hz * by) + 6, s);
  });
  for (let i = 0; i < 3; i++) {
    const x = ((t * (9 + i * 2) + i * 70) % (W + 30)) - 15, y = Math.round(hz * 0.32 + i * 7 + Math.sin(t * 1.5 + i) * 2), up = ((f + i * 2) % 6) < 3;
    P(c, x - 2, y - (up ? 1 : 0), 2, 1, '#3E4A6A'); P(c, x, y, 1, 1, '#3E4A6A'); P(c, x + 1, y - (up ? 1 : 0), 2, 1, '#3E4A6A');
  }
  c.drawImage(K.front, 0, 0);
  for (let i = 0; i < 10; i++) { const x = (i * 37 + 11) % W, y = hz + 2 + ((i * 13) % Math.max(1, shore - hz - 4)); if (Math.sin(t * 3 + i * 1.7) > 0.6) { P(c, x, y, 2, 1, '#FFFFFF'); } }
  const bc = ['#ffc66b', '#f6a6c1', '#86c094', '#b9a6f0', '#8fc5ef']; K.bulbs.forEach(([x, y], i) => { P(c, x, y, 2, 2, bc[i % 5]); if (Math.sin(t * 1.2 + i) > 0.5) P(c, x, y, 1, 1, '#ffffff'); });
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.8 + 0.1 * Math.sin(t * 7); c.drawImage(K.glow[f & 1], 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  (L.posts || []).forEach(([x, b]) => { P(c, x + 4, b - 26, 5, 6, '#F2DFA6'); P(c, x + 5, b - 25, 2, 2, '#FFF6D8'); });
  if (L.fire) {
    const [fx, fy] = L.fire, s = L.fs!, r = rng(f * 13 + 7);
    for (let i = -10; i <= 10; i++) if (r() > .35) P(c, fx + i * s, fy - 1, 1, 1, r() > .5 ? '#ff7a3a' : '#c23a22');
    const cols = ['#a82e22', '#e0552a', '#f7952f', '#ffcf5c', '#fff2b8'];
    for (let k = 0; k < 5; k++) { const hw = (13 - k * 2.4) * s, hh = (38 - k * 6.6) * s; for (let i = -Math.floor(hw); i <= Math.floor(hw); i++) { const fall = 1 - Math.pow(Math.abs(i) / (hw + 1), 1.25), h = Math.floor(hh * fall * (0.68 + r() * 0.44)); if (h > 0) P(c, fx + i, fy - 3 - h, 1, h, cols[k]); } }
    for (let k = 0; k < 9; k++) { const ph = (t * 0.42 + k * 0.111) % 1; P(c, fx + Math.sin(k * 2.3 + t * 1.7) * (3 + ph * 14), fy - 34 * s - ph * 60 * s, 1, 1, ph < 0.4 ? '#ffe08a' : ph < 0.75 ? '#e88a4a' : '#a0604a'); }
    for (let k = 0; k < 6; k++) { const ph = (t * 0.1 + k / 6) % 1; const a = (1 - ph) * 0.22; if (a > 0.02) P(c, fx + Math.sin(ph * 5 + k) * 6 + ph * 14, fy - 48 * s - ph * 70 * s, 2 + ph * 3, 2 + ph * 2, 'rgba(150,150,160,' + a.toFixed(2) + ')'); }
  }
  const BF = ['#FFFFFF', '#FFD36B', '#F6A6C1', '#B9A6F0'];
  for (let i = 0; i < 5; i++) {
    const x = W * (0.12 + 0.19 * i) + Math.sin(t * 0.7 + i * 2) * 14, y = shore + (H - shore) * (0.22 + (i % 3) * 0.18) + Math.sin(t * 1.1 + i) * 8;
    if (L.fire && Math.abs(x - L.fire[0]) < 26 && Math.abs(y - L.fire[1]) < 30) continue;
    const col = BF[i % 4], open = Math.sin(t * 12 + i * 1.3) > 0;
    if (open) { P(c, x - 1, y - 1, 1, 2, col); P(c, x + 1, y - 1, 1, 2, col); } else P(c, x, y - 2, 1, 2, col);
    P(c, x, y, 1, 1, '#3a2a2a');
  }
}
