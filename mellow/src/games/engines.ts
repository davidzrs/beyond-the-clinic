// Deduction engines for the three daily puzzles. Each hint is a step that follows from the rules,
// with a plain-language reason, so a hint teaches the move instead of just revealing it.
import type { HotelClue, HotelPuzzle } from './puzzles';

export type Hint = { cell: number; value: number; why: string; line?: { axis: 'row' | 'col'; i: number }; clues?: number[] };
const D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const where = (n: number, i: number) => `row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}`;
function nb(n: number, i: number) {
  const x = i % n, y = Math.floor(i / n), r: number[] = [];
  for (const [dx, dy] of D4) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < n && b < n) r.push(b * n + a); }
  return r;
}

// ---------- Hidden Picture (nonogram) ----------
// State per cell: 0 empty, 1 filled, 2 marked blank.
export const lineClue = (line: number[]) => { const r: number[] = []; let c = 0; for (const v of line) { if (v === 1) c++; else if (c) { r.push(c); c = 0; } } if (c) r.push(c); return r; };
const memo: Record<string, number[][]> = {};
function placements(n: number, cl: number[]) {
  const key = n + ':' + cl.join(',');
  if (memo[key]) return memo[key];
  const out: number[][] = [];
  const rec = (i: number, pos: number, arr: number[]) => {
    if (i === cl.length) { out.push(arr.slice()); return; }
    const rest = cl.slice(i + 1).reduce((a, b) => a + b + 1, 0);
    for (let s = pos; s + cl[i] + rest <= n; s++) { const a = arr.slice(); for (let k = s; k < s + cl[i]; k++) a[k] = 1; rec(i + 1, s + cl[i] + 1, a); }
  };
  rec(0, 0, new Array(n).fill(0));
  return (memo[key] = out);
}
export function nonoHint(n: number, sol: number[], st: number[], rows: number[][], cols: number[][]): Hint | null {
  for (let i = 0; i < n * n; i++) {
    if (st[i] === 1 && !sol[i]) return { cell: i, value: 2, why: `${cap(where(n, i))}: this square was filled, but it stays blank. Marked it with ✕.` };
    if (st[i] === 2 && sol[i]) return { cell: i, value: 0, why: `${cap(where(n, i))}: this square was marked ✕, but it gets filled. Cleared it.` };
  }
  let best: { axis: 'row' | 'col'; i: number; j: number; v: number; clue: number[]; count: number } | null = null;
  for (const axis of ['row', 'col'] as const) for (let i = 0; i < n; i++) {
    const clue = axis === 'row' ? rows[i] : cols[i];
    const known = Array.from({ length: n }, (_, j) => { const s = axis === 'row' ? st[i * n + j] : st[j * n + i]; return s === 1 ? 1 : s === 2 ? 0 : -1; });
    if (known.every((v) => v >= 0)) continue;
    const opts = placements(n, clue).filter((p) => p.every((v, j) => known[j] < 0 || known[j] === v));
    for (let j = 0; j < n; j++) {
      if (known[j] >= 0 || !opts.length) continue;
      const v = opts[0][j];
      if (opts.every((p) => p[j] === v) && (!best || opts.length < best.count)) best = { axis, i, j, v, clue, count: opts.length };
    }
  }
  if (!best) return null;
  const { axis, i, j, v, clue, count } = best;
  const used = clue.reduce((a, b) => a + b, 0) + Math.max(0, clue.length - 1);
  let why: string;
  if (!clue.length) why = 'the clue is 0, so the whole line stays blank.';
  else if (used === n) why = `the blocks fill all ${n} squares with no room to spare, so the whole line is fixed.`;
  else if (count === 1) why = 'with what you have already, there is only one way left to fit the blocks.';
  else if (v) why = `there are ${count} ways to fit the blocks around what you have, and this square is filled in all of them.`;
  else why = `there are ${count} ways to fit the blocks around what you have, and this square is blank in all of them. Mark it ✕.`;
  return { cell: axis === 'row' ? i * n + j : j * n + i, value: v ? 1 : 2, line: { axis, i }, why: `${axis === 'row' ? 'Row' : 'Column'} ${i + 1} (clue ${clue.length ? clue.join(' ') : '0'}): ${why}` };
}

