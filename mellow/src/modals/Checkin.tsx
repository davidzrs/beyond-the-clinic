import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { C, F, themed } from '../theme';
import { Icon } from '../components/Pixel';
import { Btn, Chip, Eyebrow, H2, H3, LinkBtn, Reply, T } from '../components/ui';
import { useLayout } from '../layout';
import { AREAS, buildPlan, Checkin, focusAreas, fromYmd, KEEP_UP_AREA, KEEP_UP_BASIS, needsSupport, niceDate, PHQ_ITEMS, PHQ_OPTIONS, PLAN_DAYS, severity } from '../checkin';

// The PHQ-9, one question at a time, then the report.
export function CheckinFlow() {
  const S = useApp();
  const [answers, setAnswers] = useState<number[]>([]);
  const [i, setI] = useState(0);
  const [result, setResult] = useState<Checkin | null>(null);
  if (result) return <Report c={result} fresh />;
  const pick = (v: number) => {
    const a = [...answers]; a[i] = v; setAnswers(a);
    if (i < PHQ_ITEMS.length - 1) setI(i + 1);
    else setResult(S.saveCheckin(a));
  };
  return (
    <View>
      <View style={st.track}><View style={[st.fill, { width: (((i + 1) / PHQ_ITEMS.length) * 100 + '%') as any }]} /></View>
      <Eyebrow>{'Question ' + (i + 1) + ' of ' + PHQ_ITEMS.length}</Eyebrow>
      <T muted style={{ marginTop: 6 }}>Over the last 2 weeks, how often have you been bothered by:</T>
      <H2 style={{ marginTop: 6, minHeight: 78 }}>{PHQ_ITEMS[i]}</H2>
      <View style={{ gap: 8, marginTop: 12 }}>
        {PHQ_OPTIONS.map((o, v) => (
          <Pressable key={o} onPress={() => pick(v)} accessibilityRole="button" accessibilityState={{ selected: answers[i] === v }}
            style={(p: any) => [st.opt, answers[i] === v && { borderColor: C.ember }, (p.hovered || p.pressed) && { borderColor: C.lineHi }]}>
            <Text style={st.optT}>{o}</Text>
          </Pressable>
        ))}
      </View>
      {i > 0 ? <View style={{ marginTop: 14 }}><LinkBtn label="Previous question" onPress={() => setI(i - 1)} /></View> : null}
    </View>
  );
}

