import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

function useBoardWidth() { const { width } = useLayout(); return Math.min(460, width - 72); }

function Controls({ mode, onMode, onHint, onNext, done }: { mode?: [string, boolean]; onMode?: () => void; onHint: () => void; onNext: () => void; done: boolean }) {
  return (
    <View style={gs.controls}>
      {mode && !done ? <Btn sm kind="ghost" label={mode[0]} onPress={onMode} style={mode[1] ? { borderWidth: 1, borderColor: C.ember } : null} /> : null}
      {!done ? <Btn sm kind="ghost" icon="info" label="Hint" onPress={onHint} /> : null}
      <Btn sm kind="ghost" icon="refresh" label="Another puzzle" onPress={onNext} />
    </View>
  );
}

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
  const [st, setSt] = useState<number[]>(() => Array(n * n).fill(0));
  const [mark, setMark] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [won, setWon] = useState(false);
  useEffect(() => { setSt(Array(n * n).fill(0)); setHint(null); setWon(false); }, [P]);
  const u = W / (n + 0.62 * k + 0.3), off = W - n * u;
  const lineDone = (axis: 'row' | 'col', i: number) => {
    const got = lineClue(Array.from({ length: n }, (_, j) => (axis === 'row' ? st[i * n + j] : st[j * n + i])));
    const want = axis === 'row' ? rows[i] : cols[i];
    return got.length === want.length && got.every((v, j) => v === want[j]);
  };
  const apply = (next: number[]) => {
    setSt(next);
    if (!won && next.every((v, i) => (v === 1) === (sol[i] === 1))) { setWon(true); setHint(null); onDone(); }
  };
  const tap = (i: number) => { if (won) return; const next = st.slice(); next[i] = mark ? (st[i] === 2 ? 0 : 2) : (st[i] === 1 ? 0 : 1); apply(next); };
  const doHint = () => { const h = nonoHint(n, sol, st, rows, cols); if (!h) return; const next = st.slice(); next[h.cell] = h.value; setHint(h); apply(next); };
  const fs = Math.max(10, u * 0.42);
  return (
    <View>
      <T muted style={{ fontSize: 14 }}>The numbers give the runs of filled squares in each row and column, in order, with at least one blank between runs. Fill what you can work out; mark blanks with ✕. A picture appears at the end.</T>
      <View style={{ width: W, height: W, alignSelf: 'center', marginTop: 14 }}>
        {hint?.line ? <View style={[gs.hl, hint.line.axis === 'row' ? { left: 0, top: off + hint.line.i * u, width: W, height: u } : { top: 0, left: off + hint.line.i * u, width: u, height: W }]} /> : null}
        {Array.from({ length: n }, (_, i) => (
          <React.Fragment key={i}>
            <View style={[gs.rowClue, { top: off + i * u, height: u, width: off - 6 }]}>
              {(rows[i].length ? rows[i] : [0]).map((v, j) => <Text key={j} style={[gs.clue, { fontSize: fs, width: u * 0.62 }, lineDone('row', i) && { color: C.muted }]}>{v}</Text>)}
            </View>
            <View style={[gs.colClue, { left: off + i * u, width: u, height: off - 6 }]}>
              {(cols[i].length ? cols[i] : [0]).map((v, j) => <Text key={j} style={[gs.clue, { fontSize: fs, height: u * 0.62, lineHeight: u * 0.62 }, lineDone('col', i) && { color: C.muted }]}>{v}</Text>)}
            </View>
          </React.Fragment>
        ))}
        {st.map((v, i) => {
          const x = i % n, y = Math.floor(i / n);
          return (
            <Pressable key={i} onPress={() => tap(i)} accessibilityLabel={`Row ${y + 1}, column ${x + 1}`}
              style={[gs.cell, { left: off + x * u + 1.5, top: off + y * u + 1.5, width: u - 3, height: u - 3, borderRadius: u * 0.16 },
                (won ? sol[i] : v === 1) ? { backgroundColor: C.forest } : won ? { backgroundColor: 'transparent' } : null,
                hint && hint.cell === i ? { borderWidth: 2, borderColor: C.plum } : null]}>
              {!won && v === 2 ? <Text style={[gs.x, { fontSize: u * 0.42 }]}>✕</Text> : null}
            </Pressable>
          );
        })}
        {!won && n > 5 ? [5].filter((g) => g < n).map((g) => (
          <React.Fragment key={g}>
            <View pointerEvents="none" style={[gs.rule, { left: off + g * u - 1, top: off, width: 2, height: n * u }]} />
            <View pointerEvents="none" style={[gs.rule, { top: off + g * u - 1, left: off, height: 2, width: n * u }]} />
          </React.Fragment>
        )) : null}
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
  const [st, setSt] = useState<number[]>(fresh);
  const [mark, setMark] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [won, setWon] = useState(false);
  useEffect(() => { setSt(fresh()); setHint(null); setWon(false); }, [P]);
  const u = W / n;
  const apply = (next: number[]) => {
    setSt(next);
    if (!won && next.every((v, i) => (v === 1) === (sol[i] === 1))) { setWon(true); setHint(null); onDone(); }
  };
  const tap = (i: number) => {
    if (won || cl[i]) return;
    const target = mark ? 0 : 1, next = st.slice(); next[i] = st[i] === target ? -1 : target; apply(next);
  };
  const doHint = () => { const h = sightHint(n, cl, sol, st); if (!h) return; const next = st.slice(); next[h.cell] = h.value; setHint(h); apply(next); };
  const ray = new Set<number>();
  cl.forEach((v, i) => {
    if (!v) return; const x = i % n, y = Math.floor(i / n);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { let a = x + dx, b = y + dy; while (a >= 0 && b >= 0 && a < n && b < n && st[b * n + a] !== 1) { ray.add(b * n + a); a += dx; b += dy; } }
  });
  return (
    <View>
      <T muted style={{ fontSize: 14 }}>Each number says how many squares it can see in straight lines (up, down, left, right), counting itself. Shade squares to block the view. Shaded squares never touch side by side, and the open squares all stay connected.</T>
      <View style={{ width: W, height: W, alignSelf: 'center', marginTop: 14 }}>
        {st.map((v, i) => {
          const x = i % n, y = Math.floor(i / n), seen = cl[i] ? sightSeen(st, n, i) : null, ok = !!seen && seen.min === cl[i] && seen.max === cl[i];
          return (
            <Pressable key={i} onPress={() => tap(i)} accessibilityLabel={cl[i] ? `Number ${cl[i]}` : `Row ${y + 1}, column ${x + 1}`}
              style={[gs.cell, { left: x * u + 2, top: y * u + 2, width: u - 4, height: u - 4, borderRadius: u * 0.16 },
                v === 1 ? { backgroundColor: C.forest } : won ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line } : ray.has(i) ? { backgroundColor: C.night4 } : null,
                hint && hint.cell === i ? { borderWidth: 2, borderColor: C.plum } : null]}>
              {cl[i] ? <View style={[gs.num, { width: u * 0.66, height: u * 0.66, borderRadius: u * 0.33, backgroundColor: won || ok ? C.forest : C.plum }]}><Text style={[gs.numT, { fontSize: u * 0.34 }]}>{cl[i]}</Text></View>
                : v === 0 && !won ? <View style={[gs.dot, { width: u * 0.14, height: u * 0.14, borderRadius: u * 0.07 }]} /> : null}
            </Pressable>
          );
        })}
      </View>
      {won ? <Reply><T><Text style={{ fontFamily: F.bodyBold }}>Solved.</Text> Every number sees exactly what it should. A new one arrives tomorrow.</T></Reply>
        : hint ? <Reply><T style={{ fontSize: 14 }}>{hint.why}</T></Reply> : null}
      <Controls mode={[mark ? 'Mode: mark open ·' : 'Mode: shade', mark]} onMode={() => setMark(!mark)} onHint={doHint} onNext={() => setVariant(variant + 1)} done={won} />
    </View>
  );
}

