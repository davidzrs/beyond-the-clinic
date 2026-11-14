import React from 'react';
import { GestureResponderEvent, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, themed, themeMode } from '../theme';
import { Icon } from '../components/Pixel';
import { Btn, H2, T } from '../components/ui';
import { useLayout } from '../layout';
import type { HotelPuzzle } from './puzzles';
import { CluePart, DIRS, FURN, GUESTS, ORDINAL, ROOMS, Term } from './engines';
import { Cell, Mini } from './Tutorial';

// Hotel Mystery clues with tappable words: directions, "next to", furniture, rooms and rows are
// underlined, and a tap opens a short explanation with a tiny picture (like Murdoku's glossary).

export function ClueLine({ parts, onTerm, style }: { parts: CluePart[]; onTerm: (t: Term) => void; style?: any }) {
  return (
    <T style={style}>
      {parts.map((p, i) => typeof p === 'string' ? p : (
        <Text key={i} accessibilityRole="button" accessibilityHint="Explains this word"
          // Stop the tap reaching the guest card around it (web), so it only opens the explanation.
          onPress={(e: GestureResponderEvent) => { e.stopPropagation?.(); onTerm(p.term); }}
          style={ts.term}>{p.text}</Text>
      ))}
    </T>
  );
}

const name = (P: HotelPuzzle, x: number) => GUESTS[P.people[x]].name;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const roomBg = (a: number) => (themeMode() === 'night' ? ROOMS[a].colorN : ROOMS[a].color);

// Title, explanation and picture for one term.
function explain(P: HotelPuzzle, t: Term): { title: string; text: string; demo: React.ReactNode; caption?: string } {
  const n = P.n;
  switch (t.k) {
    case 'dir': {
      // A 5×5 compass: the other guest in the middle, the squares this guest could be in shaded.
      const { word, dr, dc } = DIRS[t.d], g = GUESTS[P.people[t.p]], h = GUESTS[P.people[t.q]];
      const cells: Cell[] = Array.from({ length: 25 }, (_, i) => {
        const r = Math.floor(i / 5) - 2, c = (i % 5) - 2;
        if (!r && !c) return { k: 'big', t: h.ini, c: h.color };
        const fits = r && c && (!dr || Math.sign(r) === dr) && (!dc || Math.sign(c) === dc);
        return fits ? { bg: g.color + '44' } : {};
      });
      const rowPart = dr ? `in a row ${dr < 0 ? 'above' : 'below'} ${name(P, t.q)}’s` : '';
      const colPart = dc ? `in a column to the ${dc > 0 ? 'right' : 'left'} of ${name(P, t.q)}’s` : '';
      const compass = 'North is the top of the plan, east the right.';
      const text = dr && dc
        ? `${name(P, t.p)} is ${rowPart} and ${colPart}, at any distance: they don’t have to touch. ${compass}`
        : `${name(P, t.p)} is ${rowPart || colPart}, at any distance, in any other ${dr ? 'column' : 'row'}. ${compass}`;
      return { title: cap(word), text, demo: <Mini cols={5} cells={cells} size={26} />, caption: `${g.name} can be in any shaded square` };
    }
    case 'next': {
      const f = FURN[t.o];
      const cells: Cell[] = [{}, { bg: C.forest + '55' }, {}, { bg: C.forest + '55' }, { k: 'emoji', t: f.e }, { bg: C.forest + '55' }, {}, { bg: C.forest + '55' }, {}];
      return { title: 'Next to', text: `In a square that shares a side with the ${f.name.toLowerCase()}: just above, below, left or right of it. Diagonal squares don’t count.`, demo: <Mini cols={3} cells={cells} size={34} />, caption: 'The shaded squares are next to it' };
    }
    case 'furn': {
      const f = FURN[t.o];
      const text = f.b
        ? `The ${f.e} squares on the plan. It fills its square, so nobody can stand there${t.o === 'cofre' ? '. Whoever is alone in the room with it took the necklace.' : '.'}`
        : `The ${f.e} squares on the plan. A guest ${f.on} is on one of those squares.`;
      return { title: f.name, text, demo: <Mini cols={1} cells={[{ k: 'emoji', t: f.e }]} size={46} /> };
    }
    case 'room': {
      const r = ROOMS[t.a];
      const cells: Cell[] = P.area.map((a, i) => (a === t.a ? { bg: roomBg(a), bd: C.ember, ...(P.obj[i] ? { k: 'emoji' as const, t: FURN[P.obj[i]].e } : {}) } : {}));
      const label = r.label.toLowerCase() !== r.name ? ` It’s labelled “${r.label}” on the plan.` : '';
      return { title: cap(r.name), text: `The squares of this colour, inside the thick walls.${label}`, demo: <Mini cols={n} cells={cells} size={n > 5 ? 22 : 26} />, caption: `The ${r.name} on today’s plan` };
    }
    case 'row': {
      const cells: Cell[] = Array.from({ length: n * n }, (_, i) => (Math.floor(i / n) === t.r ? { bg: C.ember + '66' } : {}));
      return { title: `The ${ORDINAL[t.r]} row`, text: `Rows run across and are counted from the top, so this is line number ${t.r + 1} from the top of the plan.`, demo: <Mini cols={n} cells={cells} size={n > 5 ? 22 : 26} /> };
    }
  }
}

export function TermPopup({ P, term, onClose }: { P: HotelPuzzle; term: Term; onClose: () => void }) {
  const { width } = useLayout();
  const { title, text, demo, caption } = explain(P, term);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={ts.backdrop} onPress={onClose} accessibilityLabel="Close">
        {/* The card swallows taps so only the backdrop closes it. */}
        <Pressable onPress={() => {}} style={[ts.card, { width: Math.min(360, width - 32) }]}>
          <View style={ts.head}>
            <H2 style={{ flexShrink: 1 }}>{title}</H2>
            <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={10}><Icon name="close" size={20} /></Pressable>
          </View>
          <View style={ts.demo}>
            {demo}
            {caption ? <Text style={ts.cap}>{caption}</Text> : null}
          </View>
          <T style={{ color: C.creamDim }}>{text}</T>
          <Btn sm label="Got it" onPress={onClose} style={{ alignSelf: 'flex-end' }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const ts = themed(() => StyleSheet.create({
  term: { textDecorationLine: 'underline', textDecorationColor: C.muted, color: C.cream },
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,42,.45)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.night2, borderRadius: 18, borderWidth: 1, borderColor: C.lineHi, padding: 18, gap: 12, cursor: 'auto' } as any,
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  demo: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.night, borderRadius: 14, padding: 14, gap: 8 },
  cap: { fontFamily: F.bodySemi, fontSize: 12.5, color: C.creamDim, textAlign: 'center' },
}));
