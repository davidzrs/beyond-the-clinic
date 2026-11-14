import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { MOOD_KEYS, MOODS } from '../data';
import { C, F, themed } from '../theme';
import { Icon, Mallow } from '../components/Pixel';
import { Btn, Eyebrow, H2, LinkBtn, Panel, T } from '../components/ui';
import { useLayout } from '../layout';
import { PLAN_DAYS, PlanTask } from '../checkin';
import { LEVEL_UI, levelOf, SAM } from '../demo';

// Games stay as they are for now (TBD); Today just links to them.
const QUICK: [string, string, string][] = [['words', 'words', 'Words'], ['light', 'sun', 'Find light'], ['breathe', 'flame', 'Breathe'], ['forest', 'forest', 'Forest']];

// Today fits on one phone screen: one alert at most, mood, today's plan, games, the fire.
export default function Home() {
  const S = useApp();
  const { cw, wide, pad, height } = useLayout();
  const two = cw >= 900;
  const now = new Date();
  const hr = now.getHours();
  const greet = hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const bare = { ...S.avatar, hat: 'none', glasses: 'none', acc: 'none', item: 'none' };

  // 1. At most one thing that needs you: the check-in when it's due, otherwise an early-warning nudge.
  const lvl = levelOf(SAM.series.risk[S.demoDay - 1]);
  const ui = LEVEL_UI[lvl];
  const moved = (SAM.drivers[S.demoDay - 1] || []).slice(0, 2).map((d) => d.label.toLowerCase()).join(', ');
  const alert = S.checkinDue ? (
    <Pressable onPress={() => S.setModal({ type: 'phq' })} style={[st.card, st.row, { borderColor: C.ember, backgroundColor: C.navySoft }]}>
      <View style={[st.ico, { backgroundColor: C.night2 }]}><Icon name="clipboard" size={22} /></View>
      <View style={{ flex: 1 }}><Text style={st.title}>Time for your 2-week check-in</Text><Text style={st.sub}>9 questions · about 2 minutes</Text></View>
      <Btn label="Start" sm onPress={() => S.setModal({ type: 'phq' })} />
    </Pressable>
  ) : lvl === 'watch' || lvl === 'high' ? (
    <Pressable onPress={() => S.go('journey')} style={[st.card, st.row, { borderColor: ui.color + '88', backgroundColor: ui.bg }]}>
      <View style={[st.ico, { backgroundColor: C.iconWell }]}><Icon name="pulse" size={22} color={ui.color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[st.title, { color: ui.color }]} numberOfLines={1}>{lvl === 'high' ? 'Early signs showing' : 'Worth watching'}</Text>
        <Text style={st.sub2} numberOfLines={2}>{moved ? 'Changed: ' + moved : 'A few things shifted from your usual.'}</Text>
      </View>
      {lvl === 'high' ? <Btn label="Check in" sm onPress={() => S.setModal({ type: 'phq' })} /> : <Icon name="chevron" size={18} />}
    </Pressable>
  ) : null;

  // 2. Mood: one row of faces, then a single line once answered.
  const m = S.mood ? MOODS[S.mood] : null;
  const mood = m ? (
    <View style={[st.card, { gap: 6 }]}>
      <View style={st.row}>
        <Mallow a={bare} face={m.face} size={34} anim={false} />
        <View style={{ flex: 1 }}><Text style={st.title}>Feeling {m.label.toLowerCase()} today</Text><Text style={st.sub} numberOfLines={1}>{m.reply}</Text></View>
        <LinkBtn label="Change" onPress={() => S.setMood(null)} />
      </View>
      {m.support ? <LinkBtn label="Talk to someone now" onPress={() => S.setModal({ type: 'support' })} /> : null}
    </View>
  ) : (
    <View style={[st.card, { gap: 10 }]}>
      <Text style={st.h}>How are you feeling today?</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {MOOD_KEYS.map((k) => (
          <Pressable key={k} onPress={() => S.answerMood(k)} accessibilityLabel={MOODS[k].label} style={(p: any) => [st.mood, p.hovered && { borderColor: C.lineHi }]}>
            <Mallow a={bare} face={MOODS[k].face} size={28} anim={false} />
            <Text style={st.moodT} numberOfLines={1}>{MOODS[k].label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // 3. Today's plan (from the last check-in). Tap the circle to tick it off; tap the row to start it.
  const dayIdx = Math.min(PLAN_DAYS - 1, S.planDay);
  const today = S.plan.days[dayIdx];
  const tasks = S.checkinDue ? [] : today.tasks.map((t, j) => ({ t, key: today.date + '-' + j })).filter((x) => !x.t.retake);
  const left = PLAN_DAYS - 1 - S.planDay;
  const start = (t: PlanTask) => { if (t.act === 'breathe') S.setModal({ type: 'breathe' }); else if (t.act === 'campfire') S.go('campfire'); };
  const rows = S.checkinDue
    ? S.quests.slice(0, 2).map((q) => ({ key: q.id, icon: q.icon, t: q.title, sub: q.dur + ' · +' + q.ember + ' embers', done: !!S.questState[q.id], act: !!q.act, onStart: () => q.act && S.setModal({ type: q.act, quest: q.id }), onTick: () => !S.questState[q.id] && S.doQuest(q.id) }))
    : tasks.map(({ t, key }) => ({ key, icon: t.icon, t: t.t, sub: t.dur + ' · ' + t.area, done: !!S.planDone[key], act: !!t.act, onStart: () => start(t), onTick: () => (S.planDone[key] ? S.undoTask(key) : S.doTask(key, t)) }));
  const plan = (
    <View style={[st.card, { gap: 10 }]}>
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Text style={st.h}>Today’s plan</Text>
          <Text style={st.sub}>{S.checkinDue ? 'Your check-in sets the next 2 weeks' : 'Day ' + (dayIdx + 1) + ' of ' + PLAN_DAYS + ' · check-in in ' + left + (left === 1 ? ' day' : ' days')}</Text>
        </View>
        <Btn label="2 weeks" kind="ghost" sm icon="calendar" onPress={() => S.setModal({ type: 'plan' })} />
      </View>
      {rows.length ? rows.map((r) => (
        <Pressable key={r.key} onPress={r.act ? r.onStart : r.onTick} style={[st.task, r.done && { opacity: 0.6 }]}>
          <View style={st.tico}><Icon name={r.icon} size={20} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[st.title, { fontSize: 14.5 }, r.done && { textDecorationLine: 'line-through' }]} numberOfLines={2}>{r.t}</Text>
            <Text style={st.sub} numberOfLines={1}>{r.sub}</Text>
          </View>
          <Pressable onPress={r.onTick} accessibilityRole="checkbox" accessibilityState={{ checked: r.done }} accessibilityLabel={'Done: ' + r.t} hitSlop={8}
            style={[st.tick, r.done && { backgroundColor: C.forest, borderColor: C.forest }]}>
            {r.done ? <Icon name="check" size={18} color={C.cream} /> : null}
          </Pressable>
        </Pressable>
      )) : <Text style={st.sub}>Nothing planned today. Rest is part of the plan too.</Text>}
    </View>
  );

  // 4. Games and calm, one tap each (unchanged games, see Activities).
  const games = (
    <View style={{ gap: 8 }}>
      <View style={st.row}><Text style={[st.h, { flex: 1 }]}>Games & calm</Text><LinkBtn label="See all" onPress={() => S.go('activities')} /></View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {QUICK.map(([id, ic, t]) => (
          <Pressable key={id} onPress={() => (id === 'forest' ? S.setModal({ type: 'sound', kind: 'forest' }) : S.setModal({ type: id }))}
            style={(p: any) => [st.tile, p.hovered && { borderColor: C.lineHi }]}>
            <Icon name={S.actDone[id] ? 'check' : ic} size={22} />
            <Text style={st.tileT} numberOfLines={1}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // 5. The fire in one line.
  const last = S.chat[S.chat.length - 1];
  const who = S.members.find((x) => x.id === last.from) || S.members[2];
  const fire = (
    <Pressable onPress={() => S.go('campfire')} accessibilityRole="button" accessibilityLabel="Go to your campfire" style={[st.card, st.row, { paddingVertical: 10 }]}>
      <Mallow a={who.a} size={30} anim={false} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[st.title, { fontFamily: F.body, fontSize: 14 }]}><Text style={{ fontFamily: F.bodyBold }}>{who.id === 'me' ? 'You' : who.name}: </Text>{last.text}</Text>
        <Text style={st.sub} numberOfLines={1}>Pinehollow · Sunday Talk, Sun 19:00</Text>
      </View>
      <Icon name="chevron" size={18} />
    </Pressable>
  );

  // Testing only: replay the first-open streak screen and start the demo fresh.
  const reset = (
    <View style={{ gap: 6, alignItems: 'center', marginTop: 6 }}>
      <Text style={st.resetT}>Testing: reset the demo and replay the streak screen</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([['day', 'Day'], ['night', 'Night']] as const).map(([k, l]) => (
          <Pressable key={k} onPress={() => setTimeout(() => S.resetDemo(k), 250)} accessibilityRole="button" accessibilityLabel={'Reset demo, ' + l.toLowerCase()} style={(p: any) => [st.reset, (p.pressed || p.hovered) && { opacity: 0.7 }]}>
            <Icon name="refresh" size={16} />
            <Text style={st.resetT}>{'Reset · ' + l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const header = wide ? (
    <View style={{ gap: 2 }}>
      <Eyebrow>{dateStr}</Eyebrow>
      <H2>{greet}, {S.avatar.name || 'friend'}</H2>
    </View>
  ) : (
    <View style={[st.hero, { marginHorizontal: -pad, paddingHorizontal: pad }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Eyebrow style={{ color: C.heroDim }}>{dateStr}</Eyebrow>
        <H2 style={{ color: C.heroText }}>{greet}, {S.avatar.name || 'friend'}</H2>
        {height >= 760 ? <Text style={st.heroSub}>{S.streakCount > 0 ? S.streakCount + '-day streak · ' : ''}{S.embers} embers</Text> : null}
      </View>
      <View style={st.glow}><Mallow a={S.avatar} size={46} anim /></View>
    </View>
  );

  return two ? (
    <View style={{ gap: 16 }}>
      {header}
      <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
        <View style={{ flex: 1.3, gap: 12 }}>{alert}{mood}{plan}</View>
        <View style={{ flex: 1, gap: 12 }}>{fire}{games}{reset}</View>
      </View>
    </View>
  ) : (
    <View style={{ gap: 10 }}>{header}{alert}{mood}{plan}{games}{fire}{reset}</View>
  );
}

const st = themed(() => StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.navyDeep, paddingTop: 0, paddingBottom: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 2 },
  heroSub: { fontFamily: F.body, fontSize: 13, color: C.heroDim },
  reset: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, minHeight: 44, borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', borderColor: C.lineHi },
  resetT: { fontFamily: F.bodyBold, fontSize: 13, color: C.muted },
  glow: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.peach, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.night2, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ico: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  h: { fontFamily: F.display, fontSize: 16.5, color: C.cream },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: C.cream },
  sub: { fontFamily: F.body, fontSize: 12.5, color: C.muted },
  sub2: { fontFamily: F.body, fontSize: 13, color: C.creamDim },
  mood: { flex: 1, alignItems: 'center', gap: 1, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.night3 },
  moodT: { fontFamily: F.displayMed, fontSize: 11.5, color: C.creamDim },
  task: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, backgroundColor: C.night3 },
  tico: { width: 36, height: 36, borderRadius: 9, backgroundColor: C.night2, alignItems: 'center', justifyContent: 'center' },
  tick: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: C.lineHi, alignItems: 'center', justifyContent: 'center' },
  tile: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.night2 },
  tileT: { fontFamily: F.displayMed, fontSize: 11.5, color: C.creamDim, textAlign: 'center' },
}));
