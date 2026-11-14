// Breathe with the fire: a full-screen night campfire that hides the rest of the app.
// The flames rise as you breathe in, hold, and settle as you breathe out, with a fireplace
// crackling softly. Nothing else on screen: the words, a quiet count, and a close button.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PixelCtx } from '../pixel/raster';
import { buildScene, drawFrame, LAYOUTS } from '../pixel/scene';
import { PixelImage } from '../pixel/PixelImage';
import { F } from '../theme';
import { startFireplace, type Scape } from '../audio/fireplace';

const ND = Platform.OS !== 'web';
const INTRO = 4; // seconds of "get comfortable" before the first breath
// One breath: in 4 s, hold 2 s, out 6 s, a short rest. A slow, calming rhythm.
const PHASES: [string, number][] = [['Breathe in', 4], ['Hold', 2], ['Breathe out', 6], ['', 1]];
const CYCLE = PHASES.reduce((s, p) => s + p[1], 0);
const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));

/** Where we are in the breath: phase index, fullness of the breath 0..1, completed breaths. */
function breathAt(t: number) {
  if (t < INTRO) return { phase: -1, full: 0, done: 0 };
  const x = t - INTRO, done = Math.floor(x / CYCLE);
  let r = x % CYCLE;
  for (let i = 0; i < PHASES.length; i++) {
    const d = PHASES[i][1];
    if (r < d) {
      const p = r / d;
      const full = i === 0 ? ease(p) : i === 1 ? 1 : i === 2 ? 1 - ease(p) : 0;
      return { phase: i, full, done };
    }
    r -= d;
  }
  return { phase: 3, full: 0, done };
}

