import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, themed, themeMode } from '../theme';
import { Btn, Reply, s, T } from '../components/ui';
import { Icon } from '../components/Pixel';
import { lockPageScroll } from '../scrollLock';
import { useLayout } from '../layout';
import { HOTEL, PICS, SIGHT } from './puzzles';
import { blocked, clueText, FURN, GUESTS, Hint, hotelNext, lineClue, nonoHint, ROOMS, sightHint, sightSeen, thief } from './engines';

// One puzzle a day: everyone gets the same one, and it grows a little through the week (Monday small, weekend big).
// Once solved, the puzzle stays solved for the rest of the day; a new one arrives tomorrow.
const dayOfYear = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5);
const weekday = () => (new Date().getDay() + 6) % 7;
export const TODAY_SIZE = { nono: [5, 5, 7, 7, 8, 10, 10], sight: [5, 5, 6, 6, 6, 7, 7], hotel: [4, 4, 5, 5, 5, 6, 6] };
const pick = <T,>(list: T[]) => list[dayOfYear() % list.length];
// Who at your fire solved today's puzzle. Demo data, fixed per day and game; times are never shown.
export function friendsWhoSolved(friends: { id: string; name: string }[], game: string) {
  const day = dayOfYear();
  return friends.filter((f) => { let h = day * 31 + game.length * 7; for (const ch of game + f.id) h = (h * 33 + ch.charCodeAt(0)) % 9973; return h % 3 !== 0; }).map((f) => f.name);
}

// The game page is at most 620 wide and the board sits in a panel with 18 px padding (plus its border).
function useBoardWidth() { const { cw } = useLayout(); return Math.max(220, Math.min(560, Math.min(620, cw) - 38)); }

// One pointer handler for the whole board, so a press can drag across squares.
// Web: DOM pointer events, which also tell left from right button (right = mark ✕).
// Phones: a PanResponder; there is no right button there, so the mode button does the marking.
type Pointer = { down: (x: number, y: number, alt: boolean) => void; move: (x: number, y: number) => void; up: () => void };
function useBoardPointer(h: Pointer) {
  const ref = useRef<any>(null);
  const live = useRef(h); live.current = h;
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = ref.current as HTMLElement | null;
    if (!el || typeof el.addEventListener !== 'function') return;
    let active = false;
    const at = (e: PointerEvent): [number, number] => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault(); active = true;
      try { el.setPointerCapture(e.pointerId); } catch {}
      const [x, y] = at(e); live.current.down(x, y, e.button === 2);
    };
    const move = (e: PointerEvent) => { if (active) { const [x, y] = at(e); live.current.move(x, y); } };
    const up = () => { if (active) { active = false; live.current.up(); } };
    const menu = (e: Event) => e.preventDefault();
    el.style.touchAction = 'none'; el.style.userSelect = 'none'; el.style.cursor = 'pointer';
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('contextmenu', menu);
    return () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('contextmenu', menu);
    };
  }, []);
  const pan = useMemo(() => {
    if (Platform.OS === 'web') return null;
    const start = { x: 0, y: 0 };
    // Claim the touch straight away (capture phase too) and switch page scrolling off until the finger lifts,
    // otherwise the page's native ScrollView takes vertical drags.
    const end = () => { lockPageScroll(false); live.current.up(); };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => { lockPageScroll(true); start.x = e.nativeEvent.locationX; start.y = e.nativeEvent.locationY; live.current.down(start.x, start.y, false); },
      onPanResponderMove: (_, g) => live.current.move(start.x + g.dx, start.y + g.dy),
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }, []);
  return { ref, handlers: pan ? pan.panHandlers : {} };
}

// State that pointer handlers can read straight away, before React re-renders (drags fire many moves per frame).
function useLive<V>(init: () => V): [V, React.MutableRefObject<V>, (v: V) => void] {
  const [v, setV] = useState<V>(init);
  const r = useRef<V>(v);
  return [v, r, (n: V) => { r.current = n; setV(n); }];
}

