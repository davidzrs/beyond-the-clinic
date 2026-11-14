import { PixelCtx } from './raster';

export const OL = '#2a2038';
const W = '#ffffff';

type Pix = Map<string, string>;
type Draw = {
  m: Pix;
  set(x: number, y: number, c: string): void;
  rect(x: number, y: number, w: number, h: number, c: string): void;
  pts(a: number[][], c: string): void;
};

function Cv(): Draw {
  const m: Pix = new Map();
  return {
    m,
    set(x, y, c) { m.set(x + ',' + y, c); },
    rect(x, y, w, h, c) { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) m.set((x + i) + ',' + (y + j), c); },
    pts(a, c) { a.forEach(([x, y]) => m.set(x + ',' + y, c)); },
  };
}

function outlined(v: Draw, col = OL): Pix {
  const o: Pix = new Map();
  for (const k of v.m.keys()) {
    const i = k.indexOf(',');
    const x = +k.slice(0, i), y = +k.slice(i + 1);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const kk = (x + dx) + ',' + (y + dy);
      if (!v.m.has(kk)) o.set(kk, col);
    }
  }
  for (const [k, c] of v.m) o.set(k, c);
  return o;
}

function paint(ctx: PixelCtx, m: Pix, ox = 0, oy = 0) {
  for (const [k, c] of m) {
    const i = k.indexOf(',');
    ctx.fillStyle = c;
    ctx.fillRect(+k.slice(0, i) + ox, +k.slice(i + 1) + oy, 1, 1);
  }
}

export type Avatar = { name: string; color: string; face: string; hat: string; glasses: string; acc: string; item: string };
type Part = { label: string; d?: (v: Draw) => void; flat?: boolean };

export const COLORS: Record<string, { label: string; base: string; light: string; shade: string }> = {
  vanilla: { label: 'Vanilla', base: '#f4ead8', light: '#fffaf0', shade: '#d6c6ae' },
  strawberry: { label: 'Strawberry', base: '#f3c5cf', light: '#fde3e8', shade: '#d79aaa' },
  mint: { label: 'Mint', base: '#cbe6cf', light: '#e8f6ea', shade: '#9fc6a8' },
  lavender: { label: 'Lavender', base: '#d8cdef', light: '#efe9fb', shade: '#ad9fd2' },
  toasted: { label: 'Toasted', base: '#ebc28e', light: '#f7dcb2', shade: '#c4935c' },
  blueberry: { label: 'Blueberry', base: '#bfd3ef', light: '#e0ebfa', shade: '#8faad3' },
};

export const FACES: Record<string, Part> = {
  content: { label: 'Content', d: (v) => { v.rect(12, 17, 2, 2, OL); v.rect(18, 17, 2, 2, OL); v.set(12, 17, W); v.set(18, 17, W); v.pts([[14, 20], [17, 20], [15, 21], [16, 21]], OL); } },
  happy: { label: 'Happy', d: (v) => { v.pts([[11, 18], [12, 17], [13, 17], [14, 18], [17, 18], [18, 17], [19, 17], [20, 18]], OL); v.pts([[14, 20], [17, 20], [15, 21], [16, 21]], OL); } },
  excited: { label: 'Excited', d: (v) => { v.rect(12, 16, 2, 3, OL); v.rect(18, 16, 2, 3, OL); v.set(12, 16, W); v.set(18, 16, W); v.rect(14, 20, 4, 1, OL); v.pts([[14, 21], [17, 21]], OL); v.rect(15, 21, 2, 1, '#e86a7a'); v.rect(15, 22, 2, 1, OL); } },
  calm: { label: 'Calm', d: (v) => { v.pts([[11, 17], [12, 18], [13, 18], [14, 17], [17, 17], [18, 18], [19, 18], [20, 17]], OL); v.pts([[15, 21], [16, 21]], OL); } },
  wink: { label: 'Wink', d: (v) => { v.rect(12, 17, 2, 2, OL); v.set(12, 17, W); v.pts([[17, 18], [18, 18], [19, 18], [20, 17]], OL); v.pts([[14, 20], [17, 20], [15, 21], [16, 21]], OL); } },
  sleepy: { label: 'Sleepy', d: (v) => { v.pts([[12, 18], [13, 18], [18, 18], [19, 18]], OL); v.set(15, 21, OL); v.set(16, 21, OL); v.pts([[24, 6], [25, 6], [26, 6], [25, 7], [24, 8], [25, 8], [26, 8]], '#c9d2ff'); } },
  okay: { label: 'Okay', d: (v) => { v.rect(12, 17, 2, 2, OL); v.rect(18, 17, 2, 2, OL); v.set(12, 17, W); v.set(18, 17, W); v.pts([[15, 21], [16, 21]], OL); } },
  tired: { label: 'Tired', d: (v) => { v.pts([[12, 18], [13, 18], [18, 18], [19, 18]], OL); v.pts([[12, 17], [13, 17], [18, 17], [19, 17]], 'rgba(42,32,56,.35)'); v.pts([[15, 21], [16, 21]], OL); } },
  heavy: { label: 'Heavy', d: (v) => { v.pts([[12, 18], [13, 18], [18, 18], [19, 18]], OL); v.pts([[11, 16], [12, 16], [19, 16], [20, 16]], 'rgba(42,32,56,.45)'); v.pts([[14, 21], [15, 20], [16, 20], [17, 21]], OL); } },
};
export const WARDROBE_FACES = ['content', 'happy', 'excited', 'calm', 'wink', 'sleepy'];