export function BreatheScreen({ onClose }: { onClose: (breaths: number) => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const L = width > height * 0.85 ? LAYOUTS.wide : LAYOUTS.full;
  const K = useMemo(() => buildScene(L, false), [L.key]); // always night: dark, quiet, warm
  const ctx = useMemo(() => new PixelCtx(L.W, L.H), [L.key]);
  const [tick, setTick] = useState(0);
  const [b, setB] = useState({ phase: -1, full: 0, done: 0 });
  const [soundOn, setSoundOn] = useState(true);
  const scape = useRef<Scape | null>(null);
  const start = useRef(Date.now());
  const fade = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;

  // Scene placement: zoomed in on the fire, which sits a little below the middle.
  // (On wide screens the scene is already big, so no extra zoom, and the fire sits lower to leave room for the words.)
  const wideScreen = width > height;
  const k = Math.max(width / L.W, height / L.H) * (wideScreen ? 1.05 : 1.35);
  const sw = L.W * k, sh = L.H * k;
  const [fx, fy] = L.fire!;
  const fireY = height * (wideScreen ? 0.68 : 0.6);
  const ox = width / 2 - fx * k, oy = fireY - fy * k;

  // Draw loop: the fire's size follows the breath.
  useEffect(() => {
    const draw = () => {
      const t = (Date.now() - start.current) / 1000;
      const now = breathAt(t);
      const size = (L.fs || 1) * (0.7 + 1.15 * now.full);
      drawFrame(ctx, { ...L, fs: size }, K, 1.3 + t);
      setTick((n) => n + 1);
      setB((prev) => (prev.phase !== now.phase || prev.done !== now.done || Math.abs(prev.full - now.full) > 0.01 ? now : prev));
      scape.current?.setVolume(0.45 + 0.25 * now.full);
    };
    draw();
    const id = setInterval(draw, 60);
    return () => clearInterval(id);
  }, [ctx, K]);

  // Fade in, start the fireplace sound.
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
    let alive = true;
    startFireplace(0.5).then((s) => { if (alive) scape.current = s; else s.stop(); }).catch(() => setSoundOn(false));
    const esc = (e: any) => { if (e.key === 'Escape') close(); };
    if (Platform.OS === 'web') window.addEventListener('keydown', esc);
    return () => { alive = false; scape.current?.stop(); scape.current = null; if (Platform.OS === 'web') window.removeEventListener('keydown', esc); };
  }, []);

  // The words fade in at each new phase.
  useEffect(() => {
    words.setValue(0);
    Animated.timing(words, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
  }, [b.phase]);

  const toggleSound = async () => {
    if (soundOn) { scape.current?.stop(); scape.current = null; setSoundOn(false); return; }
    try { scape.current = await startFireplace(0.5); setSoundOn(true); } catch {}
  };
  const close = () => Animated.timing(fade, { toValue: 0, duration: 500, useNativeDriver: ND }).start(() => onClose(b.done));

  const label = b.phase < 0 ? 'Get comfortable' : PHASES[b.phase][0] || ' ';
  const sub = b.phase < 0 ? 'Follow the fire. It rises as you breathe in, and settles as you breathe out.' : b.done > 0 ? b.done + (b.done === 1 ? ' breath' : ' breaths') : ' ';
  // Web blurs the glow into soft light; phones can't blur a view, so it stays much fainter there.
  const glow = (0.06 + 0.16 * b.full) * (Platform.OS === 'web' ? 1 : 0.6);
  const halo = Math.min(width, height) * (0.45 + 0.25 * b.full);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#05070F', opacity: fade }]}>
        <View pointerEvents="none" style={{ position: 'absolute', left: ox, top: oy, width: sw, height: sh }}>
          <PixelImage ctx={ctx} tick={tick} width={sw} height={sh} style={StyleSheet.absoluteFill} />
        </View>
        {/* warm light that breathes with the fire, and a dark vignette so only the fire matters */}
        <View pointerEvents="none" style={[st.glow, { left: width / 2 - halo / 2, top: fireY - halo * 0.62, width: halo, height: halo, borderRadius: halo, opacity: glow }]} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, st.vignette]} />

        <View pointerEvents="box-none" style={[st.top, { paddingTop: insets.top + 14 }]}>
          <Pressable onPress={toggleSound} accessibilityRole="button" accessibilityLabel={soundOn ? 'Mute the fire' : 'Play the fire sound'} style={(p: any) => [st.btn, (p.hovered || p.pressed) && st.btnOn]}>
            <Ionicons name={soundOn ? 'volume-medium-outline' : 'volume-mute-outline'} size={22} color="rgba(255,240,220,0.85)" />
          </Pressable>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" style={(p: any) => [st.btn, (p.hovered || p.pressed) && st.btnOn]}>
            <Ionicons name="close" size={26} color="rgba(255,240,220,0.9)" />
          </Pressable>
        </View>

        <View pointerEvents="none" style={[st.words, { top: insets.top + height * (width > height ? 0.07 : 0.12) }]}>
          <Animated.Text style={[st.big, { opacity: words, transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{label}</Animated.Text>
          <Text style={st.small}>{sub}</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  glow: { position: 'absolute', backgroundColor: '#FF8A3D', ...(Platform.OS === 'web' ? ({ filter: 'blur(60px)' } as any) : null) },
  // Only the far edges darken: the fire and the sky above it stay clear.
  vignette: Platform.OS === 'web' ? ({ backgroundImage: 'radial-gradient(ellipse 75% 85% at 50% 55%, rgba(0,0,0,0) 55%, rgba(3,4,10,0.35) 85%, rgba(3,4,10,0.6) 100%)' } as any) : { backgroundColor: 'rgba(3,4,10,0.12)' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 16 },
  btn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  btnOn: { backgroundColor: 'rgba(255,255,255,0.14)' },
  words: { position: 'absolute', left: 24, right: 24, alignItems: 'center', gap: 10 },
  big: { fontFamily: F.display, fontSize: 34, color: '#FFF1DE', textAlign: 'center', letterSpacing: 0.5, textShadowColor: 'rgba(255,140,60,0.35)', textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  small: { fontFamily: F.body, fontSize: 15, color: 'rgba(255,240,220,0.6)', textAlign: 'center', maxWidth: 340 },
});
