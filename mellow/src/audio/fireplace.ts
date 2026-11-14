// The fireplace recording for "Breathe with the fire" (assets/sounds/fireplace.mp3), looped.
// expo-audio plays it the same way on phones and on the web.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { Scape } from './soundscape';

const SOURCE = require('../../assets/sounds/fireplace.mp3');

export async function startFireplace(volume: number): Promise<Scape> {
  try { await setAudioModeAsync({ playsInSilentMode: true }); } catch {}
  const player = createAudioPlayer(SOURCE);
  player.loop = true;
  player.volume = 0;
  player.play();
  // Fade in over about 2.5 s, then follow whatever volume we're asked for, smoothly.
  let target = volume, current = 0, stopped = false;
  const id = setInterval(() => {
    if (stopped) return;
    current += (target - current) * 0.12;
    try { player.volume = Math.max(0, Math.min(1, current)); } catch {}
  }, 60);
  return {
    setVolume(v) { target = v; },
    stop() {
      target = 0;
      setTimeout(() => { stopped = true; clearInterval(id); try { player.pause(); player.remove(); } catch {} }, 700);
    },
  };
}
