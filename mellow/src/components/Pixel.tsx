import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PixelImage } from '../pixel/PixelImage';
import { PixelStill } from '../pixel/PixelStill';
import { PixelCtx } from '../pixel/raster';
import { Avatar, iconRaster, mallowRaster } from '../pixel/sprites';
import { buildScene, drawFrame, Layout, LAYOUTS, SceneCache } from '../pixel/scene';
import { C, F, themed, themeMode } from '../theme';

const ND = Platform.OS !== 'web';

export function Mallow({ a, face, size, anim = true, delay = 0, hop = false }: { a: Avatar; face?: string | null; size: number; anim?: boolean; delay?: number; hop?: boolean }) {
  const ctx = useMemo(() => mallowRaster(a, face), [a.color, a.face, a.hat, a.glasses, a.acc, a.item, face]);
  const breath = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!anim) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay * 1000),
      Animated.timing(breath, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(breath, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);
  useEffect(() => {
    if (!hop) return;
    jump.setValue(0);
    Animated.sequence([
      Animated.timing(jump, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.timing(jump, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: ND }),
    ]).start();
  }, [hop]);
  const sx = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const sy = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.965] });
  const ty = jump.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.22] });
  return (
    <Animated.View style={{ width: size, height: size, transformOrigin: '50% 90%', transform: [{ translateY: ty }, { scaleX: sx }, { scaleY: sy }] }}>
      <PixelStill ctx={ctx} width={size} height={size} cacheKey={[a.color, face || a.face, a.hat, a.glasses, a.acc, a.item].join('|')} />
    </Animated.View>
  );
}

// UI icons are clean vector glyphs; pixel art is kept for the campfire, stage and marshmallows.
const ICON_MAP: Record<string, [string, string]> = themed(() => ({
  home: ['home-outline', C.cream], flame: ['flame-outline', C.fire], ember: ['flame', C.fire], play: ['game-controller-outline', C.plumSoft],
  leaf: ['leaf-outline', C.moss], forest: ['leaf-outline', C.moss], words: ['grid-outline', C.emberHi], sun: ['sunny', '#D99A00'],
  rain: ['rainy-outline', C.muted], cloud: ['cloud-outline', C.muted], sky: ['partly-sunny-outline', '#4F7F96'], sync: ['sparkles-outline', C.rose],
  chat: ['chatbubbles-outline', C.plumSoft], note: ['mail-outline', C.creamDim], tree: ['walk-outline', C.moss], walk: ['walk-outline', C.moss],
  wave: ['water-outline', '#4F7F96'], moon: ['moon-outline', C.emberHi], music: ['musical-notes-outline', C.plumSoft], star: ['star-outline', C.emberHi],
  heart: ['heart-outline', C.rose], drink: ['cafe-outline', C.emberHi], check: ['checkmark-circle', C.moss], clock: ['time-outline', C.muted],
  refresh: ['shuffle-outline', C.creamDim], info: ['information-circle-outline', '#4F7F96'], people: ['person-add-outline', C.cream], close: ['close', C.creamDim],
  clipboard: ['clipboard-outline', C.emberHi], calendar: ['calendar-outline', C.emberHi], bed: ['bed-outline', C.plumSoft], steps: ['footsteps-outline', C.moss],
  phone: ['phone-portrait-outline', '#4F7F96'], pulse: ['pulse-outline', C.rose], chevron: ['chevron-forward', C.muted], back: ['chevron-back', C.creamDim], down: ['chevron-down', C.ember], up: ['chevron-up', C.ember], lifebuoy: ['help-buoy-outline', C.rose],
}));
export function Icon({ name, size = 22, color }: { name: string; size?: number; color?: string }) {
  const [glyph, def] = ICON_MAP[name] || ['ellipse-outline', C.creamDim];
  return <Ionicons name={glyph as any} size={size} color={color || def} />;
}
export function PixelIcon({ name, size = 22 }: { name: string; size?: number }) {
  const ctx = useMemo(() => iconRaster(name), [name]);
  return <PixelStill ctx={ctx} width={size} height={size} cacheKey={"icon:" + name} />;
}

