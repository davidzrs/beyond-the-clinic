import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { C, F, themed } from '../theme';
import { Icon } from '../components/Pixel';
import { Btn, Eyebrow, H2, IconBtn } from '../components/ui';
import { useLayout } from '../layout';
import { fromYmd, niceDate, PLAN_DAYS, severity } from '../checkin';
import { baseline, dateOfDay, DEMO, fmtDay, LEVEL_UI, levelOf, meanOf, SAM, windowOf } from '../demo';
import { DayPicker } from '../components/DayPicker';

// The four signals, this week vs the person's own normal (days 7-34 of the demo data).
const SIGNALS: { key: string; label: string; icon: string; fmt: (v: number) => string; off: (now: number, usual: number) => boolean }[] = [
  { key: 'sleepHours', label: 'Sleep', icon: 'bed', fmt: (v) => v.toFixed(1) + ' h', off: (a, b) => Math.abs(a - b) > 0.7 },
  { key: 'steps', label: 'Steps', icon: 'steps', fmt: (v) => (v / 1000).toFixed(1) + 'k', off: (a, b) => a < b * 0.8 },
  { key: 'screenMinutes', label: 'Screen time', icon: 'phone', fmt: (v) => (v / 60).toFixed(1) + ' h', off: (a, b) => a > b * 1.25 },
  { key: 'restingHr', label: 'Resting heart', icon: 'pulse', fmt: (v) => Math.round(v) + ' bpm', off: (a, b) => a > b + 3 },
];

