// A tiny software canvas. It implements the subset of CanvasRenderingContext2D the
// pixel art uses (fillStyle, fillRect, globalAlpha, 'lighter', drawImage), so the
// exact same drawing code produces identical pixels on web and on Android.

type RGBA = [number, number, number, number];
const colorCache = new Map<string, RGBA>();

export function parseColor(s: string): RGBA {
  let c = colorCache.get(s);
  if (c) return c;
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    c = [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    ];
  } else {
    const m = s.match(/rgba?\(([^)]+)\)/);
    const p = m ? m[1].split(',').map((v) => parseFloat(v)) : [0, 0, 0, 1];
    c = [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
  }
  colorCache.set(s, c);
  return c;
}

export class PixelCtx {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  fillStyle = '#000000';
  globalAlpha = 1;
  globalCompositeOperation: 'source-over' | 'lighter' = 'source-over';
  imageSmoothingEnabled = false;

  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  clearRect() {
    this.data.fill(0);
  }

  copyFrom(src: PixelCtx) {
    this.data.set(src.data);
  }

  fillRect(x: number, y: number, w: number, h: number) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.width, Math.round(x) + Math.max(1, Math.round(w)));
    const y1 = Math.min(this.height, Math.round(y) + Math.max(1, Math.round(h)));
    if (x1 <= x0 || y1 <= y0) return;
    const [r, g, b, a0] = parseColor(this.fillStyle);
    const a = a0 * this.globalAlpha;
    if (a <= 0) return;
    const d = this.data;
    const W = this.width;
    const add = this.globalCompositeOperation === 'lighter';
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * W + x0) * 4;
      for (let xx = x0; xx < x1; xx++, i += 4) {
        if (add) {
          d[i] += r * a; d[i + 1] += g * a; d[i + 2] += b * a; d[i + 3] += a * 255;
        } else if (a >= 1) {
          d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
        } else {
          const da = d[i + 3] / 255;
          const oa = a + da * (1 - a);
          if (oa <= 0) continue;
          const k = da * (1 - a);
          d[i] = (r * a + d[i] * k) / oa;
          d[i + 1] = (g * a + d[i + 1] * k) / oa;
          d[i + 2] = (b * a + d[i + 2] * k) / oa;
          d[i + 3] = oa * 255;
        }
      }
    }
  }

  drawImage(src: PixelCtx, dx = 0, dy = 0) {
    const s = src.data;
    const d = this.data;
    const ga = this.globalAlpha;
    const add = this.globalCompositeOperation === 'lighter';
    const W = this.width;
    for (let y = 0; y < src.height; y++) {
      const ty = y + dy;
      if (ty < 0 || ty >= this.height) continue;
      for (let x = 0; x < src.width; x++) {
        const tx = x + dx;
        if (tx < 0 || tx >= W) continue;
        const si = (y * src.width + x) * 4;
        const sa = (s[si + 3] / 255) * ga;
        if (sa <= 0) continue;
        const i = (ty * W + tx) * 4;
        if (add) {
          d[i] += s[si] * sa; d[i + 1] += s[si + 1] * sa; d[i + 2] += s[si + 2] * sa; d[i + 3] += sa * 255;
        } else if (sa >= 1) {
          d[i] = s[si]; d[i + 1] = s[si + 1]; d[i + 2] = s[si + 2]; d[i + 3] = 255;
        } else {
          const da = d[i + 3] / 255;
          const oa = sa + da * (1 - sa);
          const k = da * (1 - sa);
          d[i] = (s[si] * sa + d[i] * k) / oa;
          d[i + 1] = (s[si + 1] * sa + d[i + 1] * k) / oa;
          d[i + 2] = (s[si + 2] * sa + d[i + 2] * k) / oa;
          d[i + 3] = oa * 255;
        }
      }
    }
  }
}
