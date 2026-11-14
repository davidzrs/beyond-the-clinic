import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { MOOD14, MOOD_KEYS, MOODS, SLEEP14, STEPS14 } from '../data';
import { C, F } from '../theme';
import { Icon } from '../components/Pixel';
import { Chip, Eyebrow, H1, H3, Panel, PTitle, T } from '../components/ui';
import { useLayout } from '../layout';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Bars({ data, max, color, labels, band, h = 120 }: { data: number[]; max: number; color: (v: number) => string; labels: [string, string, string]; band?: [number, number]; h?: number }) {
  const n = data.length;
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <View style={{ height: h, justifyContent: 'space-between', paddingBottom: 18 }}>
        {[labels[2], labels[1], labels[0]].map((l, i) => <Text key={i} style={st.axis}>{l}</Text>)}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ height: h - 18, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          {band ? <View style={[st.band, { bottom: (band[0] / max) * (h - 18), height: ((band[1] - band[0]) / max) * (h - 18) }]} /> : null}
          {[0, 0.5, 1].map((t) => <View key={t} style={[st.grid, { bottom: t * (h - 18) }]} />)}
          {data.map((v, i) => (
            <View key={i} style={{ flex: 1, height: Math.max(3, (v / max) * (h - 18)), backgroundColor: color(v), borderTopLeftRadius: 3, borderTopRightRadius: 3, borderWidth: i === n - 1 ? 1.5 : 0, borderColor: C.emberHi }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
          {data.map((_, i) => <Text key={i} style={[st.day, i === n - 1 && { color: C.creamDim }]}>{i === n - 1 ? 'Tdy' : DAYS[(i + 7 - (n % 7)) % 7]}</Text>)}
        </View>
      </View>
    </View>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
      {items.map(([c, l]) => <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }} /><T muted style={{ fontSize: 12.5 }}>{l}</T></View>)}
    </View>
  );
}

export default function Journey() {
  const S = useApp();
  const { cw } = useLayout();
  const two = cw >= 760;
  const moodMap = { heavy: 1, low: 2, okay: 3, good: 4, bright: 5 };
  const M = [...MOOD14, S.mood ? moodMap[S.mood] : 3];
  const mcol = ['#5a4f86', '#7d6fb4', '#a99ec8', '#f0b070', '#ffc66b'];
  const done = [...S.actLog, { icon: 'words', t: 'Ember Words', d: 'Yesterday' }, { icon: 'walk', t: 'Slow Walk', d: 'Yesterday' }, { icon: 'chat', t: 'Sunday Talk', d: 'Sun' }, { icon: 'flame', t: 'Breathe with the Flame', d: 'Sat' }, { icon: 'sky', t: 'Sky Break', d: 'Fri' }].slice(0, 7);
  const miles: [string, string, string][] = [['star', 'Joined Mellow', 'Oct 2'], ['flame', 'Lit Pinehollow with Juno, Teo and Ama', 'Oct 4'], ['chat', 'Your first Sunday Talk', 'Oct 6'], ['ember', '50 embers gathered', 'Oct 21'], ['leaf', 'Today', 'You’re here'], ['heart', 'Next: one month at the fire', 'In a few days']];
  const pair = (a: React.ReactNode, b: React.ReactNode) => two
    ? <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}><View style={{ flex: 1 }}>{a}</View><View style={{ flex: 1 }}>{b}</View></View>
    : <View style={{ gap: 20 }}>{a}{b}</View>;
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 6 }}>
        <Eyebrow>My journey</Eyebrow>
        <H1>A gentle look back</H1>
        <T style={{ color: C.creamDim }}>Patterns from your check-ins, sleep and movement over the last two weeks. It’s here to help you notice what helps, not to grade you.</T>
      </View>
      <Panel>
        <PTitle eyebrow="Last 14 days" title="How you’ve been feeling" right={<Chip label="From your daily check-ins" />} />
        <Bars data={M} max={5} color={(v) => mcol[v - 1]} labels={['', 'Okay', 'Bright']} />
        <Legend items={MOOD_KEYS.map((k, i) => [mcol[i], MOODS[k].label])} />
      </Panel>
      {pair(
        <Panel>
          <PTitle eyebrow="From your ring" title="Sleep" right={<Chip label="Usual: 7–8 h" />} />
          <Bars data={SLEEP14} max={10} color={(v) => (v < 6.5 ? '#7d6fb4' : '#8fb4e6')} labels={['0h', '5h', '10h']} band={[7, 8]} />
          <Legend items={[['rgba(134,192,148,.45)', 'Your usual range'], ['#7d6fb4', 'Shorter nights']]} />
        </Panel>,
        <Panel>
          <PTitle eyebrow="From your phone" title="Movement" right={<Chip label="Thousand steps" />} />
          <Bars data={STEPS14} max={10} color={(v) => (v >= 6 ? '#86c094' : '#3f7a5a')} labels={['0', '5k', '10k']} />
          <Legend items={[['#86c094', 'Active days'], ['#3f7a5a', 'Quieter days']]} />
        </Panel>,
      )}
      <Panel>
        <PTitle eyebrow="Things Mellow noticed" title="Little patterns" />
        <View style={{ flexDirection: cw >= 900 ? 'row' : 'column', gap: 14 }}>
          {([['sky', 'Brighter after time outside', 'On the 6 days you went for a walk, your check-ins were a step brighter on average.'], ['moon', 'Nights have been a bit shorter', 'About 6.3 h this week compared with your usual 7.5 h. A wind-down quest tonight could help.'], ['chat', 'Sundays at the fire help', 'Your two best days this month came right after Sunday Talk.']] as const).map(([ic, t, d]) => (
            <View key={t} style={st.insight}><Icon name={ic} size={30} /><H3>{t}</H3><T style={{ color: C.creamDim, fontSize: 14 }}>{d}</T></View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'flex-start' }}>
          <Icon name="info" size={18} />
          <T muted style={{ flex: 1, fontSize: 13 }}>These are patterns, not diagnoses. You choose what your care team can see, and you can change that any time.</T>
        </View>
      </Panel>
      {pair(
        <Panel>
          <PTitle eyebrow="Recently" title="Things you did" />
          {done.map((x, i) => (
            <View key={i} style={st.doneRow}><Icon name={x.icon} size={26} /><T style={{ flex: 1, fontSize: 14 }}>{x.t}</T><T muted style={{ fontSize: 12.5 }}>{x.d}</T></View>
          ))}
        </Panel>,
        <Panel>
          <PTitle eyebrow="Your path" title="Milestones" />
          {miles.map(([ic, t, d], i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={[st.dot, i === 5 && { backgroundColor: 'transparent', borderWidth: 2, borderStyle: 'dashed', borderColor: C.line }]}><Icon name={ic} size={18} /></View>
                {i < miles.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 14, backgroundColor: C.line }} /> : null}
              </View>
              <View style={{ paddingBottom: 16, flex: 1 }}><Text style={st.mt}>{t}</Text><T muted style={{ fontSize: 12.5 }}>{d}</T></View>
            </View>
          ))}
        </Panel>,
      )}
    </View>
  );
}

const st = StyleSheet.create({
  axis: { fontFamily: F.label, fontSize: 10, color: C.muted, textAlign: 'right', width: 30 },
  day: { flex: 1, textAlign: 'center', fontFamily: F.label, fontSize: 10, color: C.muted },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.night4 },
  band: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(134,192,148,.14)' },
  insight: { flex: 1, backgroundColor: C.night3, borderRadius: 14, padding: 16, gap: 8 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.night4 },
  dot: { width: 28, height: 28, borderRadius: 10, backgroundColor: C.night3, alignItems: 'center', justifyContent: 'center' },
  mt: { fontFamily: F.display, fontSize: 16, color: C.cream },
});
