// TEST ONLY (#lab): the 8-bit hilltop behind your marshmallow on Today.
// Same pixel toolkit and palette family as the campfire, but a different place: your own spot on a hill,
// with snowy mountains, a little cabin, a winding path, a big oak and your own small fire.
// The fire (and the light it throws) grows with how much of today you've done.
import { PixelCtx } from './raster';

type C = PixelCtx;
export type HomeLayout = { key: string; W: number; H: number; ground: number; fire: [number, number] };
export type HomeCache = { L: HomeLayout; back: C; front: C; glow: C[]; tw: [number, number, number][]; cabin: [number, number]; day: boolean };

function rng(s: number) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function P(c: C, x: number, y: number, w: number, h: number, col: string) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }

const PAL = {
  night: {
    sky: ['#070a22', '#0b0f2e', '#10153b', '#161a48', '#1e1f53', '#28245d', '#342a65', '#43306b', '#54376f', '#673f72'],
    star: ['#fff4d6', '#a9a8d4', '#6e6da4'],
    mtn: '#2b2a5e', mtnHi: '#3f3e7c', snow: '#a3a9dc', snowHi: '#c8ccf0',
    hill: '#1c2a49', hillHi: '#2a3c5f', pine: '#0f1a30', pineHi: '#1c2c4a', trunk: '#1a131e',
    meadow: ['#21402f', '#1c3829', '#183123', '#142a1e', '#102219'], meadowTop: '#336347',
    path: ['#3f3848', '#352f3f', '#4a4252'], blade: ['#2e4b39', '#4d7d5c'], flower: ['#e88a96', '#ffd36b', '#a595d4', '#f4ead5'],
    wall: '#4e3832', wallHi: '#634940', wallLo: '#3a2925', roof: '#2c2240', roofHi: '#40345a', win: '#ffc66b', winHi: '#fff2c0', door: '#24160f',
    leaf: '#162a3c', leafHi: '#24405a', leafLo: '#0c1726', bark: '#2a1f26', barkHi: '#3e2f38',
    smoke: '180,170,210', glow: '255,130,50',
  },
  day: {
    sky: ['#3E8EDA', '#4996DE', '#559FE2', '#62A8E6', '#70B1E9', '#7FBBEC', '#8FC5EF', '#A0CFF1', '#B2D9F3', '#C8E6F6'],
    star: ['#fff', '#fff', '#fff'],
    mtn: '#8BA5D6', mtnHi: '#A9BFE6', snow: '#EEF4FF', snowHi: '#FFFFFF',
    hill: '#6FB25D', hillHi: '#8DCB73', pine: '#3B7A47', pineHi: '#5A9F58', trunk: '#6A4A33',
    meadow: ['#9AD772', '#8FCF69', '#83C660', '#78BD58', '#6DB350'], meadowTop: '#B4E58A',
    path: ['#E3C896', '#D3B57F', '#EED9AE'], blade: ['#5FA244', '#B0E28A'], flower: ['#e88a96', '#ffd36b', '#f4ead5', '#b9a6f0'],
    wall: '#B67D50', wallHi: '#CF9663', wallLo: '#94643F', roof: '#B84A3E', roofHi: '#D86A55', win: '#9FD3F2', winHi: '#E6F6FF', door: '#6A4A33',
    leaf: '#4C9648', leafHi: '#76BF5F', leafLo: '#367638', bark: '#6A4A33', barkHi: '#8B6447',
    smoke: '235,235,240', glow: '255,150,70',
  },
};
type Pal = typeof PAL.night;

// Size the art to the box: a fixed number of art pixels tall, as wide as the box needs.
export function homeLayout(boxW: number, boxH: number, groundPx: number, fireXPx: number, artH: number): HomeLayout {
  const k = boxH / artH, W = Math.ceil(boxW / k);
  const ground = Math.round(artH - groundPx / k);
  return { key: W + 'x' + artH + ':' + ground + ':' + Math.round(fireXPx / k), W, H: artH, ground, fire: [Math.round(fireXPx / k), ground + 1] };
}