const sceneCache = new Map<string, SceneCache>();
function getScene(L: Layout) {
  const day = themeMode() === 'day', key = L.key + (day ? ':day' : ':night');
  let K = sceneCache.get(key);
  if (!K) { K = buildScene(L, day); sceneCache.set(key, K); }
  return K;
}

function useWorld(L: Layout) {
  const ctx = useMemo(() => new PixelCtx(L.W, L.H), [L.key]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const K = getScene(L);
    const start = Date.now();
    drawFrame(ctx, L, K, 1.3);
    setTick((n) => n + 1);
    const id = setInterval(() => {
      drawFrame(ctx, L, K, 1.3 + (Date.now() - start) / 1000);
      setTick((n) => n + 1);
    }, 100);
    return () => clearInterval(id);
  }, [L.key]);
  return { ctx, tick };
}

export type SceneMember = { id: string; name: string; a: Avatar };

export function CampScene({ members, bubbles, onPick, compact, hopId }: { members: SceneMember[]; bubbles?: Record<string, string>; onPick?: (m: SceneMember) => void; compact?: boolean; hopId?: string | null }) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width));
  const L = !compact && w > 0 && w < 560 ? LAYOUTS.tall : LAYOUTS.wide;
  const h = w * L.H / L.W;
  return (
    <View onLayout={onLayout} style={{ width: '100%', height: h || undefined, aspectRatio: w ? undefined : L.W / L.H, backgroundColor: '#0a0e22', overflow: 'hidden' }}>
      {w > 0 && <WorldCanvas key={L.key} L={L} w={w} h={h} />}
      {w > 0 && !compact && (
        <View style={st.sign}><Text style={st.signT}>Pinehollow</Text><Text style={st.signS}>4 at the fire</Text></View>
      )}
      {w > 0 && members.map((m, i) => {
        const s = L.seats![i];
        const k = w / L.W;
        const size = s.s * k;
        return (
          <Pressable key={m.id} disabled={compact} onPress={() => onPick && onPick(m)} accessibilityLabel={m.id === 'me' ? 'You' : 'Open ' + m.name}
            style={{ position: 'absolute', left: (s.x - s.s / 2) * k, top: (s.y - s.s * 0.9) * k, width: size, height: size }}>
            <Mallow a={m.a} size={size} delay={i * 0.6} hop={hopId === m.id} />
            {!compact && (
              <View style={[st.tag, { top: size * 1.08 }]} pointerEvents="none">
                <Text style={[st.tagT, m.id === 'me' && { color: C.emberHi }]} numberOfLines={1}>{m.id === 'me' ? 'You' : m.name}</Text>
              </View>
            )}
            {!compact && bubbles && bubbles[m.id] ? (
              <View style={[st.bubble, { bottom: size * 0.95 }]} pointerEvents="none">
                <Text style={st.bubbleT}>{bubbles[m.id]}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// Full-bleed campfire: the scene covers the whole area (cropping the sides on tall screens), marshmallows stay tappable.
export function CampFull({ members, bubbles, onPick, hopId }: { members: SceneMember[]; bubbles?: Record<string, string>; onPick?: (m: SceneMember) => void; hopId?: string | null }) {
  // Start from the window size so the scene draws on the first frame, then refine with the real layout.
  const win = useWindowDimensions();
  const [box, setBox] = useState({ w: Math.round(win.width), h: Math.round(win.height) });
  // Portrait (phones): the tall scene covers the screen. Landscape (desktop web): the wide scene sits on top, ground below for the buttons.
  const landscape = box.w > box.h * 1.05;
  const L = landscape ? LAYOUTS.wide : LAYOUTS.full;
  const k = !box.w ? 0 : landscape ? Math.min(box.w / L.W, (box.h - 140) / L.H) : Math.max(box.w / L.W, box.h / L.H);
  const sw = L.W * k, sh = L.H * k, ox = (box.w - sw) / 2, oy = landscape ? 0 : box.h - sh;
  return (
    <View onLayout={(e) => setBox({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })} style={[StyleSheet.absoluteFill, { backgroundColor: themeMode() === 'day' ? (landscape ? '#69B04E' : '#3E8EDA') : (landscape ? '#101b16' : '#0a0e22'), overflow: 'hidden' }]}>
      {k > 0 && (
        <View style={{ position: 'absolute', left: ox, top: oy, width: sw, height: sh }}>
          <SceneStill L={L} w={sw} h={sh} />
          <WorldCanvas L={L} w={sw} h={sh} />
        </View>
      )}
      {k > 0 && members.map((m, i) => {
        const s = L.seats![i];
        const size = s.s * k;
        return (
          <Pressable key={m.id} onPress={() => onPick && onPick(m)} accessibilityLabel={m.id === 'me' ? 'You' : 'Open ' + m.name}
            style={{ position: 'absolute', left: ox + (s.x - s.s / 2) * k, top: oy + (s.y - s.s * 0.9) * k, width: size, height: size }}>
            <Mallow a={m.a} size={size} delay={i * 0.6} hop={hopId === m.id} />
            <View style={[st.tag, { top: size * 1.02 }]} pointerEvents="none">
              <Text style={[st.tagT, { fontSize: 12.5 }, m.id === 'me' && { color: '#ffd27a' }]} numberOfLines={1}>{m.id === 'me' ? 'You' : m.name}</Text>
            </View>
            {bubbles && bubbles[m.id] ? (
              <View style={[st.bubble, { bottom: size * 0.95 }]} pointerEvents="none"><Text style={st.bubbleT}>{bubbles[m.id]}</Text></View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// A still frame of the scene drawn as a plain image underneath the animated canvas, so the campfire never
// shows up as an empty background even if the animated canvas fails to draw on a device.
function SceneStill({ L, w, h }: { L: Layout; w: number; h: number }) {
  const mode = themeMode();
  const ctx = useMemo(() => { const c = new PixelCtx(L.W, L.H); drawFrame(c, L, getScene(L), 1.3); return c; }, [L.key, mode]);
  return <PixelStill ctx={ctx} width={w} height={h} maxScale={2} cacheKey={'scene:' + L.key + ':' + mode} style={StyleSheet.absoluteFill} />;
}

function WorldCanvas({ L, w, h }: { L: Layout; w: number; h: number }) {
  const { ctx, tick } = useWorld(L);
  return <PixelImage ctx={ctx} tick={tick} width={w} height={h} style={StyleSheet.absoluteFill} />;
}

export function StageView({ a, face, maxSize }: { a: Avatar; face?: string | null; maxSize?: number }) {
  const [w, setW] = useState(0);
  const L = LAYOUTS.stage;
  const size = maxSize ? Math.min(w, maxSize) : w;
  const k = size / L.W;
  const [sx, sy] = L.stump!;
  const ms = 78 * k;
  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ width: '100%', alignItems: 'center', backgroundColor: '#0a0e22' }}>
      {size > 0 ? (
        <View style={{ width: size, height: size }}>
          <WorldCanvas L={L} w={size} h={size} />
          <View style={{ position: 'absolute', left: (sx - 39) * k, top: (sy - 8) * k - ms * 0.9 }}>
            <Mallow a={a} face={face} size={ms} />
          </View>
        </View>
      ) : <View style={{ width: '100%', aspectRatio: 1 }} />}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  sign: { position: 'absolute', left: '2.5%', top: '4%', backgroundColor: '#5e3b24', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  signT: { fontFamily: F.display, color: '#f6dcb0', fontSize: 16 },
  signS: { fontFamily: F.displayMed, color: '#e0b98a', fontSize: 11 },
  tag: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(18,23,46,.82)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 1 },
  tagT: { fontFamily: F.label, color: '#F6F1E6', fontSize: 11 },
  bubble: { position: 'absolute', alignSelf: 'center', width: 160, backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  bubbleT: { fontFamily: F.bodyBold, color: C.ink, fontSize: 12, lineHeight: 16 },
}));
