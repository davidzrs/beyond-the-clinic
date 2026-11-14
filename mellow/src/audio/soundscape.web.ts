// Web soundscapes: generated live with the Web Audio API (same as the prototype).
export type Scape = { setVolume(v: number): void; stop(): void };

export async function startSoundscape(kind: 'forest' | 'sea', volume: number): Promise<Scape> {
  const A: AudioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
  const len = A.sampleRate * 4, buf = A.createBuffer(1, len, A.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  const src = A.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = A.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'sea' ? 650 : 900;
  const mod = A.createGain(); mod.gain.value = 0.6;
  const lfo = A.createOscillator(); lfo.frequency.value = kind === 'sea' ? 0.09 : 0.17;
  const lg = A.createGain(); lg.gain.value = kind === 'sea' ? 0.45 : 0.2; lfo.connect(lg); lg.connect(mod.gain);
  const master = A.createGain(); master.gain.value = volume;
  src.connect(lp); lp.connect(mod); mod.connect(master); master.connect(A.destination); src.start(); lfo.start();
  let timer: any = null;
  if (kind === 'forest') {
    timer = setInterval(() => {
      if (Math.random() < 0.5) return;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const t = A.currentTime + k * 0.16; const o = A.createOscillator(), g = A.createGain(); o.type = 'sine';
        const f = 2200 + Math.random() * 1400; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.1);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.15);
      }
    }, 2600);
  }
  return {
    setVolume(v) { master.gain.value = v; },
    stop() { clearInterval(timer); try { A.close(); } catch {} },
  };
}