export const HATS: Record<string, Part> = {
  none: { label: 'None' },
  beanie: { label: 'Beanie', d: (v) => { const R = '#c8564a', S = '#a24238', Wc = '#efe3cf'; [[6, 12, 19], [7, 10, 21], [8, 9, 22], [9, 8, 23], [10, 8, 23]].forEach(([y, a, b]) => { for (let x = a; x <= b; x++) v.set(x, y, x >= b - 1 ? S : R); }); for (let x = 10; x <= 21; x += 3) v.set(x, 8, S); v.rect(7, 11, 18, 2, Wc); for (let x = 8; x <= 23; x += 2) v.set(x, 12, '#d8ccb4'); v.rect(14, 4, 4, 2, Wc); v.rect(15, 3, 2, 1, Wc); } },
  cap: { label: 'Cap', d: (v) => { const B = '#4f74b8', S = '#3c5a94', D = '#2f477a'; v.rect(11, 7, 10, 1, B); v.rect(10, 8, 12, 1, B); v.rect(9, 9, 14, 3, B); for (let y = 8; y <= 11; y++) { v.set(21, y, S); v.set(22, y, S); } v.rect(20, 11, 8, 2, D); v.rect(15, 6, 2, 1, S); v.rect(12, 9, 3, 2, '#f4ead5'); } },
  sprout: { label: 'Sprout', d: (v) => { const L = '#8cc47a', D = '#5a9a5a'; v.rect(16, 7, 1, 4, D); v.pts([[12, 5], [13, 5], [13, 6], [14, 6], [14, 7], [15, 7]], L); v.pts([[17, 5], [18, 4], [19, 4], [20, 4], [18, 5], [19, 5], [17, 6]], L); v.set(13, 6, D); v.set(19, 5, D); } },
  bucket: { label: 'Bucket', d: (v) => { const G = '#8aa66e', D = '#5f7a4c', L = '#a9c28c'; v.rect(11, 6, 10, 1, G); v.rect(10, 7, 12, 3, G); v.rect(10, 9, 12, 1, D); v.rect(7, 10, 18, 2, G); v.rect(7, 11, 18, 1, D); v.rect(11, 7, 3, 1, L); } },
  crown: { label: 'Crown', d: (v) => { const Y = '#f2c14e', S = '#c9962e'; v.rect(10, 9, 12, 3, Y); v.rect(10, 11, 12, 1, S); v.pts([[10, 7], [10, 8], [11, 8], [15, 6], [16, 6], [15, 7], [16, 7], [15, 8], [16, 8], [21, 7], [21, 8], [20, 8]], Y); v.rect(15, 9, 2, 2, '#e2566a'); v.set(12, 10, '#7fd0e8'); v.set(19, 10, '#7fd0e8'); } },
};