function sky(c: C, L: HomeLayout, K: Pal) {
  const { W, H } = L, S = K.sky, bh = Math.ceil(H * 0.78 / S.length);
  P(c, 0, 0, W, H, S[S.length - 1]); S.forEach((col, i) => P(c, 0, i * bh, W, bh, col));
  for (let i = 1; i < S.length; i++) { const y = i * bh; for (let x = 0; x < W; x++) { if (x % 2 === 0) P(c, x, y - 1, 1, 1, S[i]); else P(c, x, y, 1, 1, S[i - 1]); } }
}
function moon(c: C, L: HomeLayout) {
  // a crescent, with a dithered halo
  const mx = Math.round(L.W * 0.8), my = Math.round(L.H * 0.2), r = 8;
  for (let i = -r * 2; i <= r * 2; i++) for (let j = -r * 2; j <= r * 2; j++) {
    const d = Math.sqrt(i * i + j * j), cut = Math.sqrt((i - 4) * (i - 4) + (j + 2) * (j + 2));
    if (d <= r && cut > r - 1) P(c, mx + i, my + j, 1, 1, d <= r - 1.5 ? '#f8efd2' : '#e2d4a8');
    else if (d > r && d <= r * 2 && ((i + j) & 1)) P(c, mx + i, my + j, 1, 1, 'rgba(244,236,208,' + (0.13 * (1 - (d - r) / r)).toFixed(3) + ')');
  }
}
function sun(c: C, L: HomeLayout) {
  const mx = Math.round(L.W * 0.82), my = Math.round(L.H * 0.2), r = 9;
  for (let i = -r * 2; i <= r * 2; i++) for (let j = -r * 2; j <= r * 2; j++) {
    const d = Math.sqrt(i * i + j * j);
    if (d <= r) P(c, mx + i, my + j, 1, 1, d <= r - 2 ? '#FFF7C2' : '#FFE27A');
    else if (d <= r * 2.1 && ((i + j) & 1)) P(c, mx + i, my + j, 1, 1, 'rgba(255,244,190,' + (0.35 * (1 - (d - r) / (r * 1.1))).toFixed(3) + ')');
  }
}
function pine(c: C, K: Pal, cx: number, base: number, h: number) {
  P(c, cx, base - 2, 1, 3, K.trunk);
  for (let j = 0; j < h; j++) { const w = Math.floor((j % 5) * 0.6 + j * 0.28); P(c, cx - w, base - h - 1 + j, w * 2 + 1, 1, K.pine); if (w > 0) P(c, cx - w, base - h - 1 + j, Math.ceil(w * 0.6), 1, K.pineHi); }
}
function hillY(L: HomeLayout, x: number) { return Math.round(L.ground - 22 + 5 * Math.sin(x / 28 + 0.7) + 3 * Math.sin(x / 11 + 2)); }
function meadowY(L: HomeLayout, x: number) { return Math.round(L.ground - 3 + 2 * Math.sin(x / 36 + 1.2)); }
function inPool(L: HomeLayout, x: number, y: number) { const [fx, fy] = L.fire, dx = (x - fx) / 26, dy = (y - fy) / 8; return dx * dx + dy * dy < 1; }