function Controls({ mode, onMode, onHint, done }: { mode?: [string, boolean]; onMode?: () => void; onHint: () => void; done: boolean }) {
  if (done) return null;
  return (
    <View style={gs.controls}>
      {mode ? <Btn sm kind="ghost" icon={mode[1] ? 'x' : 'brush'} label={mode[0]} onPress={onMode} style={mode[1] ? { borderWidth: 1, borderColor: C.ember } : null} /> : null}
      <Btn sm kind="ghost" icon="bulb" label="Hint" onPress={onHint} />
    </View>
  );
}

// ---------- Hidden Picture ----------
export function HiddenPicture({ onDone, solved }: { onDone: () => void; solved?: boolean }) {
  const W = useBoardWidth();
  const P = useMemo(() => {
    const n = TODAY_SIZE.nono[weekday()], names = Object.keys(PICS[n]), name = pick(names);
    const sol = PICS[n][name].join('').split('').map((c) => (c === '#' ? 1 : 0));
    const grid = (r: number, c: number) => sol[r * n + c];
    const rows = Array.from({ length: n }, (_, r) => lineClue(Array.from({ length: n }, (_, c) => grid(r, c))));
    const cols = Array.from({ length: n }, (_, c) => lineClue(Array.from({ length: n }, (_, r) => grid(r, c))));
    return { n, name, sol, rows, cols, k: Math.max(1, ...rows.map((x) => x.length), ...cols.map((x) => x.length)) };
  }, []);
  const { n, sol, rows, cols, k } = P;
  // 0 empty, 1 filled, 2 marked ✕
  const [st, stRef, setSt] = useLive<number[]>(() => Array(n * n).fill(0));
  const [mark, setMark] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
  const drag = useRef<number | null>(null);
  // Already solved today (saved progress can arrive a moment after the page opens): show the finished board.
  useEffect(() => { if (solved && !wonRef.current) { setSt(sol.map((v) => (v ? 1 : 2))); setWon(true); wonRef.current = true; } }, [solved]);
  const u = W / (n + 0.62 * k + 0.3), off = W - n * u;
  const lineDone = (axis: 'row' | 'col', i: number) => {
    const got = lineClue(Array.from({ length: n }, (_, j) => (axis === 'row' ? st[i * n + j] : st[j * n + i])));
    const want = axis === 'row' ? rows[i] : cols[i];
    return got.length === want.length && got.every((v, j) => v === want[j]);
  };
  const check = (next: number[]) => {
    if (!wonRef.current && next.every((v, i) => (v === 1) === (sol[i] === 1))) { wonRef.current = true; setWon(true); setHint(null); onDone(); }
  };
  const paint = (i: number, v: number) => { if (stRef.current[i] === v) return; const next = stRef.current.slice(); next[i] = v; setSt(next); };
  // Like Mosaic: tapping a clue crosses out every empty square left in that line.
  const crossLine = (axis: 'row' | 'col', i: number) => {
    const next = stRef.current.slice();
    for (let j = 0; j < n; j++) { const c = axis === 'row' ? i * n + j : j * n + i; if (next[c] === 0) next[c] = 2; }
    setSt(next);
  };
  const cellAt = (x: number, y: number) => {
    const cx = Math.floor((x - off) / u), cy = Math.floor((y - off) / u);
    return cx >= 0 && cy >= 0 && cx < n && cy < n ? cy * n + cx : -1;
  };
  const input = useBoardPointer({
    down: (x, y, alt) => {
      if (wonRef.current) return;
      if (x < off && y >= off && y < off + n * u) { crossLine('row', Math.floor((y - off) / u)); return; }
      if (y < off && x >= off && x < off + n * u) { crossLine('col', Math.floor((x - off) / u)); return; }
      const i = cellAt(x, y); if (i < 0) return;
      // A tap cycles empty → filled → ✕ → empty; right-click (or ✕ mode) toggles ✕ straight away.
      const cur = stRef.current[i];
      drag.current = alt || mark ? (cur === 2 ? 0 : 2) : cur === 0 ? 1 : cur === 1 ? 2 : 0;
      paint(i, drag.current);
    },
    move: (x, y) => { if (drag.current === null) return; const i = cellAt(x, y); if (i >= 0) paint(i, drag.current); },
    up: () => { if (drag.current !== null) { drag.current = null; check(stRef.current); } },
  });
  const doHint = () => { const h = nonoHint(n, sol, stRef.current, rows, cols); if (!h) return; const next = stRef.current.slice(); next[h.cell] = h.value; setHint(h); setSt(next); check(next); };
  const fs = Math.max(10, u * 0.42);
  return (
    <View>
      <View ref={input.ref} {...input.handlers} style={{ width: W, height: W, alignSelf: 'center' }}>
        {hint?.line ? <View pointerEvents="none" style={[gs.hl, hint.line.axis === 'row' ? { left: 0, top: off + hint.line.i * u, width: W, height: u } : { top: 0, left: off + hint.line.i * u, width: u, height: W }]} /> : null}
        {Array.from({ length: n }, (_, i) => (
          <React.Fragment key={i}>
            <View pointerEvents="none" style={[gs.rowClue, { top: off + i * u, height: u, width: off - 6 }]}>
              {(rows[i].length ? rows[i] : [0]).map((v, j) => <Text key={j} style={[gs.clue, { fontSize: fs, width: u * 0.62 }, lineDone('row', i) && { color: C.muted }]}>{v}</Text>)}
            </View>
            <View pointerEvents="none" style={[gs.colClue, { left: off + i * u, width: u, height: off - 6 }]}>
              {(cols[i].length ? cols[i] : [0]).map((v, j) => <Text key={j} style={[gs.clue, { fontSize: fs, height: u * 0.62, lineHeight: u * 0.62 }, lineDone('col', i) && { color: C.muted }]}>{v}</Text>)}
            </View>
          </React.Fragment>
        ))}
        {st.map((v, i) => {
          const x = i % n, y = Math.floor(i / n);
          return (
            <View key={i} pointerEvents="none"
              style={[gs.cell, { left: off + x * u + 1.5, top: off + y * u + 1.5, width: u - 3, height: u - 3, borderRadius: u * 0.16 },
                (won ? sol[i] : v === 1) ? { backgroundColor: C.forest } : won ? { backgroundColor: 'transparent' } : null,
                hint && hint.cell === i ? { borderWidth: 2, borderColor: C.plum } : null]}>
              {!won && v === 2 ? <Text style={[gs.x, { fontSize: u * 0.42 }]}>✕</Text> : null}
            </View>
          );
        })}
        {!won && n > 5 ? (
          <>
            <View pointerEvents="none" style={[gs.rule, { left: off + 5 * u - 1, top: off, width: 2, height: n * u }]} />
            <View pointerEvents="none" style={[gs.rule, { top: off + 5 * u - 1, left: off, height: 2, width: n * u }]} />
          </>
        ) : null}
      </View>
      {won ? <Reply><T><Text style={{ fontFamily: F.bodyBold }}>It was {P.name}.</Text> Every square worked out by logic. Come back tomorrow for a new picture.</T></Reply>
        : hint ? <Reply><T style={{ fontSize: 14 }}>{hint.why}</T></Reply> : null}
      <Controls mode={[mark ? 'Mode: mark ✕' : 'Mode: fill', mark]} onMode={() => setMark(!mark)} onHint={doHint} done={won} />
    </View>
  );
}