export const GLASSES: Record<string, Part> = {
  none: { label: 'None' },
  round: { label: 'Round', flat: true, d: (v) => { [11, 17].forEach((ox) => { v.pts([[ox + 1, 16], [ox + 2, 16], [ox + 1, 19], [ox + 2, 19], [ox, 17], [ox, 18], [ox + 3, 17], [ox + 3, 18]], OL); v.set(ox + 2, 17, 'rgba(255,255,255,.55)'); }); v.pts([[15, 17], [16, 17], [10, 17], [21, 17]], OL); } },
  sunnies: { label: 'Shades', flat: true, d: (v) => { v.rect(11, 16, 4, 3, '#1d1830'); v.rect(17, 16, 4, 3, '#1d1830'); v.set(12, 16, '#6a6296'); v.set(18, 16, '#6a6296'); v.set(11, 18, OL); v.set(20, 18, OL); v.pts([[15, 16], [16, 16], [10, 16], [21, 16]], OL); } },
  hearts: { label: 'Hearts', d: (v) => { const P = '#f07a9a'; [10, 17].forEach((ox) => { v.pts([[ox, 16], [ox + 1, 16], [ox + 3, 16], [ox + 4, 16]], P); v.rect(ox, 17, 5, 1, P); v.rect(ox + 1, 18, 3, 1, P); v.set(ox + 2, 19, P); v.set(ox + 1, 16, '#ffc4d4'); }); v.pts([[15, 17], [16, 17]], '#c05074'); } },
};

export const ACCS: Record<string, Part> = {
  none: { label: 'None' },
  scarf: { label: 'Scarf', d: (v) => { const R = '#d9604f', D = '#a8463a', L = '#f08a6a'; v.rect(7, 22, 18, 2, R); for (let x = 8; x <= 24; x += 3) v.set(x, 22, L); v.rect(18, 24, 3, 3, R); v.pts([[20, 24], [20, 25]], D); v.pts([[18, 27], [20, 27]], D); } },
  bow: { label: 'Bow', d: (v) => { const P = '#e86f8e', D = '#b8506c'; v.pts([[5, 9], [6, 9], [5, 10], [6, 10], [7, 10], [5, 11], [6, 11]], P); v.pts([[10, 9], [11, 9], [9, 10], [10, 10], [11, 10], [10, 11], [11, 11]], P); v.set(8, 10, D); v.pts([[5, 11], [11, 11]], D); } },
  bowtie: { label: 'Bowtie', d: (v) => { const P = '#7a63b8', D = '#4f3f86'; v.pts([[12, 22], [13, 22], [12, 23], [13, 23], [14, 23], [12, 24], [13, 24]], P); v.pts([[18, 22], [19, 22], [17, 23], [18, 23], [19, 23], [18, 24], [19, 24]], P); v.pts([[15, 23], [16, 23]], D); } },
  flower: { label: 'Flower', d: (v) => { v.set(22, 11, '#ffd36b'); v.pts([[21, 11], [23, 11], [22, 10], [22, 12]], '#f29cb5'); v.pts([[21, 10], [23, 12]], '#f6b7c9'); v.set(20, 12, '#6fa86a'); } },
};

export const ITEMS: Record<string, Part> = {
  none: { label: 'None' },
  mug: { label: 'Mug', d: (v) => { v.rect(22, 21, 4, 5, '#ece4d3'); v.rect(22, 21, 4, 1, '#7a4a30'); v.pts([[26, 22], [27, 22], [27, 23], [27, 24], [26, 24]], '#ece4d3'); v.set(23, 23, '#e86f8e'); v.rect(22, 25, 4, 1, '#cfc4ae'); } },
  lantern: { label: 'Lantern', d: (v) => { v.rect(24, 16, 2, 1, '#5a4a3a'); v.rect(23, 17, 4, 1, '#5a4a3a'); v.rect(23, 18, 4, 4, '#ffc66b'); v.set(24, 19, '#fff2c0'); v.rect(23, 22, 4, 1, '#5a4a3a'); } },
  book: { label: 'Book', d: (v) => { v.rect(21, 21, 5, 5, '#4f74b8'); v.rect(21, 21, 1, 5, '#30487a'); v.rect(23, 22, 2, 1, '#f4ead5'); v.rect(22, 25, 4, 1, '#e8e0cc'); } },
  plant: { label: 'Plant', d: (v) => { v.rect(22, 23, 4, 3, '#c0704a'); v.rect(22, 23, 4, 1, '#a85c3a'); v.pts([[23, 21], [24, 20], [24, 21], [24, 22], [25, 21], [25, 20], [22, 20]], '#6fa86a'); v.set(24, 20, '#8cc47a'); } },
};

