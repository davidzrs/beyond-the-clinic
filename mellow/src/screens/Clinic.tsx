import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { C, F } from '../theme';
import { Btn, Chip, Eyebrow, H1, Panel, PTitle, T } from '../components/ui';
import { DEMO, fmtDay, LEVEL_UI, levelOf, SAM } from '../demo';
import { useLayout } from '../layout';

// What a clinician sees between visits: consenting patients only, trends only, sorted by who may need a call.
export default function Clinic() {
  const S = useApp();
  const { cw } = useLayout();
  const day = S.demoDay;
  const samRisk = SAM.series.risk[day - 1];
  const samDrivers = (SAM.drivers[day - 1] || []).map((d) => d.label + ' ' + d.change);
  const rows = DEMO.clinic.map((p) => (p.patient.startsWith('S.') ? { ...p, patient: 'Sam K.', risk: samRisk, level: levelOf(samRisk), drivers: samDrivers.length ? samDrivers : ['Within usual range'], lastCheckIn: 'today', sam: true } : { ...p, sam: false }))
    .sort((a, b) => (b.risk ?? -1) - (a.risk ?? -1));
  const counts = { high: rows.filter((r) => levelOf(r.risk) === 'high').length, watch: rows.filter((r) => levelOf(r.risk) === 'watch').length };
  const wide = cw >= 760;
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 6 }}>
        <Eyebrow>Care team view · demo</Eyebrow>
        <H1>Who might need a call</H1>
        <T style={{ color: C.creamDim }}>Patients who chose to share their trends after TMS. Sorted by how far each person’s week has moved from their own normal. No chats, no raw data, just the reasons.</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <View style={[st.sum, { borderColor: LEVEL_UI.high.color + '88' }]}><Text style={[st.sumN, { color: LEVEL_UI.high.color }]}>{counts.high}</Text><T muted style={{ fontSize: 13 }}>suggested calls today</T></View>
        <View style={[st.sum, { borderColor: LEVEL_UI.watch.color + '88' }]}><Text style={[st.sumN, { color: LEVEL_UI.watch.color }]}>{counts.watch}</Text><T muted style={{ fontSize: 13 }}>worth watching</T></View>
        <View style={st.sum}><Text style={st.sumN}>{rows.length}</Text><T muted style={{ fontSize: 13 }}>patients sharing · {fmtDay(day)}</T></View>
      </View>
      <Panel style={{ padding: 0 }}>
        <View style={{ padding: 18, paddingBottom: 6 }}><PTitle eyebrow="Pinehollow Clinic · TMS maintenance" title="Patients" right={<Chip label={'Sam is on demo day ' + day} />} /></View>
        {rows.map((r) => {
          const l = levelOf(r.risk); const ui = LEVEL_UI[l];
          return (
            <Pressable key={r.patient} onPress={() => (r.sam ? S.go('journey') : null)} style={(p: any) => [st.row, { flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'flex-start' }, (p.hovered && r.sam) && { backgroundColor: C.night3 }]}>
              <View style={{ width: wide ? 170 : undefined, gap: 2 }}>
                <Text style={st.name}>{r.patient}{r.sam ? '  ›' : ''}</Text>
                <T muted style={{ fontSize: 12.5 }}>{r.weeksSinceTms} weeks after TMS · checked in {r.lastCheckIn}</T>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: wide ? 190 : '100%' }}>
                <View style={[st.pill, { backgroundColor: ui.bg }]}><Text style={[st.pillT, { color: ui.color }]}>{ui.label}</Text></View>
                <View style={st.track}><View style={[st.fill, { width: ((r.risk ?? 0) + '%') as any, backgroundColor: ui.color }]} /></View>
              </View>
              <View style={{ flex: wide ? 1 : undefined, gap: 2 }}>
                {r.drivers.slice(0, 3).map((d) => <T key={d} style={{ fontSize: 13.5, color: C.creamDim }}>{d}</T>)}
              </View>
              {l === 'high' ? <Btn label="Call" sm onPress={() => S.toast('Prototype: a call with ' + r.patient + ' would be scheduled.')} /> : <View style={{ width: wide ? 58 : 0 }} />}
            </Pressable>
          );
        })}
      </Panel>
      <T muted style={{ fontSize: 12.5 }}>Demo data. Sam’s row follows the My Journey timeline; the other patients are synthetic. The score is an explainable heuristic, not a diagnosis.</T>
    </View>
  );
}

const st = StyleSheet.create({
  sum: { flexGrow: 1, flexBasis: 160, backgroundColor: C.night2, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, gap: 2 },
  sumN: { fontFamily: F.displayBold, fontSize: 30, color: C.cream },
  row: { gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.night4 },
  name: { fontFamily: F.display, fontSize: 16, color: C.cream },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillT: { fontFamily: F.label, fontSize: 12 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.night4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