// ---------- Line of Sight ----------
export function LineOfSight({ onDone, solved }: { onDone: () => void; solved?: boolean }) {
  const W = useBoardWidth();
  const P = useMemo(() => {
    const n = TODAY_SIZE.sight[weekday()], p = pick(SIGHT[n]);
    return { n, cl: p.c.split(',').map(Number), sol: p.s.split('').map(Number) };
  }, []);
  const { n, cl, sol } = P;
  const fresh = () => cl.map((v) => (v ? 0 : -1));
  // -1 undecided, 0 marked ✕ (stays open), 1 shaded
  const [st, stRef, setSt] = useLive<number[]>(fresh);
  const [mark, setMark] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
  const drag = useRef<number | null>(null);
  useEffect(() => { if (solved && !wonRef.current) { setSt(sol.map((v, i) => (cl[i] ? 0 : v ? 1 : 0))); setWon(true); wonRef.current = true; } }, [solved]);
  const u = W / n;
  const check = (next: number[]) => {
    if (!wonRef.current && next.every((v, i) => (v === 1) === (sol[i] === 1))) { wonRef.current = true; setWon(true); setHint(null); onDone(); }
  };
  const paint = (i: number, v: number) => { if (cl[i] || stRef.current[i] === v) return; const next = stRef.current.slice(); next[i] = v; setSt(next); };
  const cellAt = (x: number, y: number) => { const cx = Math.floor(x / u), cy = Math.floor(y / u); return cx >= 0 && cy >= 0 && cx < n && cy < n ? cy * n + cx : -1; };
  const input = useBoardPointer({
    down: (x, y, alt) => {
      if (wonRef.current) return;
      const i = cellAt(x, y); if (i < 0 || cl[i]) return;
      // A tap cycles empty → shaded → ✕ → empty; right-click (or ✕ mode) toggles ✕ straight away.
      const cur = stRef.current[i];
      drag.current = alt || mark ? (cur === 0 ? -1 : 0) : cur === -1 ? 1 : cur === 1 ? 0 : -1;
      paint(i, drag.current);
    },
    move: (x, y) => { if (drag.current === null) return; const i = cellAt(x, y); if (i >= 0) paint(i, drag.current); },
    up: () => { if (drag.current !== null) { drag.current = null; check(stRef.current); } },
  });
  const doHint = () => { const h = sightHint(n, cl, sol, stRef.current); if (!h) return; const next = stRef.current.slice(); next[h.cell] = h.value; setHint(h); setSt(next); check(next); };
  const ray = new Set<number>();
  cl.forEach((v, i) => {
    if (!v) return; const x = i % n, y = Math.floor(i / n);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { let a = x + dx, b = y + dy; while (a >= 0 && b >= 0 && a < n && b < n && st[b * n + a] !== 1) { ray.add(b * n + a); a += dx; b += dy; } }
  });
  return (
    <View>
      <View ref={input.ref} {...input.handlers} style={{ width: W, height: W, alignSelf: 'center' }}>
        {st.map((v, i) => {
          const x = i % n, y = Math.floor(i / n), seen = cl[i] ? sightSeen(st, n, i) : null, ok = !!seen && seen.min === cl[i] && seen.max === cl[i];
          return (
            <View key={i} pointerEvents="none"
              style={[gs.cell, { left: x * u + 2, top: y * u + 2, width: u - 4, height: u - 4, borderRadius: u * 0.16 },
                v === 1 ? { backgroundColor: C.forest } : won ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line } : ray.has(i) ? { backgroundColor: C.night4 } : null,
                hint && hint.cell === i ? { borderWidth: 2, borderColor: C.plum } : null]}>
              {cl[i] ? <View style={[gs.num, { width: u * 0.66, height: u * 0.66, borderRadius: u * 0.33, backgroundColor: won || ok ? C.forest : C.plum }]}><Text style={[gs.numT, { fontSize: u * 0.34 }]}>{cl[i]}</Text></View>
                : v === 0 && !won ? <Text style={[gs.x, { fontSize: u * 0.36 }]}>✕</Text> : null}
            </View>
          );
        })}
      </View>
      {won ? <Reply><T><Text style={{ fontFamily: F.bodyBold }}>Solved.</Text> Every number sees exactly what it should. Come back tomorrow for a new one.</T></Reply>
        : hint ? <Reply><T style={{ fontSize: 14 }}>{hint.why}</T></Reply> : null}
      <Controls mode={[mark ? 'Mode: mark ✕' : 'Mode: shade', mark]} onMode={() => setMark(!mark)} onHint={doHint} done={won} />
    </View>
  );
}