const layerCache = new Map<string, Pix>();
function layer(kind: string, key: string): Pix {
  const ck = kind + ':' + key;
  const hit = layerCache.get(ck);
  if (hit) return hit;
  let m: Pix = new Map();
  if (kind === 'shadow') {
    const v = Cv(); v.rect(9, 29, 14, 1, 'rgba(0,0,0,.28)'); v.rect(11, 30, 10, 1, 'rgba(0,0,0,.18)'); m = v.m;
  } else if (kind === 'body') {
    const c = COLORS[key] || COLORS.vanilla; const v = Cv();
    for (let x = 8; x <= 23; x++) for (let y = 11; y <= 28; y++) {
      const dx = Math.min(x - 8, 23 - x), dy = Math.min(y - 11, 28 - y);
      if (dx + dy < 2) continue;
      let k = c.base;
      if (y <= 12) k = c.light; else if (y === 13) k = c.shade; else if (x >= 22 || y >= 27) k = c.shade; else if (x === 9 && y <= 23) k = c.light;
      v.set(x, y, k);
    }
    v.set(10, 15, c.light); v.set(10, 16, c.light); m = outlined(v);
  } else if (kind === 'cheeks') {
    const v = Cv(); v.pts([[10, 20], [11, 20], [20, 20], [21, 20]], '#f2939b'); m = v.m;
  } else {
    const src = ({ face: FACES, hat: HATS, glasses: GLASSES, acc: ACCS, item: ITEMS } as Record<string, Record<string, Part>>)[kind];
    const def = src && src[key];
    if (def && def.d) { const v = Cv(); def.d(v); m = kind === 'face' || def.flat ? v.m : outlined(v); }
  }
  layerCache.set(ck, m);
  return m;
}

const mallowCache = new Map<string, PixelCtx>();
export function mallowRaster(a: Avatar, face?: string | null): PixelCtx {
  const f = face || a.face;
  const key = [a.color, f, a.glasses, a.hat, a.acc, a.item].join('|');
  const hit = mallowCache.get(key);
  if (hit) return hit;
  const ctx = new PixelCtx(32, 32);
  const L: [string, string][] = [['shadow', 's'], ['body', a.color], ['cheeks', 'c'], ['face', f], ['glasses', a.glasses], ['hat', a.hat], ['acc', a.acc], ['item', a.item]];
  L.forEach(([k, v]) => paint(ctx, layer(k, v)));
  mallowCache.set(key, ctx);
  return ctx;
}