// Short report: score, what to focus on, and the plan it would build.
export function Report({ c, fresh }: { c: Checkin; fresh?: boolean }) {
  const S = useApp();
  const idx = S.checkins.findIndex((x) => x.date === c.date);
  const prev = idx > 0 ? S.checkins[idx - 1] : null;
  const delta = prev ? c.score - prev.score : 0;
  const zone = focusAreas(c.answers);
  const shown = zone.slice(0, 3);
  const plan = buildPlan(c.answers);
  const small = plan.days.reduce((n, d) => n + d.tasks.filter((t) => !t.retake).length, 0);
  const next = niceDate(fromYmd(plan.days[PLAN_DAYS - 1].date));
  return (
    <View style={{ gap: 14 }}>
      {needsSupport(c.answers) ? (
        <View style={st.alert}>
          <Text style={st.alertT}>You mentioned thoughts of hurting yourself.</Text>
          <T style={{ color: C.creamDim, fontSize: 14 }}>You deserve support right now, not just a plan.</T>
          <Btn label="Get support now" kind="plum" sm onPress={() => S.setModal({ type: 'support' })} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Text style={st.score}>{c.score}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <H2>{severity(c.score)}</H2>
          <T muted>{'out of 27' + (prev ? ' · last time ' + prev.score : '')}</T>
        </View>
        {prev && delta !== 0 ? <Chip label={(delta > 0 ? '+' : '') + delta} bg={delta > 0 ? C.amberSoft : C.greenSoft} fg={delta > 0 ? C.amber : C.forest} /> : null}
      </View>
      <View style={{ gap: 8 }}>
        <Eyebrow>Focus for the next 2 weeks</Eyebrow>
        {shown.length ? shown.map((z) => (
          <View key={z.area} style={st.row}>
            <View style={st.ico}><Icon name={z.icon} size={22} /></View>
            <View style={{ flex: 1 }}>
              <Text style={st.rowT}>{z.area}</Text>
              <T muted style={{ fontSize: 13 }}>{'Try: ' + z.tasks[0].t.charAt(0).toLowerCase() + z.tasks[0].t.slice(1) + ' · ' + z.basis}</T>
            </View>
          </View>
        )) : <T style={{ color: C.creamDim }}>Nothing stands out right now. Keep doing what helps.</T>}
        {zone.length > 3 ? <T muted style={{ fontSize: 13 }}>{'+' + (zone.length - 3) + ' more in your plan'}</T> : null}
      </View>
      <Reply>
        <T>{small + ' small things over 2 weeks, never more than 2 a day. Next check-in on ' + next + '.'}</T>
        <T muted style={{ fontSize: 12.5 }}>Based on the PHQ-9. A check-in, not a diagnosis.</T>
      </Reply>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {fresh ? (
          <>
            <Btn label="Add to my plan" icon="calendar" onPress={() => { S.adoptPlan(c.answers); S.setModal(null); }} />
            <Btn label="Not now" kind="ghost" onPress={() => S.setModal(null)} />
          </>
        ) : <Btn label="See my plan" kind="ghost" icon="calendar" onPress={() => S.setModal({ type: 'plan' })} />}
      </View>
    </View>
  );
}

// 14-day calendar of the current plan. Tap a day to see what's on it; day 14 is the next check-in.
export function PlanCalendar() {
  const S = useApp();
  const { width } = useLayout();
  const today = Math.min(PLAN_DAYS - 1, S.planDay);
  const [sel, setSel] = useState(today);
  const gridW = Math.min(560, width - 32) - 40;
  const cell = Math.floor((gridW - 4 - 6 * 6) / 7);
  const day = S.plan.days[sel];
  const basis: Record<string, string> = { ...Object.fromEntries(AREAS.map((a) => [a.area, a.basis])), [KEEP_UP_AREA]: KEEP_UP_BASIS };
  const first = fromYmd(S.plan.days[0].date), last = fromYmd(S.plan.days[PLAN_DAYS - 1].date);
  const label = sel === PLAN_DAYS - 1 ? 'Day 14 · Check-in' : sel === today ? 'Today' : niceDate(fromYmd(day.date));
  return (
    <View style={{ gap: 14 }}>
      <T muted>{niceDate(first) + ' – ' + niceDate(last) + (S.plan.areas.length ? ' · focus: ' + S.plan.areas.join(', ') : '')}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {S.plan.days.map((d, i) => {
          const dt = fromYmd(d.date);
          const retake = d.tasks.some((t) => t.retake);
          const on = i === sel;
          return (
            <Pressable key={d.date} onPress={() => setSel(i)} accessibilityLabel={niceDate(dt)} accessibilityState={{ selected: on }}
              style={[st.cell, { width: cell }, on && { backgroundColor: C.night4 }, i === today && { borderColor: C.ember }]}>
              <Text style={st.wd}>{dt.toLocaleDateString('en-GB', { weekday: 'narrow' })}</Text>
              <Text style={st.dn}>{dt.getDate()}</Text>
              <View style={{ flexDirection: 'row', gap: 3, height: 10, alignItems: 'center' }}>
                {retake ? <Icon name="clipboard" size={11} /> : d.tasks.map((_, j) => (
                  <View key={j} style={[st.dot, { backgroundColor: S.planDone[d.date + '-' + j] ? C.moss : i < today ? C.line : C.ember }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 8 }}>
        <H3>{label}</H3>
        {day.tasks.length === 0 ? <T muted>A rest day. Nothing planned, and that’s fine.</T> : day.tasks.map((t, j) => {
          const key = day.date + '-' + j;
          const done = !!S.planDone[key];
          return t.retake ? (
            <View key={j} style={st.row}>
              <View style={st.ico}><Icon name="clipboard" size={22} /></View>
              <View style={{ flex: 1 }}><Text style={st.rowT}>Your 2-week check-in</Text><T muted style={{ fontSize: 13 }}>9 questions · builds your next plan</T></View>
              {S.checkinDue ? <Btn label="Start" sm onPress={() => S.setModal({ type: 'phq' })} /> : <Text style={st.soon}>{'Opens in ' + S.checkinIn + (S.checkinIn === 1 ? ' day' : ' days')}</Text>}
            </View>
          ) : (
            <View key={j} style={[st.row, done && { backgroundColor: C.greenSoft }]}>
              <View style={st.ico}><Icon name={done ? 'check' : t.icon} size={22} /></View>
              <View style={{ flex: 1 }}><Text style={st.rowT}>{t.t}</Text><T muted style={{ fontSize: 13 }}>{t.dur + ' · ' + t.area + (basis[t.area] ? ' · ' + basis[t.area] : '')}</T></View>
              {sel <= today ? (
                <Pressable onPress={() => (done ? S.undoTask(key) : S.doTask(key, t))} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={'Done: ' + t.t} hitSlop={8}
                  style={[st.tick, done && { backgroundColor: C.forest, borderColor: C.forest }]}>
                  {done ? <Icon name="check" size={18} color={C.cream} /> : null}
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
        {([[C.ember, 'To do'], [C.moss, 'Done'], [C.line, 'Skipped']] as const).map(([c, l]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={[st.dot, { backgroundColor: c }]} /><T muted style={{ fontSize: 12.5 }}>{l}</T></View>
        ))}
      </View>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  soon: { fontFamily: F.label, fontSize: 12.5, color: C.muted },
  track: { height: 6, borderRadius: 3, backgroundColor: C.night4, marginBottom: 14, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: C.ember },
  opt: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.night3, minHeight: 52, justifyContent: 'center' },
  optT: { fontFamily: F.displayMed, fontSize: 15.5, color: C.cream },
  score: { fontFamily: F.displayBold, fontSize: 46, color: C.emberHi, minWidth: 58, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, backgroundColor: C.night3 },
  ico: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.night2, alignItems: 'center', justifyContent: 'center' },
  rowT: { fontFamily: F.bodyBold, fontSize: 15, color: C.cream },
  alert: { backgroundColor: C.roseSoft, borderRadius: 14, borderWidth: 1, borderColor: C.rose, padding: 14, gap: 6 },
  alertT: { fontFamily: F.display, fontSize: 16.5, color: C.cream },
  cell: { height: 62, borderRadius: 10, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.night3, alignItems: 'center', justifyContent: 'center', gap: 2 },
  wd: { fontFamily: F.label, fontSize: 10.5, color: C.muted },
  dn: { fontFamily: F.display, fontSize: 16, color: C.cream },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tick: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: C.lineHi, alignItems: 'center', justifyContent: 'center' },
}));