function front(c: C, L: HomeLayout, K: Pal, day: boolean): [number, number] {
  const { W, H, ground } = L, r = rng(17);
  // 1. mountains with snowy peaks
  const peaks: [number, number][] = []; for (let x = -20; x < W + 40; x += 34 + (r() * 26 | 0)) peaks.push([x, 16 + (r() * 22 | 0)]);
  const mBase = ground - 16;
  for (let x = 0; x < W; x++) {
    let top = mBase, pk = peaks[0];
    for (const p of peaks) { const y = mBase - p[1] + Math.abs(x - p[0]) * 0.75; if (y < top) { top = y; pk = p; } }
    top = Math.round(top);
    for (let y = top; y < mBase + 8; y++) {
      const snowLine = mBase - pk[1] + 6 + ((x * 7) % 3);
      const col = y < snowLine ? (x < pk[0] ? K.snowHi : K.snow) : x < pk[0] ? K.mtnHi : K.mtn;
      P(c, x, y, 1, 1, col);
    }
  }
  // 2. the far hill with a row of pines and the cabin
  const cabX = Math.round(W * (W < 220 ? 0.8 : 0.76));
  for (let x = 0; x < W; x++) { const y = hillY(L, x); P(c, x, y, 1, H - y, K.hill); P(c, x, y, 1, 1, K.hillHi); }
  for (let x = 2; x < W; x += 5 + (r() * 6 | 0)) { if (Math.abs(x - cabX) < 18) continue; pine(c, K, x, hillY(L, x) + 2, 7 + (r() * 9 | 0)); }
  const cb = hillY(L, cabX) + 2, cw = 11, wallH = 10, roofH = 8;
  P(c, cabX - cw, cb - wallH, cw * 2 + 1, wallH, K.wall); P(c, cabX - cw, cb - wallH, 3, wallH, K.wallHi); P(c, cabX + cw - 2, cb - wallH, 3, wallH, K.wallLo);
  for (let y = cb - wallH + 2; y < cb; y += 3) P(c, cabX - cw, y, cw * 2 + 1, 1, K.wallLo);
  P(c, cabX + 5, cb - wallH - roofH - 3, 3, 7, K.wallLo); // chimney
  for (let j = 0; j <= roofH; j++) { const w = cw + 2 - Math.round((roofH - j) * (cw + 2) / roofH); P(c, cabX - w, cb - wallH - roofH + j, w * 2 + 1, 1, K.roof); P(c, cabX - w, cb - wallH - roofH + j, Math.max(1, Math.round(w * 0.5)), 1, K.roofHi); }
  P(c, cabX - 7, cb - 7, 4, 3, K.win); P(c, cabX - 7, cb - 7, 1, 1, K.winHi); P(c, cabX + 3, cb - 6, 3, 6, K.door);
  // 3. the meadow you sit on
  for (let x = 0; x < W; x++) {
    const y0 = meadowY(L, x);
    K.meadow.forEach((col, i) => { const y = y0 + Math.floor(i * (H - y0) / K.meadow.length); P(c, x, y, 1, Math.ceil((H - y0) / K.meadow.length) + 1, col); });
    P(c, x, y0, 1, 1, K.meadowTop);
  }
  // 4. a path winding from the meadow up to the cabin door
  for (let i = 0; i <= 120; i++) {
    const t = i / 120, x = (W * 0.3) + (cabX + 4 - W * 0.3) * t + Math.sin(t * Math.PI * 1.6) * W * 0.07, y = H + (cb - H) * t, w = 12 * (1 - t) + 1.5;
    for (let k = -w; k <= w; k++) { const px = Math.round(x + k), py = Math.round(y); if (inPool(L, px, py)) continue; P(c, px, py, 1, 1, Math.abs(k) > w - 1 ? K.path[1] : ((px * 5 + py * 3) % 9 === 0 ? K.path[2] : K.path[0])); }
  }
  // 5. grass blades and flowers (not on the path or around the fire)
  for (let i = 0; i < W * 0.9; i++) {
    const x = r() * W | 0, y = meadowY(L, x) + 2 + (r() * (H - meadowY(L, x) - 2) | 0);
    if (inPool(L, x, y)) continue;
    const col = r() > 0.5 ? K.blade[0] : K.blade[1]; P(c, x, y, 1, 2, col); P(c, x + 1, y - 1, 1, 2, col);
    if (i % 6 === 0) { const f = K.flower[i % 4]; P(c, x + 3, y - 1, 1, 1, f); P(c, x + 2, y - 1, 1, 1, f); P(c, x + 4, y - 1, 1, 1, f); P(c, x + 3, y - 2, 1, 1, f); P(c, x + 3, y, 1, 2, K.blade[0]); }
  }
  // 6. a big oak on the left, framing the scene
  const ox = Math.max(10, Math.round(W * 0.07)), ob = meadowY(L, ox) + 6;
  P(c, ox - 3, ob - 34, 6, 34, K.bark); P(c, ox - 3, ob - 34, 2, 34, K.barkHi); P(c, ox + 2, ob - 26, 6, 2, K.bark); P(c, ox - 6, ob - 2, 12, 2, K.bark);
  const blobs: [number, number, number][] = [[0, -44, 15], [-12, -36, 11], [13, -36, 12], [-4, -54, 11], [9, -50, 10], [-14, -48, 8]];
  blobs.forEach(([bx, by, br]) => {
    for (let i = -br; i <= br; i++) for (let j = -br; j <= br; j++) {
      const d = i * i + j * j * 1.15; if (d > br * br) continue;
      const lit = i + j < -br * 0.5, shade = i + j > br * 0.6;
      P(c, ox + bx + i, ob + by + j, 1, 1, lit ? K.leafHi : shade ? K.leafLo : K.leaf);
    }
  });
  for (let i = 0; i < 26; i++) P(c, ox + (r() - 0.5) * 40, ob - 46 + (r() - 0.5) * 30, 1, 1, i % 3 ? K.leafHi : K.leafLo);
  // 7. little stones ringing your fire, and a log to sit on beside it
  const [fx, fy] = L.fire;
  for (let a = 0; a < 10; a++) { const ang = (a / 10) * Math.PI * 2, x = fx + Math.cos(ang) * 9, y = fy + 1 + Math.sin(ang) * 3; P(c, x - 2, y - 1, 4, 3, '#2a2038'); P(c, x - 1, y - 1, 3, 2, Math.sin(ang) > 0 ? '#7a7790' : '#55526a'); }
  P(c, fx - 7, fy - 1, 14, 2, '#2a1a12'); P(c, fx - 6, fy - 1, 12, 1, '#8a5a35');
  return [cabX, cb];
}