// ---------- Hotel Mystery ----------
// Same flow as Murdoku-style puzzles: pick a guest; a quick tap jots their initial as a small note,
// press and hold places them (big letter), which crosses out their row and column and locks the square.
// Drag paints notes. Tools: ✕ (mark impossible), eraser (tap a square to clear it, hold the button to clear all), undo.
type HState = { pos: number[]; notes: number[][]; xm: boolean[]; xa: number[] };
type Tool = 'note' | 'x' | 'erase';
const HOLD_MS = 420;
export function HotelMystery({ onDone, solved }: { onDone: () => void; solved?: boolean }) {
  // Wide screens: guest cards | board | tools, like a suspect sheet. Phones: board, tools, then cards.
  const { cw } = useLayout();
  const wide = cw >= 900;
  const W = wide ? Math.max(280, Math.min(560, cw - 38 - 280 - 190 - 40)) : Math.max(220, Math.min(560, cw - 38));
  const P = useMemo(() => pick(HOTEL[TODAY_SIZE.hotel[weekday()]]), []);
  const n = P.n;
  // pos: square per guest. notes: small initials per square. xm: ✕ set by hand. xa: ✕ added by placed guests (a count).
  const blank = (): HState => ({ pos: Array(n).fill(-1), notes: Array.from({ length: n * n }, () => []), xm: Array(n * n).fill(false), xa: Array(n * n).fill(0) });
  const [S, sRef, setS] = useLive<HState>(blank);
  const hist = useRef<HState[]>([]);
  const [tool, setTool] = useState<Tool>('note');
  const [sel, setSel] = useState(0);
  const selRef = useRef(0); selRef.current = sel;
  const [why, setWhy] = useState<{ text: string; cell: number; clues: number[] } | null>(null);
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
  const press = useRef<null | { c: number; alt: boolean; moved: boolean; done: boolean; timer: any; paint?: (k: number) => void }>(null);
  useEffect(() => { if (solved && !wonRef.current) { const s0 = blank(); P.sol.forEach((c, x) => place(s0, x, c)); setS(s0); setWon(true); wonRef.current = true; } }, [solved]);
  const u = W / n, night = themeMode() === 'night';
  // The selected guest's letters gently grow and shrink, so it's always clear who you're placing.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const make = () => Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    let loop = make();
    loop.start();
    // An animation started while the app was in the background can stall, so start a fresh loop on return
    // (a stopped Animated.loop can't be started again).
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') { loop.stop(); pulse.setValue(0); loop = make(); loop.start(); } });
    return () => { loop.stop(); sub.remove(); };
  }, []);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });

  const clone = (s: HState): HState => ({ pos: s.pos.slice(), notes: s.notes.map((a) => a.slice()), xm: s.xm.slice(), xa: s.xa.slice() });
  const line = (c: number) => { const r = Math.floor(c / n), col = c % n, out: number[] = []; for (let k = 0; k < n; k++) { if (k !== col) out.push(r * n + k); if (k !== r) out.push(k * n + col); } return out; };
  const unplace = (s: HState, x: number) => {
    const c = s.pos[x]; if (c < 0) return;
    s.pos[x] = -1; for (const k of line(c)) s.xa[k] = Math.max(0, s.xa[k] - 1);
  };
  const place = (s: HState, x: number, c: number) => {
    unplace(s, x);
    const other = s.pos.indexOf(c); if (other >= 0) unplace(s, other);
    s.pos[x] = c; s.notes[c] = []; s.xm[c] = false;
    for (const k of line(c)) s.xa[k]++;
  };
  const isX = (s: HState, c: number) => s.xm[c] || s.xa[c] > 0;
  const commit = (s: HState) => {
    setS(s);
    if (s.pos[selRef.current] >= 0) { const free = s.pos.findIndex((c) => c < 0); if (free >= 0) setSel(free); }
    if (!wonRef.current && s.pos.every((c, x) => c === P.sol[x])) { wonRef.current = true; setWon(true); setWhy(null); onDone(); }
  };
  const snap = () => { hist.current.push(sRef.current); if (hist.current.length > 200) hist.current.shift(); };
  const cellAt = (x: number, y: number) => { const cx = Math.floor(x / u), cy = Math.floor(y / u); return cx >= 0 && cy >= 0 && cx < n && cy < n ? cy * n + cx : -1; };

  // What a quick tap (or the first square of a drag) does, given the tool. Returns a painter for the rest of the drag.
  const painterFor = (c: number, alt: boolean): ((k: number) => void) => {
    const s0 = sRef.current;
    const t: Tool = alt ? 'x' : tool;
    if (t === 'erase') return (k) => { const s = clone(sRef.current); if (s.pos.includes(k)) unplace(s, s.pos.indexOf(k)); s.notes[k] = []; s.xm[k] = false; commit(s); };
    if (t === 'x') { const v = !s0.xm[c]; return (k) => { if (sRef.current.pos.includes(k) || sRef.current.xm[k] === v) return; const s = clone(sRef.current); s.xm[k] = v; commit(s); }; }
    const g = selRef.current, add = !s0.notes[c].includes(g);
    return (k) => {
      const cur = sRef.current; if (cur.pos.includes(k) || cur.notes[k].includes(g) === add) return;
      const s = clone(cur); s.notes[k] = add ? [...s.notes[k], g].sort((a, b) => a - b) : s.notes[k].filter((v) => v !== g); commit(s);
    };
  };
  const input = useBoardPointer({
    down: (x, y, alt) => {
      if (wonRef.current) return;
      const c = cellAt(x, y); if (c < 0 || blocked(P, c)) return;
      const p = { c, alt, moved: false, done: false, timer: null as any };
      // Hold: place the selected guest (or take away the guest already there).
      if (!alt) p.timer = setTimeout(() => {
        if (press.current !== p || p.moved) return;
        p.done = true; snap();
        const s = clone(sRef.current), there = s.pos.indexOf(c);
        if (there >= 0) unplace(s, there); else place(s, selRef.current, c);
        commit(s);
      }, HOLD_MS);
      press.current = p;
    },
    move: (x, y) => {
      const p = press.current; if (!p || p.done) return;
      const c = cellAt(x, y); if (c < 0 || c === p.c && !p.moved || blocked(P, c)) return;
      if (!p.moved) {
        p.moved = true; clearTimeout(p.timer); snap();
        if (sRef.current.pos.includes(p.c) && tool !== 'erase' && !p.alt) { p.done = true; return; }
        p.paint = painterFor(p.c, p.alt); p.paint(p.c);
      }
      p.paint && p.paint(c);
    },
    up: () => {
      const p = press.current; press.current = null; if (!p) return;
      clearTimeout(p.timer);
      if (p.done || p.moved) return;
      // Quick tap. A placed guest's square is locked: only the eraser (or another hold) changes it.
      if (sRef.current.pos.includes(p.c) && tool !== 'erase') return;
      snap(); painterFor(p.c, p.alt)(p.c);
    },
  });
  const undo = () => { const prev = hist.current.pop(); if (prev) { setS(prev); setWhy(null); } };
  const clearAll = () => { snap(); commit(blank()); setWhy(null); };
  const doHint = () => {
    const s = clone(sRef.current);
    for (let x = 0; x < n; x++) if (s.pos[x] >= 0 && s.pos[x] !== P.sol[x]) {
      const c = s.pos[x]; snap(); unplace(s, x);
      setWhy({ text: `${GUESTS[P.people[x]].name} can’t be there. Took them off the plan.`, cell: c, clues: [] }); commit(s); setSel(x); return;
    }
    const h = hotelNext(P, s.pos);
    const x = h ? h.x : s.pos.indexOf(-1); if (x < 0) return;
    const cell = h ? h.cell : P.sol[x];
    snap(); place(s, x, cell);
    setWhy({ text: h ? h.why : `${GUESTS[P.people[x]].name} goes here once several clues are combined.`, cell, clues: h ? h.clues : [] });
    commit(s);
  };
  const rowCount: Record<number, number> = {}, colCount: Record<number, number> = {};
  S.pos.forEach((c) => { if (c >= 0) { rowCount[Math.floor(c / n)] = (rowCount[Math.floor(c / n)] || 0) + 1; colCount[c % n] = (colCount[c % n] || 0) + 1; } });
  const labeled = new Set<number>();
  const t = thief(P), room = ROOMS[P.area[P.cake]];
  const toolBtn = (k: Tool, label: string, icon: string) => (
    <Btn sm kind="ghost" icon={icon} label={label} onPress={() => setTool(tool === k ? 'note' : k)} style={[wide && gs.toolWide, tool === k && { borderWidth: 1, borderColor: C.ember }]} />
  );
  const board = (
    <View ref={input.ref} {...input.handlers} style={{ width: W, height: W, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: C.lineHi }}>
      {Array.from({ length: n * n }, (_, c) => {
        const x = c % n, y = Math.floor(c / n), r = ROOMS[P.area[c]], o = P.obj[c], who = S.pos.indexOf(c);
        const first = !labeled.has(P.area[c]); if (first) labeled.add(P.area[c]);
        const bad = who >= 0 && ((rowCount[y] || 0) > 1 || (colCount[x] || 0) > 1);
        const g = who >= 0 ? GUESTS[P.people[who]] : null;
        const showX = !g && !blocked(P, c) && isX(S, c) && !won;
        const notes = !g && !showX && !won ? S.notes[c] : [];
        // Notes sit in the middle like a placed letter, just smaller; several notes share the space.
        const noteSize = u * (notes.length <= 1 ? 0.38 : notes.length === 2 ? 0.3 : notes.length <= 4 ? 0.24 : 0.19);
        return (
          <View key={c} pointerEvents="none"
            style={[gs.room, { left: x * u, top: y * u, width: u, height: u, backgroundColor: night ? r.colorN : r.color,
              borderRightWidth: x < n - 1 && P.area[c + 1] !== P.area[c] ? 2.5 : 0.5, borderBottomWidth: y < n - 1 && P.area[c + n] !== P.area[c] ? 2.5 : 0.5 }]}>
            {first ? <Text style={[gs.roomT, { fontSize: Math.max(9, u * 0.15) }]} numberOfLines={1}>{r.label}</Text> : null}
            {o ? <Text style={g || showX || notes.length ? [gs.furnSmall, { fontSize: u * 0.24 }] : { fontSize: u * 0.42 }}>{FURN[o].e}</Text> : null}
            {g ? <Animated.Text style={[gs.big, { fontSize: u * 0.56, color: g.color }, bad && { color: C.rose }, won && who === t && { textDecorationLine: 'underline' }, who === sel && !won && { transform: [{ scale: pulseScale }] }]}>{g.ini}</Animated.Text>
              : showX ? <Text style={[gs.x, { fontSize: u * 0.36 }]}>✕</Text>
              : notes.length ? (
                <View style={[gs.notes, { width: u * 0.86 }]}>
                  {notes.map((v) => {
                    const q = GUESTS[P.people[v]];
                    return <Animated.Text key={v} style={[gs.note, { fontSize: noteSize, lineHeight: noteSize * 1.15, color: q.color }, v === sel && { transform: [{ scale: pulseScale }] }]}>{q.ini}</Animated.Text>;
                  })}
                </View>
              ) : null}
            {why && why.cell === c ? <View style={[StyleSheet.absoluteFill, { borderWidth: 3, borderColor: C.plum, borderRadius: 4 }]} /> : null}
          </View>
        );
      })}
    </View>
  );
  const message = won ? <Reply><T><Text style={{ fontFamily: F.bodyBold }}>It was {GUESTS[P.people[t]].name}.</Text> The only guest in the {room.name} with the safe. Case closed. A new mystery arrives tomorrow.</T></Reply>
    : why ? <Reply><T style={{ fontSize: 14 }}>{why.text}</T></Reply> : null;
  // One card per guest, with the clues about them, like a suspect sheet. Tapping a card picks that guest.
  const cardW = wide ? 280 : cw >= 560 ? (cw - 38 - 10) / 2 : cw - 38;
  const cards = (
    <View style={wide ? { width: 280, gap: 10 } : gs.cardGrid}>
      {P.people.map((gi, x) => {
        const g = GUESTS[gi], on = x === sel && !won, placed = S.pos[x] >= 0;
        const mine = P.clues.map((c, i) => [c, i] as const).filter(([c]) => c.p === x);
        return (
          <Pressable key={x} onPress={() => setSel(x)} accessibilityState={{ selected: on }}
            style={(p: any) => [gs.card, { width: cardW }, on && { borderColor: g.color }, p.hovered && !on && { borderColor: C.lineHi }]}>
            <View style={gs.cardHead}>
              <View style={gs.cardLetterBox}><Animated.Text style={[gs.cardLetter, { color: g.color }, on && { transform: [{ scale: pulseScale }] }]}>{g.ini}</Animated.Text></View>
              <Text style={gs.cardName}>{g.name}</Text>
              {placed ? <Icon name="check" size={18} /> : null}
            </View>
            {mine.length ? mine.map(([c, i]) => (
              <T key={i} style={[{ fontSize: 13.5, lineHeight: 19 }, why?.clues.includes(i) && { fontFamily: F.bodyBold, color: C.emberHi }]}>{clueText(P, c)}</T>
            )) : <T muted style={{ fontSize: 13 }}>No clue about {g.name}. Work it out from the others.</T>}
          </Pressable>
        );
      })}
    </View>
  );
  const tools = (
    <View style={wide ? { width: 190, gap: 8 } : gs.controls}>
      {!won ? toolBtn('x', 'Impossible', 'x') : null}
      {!won ? (
        <Pressable onPress={() => setTool(tool === 'erase' ? 'note' : 'erase')} onLongPress={clearAll} delayLongPress={600} accessibilityRole="button"
          accessibilityHint="Hold to clear everything" style={[s.btn, s.btnSm, { backgroundColor: C.night4 }, wide && gs.toolWide, tool === 'erase' && { borderWidth: 1, borderColor: C.ember }]}>
          <Icon name="eraser" size={16} color={C.cream} /><Text style={[s.btnT, { fontSize: 13.5, color: C.cream }]}>Eraser</Text>
        </Pressable>
      ) : null}
      {!won ? <Btn sm kind="ghost" icon="undo" label="Undo" onPress={undo} style={wide ? gs.toolWide : null} /> : null}
      {!won ? <Btn sm kind="ghost" icon="bulb" label="Hint" onPress={doHint} style={wide ? gs.toolWide : null} /> : null}
    </View>
  );
  return (
    <View style={{ gap: 14 }}>
      {wide ? (
        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
          {cards}
          <View style={{ gap: 12, width: W }}>{board}{message}</View>
          {tools}
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <View style={{ alignSelf: 'center' }}>{board}</View>
          {message}
          {tools}
          {cards}
        </View>
      )}
    </View>
  );
}

