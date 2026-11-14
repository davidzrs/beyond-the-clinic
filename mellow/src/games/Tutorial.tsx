import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, themed, themeMode } from '../theme';
import { Icon } from '../components/Pixel';
import { Btn, H2, T } from '../components/ui';
import { useLayout } from '../layout';
import { GUESTS, ROOMS } from './engines';

// A short "how to play" shown the first time a puzzle is opened (and from the How to play button).
// Each step has a tiny example board drawn with the same colours as the real game.

// ---------- tiny example boards ----------
export type Cell = { k?: 'fill' | 'x' | 'ray' | 'num' | 'big' | 'note' | 'emoji'; t?: string; c?: string; bg?: string; bd?: string };
const E: Cell = {}, Fi: Cell = { k: 'fill' }, X: Cell = { k: 'x' }, R: Cell = { k: 'ray' };
const num = (t: string): Cell => ({ k: 'num', t });
const guest = (i: number, big = true, bg?: string): Cell => ({ k: big ? 'big' : 'note', t: GUESTS[i].ini, c: GUESTS[i].color, bg });
const room = (i: number) => (themeMode() === 'night' ? ROOMS[i].colorN : ROOMS[i].color);

function MiniCell({ c, size }: { c: Cell; size: number }) {
  const bg = c.bg ?? (c.k === 'fill' ? C.forest : c.k === 'ray' ? C.night4 : C.night3);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.18, backgroundColor: bg, borderWidth: c.bd ? 2 : 0, borderColor: c.bd, alignItems: 'center', justifyContent: 'center' }}>
      {c.k === 'x' ? <Text style={{ color: C.muted, fontFamily: F.bodyBold, fontSize: size * 0.5 }}>✕</Text>
        : c.k === 'num' ? (
          <View style={{ width: size * 0.78, height: size * 0.78, borderRadius: size, backgroundColor: C.plum, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.white, fontFamily: F.displayBold, fontSize: size * 0.42 }}>{c.t}</Text>
          </View>
        )
        : c.k === 'big' ? <Text style={{ color: c.c, fontFamily: F.displayBold, fontSize: size * 0.62 }}>{c.t}</Text>
        : c.k === 'note' ? <Text style={{ color: c.c, fontFamily: F.displayBold, fontSize: size * 0.36 }}>{c.t}</Text>
        : c.k === 'emoji' ? <Text style={{ fontSize: size * 0.55 }}>{c.t}</Text> : null}
    </View>
  );
}
export function Mini({ cols, cells, size = 24, clues }: { cols: number; cells: Cell[]; size?: number; clues?: string[] }) {
  const rows = Math.ceil(cells.length / cols);
  return (
    <View style={{ gap: 3 }}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
          {clues ? <Text style={[st.clue, { minWidth: size * 1.2, fontSize: size * 0.5 }]}>{clues[r]}</Text> : null}
          {cells.slice(r * cols, r * cols + cols).map((c, i) => <MiniCell key={i} c={c} size={size} />)}
        </View>
      ))}
    </View>
  );
}
const Arrow = ({ label }: { label?: string }) => (
  <View style={{ alignItems: 'center' }}>
    {label ? <Text style={st.arrowL}>{label}</Text> : null}
    <Text style={st.arrow}>→</Text>
  </View>
);
const Row = ({ children }: { children: React.ReactNode }) => <View style={st.row}>{children}</View>;
const Captioned = ({ ok, text, children }: { ok?: boolean; text: string; children: React.ReactNode }) => (
  <View style={{ alignItems: 'center', gap: 6 }}>
    {children}
    <Text style={[st.cap, ok === true && { color: C.moss }, ok === false && { color: C.rose }]}>{ok === true ? '✓ ' : ok === false ? '✗ ' : ''}{text}</Text>
  </View>
);
const Cycle = ({ mid }: { mid: Cell }) => (
  <Row>
    <Mini cols={1} cells={[E]} size={30} /><Arrow label="tap" /><Mini cols={1} cells={[mid]} size={30} />
    <Arrow label="tap" /><Mini cols={1} cells={[X]} size={30} /><Arrow label="tap" /><Mini cols={1} cells={[E]} size={30} />
  </Row>
);