function makeGlow(L: HomeLayout, cabin: [number, number], day: boolean, par: number) {
  const g = new PixelCtx(L.W, L.H), [fx, fy] = L.fire, spots: [number, number, number, number, number][] = [[fx, fy - 6, 46, 22, day ? 0.12 : 0.3]];
  if (!day) spots.push([cabin[0] - 5, cabin[1] - 6, 9, 6, 0.25]);
  spots.forEach(([cx, cy, rx, ry, a]) => {
    for (let i = -rx; i <= rx; i++) for (let j = -ry; j <= ry; j++) {
      if ((i + j + par) & 1) continue; const d = (i * i) / (rx * rx) + (j * j) / (ry * ry);
      if (d < 1) { g.fillStyle = 'rgba(' + (day ? PAL.day.glow : PAL.night.glow) + ',' + (a * Math.pow(1 - d, 1.3)).toFixed(3) + ')'; g.fillRect(cx + i, cy + j, 1, 1); }
    }
  });
  return g;
}

export function buildHome(L: HomeLayout, day: boolean): HomeCache {
  const K = day ? PAL.day : PAL.night, back = new PixelCtx(L.W, L.H), fr = new PixelCtx(L.W, L.H);
  sky(back, L, K);
  if (day) sun(back, L);
  else { const r = rng(5); for (let i = 0; i < L.W * L.H / 120; i++) { const v = r(); P(back, r() * L.W, r() * L.H * 0.55, 1, 1, v > 0.8 ? K.star[0] : v > 0.45 ? K.star[1] : K.star[2]); } moon(back, L); }
  const cabin = front(fr, L, K, day);
  const r = rng(99), tw: [number, number, number][] = []; for (let i = 0; i < L.W / 14; i++) tw.push([r() * L.W | 0, r() * L.H * 0.5 | 0, r() * 6]);
  return { L, back, front: fr, glow: [makeGlow(L, cabin, day, 0), makeGlow(L, cabin, day, 1)], tw, cabin, day };
}