// ---------- Line of Sight (Kurodoko) ----------
// State per cell: -1 undecided, 0 open, 1 shaded.
function openConnected(st: number[], n: number) {
  const start = st.indexOf(0); if (start < 0) return true;
  const seen = new Uint8Array(n * n), q = [start]; seen[start] = 1;
  for (let h = 0; h < q.length; h++) for (const j of nb(n, q[h])) if (!seen[j] && st[j] !== 1) { seen[j] = 1; q.push(j); }
  return st.every((v, i) => v !== 0 || seen[i]);
}
export function sightSeen(st: number[], n: number, i: number) {
  let min = 1, max = 1; const x = i % n, y = Math.floor(i / n);
  for (const [dx, dy] of D4) {
    let a = x + dx, b = y + dy, sure = true;
    while (a >= 0 && b >= 0 && a < n && b < n) { const s = st[b * n + a]; if (s === 1) break; max++; if (s === 0 && sure) min++; else sure = false; a += dx; b += dy; }
  }
  return { min, max };
}
function sightContra(st: number[], n: number, cl: number[]): string | null {
  for (let i = 0; i < n * n; i++) if (st[i] === 1) {
    if (cl[i]) return `the number at ${where(n, i)} would be shaded`;
    if (nb(n, i).some((j) => st[j] === 1)) return 'two shaded squares would touch';
  }
  for (let i = 0; i < n * n; i++) if (cl[i]) {
    const { min, max } = sightSeen(st, n, i);
    if (min > cl[i]) return `the ${cl[i]} at ${where(n, i)} would see too many squares`;
    if (max < cl[i]) return `the ${cl[i]} at ${where(n, i)} could not see ${cl[i]} squares`;
  }
  if (!openConnected(st, n)) return 'the open squares would be cut in two';
  return null;
}
function sightStep(st: number[], n: number, cl: number[]): Hint | null {
  for (let i = 0; i < n * n; i++) if (st[i] === 1) for (const j of nb(n, i)) if (st[j] === -1)
    return { cell: j, value: 0, why: `It touches the shaded square at ${where(n, i)}, and shaded squares never touch side by side. It stays open.` };
  for (let i = 0; i < n * n; i++) if (cl[i]) {
    const v = cl[i], { min, max } = sightSeen(st, n, i), x = i % n, y = Math.floor(i / n);
    if (max !== v && min !== v) continue;
    for (const [dx, dy] of D4) {
      let a = x + dx, b = y + dy, sure = true;
      while (a >= 0 && b >= 0 && a < n && b < n) {
        const c = b * n + a, s = st[c]; if (s === 1) break;
        if (s === -1) {
          if (max === v) return { cell: c, value: 0, why: `The ${v} at ${where(n, i)} only reaches ${v} if it sees every square it still can. This one stays open.` };
          if (min === v && sure) return { cell: c, value: 1, why: `The ${v} at ${where(n, i)} already sees ${v} squares, so the view has to stop here with a shaded square.` };
          sure = false;
        }
        a += dx; b += dy;
      }
    }
  }
  for (let u = 0; u < n * n; u++) if (st[u] === -1) {
    st[u] = 1; const ok = openConnected(st, n); st[u] = -1;
    if (!ok) return { cell: u, value: 0, why: 'Shading this square would cut the open squares in two. It stays open.' };
  }
  return null;
}
export function sightHint(n: number, cl: number[], sol: number[], st0: number[]): Hint | null {
  for (let i = 0; i < n * n; i++) if (st0[i] >= 0 && !cl[i] && st0[i] !== sol[i])
    return { cell: i, value: -1, why: `${cap(where(n, i))}: this square was ${sol[i] ? 'marked ✕, but it is shaded' : 'shaded, but it stays open'}. Cleared it.` };
  const st = st0.slice();
  const s = sightStep(st, n, cl); if (s) return s;
  const name = (v: number) => (v ? 'shaded' : 'open');
  for (let i = 0; i < n * n; i++) if (st[i] === -1) for (const v of [1, 0]) {
    const t = st.slice(); t[i] = v;
    let r: string | null = null;
    for (let k = 0; k < n * n + 2 && !r; k++) { r = sightContra(t, n, cl); if (r) break; const p = sightStep(t, n, cl); if (!p) break; t[p.cell] = p.value; }
    if (r) return { cell: i, value: 1 - v, why: `If this square were ${name(v)}, following the rules ${r}. So it is ${name(1 - v)}.` };
  }
  const i = st.findIndex((v, k) => v < 0 && !cl[k]);
  return i < 0 ? null : { cell: i, value: sol[i], why: 'This square follows from several rules at once.' };
}

