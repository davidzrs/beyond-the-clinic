import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { C, F, themed } from '../theme';
import { Icon, Mallow } from '../components/Pixel';
import { Btn, LinkBtn } from '../components/ui';
import { useLayout } from '../layout';
import { fromYmd, niceDate, PLAN_DAYS, severity } from '../checkin';
import { baseline, dateOfDay, DEMO, Level, levelOf, meanOf, SAM, weekdayLetter, windowOf } from '../demo';
import { DayPicker } from '../components/DayPicker';

// Journey: how your weeks have been going, kindly.
// - Your week is described as weather: it changes, it passes, and it's never your fault.
// - No score out of 100, no red, no "Off" warnings. Differences are described, not judged.
// - Tapping a signal opens just that signal (its 2 weeks, why it matters, one small tip), right here.

type Weather = { title: string; icon: string; tone: string; face: string; text: string };
const WEATHER = (): Record<Level, Weather> => ({
  calibrating: { title: 'Getting to know you', icon: 'star', tone: C.plumSoft, face: 'calm', text: 'Mellow is still learning what a normal week looks like for you. Keep going as you are.' },
  steady: { title: 'Clear skies', icon: 'sun', tone: C.moss, face: 'happy', text: 'This week looks a lot like your usual. Nice and steady.' },
  watch: { title: 'A few clouds', icon: 'cloud', tone: C.amber, face: 'content', text: 'A couple of things drifted from your usual. Weeks vary, and that’s okay. Be gentle with yourself.' },
  high: { title: 'A rainy stretch', icon: 'rain', tone: C.plumSoft, face: 'calm', text: 'Things seem heavier lately. That isn’t your fault, and it passes. Small steps help, and you don’t have to do this alone.' },
});

type Sig = { key: string; label: string; icon: string; fmt: (v: number) => string; unit: string; why: string; tip: string; act?: string };
const SIGNALS: Sig[] = [
  { key: 'sleepHours', label: 'Sleep', icon: 'bed', fmt: (v) => v.toFixed(1) + ' h', unit: 'a night', why: 'Sleep is often the first thing to shift when life gets harder.', tip: 'Getting up at the same time each day helps more than going to bed early.' },
  { key: 'steps', label: 'Steps', icon: 'steps', fmt: (v) => (v / 1000).toFixed(1) + 'k', unit: 'a day', why: 'Moving a little lifts energy and mood, even on slow days.', tip: 'A 10-minute walk outside counts. So does a lap around the block.' },
  { key: 'screenMinutes', label: 'Screen time', icon: 'phone', fmt: (v) => (v / 60).toFixed(1) + ' h', unit: 'a day', why: 'Late-night scrolling can quietly eat into sleep.', tip: 'Try putting the phone away by 23:00, just for tonight.' },
  { key: 'restingHr', label: 'Resting heart', icon: 'pulse', fmt: (v) => Math.round(v) + ' bpm', unit: 'at rest', why: 'It rises a little with stress, illness or short nights.', tip: 'A few slow breaths can help your body settle.', act: 'breathe' },
];
// Describe a difference without judging it.
function compare(now: number, usual: number) {
  const r = now / usual;
  if (Math.abs(r - 1) < 0.1) return { text: 'about your usual', off: false };
  return { text: (Math.abs(r - 1) < 0.25 ? 'a bit ' : '') + (r > 1 ? 'more' : 'less') + ' than usual', off: true };
}