function aurora(c: C, L: HomeLayout, t: number) {
  const base = L.H * 0.3, amp = 5;
  for (let x = 0; x < L.W; x++) {
    const y0 = base + Math.sin(x * 0.035 + t * 0.22) * amp + Math.sin(x * 0.012 - t * 0.13) * amp * 1.4;
    const len = Math.max(4, 11 + 6 * Math.sin(x * 0.07 + t * 0.5) + 4 * Math.sin(x * 0.19 - t * 0.8)), br = 0.5 + 0.5 * Math.sin(x * 0.045 + t * 0.7);
    for (let j = 0; j < len; j++) {
      if (j > len * 0.45 && ((x + j) & 1)) continue; const k = j / len, a = (1 - k) * 0.4 * br; if (a < 0.02) continue;
      c.fillStyle = 'rgba(' + (j < 2 ? '170,255,210' : k < 0.55 ? '80,220,150' : '150,110,235') + ',' + a.toFixed(2) + ')'; c.fillRect(x, Math.round(y0 - j), 1, 1);
    }
  }
}
function cloud(c: C, x: number, y: number, s: number) {
  P(c, x, y, 18 * s, 4 * s, '#FFFFFF'); P(c, x + 3 * s, y - 3 * s, 9 * s, 3 * s, '#FFFFFF'); P(c, x + 9 * s, y - 5 * s, 6 * s, 3 * s, '#FFFFFF'); P(c, x + 13 * s, y - 2 * s, 4 * s, 2 * s, '#FFFFFF'); P(c, x + 1, y + 4 * s - 1, 18 * s - 2, 1, '#DCEAF7');
}

