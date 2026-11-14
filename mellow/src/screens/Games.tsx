import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { TYPE_COLORS } from '../data';
import { C, F, themed } from '../theme';
import { Icon } from '../components/Pixel';
import { Btn, Chip, Eyebrow, H1, H3, LinkBtn, Panel, T } from '../components/ui';
import { useLayout } from '../layout';
import { TODAY_SIZE } from '../games/PuzzleGames';

// The Games tab: three daily logic puzzles. They are the daily reason to open the app; each one is short,
// can't be lost, and its hints explain the reasoning. Older games (Ember Words etc.) stay under Activities.
const GAMES = [
  { id: 'nono', icon: 'picture', title: 'Hidden Picture', desc: 'Use the number clues to fill the grid. A small picture appears when you finish.', size: TODAY_SIZE.nono },
  { id: 'sight', icon: 'eye', title: 'Line of Sight', desc: 'Each number sees a set count of squares. Shade squares to block the view in just the right places.', size: TODAY_SIZE.sight },
  { id: 'hotel', icon: 'key', title: 'Hotel Mystery', desc: 'A necklace has gone missing. Place the guests from the clues and find who was alone with the safe.', size: TODAY_SIZE.hotel },
] as const;

export default function Games() {
  const S = useApp();
  const { cw } = useLayout();
  const cols = cw >= 900 ? 3 : cw >= 560 ? 2 : 1;
  const cardW = (cw - (cols - 1) * 16) / cols;
  const wd = (new Date().getDay() + 6) % 7;
  const tc = TYPE_COLORS.daily;
  const doneCount = GAMES.filter((g) => S.actDone[g.id]).length;
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
        {GAMES.map((g) => {
          const n = g.size[wd], done = !!S.actDone[g.id];
          return (
            <Panel key={g.id} style={{ width: cardW, padding: 0 }}>
              <View style={[st.art, { backgroundColor: tc.bg }]}>
                <Chip label="Daily puzzle" bg={tc.chipBg} fg={tc.chipFg} style={{ position: 'absolute', left: 12, top: 12 }} />
                <View style={st.iconCircle}><Icon name={g.icon} size={30} /></View>
              </View>
              <View style={{ padding: 16, gap: 6, flex: 1 }}>
                <H3>{g.title}</H3>
                <T style={{ color: C.creamDim, fontSize: 14 }}>{g.desc}</T>
                <View style={st.foot}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="clock" size={14} /><T muted style={{ fontSize: 13 }}>{`${n}×${n} today`}</T></View>
                  {done ? <Text style={st.done}>Solved today</Text> : <Btn sm label="Play" onPress={() => S.setModal({ type: g.id })} />}
                </View>
              </View>
            </Panel>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <T muted>Looking for word games, quests or something calm?</T>
        <LinkBtn label="See all activities" onPress={() => S.go('activities')} />
      </View>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  art: { height: 96, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.iconWell, alignItems: 'center', justifyContent: 'center' },
  foot: { marginTop: 'auto', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  done: { fontFamily: F.display, fontSize: 14, color: C.moss },
}));
