// Native soundscapes: synthesise a loopable WAV in JS, save it to the cache and play it
// with expo-audio. No audio files are bundled.
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

function makeWav(kind: 'forest' | 'sea'): Uint8Array {
  const sr = 22050, secs = 12, n = sr * secs;
  const pcm = new Float32Array(n);
  let last = 0, lp = 0;
  const k = kind === 'sea' ? 0.18 : 0.26;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    lp += (last * 3.5 - lp) * k;
    const t = i / sr;
    const amp = kind === 'sea' ? 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 6 - Math.PI / 2), 1.6) : 0.75 + 0.25 * Math.sin((2 * Math.PI * t) / 4);
    pcm[i] = lp * amp;
  }
  if (kind === 'forest') {
    [1.3, 4.1, 7.6, 10.2].forEach((start, ci) => {
      for (let c = 0; c < 2 + (ci % 2); c++) {
        const s0 = Math.floor((start + c * 0.16) * sr), len = Math.floor(0.13 * sr), f0 = 2300 + ci * 300;
        let ph = 0;
        for (let j = 0; j < len && s0 + j < n; j++) {
          const p = j / len, f = f0 * (1 + 0.35 * p);
          ph += (2 * Math.PI * f) / sr;
          pcm[s0 + j] += Math.sin(ph) * 0.06 * Math.min(1, p * 8) * (1 - p);
        }
      }
    });
  }
  const fade = Math.floor(0.05 * sr);
  for (let i = 0; i < fade; i++) { const g = i / fade; pcm[i] *= g; pcm[n - 1 - i] *= g; }
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(pcm[i]));
  const norm = peak > 0 ? 0.7 / peak : 1;
  const buf = new Uint8Array(44 + n * 2);
  const dv = new DataView(buf.buffer);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  str(36, 'data'); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i] * norm)) * 32767, true);
  return buf;
}

export type Scape = { setVolume(v: number): void; stop(): void };

export async function startSoundscape(kind: 'forest' | 'sea', volume: number): Promise<Scape> {
  try { await setAudioModeAsync({ playsInSilentMode: true }); } catch {}
  const file = new File(Paths.cache, 'mellow-' + kind + '.wav');
  if (!file.exists) { file.create(); file.write(makeWav(kind)); }
  const player: AudioPlayer = createAudioPlayer(file.uri);
  player.loop = true;
  player.volume = volume;
  player.play();
  return {
    setVolume(v) { player.volume = v; },
    stop() { try { player.pause(); player.remove(); } catch {} },
  };
}