// One frame. warmth 0..1: how much of today's plan is done.
export function drawHome(c: C, K: HomeCache, t: number, warmth: number) {
  const { L } = K, { W, H } = L, f = Math.floor(t * 10), r = rng(f * 13 + 7), day = K.day;
  c.copyFrom(K.back);
  if (!day) {
    K.tw.forEach(([x, y, o]) => { const b = Math.sin(t * 1.6 + o); if (b > 0.3) P(c, x, y, 1, 1, b > 0.8 ? '#ffffff' : '#fff4d6'); if (b > 0.85) { P(c, x - 1, y, 1, 1, 'rgba(255,244,214,.5)'); P(c, x + 1, y, 1, 1, 'rgba(255,244,214,.5)'); } });
    aurora(c, L, t);
    const ph = (t % 9) / 0.9; // a shooting star every 9 seconds
    if (ph < 1) { const sx = W * 0.15 + ph * W * 0.3, sy = H * 0.08 + ph * H * 0.14; for (let k = 0; k < 10; k++) P(c, sx - k * 2, sy - k * 0.9, 1, 1, 'rgba(255,255,255,' + (1 - k / 10).toFixed(2) + ')'); }
  } else {
    [[0.05, 0.14, 2, 1.2], [0.45, 0.07, 1.6, 0.9], [0.7, 0.32, 1.3, 1.5], [0.25, 0.4, 1.1, 1.1]].forEach(([bx, by, s, sp]) => { const span = W + 50, x = ((bx * span + t * sp) % span) - 40; cloud(c, x, Math.round(H * by) + 6, s); });
    for (let i = 0; i < 3; i++) { const x = ((t * (8 + i * 2) + i * 60) % (W + 30)) - 15, y = Math.round(H * 0.3 + i * 6 + Math.sin(t * 1.5 + i) * 2), up = ((f + i * 2) % 6) < 3; P(c, x - 2, y - (up ? 1 : 0), 2, 1, '#3E4A6A'); P(c, x, y, 1, 1, '#3E4A6A'); P(c, x + 1, y - (up ? 1 : 0), 2, 1, '#3E4A6A'); }
  }
  c.drawImage(K.front, 0, 0);
  // the cabin: a flickering window at night, smoke from the chimney
  const [cx, cb] = K.cabin;
  if (!day && Math.sin(t * 5) > -0.6) P(c, cx - 6, cb - 6, 2, 1, '#fff2c0');
  for (let k = 0; k < 5; k++) { const ph = (t * 0.15 + k / 5) % 1, a = (1 - ph) * 0.35; P(c, cx + 6 + Math.sin(ph * 6 + k) * 3 + ph * 8, cb - 22 - ph * 22, 2 + ph * 3, 2 + ph * 2, 'rgba(' + (day ? PAL.day.smoke : PAL.night.smoke) + ',' + a.toFixed(2) + ')'); }
  // the fire's light, brighter as the fire grows
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = (0.3 + 0.7 * warmth) * (0.88 + 0.1 * Math.sin(t * 7)); c.drawImage(K.glow[f & 1], 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // your fire
  const [fx, fy] = L.fire, s = 0.45 + 0.55 * warmth;
  for (let i = -6; i <= 6; i++) if (r() > 0.35) P(c, fx + i, fy - 1, 1, 1, r() > 0.5 ? '#ff7a3a' : '#c23a22');
  const cols = ['#a82e22', '#e0552a', '#f7952f', '#ffcf5c', '#fff2b8'];
  for (let k = 0; k < 5; k++) { const hw = (9 - k * 1.6) * (0.7 + 0.3 * s), hh = (30 - k * 5.2) * s; for (let i = -Math.floor(hw); i <= Math.floor(hw); i++) { const fall = 1 - Math.pow(Math.abs(i) / (hw + 1), 1.25), h = Math.floor(hh * fall * (0.68 + r() * 0.44)); if (h > 0) P(c, fx + i, fy - 2 - h, 1, h, cols[k]); } }
  for (let k = 0; k < 7; k++) { const ph = (t * 0.45 + k / 7) % 1; P(c, fx + Math.sin(k * 2.3 + t * 1.7) * (2 + ph * 10), fy - 24 * s - ph * 40 * s, 1, 1, ph < 0.4 ? '#ffe08a' : ph < 0.75 ? '#e88a4a' : '#7a3a2a'); }
  // fireflies at night, butterflies by day
  if (!day) {
    for (let i = 0; i < 10; i++) { const x = (i + 0.5) / 10 * W + Math.sin(t * 0.5 + i * 1.7) * 10, y = L.ground - 18 + Math.sin(t * 0.8 + i * 2.1) * 10 + (i % 3) * 6; if (Math.abs(x - fx) < 20) continue; if (Math.sin(t * 2.2 + i * 1.3) > -0.1) { P(c, x, y, 1, 1, '#e8f7a0'); P(c, x - 1, y, 1, 1, 'rgba(232,247,160,.3)'); } }
  } else {
    const BF = ['#FFFFFF', '#FFD36B', '#F6A6C1', '#B9A6F0'];
    for (let i = 0; i < 4; i++) { const x = W * (0.15 + 0.22 * i) + Math.sin(t * 0.7 + i * 2) * 12, y = L.ground - 4 + (i % 2) * 8 + Math.sin(t * 1.1 + i) * 6; if (Math.abs(x - fx) < 16) continue; const col = BF[i % 4], open = Math.sin(t * 12 + i * 1.3) > 0; if (open) { P(c, x - 1, y - 1, 1, 2, col); P(c, x + 1, y - 1, 1, 2, col); } else P(c, x, y - 2, 1, 2, col); P(c, x, y, 1, 1, '#3a2a2a'); }
  }
}
