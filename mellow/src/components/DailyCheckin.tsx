import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state';
import { MOOD_KEYS, MOODS, MoodKey } from '../data';
import { F } from '../theme';
import { Icon, Mallow } from './Pixel';
import { addDays, ymd } from '../checkin';

// First thing you see each day: your streak, and one question. Answering it lights today's flame
// and adds a day to the streak.
// Night (19:00 to 6:00): a campfire under the stars. Day: a bright, graphic sunburst behind the flame,
// so the fire reads as a badge rather than a fire in a sunny field.
// Animated transforms and opacity only, so it runs the same in Expo Go, a native build and the web.

const ND = Platform.OS !== 'web';
const TAU = Math.PI * 2;

type Look = {
  day: boolean; bg: string[]; loc: number[]; ground: string[]; treesBack: string; treesFront: string;
  text: string; dim: string; hint: string; card: string; tile: string; line: string; pickBg: string;
  dotOff: string; numShadow: string; halo: number; goBg: string; goText: string;
};
const NIGHT: Look = {
  day: false, bg: ['#060920', '#10164A', '#2A2462', '#4A2E62'], loc: [0, 0.22, 0.38, 0.5], ground: ['#151A3F', '#0C1030'],
  treesBack: '#1B2150', treesFront: '#0E1232',
  text: '#FFF4E4', dim: '#B9BCDD', hint: '#FFC857', card: '#171C44', tile: '#222860', line: '#353C7A', pickBg: '#3A2E5E',
  dotOff: 'rgba(255,255,255,.28)', numShadow: 'rgba(255,138,61,0.75)', halo: 1, goBg: '#FF8A3D', goText: '#2A1406',
};
const DAY: Look = {
  day: true, bg: ['#F3FBE9', '#DDF1CB', '#C4E6AE', '#A9D893'], loc: [0, 0.35, 0.7, 1], ground: [], treesBack: '', treesFront: '',
  text: '#1D3A27', dim: '#3F5F49', hint: '#24683D', card: '#FFFFFF', tile: '#EEF7E6', line: '#D3E7C3', pickBg: '#FFF0DA',
  dotOff: 'rgba(29,58,39,.28)', numShadow: 'rgba(255,255,255,0.85)', halo: 0.6, goBg: '#F07A2E', goText: '#2A1406',
};
export function isDaytime(d = new Date()) { const h = d.getHours(); return h >= 6 && h < 19; }

// A little vibration on phones (nothing on the web).
const buzz = (kind: 'tap' | 'win') => {
  if (Platform.OS === 'web') return;
  (kind === 'tap' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)).catch(() => {});
};

// Streak tiers: the fire grows a name as the streak grows.
const TIERS: [number, string][] = [[30, 'Eternal flame'], [14, 'Beacon'], [7, 'Bonfire'], [3, 'Campfire'], [1, 'Kindling'], [0, 'Cold embers']];
const tierOf = (n: number) => TIERS.find(([min]) => n >= min)![1];

// What your marshmallow says, before and after you answer.
const WAITING = ['Keep me warm?', 'Fire’s getting low…', 'How are you, really?', 'Psst. One tap.'];
const SAYS: Record<string, string> = { heavy: 'I’m right here.', low: 'Let’s stay cozy.', okay: 'Okay is good!', good: 'Toasty!', bright: 'Woohoo!' };

const FLAME = [
  { w: 104, c: '#D9362B', o: 0.92, up: 0, dur: 820 },
  { w: 84, c: '#F2622C', o: 0.95, up: 6, dur: 700 },
  { w: 64, c: '#FF9A3A', o: 1, up: 12, dur: 610 },
  { w: 44, c: '#FFD15E', o: 1, up: 18, dur: 540 },
  { w: 24, c: '#FFF6D8', o: 1, up: 24, dur: 470 },
];
const STAGE = 220, BASE = 46;
// On the web, 'hidden' still lets focus scroll the overlay; 'clip' never scrolls.
const CLIP: any = Platform.OS === 'web' ? { overflow: 'clip' } : null;

function sample(n: number, f: (t: number) => number) {
  const inputRange: number[] = [], outputRange: number[] = [];
  for (let i = 0; i <= n; i++) { inputRange.push(i / n); outputRange.push(f(i / n)); }
  return { inputRange, outputRange };
}
const loop = (v: Animated.Value, dur: number, delay = 0, yoyo = true) => Animated.loop(Animated.sequence([
  Animated.delay(delay),
  Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
  ...(yoyo ? [Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: ND })] : [Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: ND })]),
]));