// Journey fits on one phone screen: how this week compares, the check-in, four signals. Details live in Insights.
export default function Journey() {
  const S = useApp();
  const { cw, wide, pad } = useLayout();
  const two = cw >= 900;
  const day = S.demoDay;
  const [picking, setPicking] = useState(false);
  const setDay = (d: number) => S.setDemoDay(Math.max(1, Math.min(DEMO.days, d)));
  const risk = SAM.series.risk[day - 1];
  const lvl = levelOf(risk);
  const ui = LEVEL_UI[lvl];
  const drivers = (SAM.drivers[day - 1] || []).slice(0, 2);

  const header = (
    <View style={[st.row, !wide && { backgroundColor: C.navyDeep, marginHorizontal: -pad, paddingHorizontal: pad, paddingTop: 2, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }]}>
      <H2 style={[{ flex: 1 }, !wide && { color: C.heroText }]}>{(S.avatar.name || 'Your') + (S.avatar.name ? '’s' : '')} journey</H2>
      <Pressable onPress={() => S.go('wardrobe')} accessibilityLabel="Customize your marshmallow" style={st.embers}><Icon name="ember" size={14} /><Text style={st.embersT}>{S.embers}</Text></Pressable>
    </View>
  );

  // 1. This week compared with your normal: level, score on a green / amber / red scale, the 90-day
  //    timeline (tap a bar), and the date (step a day, or tap it to pick from a calendar).
  const ZONES: [number, number, 'steady' | 'watch' | 'high'][] = [[0, 30, 'steady'], [30, 55, 'watch'], [55, 100, 'high']];
  const status = (
    <View style={[st.card, st.status]}>
      <View style={[st.accent, { backgroundColor: ui.color }]} />
      <View style={st.row}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={st.sub}>This week, compared with your normal</Text>
          <View style={[st.lvl, { backgroundColor: ui.bg }]}>
            <View style={[st.lvlDot, { backgroundColor: ui.color }]} />
            <Text style={[st.lvlT, { color: C.cream }]}>{ui.label}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[st.scoreN, { color: ui.color }]}>{risk == null ? '…' : risk}</Text>
          <Text style={st.sub}>of 100</Text>
        </View>
      </View>
      <View style={st.meter}>
        {ZONES.map(([a, b, z]) => (
          <View key={z} style={{ flex: b - a, height: 6, borderRadius: 3, backgroundColor: z === lvl ? LEVEL_UI[z].color : LEVEL_UI[z].bg }} />
        ))}
        {risk != null && <View style={[st.marker, { left: `${Math.max(0, Math.min(100, risk))}%`, backgroundColor: ui.color }]} />}
      </View>
      <Text style={st.sub2} numberOfLines={1}>{drivers.length ? drivers.map((d) => d.label + ' ' + d.change).join(' · ') : ui.text}</Text>
      <View style={st.strip}>
        {SAM.series.risk.map((rv, i) => {
          const l = levelOf(rv); const sel = i + 1 === day;
          return (
            <Pressable key={i} onPress={() => setDay(i + 1)} accessibilityLabel={'Day ' + (i + 1)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
              <View style={{ height: sel ? 26 : Math.max(3, ((rv ?? 0) / 100) * 22), borderRadius: 1.5, backgroundColor: sel ? C.cream : l === 'calibrating' ? C.night4 : LEVEL_UI[l].color, opacity: sel ? 1 : i + 1 > day ? 0.25 : 0.55 }} />
            </Pressable>
          );
        })}
      </View>
      <View style={st.row}>
        <Text style={[st.sub, { flex: 1 }]} numberOfLines={1}>Last 90 days · demo</Text>
        <View style={st.datePick}>
          <Pressable onPress={() => setDay(day - 1)} disabled={day <= 1} accessibilityLabel="Previous day" style={[st.dateStep, day <= 1 && { opacity: 0.3 }]}><Icon name="back" size={15} /></Pressable>
          <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel="Choose a date" style={(p: any) => [st.dateBtn, (p.pressed || p.hovered) && { backgroundColor: C.night4 }]}>
            <Icon name="calendar" size={14} />
            <Text style={st.day}>{dateOfDay(day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</Text>
          </Pressable>
          <Pressable onPress={() => setDay(day + 1)} disabled={day >= DEMO.days} accessibilityLabel="Next day" style={[st.dateStep, day >= DEMO.days && { opacity: 0.3 }]}><Icon name="chevron" size={15} /></Pressable>
        </View>
      </View>
      <DayPicker visible={picking} day={day} min={1} max={DEMO.days} onPick={setDay} onClose={() => setPicking(false)} />
    </View>
  );

  // 2. The 2-week check-in: last score, trend, and the way into the form and the plan.
  const last = S.checkins[S.checkins.length - 1];
  const prev = S.checkins[S.checkins.length - 2];
  const delta = last && prev ? last.score - prev.score : 0;
  const hist = S.checkins.slice(-6);
  const checkin = (
    <View style={[st.card, { gap: 10 }]}>
      {last ? (
        <Pressable onPress={() => S.setModal({ type: 'report', c: last })} style={st.row} accessibilityLabel="Open your last check-in">
          <Text style={st.score}>{last.score}</Text>
          <View style={{ flex: 1, gap: 1 }}>
            <Eyebrow>2-week check-in</Eyebrow>
            <Text style={st.title} numberOfLines={1}>{severity(last.score) + (prev && delta !== 0 ? (delta < 0 ? ' · ↓' : ' · ↑') + Math.abs(delta) : '')}</Text>
            <Text style={st.sub} numberOfLines={1}>{'Last one ' + niceDate(fromYmd(last.date)) + (S.checkinDue ? ' · the next one is open' : '')}</Text>
          </View>
          <View style={st.hist}>
            {hist.map((c, i) => <View key={c.date} style={{ width: 7, height: Math.max(3, (c.score / 27) * 40), borderRadius: 2, backgroundColor: c.score >= 10 ? C.rose : i === hist.length - 1 ? C.emberHi : C.plumSoft }} />)}
          </View>
        </Pressable>
      ) : <Text style={st.sub}>No check-ins yet.</Text>}
      {/* The 2 weeks filling up until the next check-in opens. */}
      <View style={st.wait} accessibilityLabel={S.checkinDue ? 'Check-in open' : 'Next check-in in ' + S.checkinIn + ' days'}>
        {Array.from({ length: PLAN_DAYS }, (_, i) => <View key={i} style={[st.waitSeg, { backgroundColor: i <= S.planDay ? (S.checkinDue ? C.ember : C.moss) : C.night4 }]} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {S.checkinDue
          ? <Btn label="Start check-in" sm icon="clipboard" onPress={() => S.setModal({ type: 'phq' })} />
          : (
            <View style={st.locked} accessibilityRole="text">
              <Icon name="clock" size={15} />
              <Text style={st.lockedT}>{'Opens in ' + S.checkinIn + (S.checkinIn === 1 ? ' day' : ' days')}</Text>
              <Text style={st.lockedD}>{niceDate(S.nextCheckin)}</Text>
            </View>
          )}
        <Btn label="My 2 weeks" kind="ghost" sm icon="calendar" onPress={() => S.setModal({ type: 'plan' })} />
      </View>
    </View>
  );

  // 3. Four signals, this week vs usual. Tap for the detailed charts.
  const tileW = two ? '48%' : (cw - 8) / 2;
  const signals = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {SIGNALS.map((s) => {
        const now = meanOf(windowOf(SAM.series[s.key], day, 7));
        const usual = baseline(s.key);
        const off = now != null && usual != null && s.off(now, usual);
        return (
          <Pressable key={s.key} onPress={() => S.go('insights')} style={(p: any) => [st.card, st.tile, { width: tileW as any }, off && { borderColor: C.amber + '88', backgroundColor: C.amberSoft }, p.hovered && { borderColor: C.lineHi }]}>
            <View style={[st.row, { gap: 6 }]}><Icon name={s.icon} size={16} /><Text style={st.tileL}>{s.label}</Text></View>
            <Text style={st.tileV}>{now == null ? '…' : s.fmt(now)}</Text>
            <Text style={[st.sub, off && { color: C.amber }]} numberOfLines={1}>{usual == null ? '' : (off ? 'Off · ' : '') + 'usual ' + s.fmt(usual)}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  // 4. Where to go next.
  const links = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pressable onPress={() => S.go('insights')} style={st.link}><Text style={st.linkT}>Insights</Text><Icon name="chevron" size={14} /></Pressable>
      <Pressable onPress={() => S.go('clinic')} style={st.link}><Text style={st.linkT}>Care team</Text><Icon name="chevron" size={14} /></Pressable>
      <Pressable onPress={() => S.setModal({ type: 'support' })} style={st.link}><Icon name="lifebuoy" size={14} /><Text style={st.linkT}>Get help</Text></Pressable>
    </View>
  );

  return two ? (
    <View style={{ gap: 16 }}>
      {header}
      <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
        <View style={{ flex: 1.2, gap: 12 }}>{status}{checkin}</View>
        <View style={{ flex: 1, gap: 12 }}>{signals}{links}</View>
      </View>
    </View>
  ) : (
    <View style={{ gap: 12 }}>{header}{status}{checkin}{signals}{links}</View>
  );
}

const st = themed(() => StyleSheet.create({
  card: { backgroundColor: C.night2, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  embers: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, backgroundColor: C.peach, paddingHorizontal: 10, paddingVertical: 4 },
  embersT: { fontFamily: F.display, fontSize: 14, color: C.ink },
  big: { fontFamily: F.display, fontSize: 20, color: C.cream },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: C.cream },
  sub: { fontFamily: F.body, fontSize: 12.5, color: C.muted },
  sub2: { fontFamily: F.body, fontSize: 13, color: C.creamDim },
  status: { gap: 10, paddingLeft: 16, overflow: 'hidden' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  lvl: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 },
  lvlDot: { width: 9, height: 9, borderRadius: 5 },
  lvlT: { fontFamily: F.display, fontSize: 17 },
  scoreN: { fontFamily: F.displayBold, fontSize: 30, lineHeight: 32 },
  meter: { flexDirection: 'row', gap: 3, alignItems: 'center', height: 14 },
  marker: { position: 'absolute', width: 14, height: 14, borderRadius: 7, marginLeft: -7, borderWidth: 2.5, borderColor: C.night2 },
  strip: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 26 },
  datePick: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: C.night3, borderRadius: 12, padding: 2 },
  dateStep: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 10, borderRadius: 9 },
  day: { fontFamily: F.label, fontSize: 12.5, color: C.cream },
  wait: { flexDirection: 'row', gap: 3 },
  waitSeg: { flex: 1, height: 4, borderRadius: 2 },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', borderColor: C.lineHi, paddingHorizontal: 12, paddingVertical: 7, opacity: 0.85 },
  lockedT: { fontFamily: F.label, fontSize: 13, color: C.creamDim },
  lockedD: { fontFamily: F.body, fontSize: 12.5, color: C.muted },
  score: { fontFamily: F.displayBold, fontSize: 30, color: C.emberHi, minWidth: 36 },
  hist: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 40 },
  tile: { gap: 1, paddingVertical: 8 },
  tileL: { fontFamily: F.label, fontSize: 12, color: C.muted },
  tileV: { fontFamily: F.display, fontSize: 19, color: C.cream },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 6 },
  linkT: { fontFamily: F.displayMed, fontSize: 13, color: C.creamDim },
}));