const gs = themed(() => StyleSheet.create({
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  cell: { position: 'absolute', backgroundColor: C.night3, alignItems: 'center', justifyContent: 'center' },
  hl: { position: 'absolute', backgroundColor: C.navySoft, borderRadius: 6 },
  rowClue: { position: 'absolute', left: 0, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  colClue: { position: 'absolute', top: 0, justifyContent: 'flex-end', alignItems: 'center' },
  clue: { fontFamily: F.bodyBold, color: C.cream, textAlign: 'center' },
  x: { fontFamily: F.bodyBold, color: C.muted },
  rule: { position: 'absolute', backgroundColor: C.lineHi },
  num: { alignItems: 'center', justifyContent: 'center' },
  numT: { fontFamily: F.displayBold, color: C.white },
  room: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderColor: C.lineHi },
  roomT: { position: 'absolute', left: 4, top: 2, fontFamily: F.label, color: C.creamDim },
  furnSmall: { position: 'absolute', right: 3, bottom: 1 },
  guest: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white },
  guestT: { fontFamily: F.displayBold, color: C.white },
  guests: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  gchip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.night2, paddingLeft: 10, paddingRight: 12, paddingVertical: 6 },
  gchipOn: { borderColor: C.ember, backgroundColor: C.night4 },
  gletter: { fontFamily: F.displayBold, fontSize: 17, color: C.cream, minWidth: 14, textAlign: 'center' },
  big: { fontFamily: F.displayBold, color: C.cream },
  notes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 4 },
  note: { fontFamily: F.displayBold, textAlign: 'center' },
  toolWide: { alignSelf: 'stretch' },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { backgroundColor: C.night3, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', padding: 12, gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  cardLetterBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.night2, alignItems: 'center', justifyContent: 'center' },
  cardLetter: { fontFamily: F.displayBold, fontSize: 24 },
  cardName: { flex: 1, fontFamily: F.display, fontSize: 16.5, color: C.cream },
  gname: { fontFamily: F.displayMed, fontSize: 14, color: C.cream },
  clues: { backgroundColor: C.night3, borderRadius: 14, padding: 14, gap: 6, marginTop: 14 },
}));
