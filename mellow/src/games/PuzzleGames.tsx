import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, themed, themeMode } from '../theme';
import { Btn, Reply, T } from '../components/ui';
import { useLayout } from '../layout';
import { HOTEL, PICS, SIGHT } from './puzzles';
import { blocked, clueText, FURN, GUESTS, Hint, hotelNext, lineClue, nonoHint, ROOMS, sightHint, sightSeen, thief } from './engines';

// One puzzle a day: everyone gets the same one, and it grows a little through the week (Monday small, weekend big).
// "Another puzzle" is there for the demo; the real app would show only today's.
const dayOfYear = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5);
const weekday = () => (new Date().getDay() + 6) % 7;
export const TODAY_SIZE = { nono: [5, 5, 7, 7, 8, 10, 10], sight: [5, 5, 6, 6, 6, 7, 7], hotel: [4, 4, 5, 5, 5, 6, 6] };
const pick = <T,>(list: T[], variant: number) => list[(dayOfYear() + variant) % list.length];

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
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => { start.x = e.nativeEvent.locationX; start.y = e.nativeEvent.locationY; live.current.down(start.x, start.y, false); },
      onPanResponderMove: (_, g) => live.current.move(start.x + g.dx, start.y + g.dy),
      onPanResponderRelease: () => live.current.up(),
      onPanResponderTerminate: () => live.current.up(),
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

function Controls({ mode, onMode, onHint, onNext, done }: { mode?: [string, boolean]; onMode?: () => void; onHint: () => void; onNext: () => void; done: boolean }) {
  return (
    <View style={gs.controls}>
      {mode && !done ? <Btn sm kind="ghost" label={mode[0]} onPress={onMode} style={mode[1] ? { borderWidth: 1, borderColor: C.ember } : null} /> : null}
      {!done ? <Btn sm kind="ghost" icon="info" label="Hint" onPress={onHint} /> : null}
      <Btn sm kind="ghost" icon="refresh" label="Another puzzle" onPress={onNext} />
    </View>
  );
}
const TIP = 'Tap a square to fill it, tap again for ✕, once more to clear. Drag to do several at once.' + (Platform.OS === 'web' ? ' Right-click marks ✕.' : '');

// ---------- Hidden Picture ----------
export function HiddenPicture({ onDone }: { onDone: () => void }) {
  const W = useBoardWidth();
  const [variant, setVariant] = useState(0);
  const P = useMemo(() => {
    const n = TODAY_SIZE.nono[weekday()], names = Object.keys(PICS[n]), name = pick(names, variant);
    const sol = PICS[n][name].join('').split('').map((c) => (c === '#' ? 1 : 0));
    const grid = (r: number, c: number) => sol[r * n + c];
    const rows = Array.from({ length: n }, (_, r) => lineClue(Array.from({ length: n }, (_, c) => grid(r, c))));
    const cols = Array.from({ length: n }, (_, c) => lineClue(Array.from({ length: n }, (_, r) => grid(r, c))));
    return { n, name, sol, rows, cols, k: Math.max(1, ...rows.map((x) => x.length), ...cols.map((x) => x.length)) };
  }, [variant]);
  const { n, sol, rows, cols, k } = P;
  // 0 empty, 1 filled, 2 marked ✕
  const [st, stRef, setSt] = useLive<number[]>(() => Array(n * n).fill(0));
  const [mark, setMark] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
  const drag = useRef<number | null>(null);
  useEffect(() => { setSt(Array(n * n).fill(0)); setHint(null); setWon(false); wonRef.current = false; }, [P]);
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
      <T muted style={{ fontSize: 14 }}>The numbers give the runs of filled squares in each row and column, in order, with at least one blank between runs. Fill what you can work out and mark blanks with ✕. A picture appears at the end.</T>
      <T muted style={{ fontSize: 13, marginTop: 4 }}>{TIP} Tap a number to cross out the rest of its line.</T>
      <View ref={input.ref} {...input.handlers} style={{ width: W, height: W, alignSelf: 'center', marginTop: 14 }}>
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
      {won ? <Reply><T><Text style={{ fontFamily: F.bodyBold }}>It was {P.name}.</Text> Every square worked out by logic. A new picture arrives tomorrow.</T></Reply>
        : hint ? <Reply><T style={{ fontSize: 14 }}>{hint.why}</T></Reply> : null}
      <Controls mode={[mark ? 'Mode: mark ✕' : 'Mode: fill', mark]} onMode={() => setMark(!mark)} onHint={doHint} onNext={() => setVariant(variant + 1)} done={won} />
    </View>
  );
}