// A pine silhouette: three stacked triangles.
function Pine({ x, h, color }: { x: number; h: number; color: string }) {
  const w = h * 0.62;
  return (
    <View style={{ position: 'absolute', left: x - w / 2, bottom: 0, width: w, height: h, alignItems: 'center' }}>
      {[0, 1, 2].map((k) => {
        const tw = w * (0.55 + k * 0.22), th = h * 0.42;
        return <View key={k} style={{ position: 'absolute', top: k * h * 0.22, width: 0, height: 0, borderLeftWidth: tw / 2, borderRightWidth: tw / 2, borderBottomWidth: th, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }} />;
      })}
      <View style={{ position: 'absolute', bottom: 0, width: Math.max(3, w * 0.1), height: h * 0.12, backgroundColor: color }} />
    </View>
  );
}
// Two rows of pines along the horizon, leaving a clearing for the fire in the middle.
function Treeline({ W, back, front }: { W: number; back: string; front: string }) {
  const rows = useMemo(() => {
    const out: { x: number; h: number; front: boolean }[] = [];
    let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (const front of [false, true]) {
      for (let x = -10; x < W + 10; x += front ? 30 + r() * 14 : 20 + r() * 10) {
        const fromMid = Math.abs(x - W / 2);
        if (front && fromMid < 110) continue;
        if (!front && fromMid < 70) continue;
        out.push({ x, h: front ? 64 + r() * 40 + (fromMid > W * 0.38 ? 26 : 0) : 38 + r() * 26, front });
      }
    }
    return out;
  }, [W]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: 140 }}>
      {rows.map((t, i) => <Pine key={i} x={t.x} h={t.h} color={t.front ? front : back} />)}
    </View>
  );
}
// Day: long soft rays turning slowly behind the flame.
function Sunburst({ spin, size }: { spin: Animated.AnimatedInterpolation<string>; size: number }) {
  const rays = 14, half = size / 2;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 0, height: 0, transform: [{ rotate: spin }] }}>
      {Array.from({ length: rays }, (_, i) => (
        <View key={i} style={{ position: 'absolute', width: 0, height: 0, transform: [{ rotate: (i * 360) / rays + 'deg' }] }}>
          <View style={{ position: 'absolute', left: -half * 0.16, top: -half, width: 0, height: 0, borderLeftWidth: half * 0.16, borderRightWidth: half * 0.16, borderTopWidth: half, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: i % 2 ? 'rgba(255,255,255,0.32)' : 'rgba(250,255,214,0.42)' }} />
        </View>
      ))}
    </Animated.View>
  );
}