const IP: Record<string, string> = { y: '#ffc66b', Y: '#f0913a', g: '#86c094', G: '#3f7a5a', c: '#f4ead5', d: '#b8b2cc', p: '#e88a96', b: '#8fb4e6', B: '#4f74b8', v: '#a595d4', V: '#6b5b9a', R: '#c8564a', k: '#6a6888', K: '#4a4866', w: '#ffffff', n: '#7a4e30' };
export const ICONS: Record<string, string[]> = {
  home: ['....RR....', '...RRRR...', '..RRRRRR..', '.RRRRRRRR.', 'RRRRRRRRRR', '.cccccccc.', '.ccnncyyc.', '.ccnncyyc.', '.ccnncccc.', '.cccccccc.'],
  flame: ['....Y.....', '...YY.....', '...YYY.Y..', '..YYyYYY..', '..YyyyYY..', '.YYyycyY..', '.YyyccyY..', '..YyyyY...', '.nnnnnnn..', '..n...n...'],
  play: ['..........', '.vvvvvvvv.', 'vvvvvvvvvv', 'vcvvvvvvyv', 'cccvvvvyvy', 'vcvvvvvvyv', 'vvvvvvvvvv', 'vvv....vvv', '.v......v.', '..........'],
  leaf: ['......gggg', '....gggggg', '...ggGgggg', '..ggGggggg', '..gGggggg.', '..Gggggg..', '.G.gggg...', 'G.........', '..........', '..........'],
  words: ['yyyy.gggg.', 'yyyy.gggg.', 'yyyy.gggg.', 'yyyy.gggg.', '..........', 'cccc.yyyy.', 'cccc.yyyy.', 'cccc.yyyy.', 'cccc.yyyy.', '..........'],
  sun: ['....y.....', '.y..y..y..', '..yyyyy...', '.yyYYYyy..', 'yyYYYYYyy.', '.yyYYYyy..', '..yyyyy...', '.y..y..y..', '....y.....', '..........'],
  rain: ['..........', '...kkkk...', '..kkkkkk..', '.kkkkkkkk.', 'kkkkkkkkkk', '.KKKKKKKK.', '..b..b..b.', '.b..b..b..', '..........', '..........'],
  cloud: ['..........', '...dddd...', '..dddddd..', '.dddddddd.', 'dddddddddd', '.kkkkkkkk.', '..........', '..........', '..........', '..........'],
  sky: ['......yy..', '.....yyyy.', '..ccc.yy..', '.ccccc....', 'ccccccc...', '.ccccccc..', '..........', 'bbbbbbbbbb', 'BBBBBBBBBB', '..........'],
  sync: ['.pp.pp....', 'pppppp....', 'ppppppvvvv', '.ppppvvvvv', '..ppvvvvvv', '...pvvvvvv', '....vvvvv.', '.....vvv..', '......v...', '..........'],
  chat: ['.cccccccc.', 'cccccccccc', 'ccVccVccVc', 'cccccccccc', '.cccccccc.', '..cc......', '.cc.......', '..........', '..........', '..........'],
  note: ['cccccccccc', 'cVcccccccV', 'ccVccccVcc', 'cccVccVccc', 'ccccVVcccc', 'cccccccccc', 'cccccccccc', '..........', '..........', '..........'],
  tree: ['....G.....', '...GgG....', '..GgggG...', '...GgG....', '..GgggG...', '.GgggggG..', 'GgggggggG.', '....n.....', '....n.....', '..........'],
  wave: ['..........', '..bb......', '.b..b..bb.', 'b....bb..b', '..........', '..BB......', '.B..B..BB.', 'B....BB..B', '..........', '..........'],
  moon: ['...yyy....', '..yy......', '.yy.......', '.yy.......', '.yy.......', '.yyy......', '..yyyy.yy.', '...yyyyy..', '..........', '..........'],
  music: ['....vvvvvv', '....v....v', '....v....v', '....v....v', '..vvv..vvv', '.vvvv.vvvv', '..vv...vv.', '..........', '..........', '..........'],
  star: ['....y.....', '....y.....', '...yyy....', 'yyyyYyyyy.', '...yyy....', '....y.....', '....y.....', '..........', '..........', '..........'],
  heart: ['.pp.pp....', 'pppppp....', 'pppppp....', '.pppp.....', '..pp......', '..........', '..........', '..........', '..........', '..........'],
  check: ['.........g', '........gg', '.......gg.', 'g.....gg..', 'gg...gg...', '.gg.gg....', '..ggg.....', '...g......', '..........', '..........'],
  clock: ['..cccc....', '.c....c...', 'c..V...c..', 'c..V...c..', 'c..VVV.c..', 'c......c..', '.c....c...', '..cccc....', '..........', '..........'],
  refresh: ['..cccc....', '.c....c.c.', 'c......cc.', 'c.....ccc.', 'c.........', 'c......c..', '.c....c...', '..cccc....', '..........', '..........'],
  info: ['..bbbb....', '.bbccbb...', 'bbbbbbbb..', 'bbbccbbb..', 'bbbccbbb..', 'bbbccbbb..', '.bbbbbb...', '..bbbb....', '..........', '..........'],
  people: ['.yy...pp..', 'yyyy.pppp.', 'yyyy.pppp.', '.yy...pp..', '..........', 'yyyy.pppp.', 'yyyy.pppp.', 'yyyy.pppp.', '..........', '..........'],
  ember: ['....Y.....', '...YyY....', '..YyyyY...', '..YyyyY...', '...YyY....', '....Y.....', '..........', '..........', '..........', '..........'],
  close: ['..........', '.cc....cc.', '..cc..cc..', '...cccc...', '....cc....', '...cccc...', '..cc..cc..', '.cc....cc.', '..........', '..........'],
};
const iconCache = new Map<string, PixelCtx>();
export function iconRaster(name: string): PixelCtx {
  const hit = iconCache.get(name);
  if (hit) return hit;
  const v = Cv();
  (ICONS[name] || []).forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch !== '.' && IP[ch]) v.set(x, y, IP[ch]); } });
  const ctx = new PixelCtx(12, 12);
  paint(ctx, outlined(v), 1, 1);
  iconCache.set(name, ctx);
  return ctx;
}