// ---------- Line of Sight ----------
export function LineOfSight({ onDone }: { onDone: () => void }) {
  const W = useBoardWidth();
  const [variant, setVariant] = useState(0);
  const P = useMemo(() => {
    const n = TODAY_SIZE.sight[weekday()], p = pick(SIGHT[n], variant);
    return { n, cl: p.c.split(',').map(Number), sol: p.s.split('').map(Number) };
  }, [variant]);
  const { n, cl, sol } = P;
  const fresh = () => cl.map((v) => (v ? 0 : -1));
  // -1 undecided, 0 marked ✕ (stays open), 1 shaded
  const [st, stRef, setSt] = useLive<number[]>(fresh);
  const [mark, setMark] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
  const drag = useRef<number | null>(null);
  useEffect(() => { setSt(fresh()); setHint(null); setWon(false); wonRef.current = false; }, [P]);
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
      <T muted style={{ fontSize: 14 }}>Each number says how many squares it can see in straight lines (up, down, left, right), counting itself. Shade squares to block the view. Shaded squares never touch side by side, and the open squares all stay connected.</T>
      <T muted style={{ fontSize: 13, marginTop: 4 }}>{TIP.replace('fill', 'shade')} A ✕ means the square stays open.</T>
      <View ref={input.ref} {...input.handlers} style={{ width: W, height: W, alignSelf: 'center', marginTop: 14 }}>
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
      {won ? <Reply><T><Text style={{ fontFamily: F.bodyBold }}>Solved.</Text> Every number sees exactly what it should. A new one arrives tomorrow.</T></Reply>
        : hint ? <Reply><T style={{ fontSize: 14 }}>{hint.why}</T></Reply> : null}
      <Controls mode={[mark ? 'Mode: mark ✕' : 'Mode: shade', mark]} onMode={() => setMark(!mark)} onHint={doHint} onNext={() => setVariant(variant + 1)} done={won} />
    </View>
  );
}