export function DailyCheckin() {
  const S = useApp();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const P = useMemo(() => (S.skyOverride ? (S.skyOverride === 'day' ? DAY : NIGHT) : isDaytime() ? DAY : NIGHT), [S.skyOverride]);
  const [picked, setPicked] = useState<MoodKey | null>(null);
  const [lit, setLit] = useState(false); // true once the flame has taken the new day
  const frozen = useRef<{ n: number; last: string } | null>(null); // the streak as it was before answering
  const before = frozen.current ? frozen.current.n : S.streakCount;
  const lastBefore = frozen.current ? frozen.current.last : S.streak.last;
  const [after, setAfter] = useState(before);
  const [still, setStill] = useState(false);
  const shownAt = useRef(Date.now());
  const [hopOn, setHopOn] = useState(false);
  const hopNow = () => { setHopOn(true); setTimeout(() => setHopOn(false), 480); };
  const waiting = useMemo(() => WAITING[Math.floor(Math.random() * WAITING.length)], []);
  const shake = useRef(new Animated.Value(0)).current;
  const plus = useRef(new Animated.Value(0)).current;      // the "+1" that floats off the number
  const tierPop = useRef(new Animated.Value(0)).current;
  const bubblePop = useRef(new Animated.Value(0)).current;
  const tiles = useRef(MOOD_KEYS.map(() => new Animated.Value(0))).current;

  // --- animated values ---
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;      // entrance
  const heat = useRef(new Animated.Value(0)).current;      // 0 = embers waiting, 1 = full fire
  const sway = useRef(new Animated.Value(0)).current;      // slow 3D turn
  const orbit = useRef(new Animated.Value(0)).current;     // ember ring
  const drift = useRef(new Animated.Value(0)).current;     // moon breathing / motes
  const spin = useRef(new Animated.Value(0)).current;      // day sunburst
  const pulse = useRef(new Animated.Value(0)).current;     // today's dot / hint
  const comet = useRef(new Animated.Value(0)).current;     // spark from your answer to the fire
  const burst = useRef(new Animated.Value(0)).current;     // flare + shockwave + embers
  const flip = useRef(new Animated.Value(0)).current;      // number flip
  const dotPop = useRef(new Animated.Value(0)).current;
  const flick = useRef(FLAME.map(() => new Animated.Value(0))).current;
  const sparks = useRef(Array.from({ length: 9 }, () => new Animated.Value(0))).current;
  const stars = useRef(Array.from({ length: 22 }, () => new Animated.Value(0))).current;

  // --- where things are, for the comet ---
  const pos = useRef({ top: { x: 0, y: 0 }, stage: { x: 0, y: 0 }, card: { x: 0, y: 0, w: 0 }, row: { y: 0, h: 0 } }).current;
  const [cometXY, setCometXY] = useState({ sx: 0, sy: 0, fx: 0, fy: 0 });

  useEffect(() => {
    let alive = true;
    shownAt.current = Date.now();
    AccessibilityInfo.isReduceMotionEnabled?.().then((r) => { if (alive) setStill(!!r); }).catch(() => {});
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: ND }),
      Animated.timing(rise, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
      Animated.timing(heat, { toValue: 0.45, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
    ]).start();
    const loops = [
      loop(sway, 2600), loop(drift, 9000), loop(pulse, 900),
      Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: ND })),
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 40000, easing: Easing.linear, useNativeDriver: ND })),
      ...flick.map((v, i) => loop(v, FLAME[i].dur, i * 90)),
      ...sparks.map((v, i) => loop(v, 1500 + (i % 3) * 300, i * 230, false)),
      ...stars.map((v, i) => loop(v, 1400 + (i % 4) * 500, i * 170)),
    ];
    loops.forEach((l) => l.start());
    // mood tiles bounce in one after another, then your marshmallow pipes up
    Animated.stagger(70, tiles.map((v) => Animated.spring(v, { toValue: 1, friction: 5, tension: 90, delay: 450, useNativeDriver: ND }))).start();
    Animated.sequence([Animated.delay(900), Animated.spring(bubblePop, { toValue: 1, friction: 5, useNativeDriver: ND })]).start();
    return () => { alive = false; loops.forEach((l) => l.stop()); };
  }, []);
  // While waiting for an answer, your marshmallow does a little hop now and then.
  useEffect(() => {
    if (picked) return;
    const id = setInterval(hopNow, 3600);
    return () => clearInterval(id);
  }, [picked]);

  // Per-particle interpolations, built once.
  const ring = useMemo(() => Array.from({ length: 16 }, (_, i) => {
    const p = i / 16, R = 98 + (i % 3) * 10;
    const x = orbit.interpolate(sample(32, (t) => Math.cos(TAU * (t + p)) * R));
    const y = orbit.interpolate(sample(32, (t) => Math.sin(TAU * (t + p)) * R * 0.26));
    const depth = (t: number) => (Math.sin(TAU * (t + p)) + 1) / 2; // 0 = far side, 1 = near side
    const sc = orbit.interpolate(sample(32, (t) => 0.45 + depth(t) * 0.85));
    const op = orbit.interpolate(sample(32, (t) => 0.15 + depth(t) * 0.85));
    return { x, y, sc, op, size: 4 + (i % 3) * 2, c: i % 4 === 0 ? '#FFC857' : i % 4 === 1 ? '#FF7A45' : i % 4 === 2 ? '#FFE3A3' : '#FF8A3D' };
  }), []);
  const blast = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * TAU + (i % 2) * 0.14, R = 120 + (i % 4) * 34;
    return {
      x: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * R] }),
      y: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * R * 0.8 - 30] }),
      op: burst.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 1, 0.8, 0] }),
      sc: burst.interpolate({ inputRange: [0, 1], outputRange: [1.4, 0.3] }),
      size: 5 + (i % 3) * 3, c: i % 3 === 0 ? '#FFC857' : i % 3 === 1 ? '#FFF2C9' : '#FF7A45',
    };
  }), []);
  // Day: warm motes drifting up through the light.
  const motes = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    left: ((i * 67 + 13) % 96) + 2, top: ((i * 41 + 7) % 80) + 5, size: 3 + (i % 3) * 2,
    y: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -(18 + (i % 4) * 10)] }),
    x: drift.interpolate(sample(8, (t) => Math.sin(t * 4 + i) * 6)),
    op: stars[i].interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.8] }),
  })), []);

  if (!S.showDaily && !picked) return null;

  const bare = { ...S.avatar, hat: 'none', glasses: 'none', acc: 'none', item: 'none' };
  const close = () => Animated.timing(fade, { toValue: 0, duration: 320, useNativeDriver: ND }).start(() => { setPicked(null); S.dismissDaily(); });

  const answer = (k: MoodKey, i: number) => {
    if (picked || Date.now() - shownAt.current < 800) return; // ignore a tap that arrives while the screen is still coming in
    frozen.current = { n: S.streakCount, last: S.streak.last };
    buzz('tap');
    setPicked(k);
    const n = S.answerMood(k);
    setAfter(n);
    // comet: from the tile you tapped to the heart of the flame
    const tileW = (pos.card.w - 36 - 4 * 6) / 5;
    const sx = pos.card.x + 18 + i * (tileW + 6) + tileW / 2;
    const sy = pos.card.y + pos.row.y + pos.row.h / 2;
    const fx = pos.top.x + pos.stage.x + STAGE / 2;
    const fy = pos.top.y + pos.stage.y + STAGE - BASE - 40;
    setCometXY({ sx, sy, fx, fy });
    comet.setValue(0); burst.setValue(0); flip.setValue(0); dotPop.setValue(0);
    if (still) { heat.setValue(1); flip.setValue(1); dotPop.setValue(1); setLit(true); return; }
    Animated.sequence([
      Animated.timing(comet, { toValue: 1, duration: 650, easing: Easing.in(Easing.cubic), useNativeDriver: ND }),
      Animated.parallel([
        Animated.timing(burst, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
        Animated.sequence([
          Animated.timing(heat, { toValue: 1.45, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
          Animated.spring(heat, { toValue: 1, friction: 3.2, tension: 60, useNativeDriver: ND }),
        ]),
        Animated.sequence([
          Animated.delay(160),
          Animated.timing(flip, { toValue: 1, duration: 620, easing: Easing.out(Easing.back(1.6)), useNativeDriver: ND }),
        ]),
        Animated.sequence([Animated.delay(420), Animated.spring(dotPop, { toValue: 1, friction: 4, useNativeDriver: ND })]),
      ]),
    ]).start();
    // the moment the spark lands: buzz, shake, +1, maybe a new tier, and a happy hop
    setTimeout(() => {
      setLit(true);
      buzz('win');
      hopNow();
      shake.setValue(0); plus.setValue(0); tierPop.setValue(0); bubblePop.setValue(0.5);
      Animated.parallel([
        Animated.sequence([6, -5, 4, -3, 2, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 45, useNativeDriver: ND }))),
        Animated.timing(plus, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
        Animated.sequence([Animated.delay(500), Animated.spring(tierPop, { toValue: 1, friction: 4, tension: 80, useNativeDriver: ND })]),
        Animated.spring(bubblePop, { toValue: 1, friction: 4, useNativeDriver: ND }),
      ]).start();
    }, 650);
  };

  // The last 7 days, lit up for the days in the streak (today joins once you answer and the dot pops).
  const n = lit ? after : before;
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6));
  const isLit = (d: Date, count: number, last: string) => { const k = ymd(d); return count > 0 && k <= last && k > ymd(addDays(new Date(last + 'T12:00:00'), -count)); };
  const nextDay = before + 1;
  const W = width + 40;

  // --- derived animation styles ---
  const enterY = rise.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const cardY = rise.interpolate({ inputRange: [0, 0.4, 1], outputRange: [140, 90, 0] });
  const cardO = rise.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] });
  const turn = sway.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '16deg'] });
  const tilt = sway.interpolate({ inputRange: [0, 1], outputRange: ['6deg', '-4deg'] });
  const fireScale = heat.interpolate({ inputRange: [0, 0.45, 1, 1.45], outputRange: [0.2, 0.62, 1, 1.38] });
  const fireOp = heat.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.75, 1] });
  const auraScale = heat.interpolate({ inputRange: [0, 1, 1.45], outputRange: [0.5, 1, 1.25] });
  const auraOp = heat.interpolate({ inputRange: [0, 0.45, 1, 1.45], outputRange: [0, 0.55 * P.halo, P.halo, P.halo] });
  const ringOp = heat.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.55, 1] });
  const burstSpin = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const burstScale = heat.interpolate({ inputRange: [0, 0.45, 1, 1.45], outputRange: [0.4, 0.75, 1, 1.15] });
  const cometX = comet.interpolate({ inputRange: [0, 1], outputRange: [cometXY.sx, cometXY.fx] });
  const cometY = comet.interpolate(sample(20, (t) => cometXY.sy + (cometXY.fy - cometXY.sy) * t - Math.sin(Math.PI * t) * 70));
  const cometO = comet.interpolate({ inputRange: [0, 0.05, 0.92, 1], outputRange: [0, 1, 1, 0] });
  const shock = (d: number) => ({
    transform: [{ scaleX: burst.interpolate({ inputRange: [0, d, 1], outputRange: [0.2, 0.2, 3.6] }) }, { scaleY: burst.interpolate({ inputRange: [0, d, 1], outputRange: [0.2, 0.2, 1.6] }) }],
    opacity: burst.interpolate({ inputRange: [0, d, d + 0.05, 1], outputRange: [0, 0, 0.9, 0] }),
  });
  const flash = burst.interpolate({ inputRange: [0, 0.06, 0.4], outputRange: [0, 0.32, 0] });
  const oldRot = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '90deg', '90deg'] });
  const newRot = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-90deg', '-90deg', '0deg'] });
  const oldO = flip.interpolate({ inputRange: [0, 0.49, 0.5], outputRange: [1, 1, 0] });
  const newO = flip.interpolate({ inputRange: [0, 0.5, 0.51], outputRange: [0, 0, 1] });
  const numScale = flip.interpolate({ inputRange: [0, 0.5, 0.8, 1], outputRange: [1, 0.9, 1.25, 1] });
  const pulseSc = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const pulseO = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const numStyle = { color: P.text, textShadowColor: P.numShadow };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.wrap, CLIP, { backgroundColor: P.day ? P.bg[3] : P.ground[1], opacity: fade, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      {/* background: night sky with stars and moon, or warm daylight with drifting motes */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <LinearGradient colors={P.bg as any} locations={P.loc as any} style={StyleSheet.absoluteFill} />
        {P.day ? motes.map((m, i) => (
          <Animated.View key={i} style={{ position: 'absolute', left: m.left + '%' as any, top: m.top + '%' as any, width: m.size, height: m.size, borderRadius: m.size, backgroundColor: i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#F4F7B0' : '#FFD27A', opacity: m.op, transform: [{ translateX: m.x }, { translateY: m.y }] }} />
        )) : (
          <>
            {stars.map((v, i) => (
              <Animated.View key={i} style={[st.star, { left: ((i * 73 + 7) % 100) + '%' as any, top: ((i * 37 + 3) % 48) + '%' as any, width: i % 5 === 0 ? 3 : 2, height: i % 5 === 0 ? 3 : 2, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }]} />
            ))}
            <Animated.View style={[st.moon, { right: 40, top: insets.top + 40, transform: [{ scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] }]}>
              {[110, 76].map((d, i) => <View key={d} style={{ position: 'absolute', width: d, height: d, borderRadius: d, backgroundColor: '#F4ECD0', opacity: [0.06, 0.12][i] }} />)}
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4ECD0' }}>
                <View style={{ position: 'absolute', left: 9, top: 11, width: 7, height: 7, borderRadius: 4, backgroundColor: '#DCCFA6' }} />
                <View style={{ position: 'absolute', left: 22, top: 22, width: 9, height: 6, borderRadius: 4, backgroundColor: '#DCCFA6' }} />
              </View>
            </Animated.View>
          </>
        )}
      </View>

      <Animated.View style={[st.top, { transform: [{ translateY: enterY }, { translateX: shake }] }]} onLayout={(e: LayoutChangeEvent) => { pos.top = e.nativeEvent.layout; }}>
        <View style={st.stage} onLayout={(e: LayoutChangeEvent) => { pos.stage = e.nativeEvent.layout; }}>
          {P.day ? (
            <Animated.View pointerEvents="none" style={[st.center, { opacity: auraOp, transform: [{ scale: burstScale }] }]}>
              <Sunburst spin={burstSpin} size={Math.max(width, 420) * 1.2} />
            </Animated.View>
          ) : (
            <>
              {/* the ground and the treeline on the horizon, full width */}
              <View pointerEvents="none" style={{ position: 'absolute', left: (STAGE - W) / 2, width: W, top: STAGE - BASE + 2, height: 1600 }}>
                <LinearGradient colors={P.ground as any} style={StyleSheet.absoluteFill} />
              </View>
              <View pointerEvents="none" style={{ position: 'absolute', left: (STAGE - W) / 2, width: W, bottom: BASE - 4, height: 140 }}>
                <Treeline W={W} back={P.treesBack} front={P.treesFront} />
              </View>
            </>
          )}

          {/* firelight halo, layered circles = a soft radial glow on every platform */}
          <Animated.View pointerEvents="none" style={[st.center, { opacity: auraOp, transform: [{ scale: auraScale }] }]}>
            {[340, 260, 190, 130].map((d, i) => (
              <View key={d} style={[st.halo, { width: d, height: d, borderRadius: d / 2, marginLeft: -d / 2, marginTop: -d / 2, backgroundColor: i < 2 ? '#FF7A2E' : '#FFB347', opacity: [0.07, 0.1, 0.14, 0.2][i] }]} />
            ))}
          </Animated.View>

          {/* shockwaves on the ground plane */}
          <Animated.View pointerEvents="none" style={[st.shock, shock(0)]} />
          <Animated.View pointerEvents="none" style={[st.shock, { borderColor: '#FFC857' }, shock(0.12)]} />

          {/* ember ring, a tilted 3D orbit: near side bigger and brighter */}
          <Animated.View pointerEvents="none" style={[st.center, { top: STAGE - BASE - 34, opacity: ringOp, transform: [{ rotate: '-10deg' }] }]}>
            {ring.map((r, i) => (
              <Animated.View key={i} style={[st.dot0, { width: r.size, height: r.size, borderRadius: r.size, backgroundColor: r.c, opacity: r.op, transform: [{ translateX: r.x }, { translateY: r.y }, { scale: r.sc }] }]} />
            ))}
          </Animated.View>

          {/* the flame: five teardrops, each flickering on its own, turning in 3D with parallax */}
          <Animated.View style={[st.flameBox, { opacity: fireOp, transform: [{ perspective: 700 }, { rotateX: tilt }, { rotateY: turn }, { scale: fireScale }] }]}>
            {FLAME.map((L, i) => {
              const f = flick[i];
              return (
                <Animated.View key={i} style={{
                  position: 'absolute', width: L.w, height: L.w, left: (STAGE - L.w) / 2, bottom: BASE + L.up, transformOrigin: '50% 100%',
                  transform: [
                    { translateX: sway.interpolate({ inputRange: [0, 1], outputRange: [-i * 2.4, i * 2.4] }) },
                    { translateY: f.interpolate({ inputRange: [0, 1], outputRange: [0, -3 - i] }) },
                    { scaleX: f.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
                    { scaleY: f.interpolate({ inputRange: [0, 1], outputRange: [1.18, 1.38 + i * 0.03] }) },
                  ],
                } as any}>
                  <View style={{ width: L.w, height: L.w, borderRadius: L.w / 2, borderTopLeftRadius: L.w * 0.06, backgroundColor: L.c, opacity: L.o, transform: [{ rotate: '45deg' }] }} />
                </Animated.View>
              );
            })}
            {sparks.map((v, i) => (
              <Animated.View key={i} style={[st.spark, {
                left: STAGE / 2 - 2 + ((i % 3) - 1) * 10, bottom: BASE + 70,
                opacity: v.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 0.5, 0] }),
                transform: [
                  { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -110 - (i % 3) * 25] }) },
                  { translateX: v.interpolate(sample(10, (t) => Math.sin(t * 6 + i) * (6 + t * 10))) },
                  { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.3] }) },
                ],
              }]} />
            ))}
          </Animated.View>

          {/* logs */}
          <View pointerEvents="none" style={[st.log, { transform: [{ rotate: '14deg' }] }]} />
          <View pointerEvents="none" style={[st.log, { transform: [{ rotate: '-14deg' }] }]} />

          {/* you, warming up by the fire, with something to say */}
          <View pointerEvents="none" style={st.me}>
            <Mallow a={S.avatar} face={picked && lit ? MOODS[picked].face : undefined} size={70} hop={hopOn} />
          </View>
          <Animated.View pointerEvents="none" style={[st.bubble, { backgroundColor: P.card, borderColor: P.line, opacity: bubblePop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }), transform: [{ scale: bubblePop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}>
            <Text style={[st.bubbleT, { color: P.text }]}>{picked && lit ? SAYS[picked] : waiting}</Text>
            <View style={[st.bubbleTail, { borderTopColor: P.card }]} />
          </Animated.View>

          {/* the burst of embers when your answer lands */}
          <View pointerEvents="none" style={[st.center, { top: STAGE - BASE - 50 }]}>
            {blast.map((b, i) => (
              <Animated.View key={i} style={[st.dot0, { width: b.size, height: b.size, borderRadius: b.size, backgroundColor: b.c, opacity: b.op, transform: [{ translateX: b.x }, { translateY: b.y }, { scale: b.sc }] }]} />
            ))}
          </View>
        </View>

        {/* the number, flipping over in 3D when the day is added */}
        <Animated.View style={[st.numBox, { transform: [{ scale: numScale }] }]} accessibilityLiveRegion="polite" accessibilityLabel={n + ' day streak'}>
          <Animated.Text style={[st.num, numStyle, { opacity: oldO, transform: [{ perspective: 500 }, { rotateX: oldRot }] }]}>{before}</Animated.Text>
          <Animated.Text style={[st.num, numStyle, StyleSheet.absoluteFill, { opacity: newO, transform: [{ perspective: 500 }, { rotateX: newRot }] }]}>{after}</Animated.Text>
          <Animated.Text pointerEvents="none" style={[st.plus, { opacity: plus.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: plus.interpolate({ inputRange: [0, 1], outputRange: [6, -46] }) }, { scale: plus.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.2, 1] }) }] }]}>+1</Animated.Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[st.streakT, { color: P.dim }]}>day streak</Text>
          <View>
            <View style={[st.tier, { borderColor: P.line }]}><Text style={[st.tierT, { color: P.dim }]}>{tierOf(before)}</Text></View>
            {tierOf(after) !== tierOf(before) ? (
              <Animated.View style={[st.tier, st.tierNew, StyleSheet.absoluteFill, { opacity: tierPop, transform: [{ scale: tierPop.interpolate({ inputRange: [0, 1], outputRange: [1.8, 1] }) }, { rotate: tierPop.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] }) }] }]}>
                <Text style={[st.tierT, { color: '#2A1406' }]} numberOfLines={1}>{tierOf(after)}</Text>
              </Animated.View>
            ) : null}
          </View>
        </View>

        <View style={st.week}>
          {days.map((d, i) => {
            const label = d.toLocaleDateString('en-GB', { weekday: 'narrow' });
            if (i === 6) {
              return (
                <View key={i} style={{ alignItems: 'center', gap: 5 }}>
                  <Text style={[st.wd, { color: P.hint }]}>{label}</Text>
                  <View style={st.dotWrap}>
                    {!picked ? <Animated.View style={[st.dotRing, { borderColor: P.hint, opacity: pulseO, transform: [{ scale: pulseSc }] }]} /> : null}
                    <View style={[st.dot, st.dotToday, { borderColor: P.hint }]} />
                    <Animated.View style={[st.dot, st.dotOn, StyleSheet.absoluteFill, { opacity: dotPop, transform: [{ scale: dotPop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]}>
                      <Icon name="check" size={14} color="#FFFFFF" />
                    </Animated.View>
                  </View>
                </View>
              );
            }
            const on = isLit(d, before, lastBefore);
            return (
              <View key={i} style={{ alignItems: 'center', gap: 5 }}>
                <Text style={[st.wd, { color: P.dim }]}>{label}</Text>
                <View style={[st.dot, { borderColor: P.dotOff }, on && st.dotOn]}>{on ? <Icon name="check" size={14} color="#FFFFFF" /> : null}</View>
              </View>
            );
          })}
        </View>
        {!picked ? (
          <Animated.Text style={[st.hint, { color: P.hint, opacity: pulseO }]}>{before > 0 ? 'Check in below to light day ' + nextDay : 'Check in below to light your first flame'}</Animated.Text>
        ) : <Text style={[st.hint, { color: P.hint }]}>{lit ? 'Day ' + after + ' is lit' : ' '}</Text>}
      </Animated.View>

      <Animated.View style={[st.card, { backgroundColor: P.card, borderColor: P.line, boxShadow: P.day ? '0px 10px 30px rgba(46,107,58,0.18), 0px 2px 6px rgba(46,107,58,0.08)' : '0px 12px 34px rgba(0,0,0,0.5), 0px 0px 0px 1px rgba(255,180,100,0.06)', opacity: cardO, transform: [{ translateY: cardY }] }]} onLayout={(e: LayoutChangeEvent) => { const l = e.nativeEvent.layout; pos.card = { x: l.x, y: l.y, w: l.width }; }}>
        {picked && lit ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 6 }}>
            <Mallow a={bare} face={MOODS[picked].face} size={64} />
            <Text style={[st.q, { color: P.text }]}>{after > 1 ? after + ' days in a row. See you tomorrow!' : 'Your first flame is lit. See you tomorrow!'}</Text>
            <Text style={[st.reply, { color: P.dim }]}>{MOODS[picked].reply}</Text>
            <Pressable onPress={close} accessibilityRole="button" style={(p: any) => [st.go, { backgroundColor: P.goBg }, (p.pressed || p.hovered) && { opacity: 0.88 }]}>
              <Text style={[st.goT, { color: P.goText }]}>Continue</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[st.q, { color: P.text }]}>How are you feeling today?</Text>
            <Text style={[st.reply, { color: P.dim }]}>Your answer lights today’s flame.</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }} onLayout={(e: LayoutChangeEvent) => { const l = e.nativeEvent.layout; pos.row = { y: l.y, h: l.height }; }}>
              {MOOD_KEYS.map((k, i) => (
                <Animated.View key={k} style={{ flex: 1, opacity: tiles[i], transform: [{ translateY: tiles[i].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: tiles[i].interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }}>
                  <Pressable onPress={() => answer(k, i)} disabled={!!picked} accessibilityRole="button" accessibilityLabel={MOODS[k].label}
                    style={(p: any) => [st.mood, { borderColor: P.line, backgroundColor: P.tile }, p.hovered && { borderColor: '#FF8A3D', transform: [{ translateY: -3 }, { rotate: i % 2 ? '2deg' : '-2deg' }] }, p.pressed && { transform: [{ scale: 0.92 }] }, picked === k && { borderColor: '#FFB03A', backgroundColor: P.pickBg, transform: [{ scale: 1.06 }] }, picked && picked !== k && { opacity: 0.4 }]}>
                    <Mallow a={bare} face={MOODS[k].face} size={40} anim={false} />
                    <Text style={[st.moodT, { color: P.dim }]} numberOfLines={1}>{MOODS[k].label}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </Animated.View>

      {!picked ? <Pressable onPress={close} style={{ alignSelf: 'center', padding: 10 }}><Text style={[st.later, { color: P.dim }]}>Not now</Text></Pressable> : <View style={{ height: 44 }} />}

      {/* the spark that carries your answer up to the fire */}
      <Animated.View pointerEvents="none" style={[st.comet, { opacity: cometO, transform: [{ translateX: cometX }, { translateY: cometY }] }]}>
        <View style={st.cometGlow} />
        <View style={st.cometCore} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFD9A0', opacity: flash }]} />
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 20, justifyContent: 'center', gap: 22, zIndex: 50, overflow: 'hidden' },
  star: { position: 'absolute', borderRadius: 2, backgroundColor: '#FFF4E4' },
  moon: { position: 'absolute', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  top: { alignItems: 'center' },
  stage: { width: STAGE, height: STAGE, alignItems: 'center' },
  center: { position: 'absolute', left: STAGE / 2, top: STAGE - BASE - 60, width: 0, height: 0 },
  halo: { position: 'absolute' },
  dot0: { position: 'absolute', marginLeft: -3, marginTop: -3 },
  flameBox: { position: 'absolute', left: 0, top: 0, width: STAGE, height: STAGE },
  spark: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFE08A' },
  shock: { position: 'absolute', left: STAGE / 2 - 50, top: STAGE - BASE - 22, width: 100, height: 44, borderRadius: 50, borderWidth: 3, borderColor: '#FF9A3A' },
  log: { position: 'absolute', bottom: BASE - 14, width: 96, height: 14, borderRadius: 7, backgroundColor: '#5B3A26', borderWidth: 2, borderColor: '#2E1C14' },
  numBox: { height: 66, minWidth: 90, alignItems: 'center', justifyContent: 'center', marginTop: -6 },
  num: { fontFamily: F.displayBold, fontSize: 60, lineHeight: 66, textAlign: 'center', textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  streakT: { fontFamily: F.display, fontSize: 18, marginTop: -2 },
  week: { flexDirection: 'row', gap: 10, marginTop: 16 },
  wd: { fontFamily: F.label, fontSize: 12 },
  dotWrap: { width: 30, height: 30 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: '#FF8A3D', borderColor: '#FF8A3D' },
  dotToday: { position: 'absolute', borderStyle: 'dashed' },
  dotRing: { position: 'absolute', left: -5, top: -5, width: 40, height: 40, borderRadius: 20, borderWidth: 2 },
  hint: { fontFamily: F.bodyBold, fontSize: 14, marginTop: 12 },
  // A soft, wide shadow so the card floats on the scene instead of sitting on it.
  card: { borderRadius: 24, padding: 18, gap: 4, width: '100%', maxWidth: 520, alignSelf: 'center', borderWidth: 1 },
  q: { fontFamily: F.display, fontSize: 21, textAlign: 'center' },
  reply: { fontFamily: F.body, fontSize: 14, textAlign: 'center' },
  me: { position: 'absolute', left: -46, bottom: BASE - 30 },
  bubble: { position: 'absolute', left: -78, bottom: BASE + 52, maxWidth: 140, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1 },
  bubbleT: { fontFamily: F.bodyBold, fontSize: 12.5 },
  bubbleTail: { position: 'absolute', left: 40, bottom: -7, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  plus: { position: 'absolute', right: -34, top: 4, fontFamily: F.displayBold, fontSize: 26, color: '#FF8A3D' },
  tier: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tierNew: { backgroundColor: '#FFC857', borderColor: '#FFC857' },
  tierT: { fontFamily: F.bodyBold, fontSize: 12 },
  // No flex: 1 here: the Animated.View around each tile already splits the row. On Android, flex: 1 inside that
  // column made the tile 0 high (just padding), so the marshmallow and label spilled out below it.
  mood: { alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5 },
  moodT: { fontFamily: F.displayMed, fontSize: 12 },
  go: { marginTop: 8, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 28, minHeight: 44, justifyContent: 'center' },
  goT: { fontFamily: F.bodyBold, fontSize: 15 },
  later: { fontFamily: F.bodyBold, fontSize: 15, textDecorationLine: 'underline' },
  comet: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },
  cometGlow: { position: 'absolute', left: -14, top: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,170,80,0.45)' },
  cometCore: { position: 'absolute', left: -6, top: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF3C4' },
});
