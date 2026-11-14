import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { COOP_GOAL, MOOD_KEYS, MOODS } from '../data';
import { C, F, themed } from '../theme';
import { Icon, Mallow } from '../components/Pixel';
import { Btn, Eyebrow, H2, LinkBtn, Panel, T } from '../components/ui';
import { useLayout } from '../layout';
import { niceDate, PLAN_DAYS, PlanTask } from '../checkin';

import { LEVEL_UI, levelOf, SAM } from '../demo';
import { hasBackend } from '../lib/supabase';

// Games stay as they are for now (TBD); Today just links to them.

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
      <Icon name="chevron" size={18} />
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

  // 4. A moment of calm: breathe with the fire (full screen). The daily puzzles live in the Games tab.
  const games = (
    <View style={{ gap: 8 }}>
      <View style={st.row}><Text style={[st.h, { flex: 1 }]}>Calm</Text><LinkBtn label="Daily puzzles" onPress={() => S.go('games')} /></View>
      <Pressable onPress={() => S.setModal({ type: 'breathe' })} accessibilityRole="button" accessibilityLabel="Breathe with the fire"
        style={(p: any) => [st.card, st.row, { gap: 12, paddingVertical: 12 }, p.hovered && { borderColor: C.lineHi }]}>
        <View style={st.breatheIco}><Icon name={S.actDone.breathe ? 'check' : 'flame'} size={24} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.title, { fontSize: 15.5 }]}>Breathe with the fire</Text>
          <Text style={st.sub} numberOfLines={1}>A few slow breaths by the campfire, with its sound</Text>
        </View>
        <Icon name="chevron" size={18} />
      </Pressable>
    </View>
  );

  // 5. The fire in one line.
  // A brand-new campfire has no messages yet, and Ember (the AI) isn't one of the seats.
  const last = S.chat[S.chat.length - 1] as (typeof S.chat)[number] | undefined;
  const ember = last?.from === 'ember';
  const who = (last && S.members.find((x) => x.id === last.from)) || (last ? S.chatPeople[last.from] : undefined) || S.members[2];
  const fire = (
    <Pressable onPress={() => S.go('campfire')} accessibilityRole="button" accessibilityLabel="Go to your campfire" style={[st.card, st.row, { paddingVertical: 10 }]}>
      {ember ? <Icon name="ember" size={26} /> : <Mallow a={who.a} size={30} anim={false} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[st.title, { fontFamily: F.body, fontSize: 14 }]}>
          {!last ? 'The fire is quiet. Say hello to your campfire.'
            : <><Text style={{ fontFamily: F.bodyBold }}>{ember ? 'Ember (AI)' : last.from === 'me' ? 'You' : who.name}: </Text>{last.text}</>}
        </Text>
        <Text style={st.sub} numberOfLines={1}>{S.campfireName + ' · Sunday Talk, Sun 19:00'}</Text>
      </View>
      <Icon name="chevron" size={18} />
    </Pressable>
  );

  // Testing only: replay the first-open streak screen and start the demo fresh.
  const reset = (
    <View style={{ gap: 6, alignItems: 'center', marginTop: 6 }}>
      {S.email ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Text style={st.resetT}>{'Signed in as ' + S.email + ' · ' + S.campfireName}</Text>
          <LinkBtn label="Sign out" onPress={() => S.signOut()} />
        </View>
      ) : hasBackend ? (
        // Trying the demo: a way back to the log in / create account screen.
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Text style={st.resetT}>You’re trying the demo</Text>
          <LinkBtn label="Leave demo" onPress={() => S.signOut()} />
        </View>
      ) : null}
      <LinkBtn label="Replay the sign-up onboarding" onPress={() => S.startOnboarding()} />
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

  if (!two) return <View style={{ gap: 10 }}>{header}{alert}{mood}{plan}{games}{fire}{reset}</View>;

  // ---------- PC: greeting + stats, then "you today" beside "your campfire", then a row of calm things ----------
  const doneN = rows.filter((r) => r.done).length;
  const stats: [string, string][] = [
    ['flame', S.streakCount > 0 ? S.streakCount + '-day streak' : 'Start a streak today'],
    ['ember', S.embers + ' embers'],
    ['calendar', S.checkinDue ? 'Check-in due today' : 'Check-in ' + niceDate(S.nextCheckin)],
  ];
  const wideHeader = (
    <View style={[st.row, { alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }]}>
      <View style={{ flex: 1, minWidth: 280, gap: 2 }}>
        <Eyebrow>{dateStr}</Eyebrow>
        <H2>{greet}, {S.avatar.name || 'friend'}</H2>
      </View>
      <View style={[st.row, { gap: 8 }]}>
        {stats.map(([ic, l]) => (
          <View key={ic} style={st.stat}><Icon name={ic} size={16} /><Text style={st.statT}>{l}</Text></View>
        ))}
      </View>
    </View>
  );

  const planWide = (
    <View style={[st.card, st.cardL, { gap: 14, flex: 1 }]}>
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Text style={st.hL}>Today’s plan</Text>
          <Text style={st.sub}>{S.checkinDue ? 'Your check-in sets the next 2 weeks' : 'Day ' + (dayIdx + 1) + ' of ' + PLAN_DAYS + ' · ' + (rows.length ? doneN + ' of ' + rows.length + ' done' : 'a rest day')}</Text>
        </View>
        <Btn label="See 2 weeks" kind="ghost" sm icon="calendar" onPress={() => S.setModal({ type: 'plan' })} />
      </View>
      {/* The two weeks at a glance: days behind you, today, days ahead. */}
      {!S.checkinDue ? (
        <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={'Day ' + (dayIdx + 1) + ' of ' + PLAN_DAYS}>
          {Array.from({ length: PLAN_DAYS }, (_, i) => (
            <View key={i} style={[st.seg, i < dayIdx && { backgroundColor: C.moss, opacity: 0.55 }, i === dayIdx && { backgroundColor: C.ember }]} />
          ))}
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        {rows.length ? rows.map((r) => (
          <Pressable key={r.key} onPress={r.act ? r.onStart : r.onTick} style={(p: any) => [st.task, st.taskL, r.done && { opacity: 0.6 }, p.hovered && { borderColor: C.lineHi }]}>
            <View style={st.tico}><Icon name={r.icon} size={20} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[st.title, r.done && { textDecorationLine: 'line-through' }]} numberOfLines={2}>{r.t}</Text>
              <Text style={st.sub} numberOfLines={1}>{r.sub}</Text>
            </View>
            {r.act && !r.done ? <Text style={st.startT}>Start</Text> : null}
            <Pressable onPress={r.onTick} accessibilityRole="checkbox" accessibilityState={{ checked: r.done }} accessibilityLabel={'Done: ' + r.t} hitSlop={8}
              style={[st.tick, r.done && { backgroundColor: C.forest, borderColor: C.forest }]}>
              {r.done ? <Icon name="check" size={18} color={C.cream} /> : null}
            </Pressable>
          </Pressable>
        )) : <Text style={st.sub}>Nothing planned today. Rest is part of the plan too.</Text>}
      </View>
      {rows.length && doneN === rows.length ? <Text style={st.sub2}>All done for today. The rest of the day is yours.</Text> : null}
    </View>
  );

  // The campfire: who's there, the last few messages, the shared goal and the next talk.
  const coop = Math.min(S.coop, COOP_GOAL);
  const recent = S.chat.slice(-3);
  const person = (id: string) => (id === 'me' ? { name: 'You', a: S.avatar } : S.chatPeople[id] || S.members.find((x) => x.id === id) || { name: 'Someone', a: S.members[2].a });
  const fireWide = (
    <View style={[st.card, st.cardL, { gap: 14, flex: 1 }]}>
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Text style={st.hL}>{S.campfireName || 'Your campfire'}</Text>
          <Text style={st.sub}>Sunday Talk · Sun 19:00</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {S.members.slice(0, 5).map((x, i) => (
            <View key={x.id} style={[st.face, i > 0 && { marginLeft: -8 }]}><Mallow a={x.id === 'me' ? S.avatar : x.a} size={26} anim={false} /></View>
          ))}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        {/* A brand-new campfire has no messages yet; Ember (the AI) isn't one of the seats. */}
        {!recent.length ? <Text style={st.msg}>The fire is quiet. Say hello to your campfire.</Text> : recent.map((msg) => {
          const ai = msg.from === 'ember';
          const p = ai ? null : person(msg.from);
          return (
            <View key={msg.id} style={[st.row, { alignItems: 'flex-start' }]}>
              {p ? <Mallow a={p.a} size={26} anim={false} /> : <Icon name="ember" size={24} />}
              <Text style={[st.msg, { flex: 1 }]} numberOfLines={2}><Text style={{ fontFamily: F.bodyBold, color: C.cream }}>{p ? p.name : 'Ember (AI)'} </Text>{msg.text}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ gap: 6 }}>
        <View style={st.row}><Text style={[st.sub, { flex: 1 }]}>Tonight’s spark: gather {COOP_GOAL} embers together</Text><Text style={st.statT}>{coop}/{COOP_GOAL}</Text></View>
        <View style={st.track}><View style={[st.fill, { width: ((coop / COOP_GOAL) * 100 + '%') as any }]} /></View>
      </View>
      <Btn label="Go to the fire" icon="flame" onPress={() => S.go('campfire')} style={{ marginTop: 'auto' }} />
    </View>
  );

  // A row of short, calm things: breathing plus today's three puzzles.
  const calm: { key: string; icon: string; t: string; sub: string; done: boolean; go: () => void }[] = [
    { key: 'breathe', icon: 'flame', t: 'Breathe with the fire', sub: '3 min · with its sound', done: !!S.actDone.breathe, go: () => S.setModal({ type: 'breathe' }) },
    { key: 'nono', icon: 'picture', t: 'Hidden Picture', sub: 'Today’s puzzle', done: S.puzzleSolvedToday('nono'), go: () => S.go('nono') },
    { key: 'sight', icon: 'eye', t: 'Line of Sight', sub: 'Today’s puzzle', done: S.puzzleSolvedToday('sight'), go: () => S.go('sight') },
    { key: 'hotel', icon: 'key', t: 'Hotel Mystery', sub: 'Today’s puzzle', done: S.puzzleSolvedToday('hotel'), go: () => S.go('hotel') },
  ];
  const calmWide = (
    <View style={{ gap: 10 }}>
      <View style={st.row}><Text style={[st.hL, { flex: 1 }]}>A moment for you</Text><LinkBtn label="All games" onPress={() => S.go('games')} /></View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {calm.map((c) => (
          <Pressable key={c.key} onPress={c.go} accessibilityRole="button" accessibilityLabel={c.t} style={(p: any) => [st.card, st.calm, p.hovered && { borderColor: C.lineHi }]}>
            <View style={[st.calmIco, c.key === 'breathe' && { backgroundColor: C.peach }]}><Icon name={c.done ? 'check' : c.icon} size={22} /></View>
            <Text style={st.title} numberOfLines={1}>{c.t}</Text>
            <Text style={st.sub} numberOfLines={1}>{c.done ? 'Done today' : c.sub}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ gap: 22 }}>
      {wideHeader}
      {alert}
      <View style={{ flexDirection: 'row', gap: 20, alignItems: 'stretch' }}>
        <View style={{ flex: 1.35, gap: 16 }}>{mood}{planWide}</View>
        <View style={{ flex: 1 }}>{fireWide}</View>
      </View>
      {calmWide}
      <View style={st.foot}>{reset}</View>
    </View>
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
  breatheIco: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.peach, alignItems: 'center', justifyContent: 'center' },
  // PC layout
  cardL: { padding: 18, borderRadius: 16 },
  hL: { fontFamily: F.display, fontSize: 18, color: C.cream },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.night2, borderWidth: 1, borderColor: C.line },
  statT: { fontFamily: F.bodyBold, fontSize: 13, color: C.creamDim },
  seg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.night3 },
  taskL: { padding: 10, borderWidth: 1, borderColor: 'transparent' },
  startT: { fontFamily: F.bodyBold, fontSize: 13, color: C.emberHi },
  face: { borderRadius: 999, backgroundColor: C.night3, padding: 3, borderWidth: 2, borderColor: C.night2 },
  msg: { fontFamily: F.body, fontSize: 14, color: C.creamDim, lineHeight: 20 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.night3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: C.ember },
  calm: { flex: 1, gap: 4, padding: 16, borderRadius: 16, minWidth: 0 },
  calmIco: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.night3, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  foot: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 14, opacity: 0.85 },
}));