// ---------- Hotel Mystery ----------
export function HotelMystery({ onDone }: { onDone: () => void }) {
  const W = useBoardWidth();
  const [variant, setVariant] = useState(0);
  const P = useMemo(() => pick(HOTEL[TODAY_SIZE.hotel[weekday()]], variant), [variant]);
  const n = P.n;
  const [pos, posRef, setPos] = useLive<number[]>(() => Array(n).fill(-1));
  // ✕ notes: "nobody is here". They don't count for the solution.
  const [marks, marksRef, setMarks] = useLive<boolean[]>(() => Array(n * n).fill(false));
  const [sel, setSel] = useState(0);
  const [mark, setMark] = useState(false);
  const [why, setWhy] = useState<{ text: string; cell: number; clues: number[] } | null>(null);
  const [won, setWon] = useState(false);
  const [hover, setHover] = useState(-1);
  const wonRef = useRef(false);
  // A press either paints ✕ notes or carries a guest; a guest is dropped where the press ends.
  const drag = useRef<null | { kind: 'mark'; v: boolean } | { kind: 'guest'; x: number; from: number; fresh: boolean; at: number }>(null);
  useEffect(() => { setPos(Array(n).fill(-1)); setMarks(Array(n * n).fill(false)); setSel(0); setWhy(null); setWon(false); wonRef.current = false; }, [P]);
  const u = W / n, night = themeMode() === 'night';
  const commit = (next: number[], nextSel?: number) => {
    setPos(next);
    const free = next.findIndex((c) => c < 0);
    setSel(nextSel ?? (free >= 0 ? free : sel));
    if (!wonRef.current && next.every((c, x) => c === P.sol[x])) { wonRef.current = true; setWon(true); setWhy(null); onDone(); }
  };
  const clearMark = (c: number) => { if (marksRef.current[c]) { const m = marksRef.current.slice(); m[c] = false; setMarks(m); } };
  const cellAt = (x: number, y: number) => { const cx = Math.floor(x / u), cy = Math.floor(y / u); return cx >= 0 && cy >= 0 && cx < n && cy < n ? cy * n + cx : -1; };
  const input = useBoardPointer({
    down: (x, y, alt) => {
      if (wonRef.current) return;
      const c = cellAt(x, y); if (c < 0 || blocked(P, c)) return;
      const there = posRef.current.indexOf(c);
      if (alt || mark) {
        if (there >= 0) return;
        const v = !marksRef.current[c]; drag.current = { kind: 'mark', v };
        const m = marksRef.current.slice(); m[c] = v; setMarks(m); return;
      }
      if (there >= 0) { drag.current = { kind: 'guest', x: there, from: c, fresh: false, at: c }; setHover(c); return; }
      const next = posRef.current.slice(); next[sel] = c; clearMark(c);
      drag.current = { kind: 'guest', x: sel, from: c, fresh: true, at: c };
      setPos(next); setHover(c);
    },
    move: (x, y) => {
      const d = drag.current, c = cellAt(x, y); if (!d || c < 0) return;
      if (d.kind === 'mark') {
        if (blocked(P, c) || posRef.current.includes(c) || marksRef.current[c] === d.v) return;
        const m = marksRef.current.slice(); m[c] = d.v; setMarks(m);
      } else if (c !== d.at) { d.at = c; setHover(c); }
    },
    up: () => {
      const d = drag.current; drag.current = null; setHover(-1);
      if (!d || d.kind !== 'guest') return;
      const next = posRef.current.slice();
      if (d.at === d.from) { if (!d.fresh) { next[d.x] = -1; commit(next, d.x); } else commit(next); return; }
      if (blocked(P, d.at) || (next.includes(d.at) && next.indexOf(d.at) !== d.x)) { commit(next); return; }
      next[d.x] = d.at; clearMark(d.at); commit(next);
    },
  });
  const doHint = () => {
    const pos0 = posRef.current;
    for (let x = 0; x < n; x++) if (pos0[x] >= 0 && pos0[x] !== P.sol[x]) {
      const next = pos0.slice(); const c = next[x]; next[x] = -1;
      setWhy({ text: `${GUESTS[P.people[x]].name} can’t be there. Moved them off the board.`, cell: c, clues: [] }); commit(next, x); return;
    }
    const s = hotelNext(P, pos0);
    const x = s ? s.x : pos0.indexOf(-1); if (x < 0) return;
    const cell = s ? s.cell : P.sol[x], next = pos0.slice(); next[x] = cell; clearMark(cell);
    setWhy({ text: s ? s.why : `${GUESTS[P.people[x]].name} goes here once several clues are combined.`, cell, clues: s ? s.clues : [] });
    commit(next);
  };
  const rowCount: Record<number, number> = {}, colCount: Record<number, number> = {};
  pos.forEach((c) => { if (c >= 0) { rowCount[Math.floor(c / n)] = (rowCount[Math.floor(c / n)] || 0) + 1; colCount[c % n] = (colCount[c % n] || 0) + 1; } });
  const labeled = new Set<number>();
  const t = thief(P), room = ROOMS[P.area[P.cake]];
  return (
    <View>
      <T muted style={{ fontSize: 14 }}>A necklace has gone missing from the hotel safe. Place each guest on the floor plan: one per row and one per column, never on a plant, bookcase, fireplace or the safe. Whoever ends up alone in the room with the safe took it.</T>
      <T muted style={{ fontSize: 13, marginTop: 4 }}>Pick a guest below and tap a square. Drag a guest to move them. {Platform.OS === 'web' ? 'Right-click' : 'Use the mode button'} to mark ✕ where nobody can be.</T>
      <View ref={input.ref} {...input.handlers} style={{ width: W, height: W, alignSelf: 'center', marginTop: 14, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: C.lineHi }}>
        {Array.from({ length: n * n }, (_, c) => {
          const x = c % n, y = Math.floor(c / n), r = ROOMS[P.area[c]], o = P.obj[c], who = pos.indexOf(c);
          const first = !labeled.has(P.area[c]); if (first) labeled.add(P.area[c]);
          const bad = who >= 0 && ((rowCount[y] || 0) > 1 || (colCount[x] || 0) > 1);
          const g = who >= 0 ? GUESTS[P.people[who]] : null;
          return (
            <View key={c} pointerEvents="none"
              style={[gs.room, { left: x * u, top: y * u, width: u, height: u, backgroundColor: night ? r.colorN : r.color,
                borderRightWidth: x < n - 1 && P.area[c + 1] !== P.area[c] ? 2.5 : 0.5, borderBottomWidth: y < n - 1 && P.area[c + n] !== P.area[c] ? 2.5 : 0.5 }]}>
              {first ? <Text style={[gs.roomT, { fontSize: Math.max(9, u * 0.15) }]} numberOfLines={1}>{r.label}</Text> : null}
              {o ? <Text style={g ? [gs.furnSmall, { fontSize: u * 0.24 }] : { fontSize: u * 0.42 }}>{FURN[o].e}</Text> : null}
              {!g && !o && marks[c] && !won ? <Text style={[gs.x, { fontSize: u * 0.36 }]}>✕</Text> : null}
              {g ? (
                <View style={[gs.guest, { width: u * 0.6, height: u * 0.6, borderRadius: u * 0.3, backgroundColor: g.color },
                  bad && { borderColor: C.rose, borderWidth: 3 }, won && who === t && { borderColor: C.ember, borderWidth: 4 }]}>
                  <Text style={[gs.guestT, { fontSize: u * 0.28 }]}>{g.ini}</Text>
                </View>
              ) : null}
              {hover === c || (why && why.cell === c) ? <View style={[StyleSheet.absoluteFill, { borderWidth: 3, borderColor: hover === c ? C.ember : C.plum, borderRadius: 4 }]} /> : null}
            </View>
          );
        })}
      </View>
      {!won ? (
        <View style={gs.guests}>
          {P.people.map((gi, x) => {
            const g = GUESTS[gi], placed = pos[x] >= 0, on = x === sel;
            return (
              <Pressable key={x} onPress={() => setSel(x)} accessibilityState={{ selected: on }} style={(p: any) => [gs.gchip, on && gs.gchipOn, p.hovered && !on && { borderColor: C.lineHi }]}>
                <View style={[gs.gdot, { backgroundColor: g.color }]}><Text style={gs.gdotT}>{g.ini}</Text></View>
                <Text style={[gs.gname, placed && { color: C.moss }]}>{g.name}{placed ? ' ✓' : ''}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {won ? <Reply><T><Text style={{ fontFamily: F.bodyBold }}>It was {GUESTS[P.people[t]].name}.</Text> The only guest in the {room.name} with the safe. Case closed until tomorrow.</T></Reply>
        : why ? <Reply><T style={{ fontSize: 14 }}>{why.text}</T></Reply> : null}
      <View style={gs.clues}>
        {P.clues.map((c, i) => (
          <T key={i} style={[{ fontSize: 14.5 }, why?.clues.includes(i) && { fontFamily: F.bodyBold, color: C.emberHi }]}>{i + 1}. {clueText(P, c)}</T>
        ))}
      </View>
      <Controls mode={[mark ? 'Mode: mark ✕' : 'Mode: place', mark]} onMode={() => setMark(!mark)} onHint={doHint} onNext={() => setVariant(variant + 1)} done={won} />
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
  gchip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.night2, paddingLeft: 5, paddingRight: 12, paddingVertical: 5 },
  gchipOn: { borderColor: C.ember, backgroundColor: C.night4 },
  gdot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gdotT: { fontFamily: F.displayBold, fontSize: 12.5, color: C.white },
  gname: { fontFamily: F.displayMed, fontSize: 14, color: C.cream },
  clues: { backgroundColor: C.night3, borderRadius: 14, padding: 14, gap: 6, marginTop: 14 },
}));