// ---------- Hotel Mystery ----------
export const GUESTS = [
  { name: 'Iris', ini: 'I', color: '#3B82C4' },
  { name: 'Leo', ini: 'L', color: '#3F9A48' },
  { name: 'Nora', ini: 'N', color: '#CF634D' },
  { name: 'Max', ini: 'M', color: '#7A5BB0' },
  { name: 'Clara', ini: 'C', color: '#B9831A' },
  { name: 'Omar', ini: 'O', color: '#2B8F8A' },
];
export const ROOMS = [
  { name: 'library', label: 'Library', color: '#F6EAD6', colorN: '#3A3328' },
  { name: 'lounge', label: 'Lounge', color: '#DCECFB', colorN: '#24324F' },
  { name: 'bar', label: 'Bar', color: '#EFE3F4', colorN: '#352A45' },
  { name: 'winter garden', label: 'Garden', color: '#DBF1D4', colorN: '#21382C' },
  { name: 'study', label: 'Study', color: '#FBF2C9', colorN: '#3A3622' },
];
// b: furniture that fills the square (nobody stands there). Keys match the generated data.
export const FURN: Record<string, { e: string; name: string; b: boolean; next?: string; on?: string }> = {
  cofre: { e: '🔐', name: 'Safe', b: true, next: 'the safe' },
  planta: { e: '🪴', name: 'Plant', b: true, next: 'a plant' },
  estante: { e: '📚', name: 'Bookcase', b: true, next: 'a bookcase' },
  lareira: { e: '🔥', name: 'Fireplace', b: true, next: 'a fireplace' },
  poltrona: { e: '🛋️', name: 'Armchair', b: false, on: 'sitting in an armchair' },
  cadeira: { e: '🪑', name: 'Chair', b: false, on: 'sitting on a chair' },
  piano: { e: '🎹', name: 'Piano', b: false, on: 'sitting at the piano' },
};
const guest = (P: HotelPuzzle, x: number) => GUESTS[P.people[x]].name;
export const blocked = (P: HotelPuzzle, c: number) => !!(P.obj[c] && FURN[P.obj[c]].b);

// Compass directions between two guests. "Leo is northeast of Nora": Leo is in a row above Nora's
// AND a column to the right of hers, at any distance. North alone says nothing about the column.
// dr/dc: sign the row/column difference (Leo minus Nora) must have; 0 = no condition.
export const DIRS: Record<string, { word: string; dr: number; dc: number }> = {
  N: { word: 'north', dr: -1, dc: 0 }, S: { word: 'south', dr: 1, dc: 0 },
  E: { word: 'east', dr: 0, dc: 1 }, W: { word: 'west', dr: 0, dc: -1 },
  NE: { word: 'northeast', dr: -1, dc: 1 }, NW: { word: 'northwest', dr: -1, dc: -1 },
  SE: { word: 'southeast', dr: 1, dc: 1 }, SW: { word: 'southwest', dr: 1, dc: -1 },
};
// Is square a in direction d from square b?
export function dirOK(n: number, d: string, a: number, b: number) {
  const { dr, dc } = DIRS[d], r = Math.sign(Math.floor(a / n) - Math.floor(b / n)), c = Math.sign((a % n) - (b % n));
  return (!dr || r === dr) && (!dc || c === dc);
}

// A clue as pieces of text; `term` pieces are words a player might not be sure about, shown
// underlined and explained in a pop-up when tapped (see ClueTerms.tsx).
export type Term =
  | { k: 'dir'; d: string; p: number; q: number }
  | { k: 'next'; o: string }
  | { k: 'furn'; o: string }
  | { k: 'room'; a: number }
  | { k: 'row'; r: number };