export default function Journey() {
  const S = useApp();
  const { cw } = useLayout();
  const two = cw >= 900;
  const day = S.demoDay;
  const [picking, setPicking] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const setDay = (d: number) => S.setDemoDay(Math.max(1, Math.min(DEMO.days, d)));
  const lvl = levelOf(SAM.series.risk[day - 1]);
  const W = WEATHER()[lvl];
  const noticed = (SAM.drivers[day - 1] || []).slice(0, 3);
  const dateLabel = dateOfDay(day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  const header = (
    <View style={[st.row, { flexWrap: 'wrap', gap: 12 }]}>
      <View style={{ flex: 1, minWidth: 220 }}>
        <Text style={st.h1}>{S.avatar.name ? S.avatar.name + '’s journey' : 'Your journey'}</Text>
        <Text style={st.sub}>How your weeks have been going, compared with your own normal. Never with anyone else.</Text>
      </View>
      {/* demo only: step through the 90 days of sample data */}
      <View style={st.datePick}>
        <Pressable onPress={() => setDay(day - 1)} disabled={day <= 1} accessibilityLabel="Previous day" style={[st.dateStep, day <= 1 && { opacity: 0.3 }]}><Icon name="back" size={15} /></Pressable>
        <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel="Choose a date" style={st.dateBtn}><Icon name="calendar" size={14} /><Text style={st.dateT}>{dateLabel}</Text></Pressable>
        <Pressable onPress={() => setDay(day + 1)} disabled={day >= DEMO.days} accessibilityLabel="Next day" style={[st.dateStep, day >= DEMO.days && { opacity: 0.3 }]}><Icon name="chevron" size={15} /></Pressable>
      </View>
      <DayPicker visible={picking} day={day} min={1} max={DEMO.days} onPick={setDay} onClose={() => setPicking(false)} />
    </View>
  );

  const tiles = SIGNALS.map((s) => {
    const now = meanOf(windowOf(SAM.series[s.key], day, 7)), usual = baseline(s.key);
    return { s, now, usual, cmp: now != null && usual != null ? compare(now, usual) : null };
  });
  const steadyOnes = tiles.filter((x) => x.cmp && !x.cmp.off && !(lvl !== 'steady' && noticed.some((d) => d.key === x.s.key)));

  // ---------- 1. your week, as weather ----------
  const tone = (l: Level) => (l === 'steady' ? C.moss : l === 'watch' ? C.amber : l === 'high' ? C.plumSoft : C.night4);
  const weather = (
    <View style={[st.card, { gap: 16 }, two && { flex: 1 }]}>
      <View style={[st.row, { gap: 14 }]}>
        <View style={[st.weatherIco, { borderColor: W.tone + '66' }]}><Icon name={W.icon} size={30} color={W.tone} /></View>
        <View style={{ flex: 1 }}>
          <Text style={st.eyebrow}>THIS WEEK</Text>
          <Text style={[st.weatherT, !two && { fontSize: 21 }]}>{W.title}</Text>
        </View>
        <Mallow a={S.avatar} face={W.face} size={58} />
      </View>
      <Text style={st.body}>{W.text}</Text>
      {noticed.length && lvl !== 'steady' ? (
        <View style={st.soft}>
          <Text style={st.h3}>What Mellow noticed</Text>
          {noticed.map((d) => (
            <View key={d.key} style={[st.row, { gap: 8 }]}>
              <View style={[st.dot, { backgroundColor: W.tone }]} />
              <Text style={st.sub2}>{d.label} {d.to > d.from ? 'has been higher' : 'has been lower'} than usual</Text>
            </View>
          ))}
          <Text style={st.sub}>These are just patterns, not a verdict. You know your week best.</Text>
        </View>
      ) : null}
      {/* always lead with what's going well */}
      {steadyOnes.length ? (
        <View style={st.soft}>
          <Text style={st.h3}>Going well</Text>
          {steadyOnes.map((x) => (
            <View key={x.s.key} style={[st.row, { gap: 8 }]}>
              <Icon name="check" size={16} />
              <Text style={st.sub2}>{x.s.label} is right around your usual</Text>
            </View>
          ))}
        </View>
      ) : null}
      {lvl === 'watch' || lvl === 'high' ? (
        <View style={{ gap: 8 }}>
          <Text style={st.h3}>Something small that might help</Text>
          <View style={[st.row, { flexWrap: 'wrap', gap: 8 }]}>
            <Btn label="Breathe with the fire" kind="ghost" sm icon="flame" onPress={() => S.setModal({ type: 'breathe' })} />
            <Btn label="Sit by the campfire" kind="ghost" sm icon="chat" onPress={() => S.go('campfire')} />
            {lvl === 'high' ? <Btn label="Talk to someone" sm icon="lifebuoy" onPress={() => S.setModal({ type: 'support' })} /> : null}
          </View>
        </View>
      ) : null}
      {/* the last 90 days as soft weather, no scores */}
      <View style={{ gap: 6, marginTop: 'auto' }}>
        <View style={st.strip}>
          {SAM.series.risk.map((rv, i) => {
            const l = levelOf(rv), sel = i + 1 === day;
            return (
              <Pressable key={i} onPress={() => setDay(i + 1)} accessibilityLabel={'Day ' + (i + 1)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                <View style={{ height: sel ? 22 : l === 'steady' ? 8 : l === 'watch' ? 13 : l === 'high' ? 18 : 5, borderRadius: 2, backgroundColor: sel ? C.cream : tone(l), opacity: sel ? 1 : i + 1 > day ? 0.2 : 0.6 }} />
              </Pressable>
            );
          })}
        </View>
        <View style={[st.row, { gap: 12, flexWrap: 'wrap' }]}>
          <Text style={[st.sub, { flex: 1 }]}>Your last 90 days</Text>
          {([['sun', 'Clear', C.moss], ['cloud', 'Clouds', C.amber], ['rain', 'Rain', C.plumSoft]] as const).map(([ic, l, c]) => (
            <View key={l} style={[st.row, { gap: 4 }]}><View style={[st.legend, { backgroundColor: c }]} /><Text style={st.sub}>{l}</Text></View>
          ))}
        </View>
      </View>
    </View>
  );

  // ---------- 2. four signals; tap one to open just that one ----------
  const sel = tiles.find((x) => x.s.key === open);
  const detail = sel ? (() => {
    const vals = windowOf(SAM.series[sel.s.key], day, 14);
    const days = Array.from({ length: 14 }, (_, i) => Math.max(14, day) - 13 + i);
    const max = Math.max(...vals.map((v) => v ?? 0), sel.usual ?? 0) * 1.15 || 1;
    const H = 90;
    return (
      <View style={[st.card, { gap: 12 }]}>
        <View style={st.row}>
          <Icon name={sel.s.icon} size={18} />
          <Text style={[st.h3, { flex: 1 }]}>{sel.s.label}, the last 2 weeks</Text>
          <Pressable onPress={() => setOpen(null)} accessibilityLabel="Close" hitSlop={8}><Icon name="close" size={18} /></Pressable>
        </View>
        <View style={{ height: H, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          {vals.map((v, i) => <View key={i} style={{ flex: 1, height: v == null ? 3 : Math.max(3, (v / max) * H), borderRadius: 3, backgroundColor: i === vals.length - 1 ? C.emberHi : C.plumSoft, opacity: v == null ? 0.3 : 0.7 }} />)}
          {sel.usual != null ? <View style={[st.usualLine, { bottom: (sel.usual / max) * H }]} /> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>{days.map((d, i) => <Text key={i} style={st.dayL}>{weekdayLetter(d)}</Text>)}</View>
        <Text style={st.sub}>The dashed line is your usual ({sel.usual != null ? sel.s.fmt(sel.usual) : '…'} {sel.s.unit}).</Text>
        <Text style={st.body}>{sel.s.why}</Text>
        <View style={[st.soft, st.row, { gap: 10 }]}>
          <Icon name="bulb" size={18} />
          <Text style={[st.sub2, { flex: 1 }]}>{sel.s.tip}</Text>
          {sel.s.act ? <Btn label="Breathe" kind="ghost" sm onPress={() => S.setModal({ type: 'breathe' })} /> : null}
        </View>
      </View>
    );
  })() : null;
  const signals = (
    <View style={{ gap: 10 }}>
      <View style={st.row}><Text style={[st.h2, { flex: 1 }]}>Your signals</Text><Text style={st.sub}>Last 7 days</Text></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tiles.map(({ s, now, usual, cmp }) => {
          const on = open === s.key;
          return (
            <Pressable key={s.key} onPress={() => setOpen(on ? null : s.key)} accessibilityRole="button" accessibilityState={{ expanded: on }}
              style={(p: any) => [st.card, st.tile, on && { borderColor: C.ember }, p.hovered && !on && { borderColor: C.lineHi }]}>
              <View style={[st.row, { gap: 6 }]}><Icon name={s.icon} size={16} /><Text style={[st.tileL, { flex: 1 }]}>{s.label}</Text><Icon name={on ? 'up' : 'down'} size={14} /></View>
              <Text style={st.tileV}>{now == null ? '…' : s.fmt(now)}</Text>
              <Text style={st.sub} numberOfLines={1}>{cmp ? cmp.text : ''}{usual != null && cmp?.off ? ' (' + s.fmt(usual) + ')' : ''}</Text>
            </Pressable>
          );
        })}
      </View>
      {detail || <Text style={st.hint}>Tap a signal to see its last 2 weeks and a small tip.</Text>}
    </View>
  );

  // ---------- 3. your check-ins, without judgement ----------
  const last = S.checkins[S.checkins.length - 1];
  const prev = S.checkins[S.checkins.length - 2];
  const hist = S.checkins.slice(-6);
  const change = last && prev ? last.score - prev.score : 0;
  const changeText = !prev ? '' : change < 0 ? 'Lighter than last time. 🌱' : change > 0 ? 'A bit heavier than last time. That’s okay, it’s exactly why we check in.' : 'About the same as last time.';
  const checkins = (
    <View style={[st.card, { gap: 12 }, two && { flex: 1 }]}>
      <View style={st.row}><Icon name="clipboard" size={18} /><Text style={[st.h2, { flex: 1 }]}>Your check-ins</Text></View>
      {last ? (
        <Pressable onPress={() => S.setModal({ type: 'report', c: last })} accessibilityRole="button" style={[st.row, { alignItems: 'flex-end', gap: 14 }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.title}>{niceDate(fromYmd(last.date))} · {severity(last.score)}</Text>
            <Text style={st.sub2}>{changeText}</Text>
            <Text style={[st.sub, { textDecorationLine: 'underline' }]}>See your answers</Text>
          </View>
          <View style={st.hist}>
            {hist.map((c, i) => <View key={c.date} style={{ width: 10, height: Math.max(4, (c.score / 27) * 46), borderRadius: 3, backgroundColor: i === hist.length - 1 ? C.emberHi : C.plumSoft, opacity: i === hist.length - 1 ? 1 : 0.6 }} />)}
          </View>
        </Pressable>
      ) : <Text style={st.sub}>Your first check-in will appear here.</Text>}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 3 }}>{Array.from({ length: PLAN_DAYS }, (_, i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= S.planDay ? (S.checkinDue ? C.ember : C.moss) : C.night4 }} />)}</View>
        <View style={st.row}>
          <Text style={[st.sub, { flex: 1 }]}>{S.checkinDue ? 'Your next check-in is open.' : 'Next one opens ' + niceDate(S.nextCheckin) + ' (in ' + S.checkinIn + (S.checkinIn === 1 ? ' day)' : ' days)')}</Text>
          {S.checkinDue ? <Btn label="Start" sm onPress={() => S.setModal({ type: 'phq' })} /> : <LinkBtn label="My 2 weeks" onPress={() => S.setModal({ type: 'plan' })} />}
        </View>
      </View>
    </View>
  );

  // ---------- 4. little wins: what you did, never what you didn't ----------
  const planDoneN = Object.keys(S.planDone).filter((k) => S.plan.days.some((d) => k.startsWith(d.date))).length;
  const wins: [string, string, string][] = [
    ['flame', S.streakCount > 0 ? S.streakCount + '-day streak' : 'Fresh start today', 'Days in a row you checked in with yourself'],
    ['leaf', planDoneN + (planDoneN === 1 ? ' small step' : ' small steps'), 'Done in this 2-week path'],
    ['ember', S.embers + ' embers', 'Warming the fire for everyone at Pinehollow'],
  ];
  const winsCard = (
    <View style={[st.card, { gap: 12 }, two && { flex: 1 }]}>
      <View style={st.row}><Icon name="star" size={18} /><Text style={[st.h2, { flex: 1 }]}>Little wins</Text></View>
      {wins.map(([ic, a, b]) => (
        <View key={a} style={[st.row, { gap: 12 }]}>
          <View style={st.winIco}><Icon name={ic} size={18} /></View>
          <View style={{ flex: 1 }}><Text style={st.title}>{a}</Text><Text style={st.sub}>{b}</Text></View>
        </View>
      ))}
      {S.actLog.slice(0, 3).map((x, i) => (
        <View key={i} style={[st.row, { gap: 12 }]}>
          <View style={st.winIco}><Icon name={x.icon} size={18} /></View>
          <View style={{ flex: 1 }}><Text style={st.title}>{x.t}</Text><Text style={st.sub}>{x.d}</Text></View>
        </View>
      ))}
    </View>
  );

  const links = (
    <View style={[st.row, { flexWrap: 'wrap', gap: 8 }]}>
      <Pressable onPress={() => S.go('insights')} style={st.link}><Text style={st.linkT}>All the details</Text><Icon name="chevron" size={14} /></Pressable>
      <Pressable onPress={() => S.setModal({ type: 'support' })} style={st.link}><Icon name="lifebuoy" size={14} /><Text style={st.linkT}>Talk to someone</Text></Pressable>
    </View>
  );

  if (!two) return <View style={{ gap: 14 }}>{header}{weather}{signals}{checkins}{winsCard}{links}</View>;
  return (
    <View style={{ gap: 20 }}>
      {header}
      <View style={{ flexDirection: 'row', gap: 20, alignItems: 'stretch' }}>
        <View style={{ flex: 1.1 }}>{weather}</View>
        <View style={{ flex: 1 }}>{signals}</View>
      </View>
      <View style={{ flexDirection: 'row', gap: 20, alignItems: 'stretch' }}>
        {checkins}
        {winsCard}
      </View>
      {links}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  card: { backgroundColor: C.night2, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  h1: { fontFamily: F.displayBold, fontSize: 26, color: C.cream },
  h2: { fontFamily: F.display, fontSize: 18, color: C.cream },
  h3: { fontFamily: F.display, fontSize: 15, color: C.cream },
  eyebrow: { fontFamily: F.label, fontSize: 11.5, letterSpacing: 0.8, color: C.muted },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: C.cream },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.creamDim },
  sub: { fontFamily: F.body, fontSize: 12.5, color: C.muted },
  sub2: { fontFamily: F.body, fontSize: 14, color: C.creamDim },
  hint: { fontFamily: F.body, fontSize: 12.5, color: C.muted, fontStyle: 'italic' },
  datePick: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: C.night2, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 2 },
  dateStep: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 10, borderRadius: 9 },
  dateT: { fontFamily: F.label, fontSize: 12.5, color: C.cream },
  weatherIco: { width: 60, height: 60, borderRadius: 18, borderWidth: 1, backgroundColor: C.night3, alignItems: 'center', justifyContent: 'center' },
  weatherT: { fontFamily: F.displayBold, fontSize: 26, color: C.cream },
  soft: { gap: 8, padding: 14, borderRadius: 14, backgroundColor: C.night3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  strip: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 24 },
  legend: { width: 10, height: 10, borderRadius: 3 },
  tile: { flexGrow: 1, flexBasis: 160, gap: 2, paddingVertical: 14 },
  tileL: { fontFamily: F.label, fontSize: 12.5, color: C.muted },
  tileV: { fontFamily: F.display, fontSize: 22, color: C.cream },
  usualLine: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.cream, zIndex: 1 },
  dayL: { flex: 1, textAlign: 'center', fontFamily: F.label, fontSize: 10.5, color: C.muted },
  hist: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 46 },
  winIco: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.night3, alignItems: 'center', justifyContent: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 7 },
  linkT: { fontFamily: F.displayMed, fontSize: 13, color: C.creamDim },
}));