// ---------- Hotel Mystery ----------
export function HotelMystery({ onDone }: { onDone: () => void }) {
  const W = useBoardWidth();
  const [variant, setVariant] = useState(0);
  const P = useMemo(() => pick(HOTEL[TODAY_SIZE.hotel[weekday()]], variant), [variant]);
  const n = P.n;
  const [pos, setPos] = useState<number[]>(() => Array(n).fill(-1));
  const [sel, setSel] = useState(0);
  const [why, setWhy] = useState<{ text: string; cell: number; clues: number[] } | null>(null);
  const [won, setWon] = useState(false);
  useEffect(() => { setPos(Array(n).fill(-1)); setSel(0); setWhy(null); setWon(false); }, [P]);
  const u = W / n, night = themeMode() === 'night';
  const apply = (next: number[], nextSel?: number) => {
    setPos(next);
    const free = next.findIndex((c) => c < 0);
    setSel(nextSel ?? (free >= 0 ? free : sel));
    if (!won && next.every((c, x) => c === P.sol[x])) { setWon(true); setWhy(null); onDone(); }
  };
  const tap = (c: number) => {
    if (won || blocked(P, c)) return;
    const there = pos.indexOf(c), next = pos.slice();
    if (there >= 0) { next[there] = -1; apply(next, there); return; }
    next[sel] = c; apply(next);
  };
  const doHint = () => {
    for (let x = 0; x < n; x++) if (pos[x] >= 0 && pos[x] !== P.sol[x]) {
      const next = pos.slice(); const c = next[x]; next[x] = -1;
      setWhy({ text: `${GUESTS[P.people[x]].name} can’t be there. Moved them off the board.`, cell: c, clues: [] }); apply(next, x); return;
    }
    const s = hotelNext(P, pos);
    const x = s ? s.x : pos.indexOf(-1); if (x < 0) return;
    const cell = s ? s.cell : P.sol[x], next = pos.slice(); next[x] = cell;
    setWhy({ text: s ? s.why : `${GUESTS[P.people[x]].name} goes here once several clues are combined.`, cell, clues: s ? s.clues : [] });
    apply(next);
  };
  const rowCount: Record<number, number> = {}, colCount: Record<number, number> = {};
  pos.forEach((c) => { if (c >= 0) { rowCount[Math.floor(c / n)] = (rowCount[Math.floor(c / n)] || 0) + 1; colCount[c % n] = (colCount[c % n] || 0) + 1; } });
  const labeled = new Set<number>();
  const t = thief(P), room = ROOMS[P.area[P.cake]];
  return (
    <View>
      <T muted style={{ fontSize: 14 }}>A necklace has gone missing from the hotel safe. Place each guest on the floor plan: one per row and one per column, never on a plant, bookcase, fireplace or the safe. Whoever ends up alone in the room with the safe took it.</T>
      <View style={{ width: W, height: W, alignSelf: 'center', marginTop: 14, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: C.lineHi }}>
        {Array.from({ length: n * n }, (_, c) => {
          const x = c % n, y = Math.floor(c / n), r = ROOMS[P.area[c]], o = P.obj[c], who = pos.indexOf(c);
          const first = !labeled.has(P.area[c]); if (first) labeled.add(P.area[c]);
          const bad = who >= 0 && ((rowCount[y] || 0) > 1 || (colCount[x] || 0) > 1);
          const g = who >= 0 ? GUESTS[P.people[who]] : null;
          return (
            <Pressable key={c} onPress={() => tap(c)} accessibilityLabel={`${r.label}, row ${y + 1}, column ${x + 1}${g ? ', ' + g.name : ''}`}
              style={[gs.room, { left: x * u, top: y * u, width: u, height: u, backgroundColor: night ? r.colorN : r.color,
                borderRightWidth: x < n - 1 && P.area[c + 1] !== P.area[c] ? 2.5 : 0.5, borderBottomWidth: y < n - 1 && P.area[c + n] !== P.area[c] ? 2.5 : 0.5 }]}>
              {first ? <Text style={[gs.roomT, { fontSize: Math.max(9, u * 0.15) }]} numberOfLines={1}>{r.label}</Text> : null}
              {o ? <Text style={g ? [gs.furnSmall, { fontSize: u * 0.24 }] : { fontSize: u * 0.42 }}>{FURN[o].e}</Text> : null}
              {g ? (
                <View style={[gs.guest, { width: u * 0.6, height: u * 0.6, borderRadius: u * 0.3, backgroundColor: g.color },
                  bad && { borderColor: C.rose, borderWidth: 3 }, won && who === t && { borderColor: C.ember, borderWidth: 4 }]}>
                  <Text style={[gs.guestT, { fontSize: u * 0.28 }]}>{g.ini}</Text>
                </View>
              ) : null}
              {why && why.cell === c ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 3, borderColor: C.plum, borderRadius: 4 }]} /> : null}
            </Pressable>
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
      <Controls onHint={doHint} onNext={() => setVariant(variant + 1)} done={won} />
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
  dot: { backgroundColor: C.plum },
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