export type CluePart = string | { text: string; term: Term };
export function clueParts(P: HotelPuzzle, c: HotelClue): CluePart[] {
  const p = guest(P, c.p);
  const room = (a: number): CluePart => ({ text: `the ${ROOMS[a].name}`, term: { k: 'room', a } });
  switch (c.t) {
    case 'in': return [`${p} is in `, room(c.a!), '.'];
    case 'notin': return [`${p} is not in `, room(c.a!), '.'];
    case 'on': return [`${p} is `, { text: FURN[c.o!].on!, term: { k: 'furn', o: c.o! } }, '.'];
    case 'next': return [`${p} is `, { text: 'next to', term: { k: 'next', o: c.o! } }, ' ', { text: FURN[c.o!].next!, term: { k: 'furn', o: c.o! } }, '.'];
    case 'row': return [`${p} is in `, { text: `the ${ORD[c.r!]} row`, term: { k: 'row', r: c.r! } }, '.'];
    case 'dir': return [`${p} is `, { text: DIRS[c.d!].word, term: { k: 'dir', d: c.d!, p: c.p, q: c.q! } }, ` of ${guest(P, c.q!)}.`];
  }
  return [];
}
export const clueText = (P: HotelPuzzle, c: HotelClue) => clueParts(P, c).map((x) => (typeof x === 'string' ? x : x.text)).join('');
function unaryOK(P: HotelPuzzle, c: HotelClue, x: number, cell: number) {
  if (c.p !== x) return true;
  switch (c.t) {
    case 'in': return P.area[cell] === c.a;
    case 'notin': return P.area[cell] !== c.a;
    case 'on': return P.obj[cell] === c.o;
    case 'next': return nb(P.n, cell).some((j) => P.obj[j] === c.o);
    case 'row': return Math.floor(cell / P.n) === c.r;
  }
  return true;
}
const cellOK = (P: HotelPuzzle, x: number, cell: number) => !blocked(P, cell) && P.clues.every((c) => unaryOK(P, c, x, cell));
function pairsOK(P: HotelPuzzle, pos: number[]) {
  for (const c of P.clues) {
    if (c.t !== 'dir') continue;
    const a = pos[c.p], b = pos[c.q!];
    if (a >= 0 && b >= 0 && !dirOK(P.n, c.d!, a, b)) return false;
  }
  return true;
}
// Next guest whose square can be deduced from the ones already placed (pos[x] = square or -1).
export function hotelNext(P: HotelPuzzle, pos: number[]): { x: number; cell: number; why: string; clues: number[] } | null {
  const n = P.n, rowUsed = new Set<number>(), colUsed = new Set<number>(), free: number[] = [];
  pos.forEach((c) => { if (c >= 0) { rowUsed.add(Math.floor(c / n)); colUsed.add(c % n); } });
  const cand: Record<number, number[]> = {};
  for (let x = 0; x < n; x++) if (pos[x] < 0) {
    free.push(x); cand[x] = [];
    for (let c = 0; c < n * n; c++) {
      if (rowUsed.has(Math.floor(c / n)) || colUsed.has(c % n) || !cellOK(P, x, c)) continue;
      const t = pos.slice(); t[x] = c; if (pairsOK(P, t)) cand[x].push(c);
    }
  }
  const R = (c: number) => Math.floor(c / n), Cc = (c: number) => c % n;
  for (let changed = true, guard = 0; changed && guard < 50; guard++) {
    changed = false;
    const keep = (x: number, f: (k: number) => boolean) => { const b = cand[x].length; cand[x] = cand[x].filter(f); if (cand[x].length !== b) changed = true; };
    // A direction clue between two unplaced guests: keep a square only if the other guest still has
    // a square that fits it (in the right direction, and not in the same row or column).
    for (const c of P.clues) if (c.t === 'dir' && pos[c.p] < 0 && pos[c.q!] < 0) {
      const p = c.p, q = c.q!, d = c.d!;
      const fits = (a: number, b: number) => dirOK(n, d, a, b) && R(a) !== R(b) && Cc(a) !== Cc(b);
      keep(p, (k) => cand[q].some((j) => fits(k, j)));
      keep(q, (j) => cand[p].some((k) => fits(k, j)));
    }
    for (const [f, used] of [[R, rowUsed], [Cc, colUsed]] as const) for (let line = 0; line < n; line++) {
      if (used.has(line)) continue;
      const who = free.filter((x) => cand[x].some((k) => f(k) === line));
      if (who.length === 1) keep(who[0], (k) => f(k) === line);
      for (const x of free) {
        if (!cand[x].length) continue;
        const lines = new Set(cand[x].map(f));
        if (lines.size === 1) { const L = [...lines][0]; for (const y of free) if (y !== x) keep(y, (k) => f(k) !== L); }
      }
    }
  }
  if (free.some((x) => !cand[x].length)) return null;
  const cites = (x: number) => P.clues.map((c, k) => (c.p === x || c.q === x ? k : -1)).filter((k) => k >= 0);
  for (const x of free) if (cand[x].length === 1) {
    const ci = cites(x);
    const by = ci.length ? `${ci.length === 1 ? 'clue' : 'clues'} ${ci.map((k) => k + 1).join(' and ')}` : 'the rules';
    return { x, cell: cand[x][0], clues: ci, why: `${guest(P, x)} can only be here: ${by}, plus the rows, columns and squares the others already rule out.` };
  }
  for (const [f, used, name] of [[R, rowUsed, 'row'], [Cc, colUsed, 'column']] as const) for (let line = 0; line < n; line++) {
    if (used.has(line)) continue;
    const pairs: [number, number][] = []; for (const x of free) for (const k of cand[x]) if (f(k) === line) pairs.push([x, k]);
    if (pairs.length === 1) { const [x, cell] = pairs[0]; return { x, cell, clues: cites(x), why: `Only ${guest(P, x)} fits in the ${ORD[line]} ${name}, and only in this square.` }; }
  }
  return null;
}
export const ORDINAL = ORD;
export const thief = (P: HotelPuzzle) => P.sol.findIndex((c) => P.area[c] === P.area[P.cake]);

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
