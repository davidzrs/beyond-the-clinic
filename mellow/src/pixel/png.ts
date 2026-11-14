// Tiny PNG encoder (uncompressed deflate) so pixel art can be shown with a plain <Image> on Android/iOS.
// Each art pixel is scaled up by an integer factor first, so the image stays crisp.
import { PixelCtx } from './raster';

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b: Uint8Array, s: number, e: number) { let c = 0xffffffff; for (let i = s; i < e; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64(b: Uint8Array) {
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] || 0) << 8) | (b[i + 2] || 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return s;
}

const cache = new Map<string, string>();
export function pngUri(ctx: PixelCtx, scale: number, key?: string) {
  const ck = key ? key + '@' + scale : '';
  if (ck && cache.has(ck)) return cache.get(ck)!;
  const w = ctx.width * scale, h = ctx.height * scale, row = w * 4 + 1;
  const raw = new Uint8Array(row * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / scale); raw[y * row] = 0;
    for (let x = 0; x < w; x++) { const si = (sy * ctx.width + Math.floor(x / scale)) * 4, di = y * row + 1 + x * 4; raw[di] = ctx.data[si]; raw[di + 1] = ctx.data[si + 1]; raw[di + 2] = ctx.data[si + 2]; raw[di + 3] = ctx.data[si + 3]; }
  }
  // zlib stream with stored (uncompressed) blocks
  const blocks = Math.ceil(raw.length / 65535) || 1;
  const z = new Uint8Array(2 + raw.length + blocks * 5 + 4); let p = 0;
  z[p++] = 0x78; z[p++] = 0x01;
  for (let i = 0; i < blocks; i++) {
    const s = i * 65535, len = Math.min(65535, raw.length - s);
    z[p++] = i === blocks - 1 ? 1 : 0; z[p++] = len & 255; z[p++] = len >> 8; z[p++] = ~len & 255; z[p++] = (~len >> 8) & 255;
    z.set(raw.subarray(s, s + len), p); p += len;
  }
  let a = 1, b2 = 0; for (let i = 0; i < raw.length; i++) { a = (a + raw[i]) % 65521; b2 = (b2 + a) % 65521; }
  const ad = ((b2 << 16) | a) >>> 0; z[p++] = ad >>> 24; z[p++] = (ad >> 16) & 255; z[p++] = (ad >> 8) & 255; z[p++] = ad & 255;
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length); const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8); dv.setUint32(8 + data.length, crc32(out, 4, 8 + data.length)); return out;
  };
  const ihdr = new Uint8Array(13); const dv = new DataView(ihdr.buffer); dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', z.subarray(0, p)), chunk('IEND', new Uint8Array(0))];
  const all = new Uint8Array(parts.reduce((n, x) => n + x.length, 0)); let o = 0; parts.forEach((x) => { all.set(x, o); o += x.length; });
  const uri = 'data:image/png;base64,' + base64(all);
  if (ck) cache.set(ck, uri);
  return uri;
}
