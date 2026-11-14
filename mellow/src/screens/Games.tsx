import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { C, F, themed, themeMode } from '../theme';
import { Icon, Mallow } from '../components/Pixel';
import { Btn, Eyebrow, H1, LinkBtn, T } from '../components/ui';
import { useLayout } from '../layout';
import { friendsWhoSolved, TODAY_SIZE } from '../games/PuzzleGames';
import { Cell, Mini } from '../games/Tutorial';
import { GUESTS, ROOMS } from '../games/engines';
import { puzzleSocialLine } from './GameScreen';

// The Games tab: three daily logic puzzles. They are the daily reason to open the app; each one is short,
// can't be lost, and its hints explain the reasoning. These are the only games in the app.
// Each card has its own colour and a little picture: a piece of that puzzle on a tilted table,
// with your marshmallow next to it.

// ---------- the pictures: a few squares of each puzzle, half solved ----------
const E: Cell = {}, Fi: Cell = { k: 'fill' }, X: Cell = { k: 'x' }, R: Cell = { k: 'ray' };
const num = (t: string): Cell => ({ k: 'num', t });
function NonoArt() {
  // A heart, mostly filled in.
  return <Mini cols={5} size={22} clues={['1 1', '5', '5', '3', '1']} cells={[
    X, Fi, X, Fi, X,
    Fi, Fi, Fi, Fi, Fi,
    Fi, Fi, Fi, Fi, E,
    X, Fi, E, E, X,
    X, E, Fi, E, E,
  ]} />;
}
function SightArt() {
  return <Mini cols={5} size={24} cells={[
    E, R, Fi, E, num('3'),
    R, num('6'), R, R, R,
    E, R, E, Fi, E,
    Fi, R, E, num('4'), E,
    E, R, Fi, E, E,
  ]} />;
}
function HotelArt() {
  const night = themeMode() === 'night';
  const room = (i: number) => (night ? ROOMS[i].colorN : ROOMS[i].color);
  const a = room(0), b = room(1), c = room(3);
  return <Mini cols={4} size={28} cells={[
    { bg: a, k: 'emoji', t: '📚' }, { bg: a, k: 'pawn', c: GUESTS[0].color }, { bg: b }, { bg: b, k: 'x' },
    { bg: a, k: 'x' }, { bg: a }, { bg: b, k: 'emoji', t: '🪴' }, { bg: b, k: 'pawn', c: GUESTS[2].color },
    { bg: c, k: 'pawn', c: GUESTS[1].color }, { bg: c, k: 'x' }, { bg: b }, { bg: b, k: 'x' },
    { bg: c }, { bg: c, k: 'emoji', t: '🔐' }, { bg: c, k: 'x' }, { bg: b },
  ]} />;
}

const GAMES = [
  { id: 'nono', title: 'Hidden Picture', desc: 'Fill the grid from the number clues and a little picture appears.', size: TODAY_SIZE.nono, Art: NonoArt, face: 'happy' },
  { id: 'sight', title: 'Line of Sight', desc: 'Shade squares so every number sees just the right amount.', size: TODAY_SIZE.sight, Art: SightArt, face: 'calm' },
  { id: 'hotel', title: 'Hotel Mystery', desc: 'A necklace is missing. Place the guests and find who was alone with the safe.', size: TODAY_SIZE.hotel, Art: HotelArt, face: 'wink' },
] as const;
// Card colours, day and night: warm sun, fresh mint, soft lavender.
const COLORS = {
  nono: { day: ['#FFD978', '#F7C54E'], night: ['#4A3D1E', '#3D3218'] },
  sight: { day: ['#9FE3C4', '#7DD3AE'], night: ['#1F4337', '#19372D'] },
  hotel: { day: ['#CDBDF6', '#B9A5F0'], night: ['#352D55', '#2C2547'] },
} as const;

export default function Games() {
  const S = useApp();
  const { cw } = useLayout();
  const cols = cw >= 880 ? 2 : 1;
  const cardW = (cw - (cols - 1) * 16) / cols;
  const side = cardW >= 430; // picture beside the text; on narrow cards it goes above
  const wd = (new Date().getDay() + 6) % 7;
  const doneCount = GAMES.filter((g) => S.puzzleSolvedToday(g.id)).length;
  const friends = S.members.filter((m) => m.id !== 'me');
  const mode = themeMode() === 'night' ? 'night' : 'day';
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 6 }}>
        <Eyebrow>Daily puzzles</Eyebrow>
        <H1>Games</H1>
        <T style={{ color: C.creamDim }}>Three logic puzzles, new every day. No timer and no way to lose. Stuck? Every hint explains the next step.</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="check" size={18} color={doneCount ? C.moss : C.muted} />
        <T muted>{doneCount ? `${doneCount} of 3 solved today` : 'Nothing solved yet today'}</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {GAMES.map(({ id, title, desc, size, Art, face }) => {
          const n = size[wd], done = S.puzzleSolvedToday(id), [bg, foot] = COLORS[id][mode];
          const art = (
            <View style={[st.art, side ? { width: 190 } : { alignSelf: 'stretch', height: 170 }]}>
              {/* The board lies on a table, tilted like a game piece; the marshmallow stands in front of it. */}
              <View style={st.tilt}><Art /></View>
              <View style={st.mallow}><Mallow a={S.avatar} face={face} size={62} /></View>
            </View>
          );
          return (
            <Pressable key={id} onPress={() => S.go(id)} accessibilityRole="button" accessibilityLabel={`Play ${title}`}
              style={(p: any) => [st.card, { width: cardW, backgroundColor: bg }, p.hovered && { transform: [{ translateY: -2 }] }]}>
              <View style={[st.top, !side && { flexDirection: 'column-reverse' }]}>
                <View style={{ flex: side ? 1 : undefined, gap: 8 }}>
                  <Text style={st.title}>{title}</Text>
                  <Text style={st.desc}>{desc}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                    {done ? (
                      <>
                        <Btn sm kind="ghost" label="View" onPress={() => S.go(id)} style={st.btnGhost} />
                        <Text style={st.done}>✓ Solved today</Text>
                      </>
                    ) : <Btn label={`Play ${title}`} onPress={() => S.go(id)} />}
                  </View>
                </View>
                {art}
              </View>
              <View style={[st.foot, { backgroundColor: foot }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Icon name="people" size={14} color={C.creamDim} />
                  <Text style={st.footT}>{puzzleSocialLine(S.puzzleCount(id), friendsWhoSolved(friends, id))}</Text>
                </View>
                <Text style={st.footT}>{`${n}×${n} today`}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  card: { borderRadius: 18, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 18 },
  title: { fontFamily: F.displayBold, fontSize: 28, lineHeight: 32, color: C.cream, letterSpacing: -0.3 },
  desc: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: C.cream },
  art: { height: 160, alignItems: 'center', justifyContent: 'center' },
  tilt: { transform: [{ perspective: 700 }, { rotateX: '38deg' }, { rotateZ: '-24deg' }], padding: 6, borderRadius: 10, backgroundColor: C.night2,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  mallow: { position: 'absolute', right: -4, bottom: -6 },
  btnGhost: { backgroundColor: C.night2 },
  done: { fontFamily: F.display, fontSize: 15, color: C.cream },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 20, paddingVertical: 11 },
  footT: { fontFamily: F.bodySemi, fontSize: 13, color: C.creamDim, flexShrink: 1 },
}));