// ---------- the steps ----------
type Step = { title: string; text: string; demo: () => React.ReactNode };
const RIGHT = Platform.OS === 'web' ? ' Right-click also marks ✕.' : '';
export const TUTORIALS: Record<'nono' | 'sight' | 'hotel', Step[]> = {
  nono: [
    {
      title: 'Find the hidden picture',
      text: 'Each number is a run of filled squares in that row or column, in order, with at least one blank between runs.',
      demo: () => <Captioned text="Clue 2 1: two filled, a gap, then one"><Mini cols={6} clues={['2 1']} cells={[Fi, Fi, E, Fi, E, E]} /></Captioned>,
    },
    {
      title: 'Fill and mark',
      text: 'Tap a square to fill it, again for ✕ (blank), once more to clear it. Drag to do several at once.' + RIGHT,
      demo: () => <Cycle mid={Fi} />,
    },
    {
      title: 'Shortcuts and hints',
      text: 'Tap a number to cross out the rest of its line. Stuck? Hint fills the next square and tells you why.',
      demo: () => (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Mini cols={5} clues={['1']} cells={[Fi, E, E, E, E]} size={24} />
          <Text style={st.arrowL}>tap the 1</Text>
          <Text style={st.arrow}>↓</Text>
          <Mini cols={5} clues={['1']} cells={[Fi, X, X, X, X]} size={24} />
        </View>
      ),
    },
  ],
  sight: [
    {
      title: 'Count what each number sees',
      text: 'A number counts the squares it can see in straight lines, including its own. Shaded squares stop the view.',
      demo: () => (
        <Captioned text="This 5 sees itself and 4 more">
          <Mini cols={4} cells={[E, R, E, E, R, num('5'), R, Fi, E, R, E, E, E, Fi, E, E]} size={28} />
        </Captioned>
      ),
    },
    {
      title: 'Shade to block the view',
      text: 'Shaded squares never touch side by side, and all the open squares must stay connected.',
      demo: () => (
        <Row>
          <Captioned ok={false} text="touching"><Mini cols={2} cells={[Fi, Fi, E, E]} size={28} /></Captioned>
          <Captioned ok text="diagonal is fine"><Mini cols={2} cells={[Fi, E, E, Fi]} size={28} /></Captioned>
        </Row>
      ),
    },
    {
      title: 'Tap, ✕ and hints',
      text: 'Tap to shade, again for ✕ (stays open), once more to clear. Drag to do several.' + RIGHT + ' Hint explains the next step.',
      demo: () => <Cycle mid={Fi} />,
    },
  ],
  hotel: [
    {
      title: 'A necklace is missing',
      text: 'Place every guest on the floor plan: one per row, one per column, never on a plant, bookcase, fireplace or the safe.',
      demo: () => (
        <Captioned text="One per row and column">
          <Mini cols={3} size={34} cells={[E, guest(0), E, { k: 'emoji', t: '🪴' }, E, guest(1), guest(2), E, E]} />
        </Captioned>
      ),
    },
    {
      title: 'Note, then place',
      text: 'Tap a guest’s card to pick them. Tap a square to note their initial. Press and hold to place them: their row and column get crossed out.',
      demo: () => (
        <Row>
          <Captioned text="tap: note"><Mini cols={1} cells={[guest(0, false)]} size={34} /></Captioned>
          <Captioned text="hold: place"><Mini cols={3} size={28} cells={[E, X, E, X, guest(0), X, E, X, E]} /></Captioned>
        </Row>
      ),
    },
    {
      title: 'Find who did it',
      text: 'Each card lists that guest’s clues. ✕ marks impossible squares, the eraser clears one (hold it to clear all), undo goes back.',
      demo: () => (
        <Captioned text="Omar is alone with the safe: he took it">
          <Mini cols={3} size={34} cells={[
            { k: 'emoji', t: '🔐', bg: room(0) }, { bg: room(1) }, { ...guest(1), bg: room(1) },
            { bg: room(0) }, { ...guest(0), bg: room(1) }, { bg: room(1) },
            { ...guest(5), bg: room(0) }, { bg: room(1) }, { bg: room(1) },
          ]} />
        </Captioned>
      ),
    },
  ],
};

export function Tutorial({ steps, onClose }: { steps: Step[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const { width } = useLayout();
  const last = i === steps.length - 1, step = steps[i];
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={st.backdrop}>
        <View style={[st.card, { width: Math.min(440, width - 32) }]}>
          <View style={st.head}>
            <Text style={st.count}>{`${i + 1} / ${steps.length}`}</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={10}><Icon name="close" size={20} /></Pressable>
          </View>
          <View style={st.body}>
            <View style={st.demo}>{step.demo()}</View>
            <H2 style={{ textAlign: 'center' }}>{step.title}</H2>
            <T style={{ textAlign: 'center', color: C.creamDim }}>{step.text}</T>
          </View>
          <View style={st.foot}>
            <Pressable onPress={onClose} hitSlop={8}><Text style={st.skip}>Skip</Text></Pressable>
            <View style={st.dots}>{steps.map((_, k) => <View key={k} style={[st.dot, k === i && st.dotOn]} />)}</View>
            <Btn sm label={last ? 'Start' : 'Next'} onPress={() => (last ? onClose() : setI(i + 1))} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = themed(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,42,.45)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.night2, borderRadius: 18, borderWidth: 1, borderColor: C.lineHi, overflow: 'hidden' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  count: { fontFamily: F.label, fontSize: 13, color: C.muted, letterSpacing: 1 },
  body: { padding: 20, gap: 10, alignItems: 'center' },
  demo: { minHeight: 120, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: C.night, borderRadius: 14, padding: 14, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  clue: { fontFamily: F.bodyBold, color: C.cream, textAlign: 'right', marginRight: 4 },
  arrow: { fontFamily: F.bodyBold, fontSize: 18, color: C.muted },
  arrowL: { fontFamily: F.label, fontSize: 10.5, color: C.muted },
  cap: { fontFamily: F.bodySemi, fontSize: 12.5, color: C.creamDim, textAlign: 'center' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line },
  skip: { fontFamily: F.bodyBold, fontSize: 14, color: C.muted },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.line },
  dotOn: { backgroundColor: C.ember, width: 18 },
}));
