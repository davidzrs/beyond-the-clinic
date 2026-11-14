import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { MOOD_KEYS, MOODS } from '../data';
import { C, F, themed } from '../theme';
import { Icon } from '../components/Pixel';
import { Btn, Chip, Eyebrow, H1, H2, H3, Panel, PTitle, T } from '../components/ui';
import { useLayout } from '../layout';
import { BackLink } from '../components/BackLink';
import { baseline, DEMO, fmtDay, LEVEL_UI, levelOf, meanOf, SAM, weekdayLetter, windowOf } from '../demo';

const N = 14;
const MCOL = ['#5a4f86', '#7d6fb4', '#a99ec8', '#f0b070', '#ffc66b'];

function Bars({ data, max, min = 0, color, axis, band, h = 120, days }: { data: (number | null)[]; max: number; min?: number; color: (v: number, i: number) => string; axis: [string, string, string]; band?: [number, number]; h?: number; days: number[] }) {
  const ih = h - 18;
  const y = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min))) * ih;
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <View style={{ height: h, justifyContent: 'space-between', paddingBottom: 18 }}>
        {[axis[2], axis[1], axis[0]].map((l, i) => <Text key={i} style={st.axis}>{l}</Text>)}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ height: ih, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
          {band ? <View style={[st.band, { bottom: y(band[0]), height: Math.max(2, y(band[1]) - y(band[0])) }]} /> : null}
          {[0, 0.5, 1].map((t) => <View key={t} style={[st.grid, { bottom: t * ih }]} />)}
          {data.map((v, i) => (
            <View key={i} style={{ flex: 1, height: v == null ? 3 : Math.max(3, y(v)), backgroundColor: v == null ? C.night4 : color(v, i), borderTopLeftRadius: 3, borderTopRightRadius: 3, opacity: v == null ? 0.6 : 1, borderWidth: i === data.length - 1 ? 1.5 : 0, borderColor: C.emberHi }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
          {days.map((d, i) => <Text key={i} style={[st.day, i === days.length - 1 && { color: C.creamDim }]}>{weekdayLetter(d)}</Text>)}
        </View>
      </View>
    </View>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
      {items.map(([c, l]) => <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} /><T muted style={{ fontSize: 12.5 }}>{l}</T></View>)}
    </View>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <View style={st.stat}>
      <Text style={st.statL}>{label}</Text>
      <Text style={[st.statV, tone ? { color: tone } : null]}>{value}</Text>
      {sub ? <T muted style={{ fontSize: 12 }}>{sub}</T> : null}
    </View>
  );
}

const PRESETS: [number, string][] = [[30, 'Steady'], [57, 'Quiet drift'], [60, 'First flag'], [66, 'Check in'], [78, 'Recovering'], [90, 'Today']];
const STAGE_COL: Record<string, string> = { awake: '#e88a96', rem: '#a595d4', light: '#8fb4e6', deep: '#4f74b8' };

export default function Insights() {
  const S = useApp();
  const { cw } = useLayout();
  const two = cw >= 760;
  const day = S.demoDay;
  const setDay = (d: number) => S.setDemoDay(Math.max(1, Math.min(DEMO.days, d)));
  const risk = SAM.series.risk[day - 1];
  const lvl = levelOf(risk);
  const ui = LEVEL_UI[lvl];
  const drivers = SAM.drivers[day - 1] || [];
  const days = Array.from({ length: N }, (_, i) => Math.max(N, day) - N + 1 + i);
  const w = (k: string) => windowOf(SAM.series[k], day, N);
  const moodMap = { heavy: 1, low: 2, okay: 3, good: 4, bright: 5 } as const;
  const mood = w('mood'); if (day === DEMO.days && S.mood) mood[mood.length - 1] = moodMap[S.mood];
  const last7 = (k: string) => meanOf(windowOf(SAM.series[k], day, 7));
  const pctOf = (k: string) => { const a = last7(k), b = baseline(k); return a != null && b ? Math.round((a / b) * 100) : null; };
  const sleepBase = baseline('sleepHours') || 7.4;
  const night = (lvl === 'high' || lvl === 'watch') ? DEMO.samNights.day66 : DEMO.samNights.day30;
  const nightLabel = (lvl === 'high' || lvl === 'watch') ? 'A restless night (day 66)' : 'A calm night (day 30)';
  const minHr = Math.min(...night.map((p) => p.hr)) - 3, maxHr = Math.max(...night.map((p) => p.hr)) + 2;
  const q = SAM.questionnaires.filter((x) => x.day <= day).slice(-4);
  const morningPct = pctOf('morningSteps'), sleepDelta = (last7('sleepHours') ?? sleepBase) - sleepBase, msgPct = pctOf('messagesSent');

  const pair = (a: React.ReactNode, b: React.ReactNode) => two
    ? <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}><View style={{ flex: 1 }}>{a}</View><View style={{ flex: 1 }}>{b}</View></View>
    : <View style={{ gap: 20 }}>{a}{b}</View>;

  const timeline = (
    <Panel>
      <PTitle eyebrow="Demo timeline · Sam’s 90 days" title={'Day ' + day + ' · ' + fmtDay(day)} right={<Chip label="Synthetic data" />} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 64 }}>
        {SAM.series.risk.map((rv, i) => {
          const l = levelOf(rv); const sel = i + 1 === day;
          return (
            <Pressable key={i} onPress={() => setDay(i + 1)} accessibilityLabel={'Day ' + (i + 1)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
              <View style={{ height: Math.max(4, ((rv ?? 0) / 100) * 56), borderRadius: 2, backgroundColor: l === 'calibrating' ? C.night4 : LEVEL_UI[l].color, opacity: sel ? 1 : 0.55, borderWidth: sel ? 1.5 : 0, borderColor: C.cream }} />
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <T muted style={{ fontSize: 12 }}>{fmtDay(1)}</T><T muted style={{ fontSize: 12 }}>Early-warning score · tap a day</T><T muted style={{ fontSize: 12 }}>{fmtDay(DEMO.days)}</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {[['Drift begins', DEMO.events.relapseStart], ['Mellow notices', DEMO.events.firstAlertDay], ['Care plan', DEMO.events.carePlanDay], ['Back to normal', DEMO.events.recoveredDay]].map(([l, d]) => (
          <Chip key={l as string} label={l + ' · day ' + d} />
        ))}
        <Pressable onPress={() => S.go('clinic')}><Chip label="Care team view ›" bg={C.navySoft} fg={C.ember} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, alignItems: 'center' }}>
        <Btn label="−7" kind="ghost" sm onPress={() => setDay(day - 7)} />
        <Btn label="−1" kind="ghost" sm onPress={() => setDay(day - 1)} />
        <Btn label="+1" kind="ghost" sm onPress={() => setDay(day + 1)} />
        <Btn label="+7" kind="ghost" sm onPress={() => setDay(day + 7)} />
        <View style={{ width: 8 }} />
        {PRESETS.map(([d, l]) => (
          <Pressable key={d} onPress={() => setDay(d)} style={[st.preset, day === d && { borderColor: C.ember, backgroundColor: C.night4 }]}>
            <Text style={[st.presetT, day === d && { color: C.cream }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </Panel>
  );

  const status = (
    <Panel style={{ backgroundColor: ui.bg, borderColor: ui.color + '66' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ gap: 4, flexShrink: 1 }}>
          <Eyebrow style={{ color: ui.color }}>How Sam’s week compares with their normal</Eyebrow>
          <H2>{ui.label}</H2>
        </View>
        <View style={[st.score, { borderColor: ui.color }]}><Text style={[st.scoreN, { color: ui.color }]}>{risk == null ? '…' : risk}</Text><Text style={st.scoreL}>of 100</Text></View>
      </View>
      <T style={{ color: C.creamDim, marginTop: 8 }}>{ui.text}</T>
      {drivers.length ? (
        <View style={{ gap: 8, marginTop: 12 }}>
          {drivers.map((d) => (
            <View key={d.key} style={st.driver}>
              <Text style={st.driverL}>{d.label}</Text>
              <Text style={st.driverV}>{d.from} → {d.to}</Text>
              <Text style={[st.driverC, { color: ui.color }]}>{d.change}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {lvl === 'watch' ? (
        <View style={st.plan}><Text style={st.planT}>What Mellow does</Text><T style={{ fontSize: 14 }}>Suggests a morning light quest and a message to the fire. Nobody else is told anything.</T></View>
      ) : lvl === 'high' ? (
        <View style={st.plan}>
          <Text style={st.planT}>Care plan (agreed in advance)</Text>
          <T style={{ fontSize: 14 }}>1. Gentle quests: a morning walk and earlier screens-off.</T>
          <T style={{ fontSize: 14 }}>2. Pinehollow gets a nudge to say hi. No data is shared.</T>
          <T style={{ fontSize: 14 }}>3. Sam’s care team sees the trend and offers a call.</T>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <Btn label="See the care-team view" sm onPress={() => S.go('clinic')} />
            <Btn label="Talk to someone now" kind="ghost" sm onPress={() => S.setModal({ type: 'support' })} />
          </View>
        </View>
      ) : null}
    </Panel>
  );

  return (
    <View style={{ gap: 20 }}>
      <BackLink />
      <View style={{ gap: 6 }}>
        <Eyebrow>All insights</Eyebrow>
        <H1>A gentle look back</H1>
        <T style={{ color: C.creamDim }}>Your check-ins, sleep, heart and movement, compared with your own normal. It’s here to help you notice what helps, not to grade you.</T>
      </View>
      {timeline}
      {status}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat label="Sleep, last 7 nights" value={(last7('sleepHours') ?? 0).toFixed(1) + ' h'} sub={'usual ' + sleepBase.toFixed(1) + ' h'} />
        <Stat label="Resting heart rate" value={Math.round(last7('restingHr') ?? 0) + ' bpm'} sub={'usual ' + Math.round(baseline('restingHr') ?? 0)} />
        <Stat label="Heart rate variability" value={Math.round(last7('hrvRmssd') ?? 0) + ' ms'} sub={'usual ' + Math.round(baseline('hrvRmssd') ?? 0)} />
        <Stat label="Steps a day" value={Math.round(last7('steps') ?? 0).toLocaleString('en-GB')} sub={'usual ' + Math.round(baseline('steps') ?? 0).toLocaleString('en-GB')} />
        <Stat label="Screen time" value={((last7('screenMinutes') ?? 0) / 60).toFixed(1) + ' h'} sub={'usual ' + ((baseline('screenMinutes') ?? 0) / 60).toFixed(1) + ' h'} />
      </View>
      <Panel>
        <PTitle eyebrow={'Last ' + N + ' days'} title="How you’ve been feeling" right={<Chip label="Daily check-ins" />} />
        <Bars data={mood} max={5} color={(v) => MCOL[Math.round(v) - 1]} axis={['', 'Okay', 'Bright']} days={days} />
        <Legend items={MOOD_KEYS.map((k, i) => [MCOL[i], MOODS[k].label] as [string, string]).concat([[C.night4, 'Skipped']])} />
      </Panel>
      {pair(
        <Panel>
          <PTitle eyebrow="From the watch" title="Sleep" right={<Chip label={'Usual ' + (sleepBase - 0.5).toFixed(1) + '–' + (sleepBase + 0.5).toFixed(1) + ' h'} />} />
          <Bars data={w('sleepHours')} max={11} color={(v) => (v > sleepBase + 1 || v < sleepBase - 1.2 ? '#7d6fb4' : '#8fb4e6')} axis={['0h', '5.5h', '11h']} band={[sleepBase - 0.5, sleepBase + 0.5]} days={days} />
          <Legend items={[['rgba(134,192,148,.45)', 'Your usual range'], ['#7d6fb4', 'Far from usual']]} />
        </Panel>,
        <Panel>
          <PTitle eyebrow="From the watch" title="Resting heart rate" right={<Chip label="bpm" />} />
          <Bars data={w('restingHr')} min={50} max={75} color={(v) => (v > (baseline('restingHr') ?? 61) + 3 ? '#e88a96' : '#AEB6CC')} axis={['50', '62', '75']} days={days} />
          <Legend items={[['#AEB6CC', 'Usual'], ['#e88a96', 'Raised']]} />
        </Panel>,
      )}
      {pair(
        <Panel>
          <PTitle eyebrow="From the watch" title="Heart rate variability" right={<Chip label="RMSSD, ms" />} />
          <Bars data={w('hrvRmssd')} max={70} color={(v) => (v < (baseline('hrvRmssd') ?? 46) * 0.85 ? '#7d6fb4' : '#86c094')} axis={['0', '35', '70']} days={days} />
          <Legend items={[['#86c094', 'Usual'], ['#7d6fb4', 'Lower: body under strain']]} />
        </Panel>,
        <Panel>
          <PTitle eyebrow="From the watch" title="Morning movement" right={<Chip label="Steps, 6–10 am" />} />
          <Bars data={w('morningSteps')} max={3200} color={(v) => (v < (baseline('morningSteps') ?? 1800) * 0.6 ? '#3f7a5a' : '#86c094')} axis={['0', '1.6k', '3.2k']} days={days} />
          <Legend items={[['#86c094', 'Active morning'], ['#3f7a5a', 'Slow start']]} />
        </Panel>,
      )}
      {pair(
        <Panel>
          <PTitle eyebrow="From the phone" title="Screen time" right={<Chip label="Hours a day" />} />
          <Bars data={w('screenMinutes').map((v) => (v == null ? null : v / 60))} max={10} color={(v) => (v > ((baseline('screenMinutes') ?? 190) / 60) * 1.5 ? '#f0913a' : '#a595d4')} axis={['0', '5h', '10h']} days={days} />
          <Legend items={[['#a595d4', 'Usual'], ['#f0913a', 'Much more than usual']]} />
        </Panel>,
        <Panel>
          <PTitle eyebrow="From the watch" title={nightLabel} right={<Chip label="Heart rate + sleep stage" />} />
          <View style={{ height: 96, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
            {night.map((p, i) => <View key={i} style={{ flex: 1, height: Math.max(3, ((p.hr - minHr) / (maxHr - minHr)) * 96), backgroundColor: STAGE_COL[p.stage], borderTopLeftRadius: 1, borderTopRightRadius: 1 }} />)}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <T muted style={{ fontSize: 12 }}>{night[0].time}</T><T muted style={{ fontSize: 12 }}>{minHr + 3}–{maxHr - 2} bpm</T><T muted style={{ fontSize: 12 }}>{night[night.length - 1].time}</T>
          </View>
          <Legend items={[[STAGE_COL.deep, 'Deep'], [STAGE_COL.light, 'Light'], [STAGE_COL.rem, 'REM'], [STAGE_COL.awake, 'Awake']]} />
        </Panel>,
      )}
      <Panel>
        <PTitle eyebrow="Things Mellow noticed" title="Little patterns" />
        <View style={{ flexDirection: cw >= 900 ? 'row' : 'column', gap: 14 }}>
          <View style={st.insight}><Icon name="sky" size={28} /><H3>Mornings</H3><T style={{ color: C.creamDim, fontSize: 14 }}>{morningPct == null ? '…' : morningPct >= 85 ? 'Your mornings are as active as usual. Morning light and movement are one of your strongest anchors.' : 'Your mornings are at ' + morningPct + '% of your usual. A slow start is one of your personal early signs.'}</T></View>
          <View style={st.insight}><Icon name="moon" size={28} /><H3>Sleep</H3><T style={{ color: C.creamDim, fontSize: 14 }}>{Math.abs(sleepDelta) < 0.4 ? 'Your sleep is right around your usual ' + sleepBase.toFixed(1) + ' hours.' : 'You’re sleeping about ' + Math.abs(sleepDelta).toFixed(1) + ' h ' + (sleepDelta > 0 ? 'more' : 'less') + ' than usual this week, and it’s more broken up.'}</T></View>
          <View style={st.insight}><Icon name="chat" size={28} /><H3>Connection</H3><T style={{ color: C.creamDim, fontSize: 14 }}>{msgPct == null ? '…' : msgPct >= 80 ? 'You’ve kept in touch as much as usual. Your best weeks follow Sunday Talk.' : 'You’ve sent ' + (100 - msgPct) + '% fewer messages than usual. Even a quick wave at the fire counts.'}</T></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'flex-start' }}>
          <Icon name="info" size={18} />
          <T muted style={{ flex: 1, fontSize: 13 }}>These are patterns, not diagnoses. You choose what your care team can see, and you can change that any time.</T>
        </View>
      </Panel>
      {pair(
        <Panel>
          <PTitle eyebrow="Short questionnaires" title="Check-ups" right={<Chip label="Shared with your care team" />} />
          {q.map((x) => (
            <View key={x.day} style={st.doneRow}>
              <T style={{ flex: 1, fontSize: 14 }}>{fmtDay(x.day)}</T>
              <T muted style={{ fontSize: 13 }}>Wellbeing (WHO-5) {x.who5}/100</T>
              {x.phq9 != null ? <Chip label={'PHQ-9 ' + x.phq9} bg={x.phq9 >= 10 ? C.roseSoft : C.night4} fg={x.phq9 >= 10 ? C.rose : C.creamDim} /> : null}
            </View>
          ))}
        </Panel>,
        <Panel>
          <PTitle eyebrow="Built on real data" title="Why mornings matter" />
          <T style={{ color: C.creamDim, fontSize: 14 }}>In the open Depresjon study (23 people with depression, 32 without, wrist actigraphy), people with depression moved about {Math.round((1 - DEMO.population.depressedActivityRatio) * 100)}% less overall, but between 6 and 10 am they moved only about {Math.round(DEMO.population.depressedMorningRatio * 100)}% as much as people without depression.</T>
          <T style={{ color: C.creamDim, fontSize: 14, marginTop: 8 }}>Mellow compares you only with yourself, and a slow morning is one of the signals it watches.</T>
          <T muted style={{ fontSize: 12, marginTop: 10 }}>Sources: Garcia-Ceja et al. 2018 (Depresjon, CC BY-NC 4.0); Furberg et al. 2016 (Fitbit, CC BY 4.0). Demo figures are synthetic, calibrated to these.</T>
        </Panel>,
      )}
      {pair(
        <Panel>
          <PTitle eyebrow="Recently" title="Things you did" />
          {[...S.actLog, { icon: 'play', t: 'Hidden Picture', d: 'Yesterday' }, { icon: 'walk', t: 'Slow Walk', d: 'Yesterday' }, { icon: 'chat', t: 'Sunday Talk', d: 'Sun' }, { icon: 'flame', t: 'Breathe with the Flame', d: 'Sat' }, { icon: 'sky', t: 'Sky Break', d: 'Fri' }].slice(0, 7).map((x, i) => (
            <View key={i} style={st.doneRow}><Icon name={x.icon} size={22} /><T style={{ flex: 1, fontSize: 14 }}>{x.t}</T><T muted style={{ fontSize: 12.5 }}>{x.d}</T></View>
          ))}
        </Panel>,
        <Panel>
          <PTitle eyebrow="Your path" title="Milestones" />
          {([['star', 'Joined Mellow', 'Oct 2'], ['flame', 'Lit Pinehollow with Juno, Teo and Ama', 'Oct 4'], ['chat', 'Your first Sunday Talk', 'Oct 6'], ['ember', '50 embers gathered', 'Oct 21'], ['leaf', 'Today', 'You’re here'], ['heart', 'Next: one month at the fire', 'In a few days']] as const).map(([ic, t, d], i, arr) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={[st.dot, i === arr.length - 1 && { backgroundColor: 'transparent', borderWidth: 2, borderStyle: 'dashed', borderColor: C.line }]}><Icon name={ic} size={16} /></View>
                {i < arr.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 14, backgroundColor: C.line }} /> : null}
              </View>
              <View style={{ paddingBottom: 16, flex: 1 }}><Text style={st.mt}>{t}</Text><T muted style={{ fontSize: 12.5 }}>{d}</T></View>
            </View>
          ))}
        </Panel>,
      )}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  axis: { fontFamily: F.label, fontSize: 10, color: C.muted, textAlign: 'right', width: 30 },
  day: { flex: 1, textAlign: 'center', fontFamily: F.label, fontSize: 10, color: C.muted },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.night4 },
  band: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(134,192,148,.14)' },
  preset: { borderRadius: 999, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 6 },
  presetT: { fontFamily: F.displayMed, fontSize: 13, color: C.creamDim },
  score: { width: 74, height: 74, borderRadius: 37, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  scoreN: { fontFamily: F.displayBold, fontSize: 24 },
  scoreL: { fontFamily: F.body, fontSize: 10.5, color: C.muted, marginTop: -2 },
  driver: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.iconWell, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  driverL: { flex: 1, fontFamily: F.bodyBold, fontSize: 14, color: C.cream },
  driverV: { fontFamily: F.body, fontSize: 13, color: C.creamDim },
  driverC: { fontFamily: F.display, fontSize: 14, minWidth: 70, textAlign: 'right' },
  plan: { marginTop: 14, gap: 4, backgroundColor: C.iconWell, borderRadius: 12, padding: 12 },
  planT: { fontFamily: F.display, fontSize: 15, color: C.cream, marginBottom: 2 },
  stat: { flexGrow: 1, flexBasis: 150, backgroundColor: C.night2, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, gap: 2 },
  statL: { fontFamily: F.label, fontSize: 12, color: C.muted },
  statV: { fontFamily: F.display, fontSize: 22, color: C.cream },
  insight: { flex: 1, backgroundColor: C.night3, borderRadius: 14, padding: 16, gap: 8 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.night4, flexWrap: 'wrap' },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.night3, alignItems: 'center', justifyContent: 'center' },
  mt: { fontFamily: F.display, fontSize: 16, color: C.cream },
}));
