import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { Act, ACTS, TYPE_COLORS, TYPE_LABEL } from '../data';
import { C, F } from '../theme';
import { Icon } from '../components/Pixel';
import { Btn, Chip, Eyebrow, H1, H2, H3, Panel, Pill, T } from '../components/ui';
import { useLayout } from '../layout';

export default function Activities() {
  const S = useApp();
  const { cw } = useLayout();
  const [f, setF] = useState<'all' | Act['type']>('all');
  const list = ACTS.filter((a) => f === 'all' || a.type === f);
  const cols = cw >= 900 ? 3 : cw >= 560 ? 2 : 1;
  const cardW = (cw - (cols - 1) * 16) / cols;
  const play = (a: Act) => {
    if (['words', 'light', 'sync', 'breathe'].includes(a.id)) S.setModal({ type: a.id });
    else if (a.id === 'forest' || a.id === 'sea') S.setModal({ type: 'sound', kind: a.id });
    else if (a.id === 'talk') S.go('campfire');
    else S.doActivity(a.id, a.title);
  };
  const tiles: [string, string][] = [['E', C.forest], ['M', C.night3], ['B', '#b8702c'], ['E', C.night3], ['R', C.forest]];
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 6 }}>
        <Eyebrow>Activities</Eyebrow>
        <H1>Things to do today</H1>
        <T style={{ color: C.creamDim }}>Short games, small quests and quiet moments. Everything here takes ten minutes or less.</T>
      </View>
      <Panel style={{ backgroundColor: '#272452', flexDirection: cw >= 620 ? 'row' : 'column', gap: 20, alignItems: cw >= 620 ? 'center' : 'flex-start' }}>
        <View style={{ flex: cw >= 620 ? 1 : undefined, gap: 8 }}>
          <Eyebrow>Today’s puzzle</Eyebrow>
          <H2>Ember Words</H2>
          <T style={{ color: C.creamDim }}>Six tries to find a cozy five-letter word. Everyone at your fire gets the same one.</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <Btn label={S.actDone.words ? 'Play again' : 'Play now'} onPress={() => S.setModal({ type: 'words' })} />
            <T muted>Juno and Teo already played</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {tiles.map(([l, c], i) => <View key={i} style={[st.tile, { backgroundColor: c }]}><Text style={st.tileT}>{l}</Text></View>)}
        </View>
      </Panel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {([['all', 'All'], ['daily', 'Daily games'], ['together', 'Together'], ['quest', 'Quests'], ['relax', 'Relax']] as const).map(([k, l]) => (
          <Pill key={k} label={l} on={f === k} onPress={() => setF(k)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {list.map((a) => {
          const tc = TYPE_COLORS[a.type];
          const done = S.actDone[a.id] && a.type === 'quest';
          return (
            <Panel key={a.id} style={{ width: cardW, padding: 0 }}>
              <View style={[st.art, { backgroundColor: tc.bg }]}>
                <Chip label={TYPE_LABEL[a.type]} bg={tc.chipBg} fg={tc.chipFg} style={{ position: 'absolute', left: 12, top: 12 }} />
                <View style={st.iconCircle}><Icon name={a.icon} size={30} /></View>
              </View>
              <View style={{ padding: 16, gap: 6, flex: 1 }}>
                <H3>{a.title}</H3>
                <T style={{ color: C.creamDim, fontSize: 14 }}>{a.desc}</T>
                <View style={st.foot}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="clock" size={14} /><T muted style={{ fontSize: 13 }}>{a.dur}</T></View>
                  {done ? <Text style={st.done}>Done today</Text> : (
                    <Btn sm kind={tc.btn} label={a.type === 'quest' ? 'Mark done' : a.type === 'relax' ? 'Open' : a.id === 'talk' ? 'Go to fire' : 'Play'} onPress={() => play(a)} />
                  )}
                </View>
              </View>
            </Panel>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  tile: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tileT: { fontFamily: F.displayBold, fontSize: 20, color: C.cream },
  art: { height: 96, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,.07)', alignItems: 'center', justifyContent: 'center' },
  foot: { marginTop: 'auto', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  done: { fontFamily: F.display, fontSize: 14, color: C.moss },
});
