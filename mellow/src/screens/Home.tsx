import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PixelCtx } from '../pixel/raster';
import { PixelImage } from '../pixel/PixelImage';
import { buildHome, drawHome, homeLayout } from '../pixel/home';
import { useApp } from '../state';
import { COOP_GOAL, MOOD_KEYS, MOODS, MoodKey } from '../data';
import { C, F, themed, themeMode } from '../theme';
import { CampScene, Icon, Mallow } from '../components/Pixel';
import { Btn, LinkBtn } from '../components/ui';
import { useLayout } from '../layout';
import { hasBackend } from '../lib/supabase';
import { AREAS, fromYmd, KEEP_UP_AREA, KEEP_UP_BASIS, niceDate, PLAN_DAYS, PlanTask } from '../checkin';
import { LEVEL_UI, levelOf, SAM } from '../demo';

// Today: your marshmallow at the centre.
// The loop: say how you feel → do today's small steps → the fire beside your marshmallow grows warmer.
// "Your next 2 weeks" becomes a path of 14 stepping stones that explains itself.

const ND = Platform.OS !== 'web';

// What your marshmallow says.
const SAYS: Record<MoodKey, string> = { heavy: 'I’m right here with you.', low: 'Let’s keep today small and cozy.', okay: 'Okay is a good place to be.', good: 'Toasty! I like this.', bright: 'Woohoo! Let’s use it well.' };
const PET = ['Hehe!', 'That tickles.', 'I’m glad you’re here.', 'Marshmallow hug!'];

// ---------- the 8-bit hilltop (src/pixel/home.ts), redrawn 10 times a second like the campfire ----------
function HomeCanvas({ w, h, groundPx, fireXPx, warmth, artH, day }: { w: number; h: number; groundPx: number; fireXPx: number; warmth: number; artH: number; day: boolean }) {
  const L = useMemo(() => homeLayout(w, h, groundPx, fireXPx, artH), [w, h, groundPx, fireXPx, artH]);
  const K = useMemo(() => buildHome(L, day), [L.key, day]);
  const ctx = useMemo(() => new PixelCtx(L.W, L.H), [L.key]);
  const target = useRef(warmth); target.current = warmth;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const start = Date.now();
    let warm = target.current;
    const draw = () => { warm += (target.current - warm) * 0.15; drawHome(ctx, K, 1.3 + (Date.now() - start) / 1000, warm); setTick((n) => n + 1); };
    draw();
    const id = setInterval(draw, 100);
    return () => clearInterval(id);
  }, [K]);
  return <PixelImage ctx={ctx} tick={tick} width={L.W * (h / L.H)} height={h} style={{ position: 'absolute', left: 0, top: 0 }} />;
}


export default function Home() {
  const S = useApp();
  const { cw, wide } = useLayout();
  const two = cw >= 900;
  const day = themeMode() === 'day';
  const now = new Date();
  const hr = now.getHours();
  const greet = hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const name = S.avatar.name || 'friend';

  // ---------- today's steps ----------
  const today = Math.min(PLAN_DAYS - 1, S.planDay);
  const todayPlan = S.plan.days[today];
  const steps = todayPlan.tasks.map((t, j) => ({ t, key: todayPlan.date + '-' + j })).filter((x) => !x.t.retake);
  const doneN = steps.filter((x) => S.planDone[x.key]).length;
  const warmth = steps.length ? doneN / steps.length : S.checkinDue ? 0.3 : 1;
  const next = steps.find((x) => !S.planDone[x.key]);
  const start = (t: PlanTask) => { if (t.act === 'breathe') S.setModal({ type: 'breathe' }); else if (t.act === 'campfire') S.go('campfire'); };

  // ---------- the marshmallow: hops when you pet it or finish something, and talks ----------
  const [hop, setHop] = useState(false);
  const [say, setSay] = useState<string | null>(null);
  const sayT = useRef<any>(null);
  const react = (line: string) => {
    setHop(true); setTimeout(() => setHop(false), 500);
    setSay(line); clearTimeout(sayT.current); sayT.current = setTimeout(() => setSay(null), 2600);
  };
  useEffect(() => () => clearTimeout(sayT.current), []);
  const tick = (key: string, t: PlanTask) => {
    if (S.planDone[key]) { S.undoTask(key); return; }
    S.doTask(key, t);
    react(doneN + 1 >= steps.length ? 'All done! Feel that warmth?' : 'Nice! The fire’s warmer.');
  };
  const bubble = say
    || (!S.mood ? 'Hi ' + name + '. How’s today feeling?'
      : S.checkinDue ? 'It’s check-in day. Two minutes, together?'
      : next ? SAYS[S.mood] + ' Next: ' + next.t.t.charAt(0).toLowerCase() + next.t.t.slice(1) + '?'
      : steps.length ? 'We did everything today. Cozy night?' : SAYS[S.mood]);

  // ---------- 1. the camp: your marshmallow by its fire ----------
  const sceneH = two ? 400 : 370, mallowS = two ? 150 : 112, fireS = two ? 74 : 60, groundH = two ? 86 : 74;
  const [W, setW] = useState(0);
  // The fire is drawn by the pixel scene, just right of the marshmallow (same row maths as the stage below).
  const rowW = mallowS * 0.92 + fireS * 1.4, fireX = W / 2 - rowW / 2 + mallowS * 0.92 + fireS * 0.7;
  const ink = day ? '#163322' : '#FFF4E4', inkDim = day ? '#2F5A3E' : '#C9C3EE';
  const chip = (icon: string, label: string) => (
    <View style={[st.sceneChip, { backgroundColor: day ? 'rgba(255,255,255,.7)' : 'rgba(10,15,51,.55)' }]}><Icon name={icon} size={15} /><Text style={[st.sceneChipT, { color: ink }]}>{label}</Text></View>
  );
  const camp = (
    <View style={[st.hero, { height: sceneH }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: day ? '#8FC5EF' : '#161a48' }]} />
      {W > 0 ? <HomeCanvas w={W} h={sceneH} groundPx={groundH - 14} fireXPx={fireX} warmth={warmth} artH={two ? 150 : 160} day={day} /> : null}

      {/* greeting and stats along the top */}
      <View style={[st.sceneTop, !two && { flexDirection: 'column', gap: 8, left: 14, right: 14, top: 14 }]}>
        <View style={{ flex: two ? 1 : undefined, minWidth: 0 }}>
          <Text style={[st.date, { color: inkDim }]}>{dateStr.toUpperCase()}</Text>
          <Text style={[st.greet, { color: ink }, !two && { fontSize: 20 }]} numberOfLines={1}>{greet}, {name}</Text>
        </View>
        <View style={two ? { gap: 6, alignItems: 'flex-end' } : { flexDirection: 'row', gap: 6 }}>
          {chip('flame', S.streakCount > 0 ? S.streakCount + '-day streak' : 'New streak')}
          {chip('ember', S.embers + ' embers')}
        </View>
      </View>

      {/* you and your fire, standing on the hill */}
      <View style={[st.stage, { bottom: groundH - 18 }]}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={[st.bubble, { maxWidth: two ? 340 : 250 }]}>
            <Text style={st.bubbleT}>{bubble}</Text>
            <View style={st.bubbleTail} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Pressable onPress={() => react(PET[Math.floor(Math.random() * PET.length)])} accessibilityRole="button" accessibilityLabel={'Pet ' + name}>
              <Mallow a={S.avatar} face={S.mood ? MOODS[S.mood].face : undefined} size={mallowS} hop={hop} />
            </Pressable>
            <View style={{ marginLeft: -mallowS * 0.08, width: fireS * 1.4 }} />{/* the pixel fire is drawn here by the scene */}
          </View>
        </View>
      </View>
    </View>
  );

  // Under the scene: the mood question until it's answered, then how warm today's fire is.
  const m = S.mood ? MOODS[S.mood] : null;
  const heroFoot = !m ? (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {MOOD_KEYS.map((k) => (
        <Pressable key={k} onPress={() => { S.answerMood(k); react(SAYS[k]); }} accessibilityLabel={MOODS[k].label} style={(p: any) => [st.mood, p.hovered && { borderColor: C.ember }]}>
          <Mallow a={{ ...S.avatar, hat: 'none', glasses: 'none', acc: 'none', item: 'none' }} face={MOODS[k].face} size={30} anim={false} />
          <Text style={st.moodT}>{MOODS[k].label}</Text>
        </Pressable>
      ))}
    </View>
  ) : (
    <View style={{ gap: 8 }}>
      <View style={st.row}>
        <Icon name="ember" size={18} />
        <Text style={[st.h3, { flex: 1 }]}>Tonight’s fire</Text>
        <Text style={st.sub}>Feeling {m.label.toLowerCase()} · </Text><LinkBtn label="change" onPress={() => S.setMood(null)} />
      </View>
      <View style={st.track}><View style={[st.fill, { width: (Math.max(0.04, warmth) * 100 + '%') as any }]} /></View>
      <Text style={st.sub}>{S.checkinDue ? 'Your check-in today lights the next two weeks.' : steps.length ? doneN + ' of ' + steps.length + ' steps done. Each one warms the fire.' : 'A rest day. The fire keeps itself warm today.'}</Text>
      {m.support ? <LinkBtn label="Talk to someone now" onPress={() => S.setModal({ type: 'support' })} /> : null}
    </View>
  );
  const hero = <View style={[st.card, { padding: 0, overflow: 'hidden' }]}>{camp}<View style={{ padding: two ? 18 : 14 }}>{heroFoot}</View></View>;

  // A gentle note when the early-warning signals moved (same rule as Today).
  const lvl = levelOf(SAM.series.risk[S.demoDay - 1]);
  const ui = LEVEL_UI[lvl];
  const alert = !S.checkinDue && (lvl === 'watch' || lvl === 'high') ? (
    <Pressable onPress={() => S.go('journey')} style={[st.card, st.row, { borderColor: ui.color + '88', backgroundColor: ui.bg }]}>
      <Icon name="pulse" size={22} color={ui.color} />
      <Text style={[st.title, { flex: 1, color: ui.color }]}>{lvl === 'high' ? 'Some early signs are showing. Want to look together?' : 'A few things shifted from your usual.'}</Text>
      <Icon name="chevron" size={18} />
    </Pressable>
  ) : null;

  // ---------- 2. today's steps ----------
  const stepsCard = (
    <View style={[st.card, { gap: 12 }, two && { flex: 1 }]}>
      <View style={st.row}>
        <Text style={[st.h2, { flex: 1 }]}>Today, together</Text>
        <Text style={st.sub}>{S.checkinDue ? 'Day 14' : 'Day ' + (today + 1) + ' of ' + PLAN_DAYS}</Text>
      </View>
      {S.checkinDue ? (
        <Pressable onPress={() => S.setModal({ type: 'phq' })} style={[st.step, { borderColor: C.ember, backgroundColor: C.navySoft }]}>
          <View style={st.stepIco}><Icon name="clipboard" size={22} /></View>
          <View style={{ flex: 1 }}><Text style={st.title}>Your 2-week check-in</Text><Text style={st.sub}>9 questions · 2 minutes · it sets your next path</Text></View>
          <Btn label="Start" sm onPress={() => S.setModal({ type: 'phq' })} />
        </Pressable>
      ) : null}
      {steps.length ? steps.map(({ t, key }) => {
        const done = !!S.planDone[key];
        return (
          <Pressable key={key} onPress={() => (t.act && !done ? start(t) : tick(key, t))} style={(p: any) => [st.step, two && { flex: 1 }, done && st.stepDone, p.hovered && !done && { borderColor: C.lineHi }]}>
            <View style={[st.stepIco, done && { backgroundColor: C.forest }]}><Icon name={done ? 'check' : t.icon} size={22} color={done ? C.cream : undefined} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[st.title, done && { textDecorationLine: 'line-through', color: C.muted }]}>{t.t}</Text>
              <View style={[st.row, { gap: 6, marginTop: 3 }]}>
                <View style={st.tag}><Text style={st.tagT}>{t.area}</Text></View>
                <Text style={st.sub}>{t.dur}</Text>
              </View>
            </View>
            {t.act && !done ? <Btn label="Start" kind="ghost" sm onPress={() => start(t)} /> : null}
            <Pressable onPress={() => tick(key, t)} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={'Done: ' + t.t} hitSlop={8}
              style={[st.tick, done && { backgroundColor: C.forest, borderColor: C.forest }]}>
              {done ? <Icon name="check" size={18} color={C.cream} /> : null}
            </Pressable>
          </Pressable>
        );
      }) : S.checkinDue ? null : <Text style={st.sub}>Nothing planned today. Rest is part of the plan too.</Text>}
      {steps.length > 0 ? <Text style={st.hint}>Tick a step when it’s done. +2 embers each, and your fire grows.</Text> : null}
    </View>
  );

  // ---------- 3. the 2-week path (replaces the "Your next 2 weeks" calendar) ----------
  const [sel, setSel] = useState(today);
  const basis: Record<string, string> = { ...Object.fromEntries(AREAS.map((a) => [a.area, a.basis])), [KEEP_UP_AREA]: KEEP_UP_BASIS };
  const areaIcon: Record<string, string> = { ...Object.fromEntries(AREAS.map((a) => [a.area, a.icon])), [KEEP_UP_AREA]: 'leaf' };
  const focus = S.plan.areas.length ? S.plan.areas : [KEEP_UP_AREA];
  const days = S.plan.days.map((d, i) => {
    const real = d.tasks.map((t, j) => ({ t, key: d.date + '-' + j })).filter((x) => !x.t.retake);
    const n = real.length, done = real.filter((x) => S.planDone[x.key]).length;
    const check = d.tasks.some((t) => t.retake);
    const state = check ? 'check' : i > today ? 'next' : n === 0 ? 'rest' : done === n ? 'done' : done > 0 ? 'part' : i < today ? 'missed' : 'open';
    return { d, i, real, n, done, state, date: fromYmd(d.date) };
  });
  const STONE = 34;
  const stone = (x: (typeof days)[number]) => {
    const on = x.i === sel, isToday = x.i === today;
    const look = x.state === 'done' ? { backgroundColor: C.forest, borderColor: C.forest }
      : x.state === 'part' ? { backgroundColor: C.greenSoft, borderColor: C.moss }
      : x.state === 'missed' ? { backgroundColor: C.night3, borderColor: C.night3 }
      : x.state === 'check' ? { backgroundColor: C.ember, borderColor: C.ember }
      : { backgroundColor: C.night2, borderColor: C.lineHi, borderStyle: 'dashed' as const };
    return (
      <Pressable key={x.i} onPress={() => setSel(x.i)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={niceDate(x.date) + ', ' + x.state}
        style={[{ alignItems: 'center', gap: 4 }, { flex: 1 }]}>
        <View style={{ height: 30, justifyContent: 'flex-end' }}>{isToday ? <Mallow a={S.avatar} size={28} anim={false} /> : null}</View>
        <View style={[st.stone, look, isToday && { borderColor: C.ember, borderWidth: 3, borderStyle: 'solid' }, on && st.stoneOn]}>
          {x.state === 'done' ? <Icon name="check" size={16} color={C.cream} /> : x.state === 'check' ? <Icon name="clipboard" size={15} color={C.emberInk} /> : x.state === 'part' ? <Text style={st.stoneN}>{x.done}/{x.n}</Text> : null}
        </View>
        <Text style={[st.stoneD, isToday && { color: C.emberHi }]}>{x.date.toLocaleDateString('en-GB', { weekday: 'narrow' })}</Text>
        <Text style={[st.stoneN, { color: isToday ? C.emberHi : C.muted }]}>{x.date.getDate()}</Text>
      </Pressable>
    );
  };
  // PC: all 14 stones in one row. Phone: two rows of 7 (week 1, week 2), so every day fits without scrolling.
  const trailOf = (list: typeof days) => (
    <View style={{ flexDirection: 'row', position: 'relative' }}>
      <View style={[st.trailLine, { top: 30 + STONE / 2 - 2 }]} />
      {list.map(stone)}
    </View>
  );
  const trailRow = two ? trailOf(days) : (
    <View style={{ gap: 14 }}>
      {[days.slice(0, 7), days.slice(7)].map((wk, i) => (
        <View key={i} style={{ gap: 2 }}>
          <Text style={st.weekT}>Week {i + 1}</Text>
          {trailOf(wk)}
        </View>
      ))}
    </View>
  );
  const pick = days[sel];
  const pickLabel = pick.state === 'check' ? 'Day 14 · ' + niceDate(pick.date) : pick.i === today ? 'Today · ' + niceDate(pick.date) : 'Day ' + (pick.i + 1) + ' · ' + niceDate(pick.date);
  const path = (
    <View style={[st.card, { gap: 16 }]}>
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Text style={st.h2}>Your 2-week path</Text>
          <Text style={st.sub}>{niceDate(days[0].date)} – {niceDate(days[PLAN_DAYS - 1].date)}</Text>
        </View>
        <Text style={st.big}>{S.checkinDue ? 'Check-in today' : S.checkinIn + (S.checkinIn === 1 ? ' day' : ' days') + ' to go'}</Text>
      </View>

      {/* how it works, in three steps */}
      <View style={[st.how, !two && { flexDirection: 'column', alignItems: 'stretch' }]}>
        {([['clipboard', 'Your check-in', 'picks what to work on'], ['leaf', '1–2 small steps a day', 'for those areas'], ['refresh', 'Day 14: check in again', 'and the path adjusts']] as const).map(([ic, a, b], i) => (
          <React.Fragment key={a}>
            {i > 0 && two ? <Icon name="chevron" size={16} /> : null}
            <View style={[st.row, { flex: two ? 1 : undefined, gap: 8 }]}>
              <View style={st.howIco}><Icon name={ic} size={16} /></View>
              <Text style={st.howT}><Text style={{ fontFamily: F.bodyBold, color: C.cream }}>{a}</Text> {b}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* what this path works on, and why */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Text style={[st.sub, { alignSelf: 'center' }]}>Working on</Text>
        {focus.map((a) => (
          <View key={a} style={st.focus}><Icon name={areaIcon[a] || 'leaf'} size={14} /><Text style={[st.focusS, { flexShrink: 1 }]}><Text style={st.focusT}>{a}</Text>{basis[a] ? ' · ' + basis[a] : ''}</Text></View>
        ))}
      </View>

      {trailRow}
      <View style={[st.row, { gap: 14, flexWrap: 'wrap' }]}>
        {([[C.forest, 'Done'], [C.moss, 'Partly'], [C.night3, 'Missed, that’s okay'], [C.ember, 'Check-in']] as const).map(([c, l]) => (
          <View key={l} style={[st.row, { gap: 5 }]}><View style={[st.legend, { backgroundColor: c }]} /><Text style={st.sub}>{l}</Text></View>
        ))}
      </View>

      {/* the day you tapped */}
      <View style={st.dayBox}>
        <Text style={st.h3}>{pickLabel}</Text>
        {pick.state === 'check' ? (
          <View style={st.row}>
            <Text style={[st.sub, { flex: 1 }]}>9 questions about the last 2 weeks. Your answers choose the next path.</Text>
            {S.checkinDue ? <Btn label="Start" sm onPress={() => S.setModal({ type: 'phq' })} /> : <Text style={st.soon}>{'Opens in ' + S.checkinIn + (S.checkinIn === 1 ? ' day' : ' days')}</Text>}
          </View>
        ) : pick.n === 0 ? <Text style={st.sub}>A rest day. Nothing planned, and that’s fine.</Text> : pick.real.map(({ t, key }) => {
          const done = !!S.planDone[key];
          return (
            <View key={key} style={[st.row, { gap: 8 }]}>
              <Icon name={done ? 'check' : t.icon} size={18} />
              <Text style={[st.sub2, { flex: 1 }, done && { textDecorationLine: 'line-through' }]}>{t.t}</Text>
              <Text style={st.sub}>{pick.i > today ? 'coming up' : done ? 'done' : pick.i < today ? 'skipped' : 'today'}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  // ---------- 4. your campfire ----------
  const coop = Math.min(S.coop, COOP_GOAL);
  const last = S.chat[S.chat.length - 1] as (typeof S.chat)[number] | undefined;
  const who = last && last.from !== 'ember' ? (last.from === 'me' ? { name: 'You', a: S.avatar } : S.chatPeople[last.from] || S.members.find((x) => x.id === last.from)) : null;
  const fire = (
    <Pressable onPress={() => S.go('campfire')} accessibilityRole="button" style={(p: any) => [st.card, { gap: 12, flex: two ? 1 : undefined }, p.hovered && { borderColor: C.lineHi }]}>
      <View style={st.row}>
        <View style={{ flex: 1 }}><Text style={st.h2}>{S.campfireName || 'Your campfire'}</Text><Text style={st.sub}>Sunday Talk · Sun 19:00</Text></View>
        <Icon name="chevron" size={18} />
      </View>
      <View style={[st.row, { gap: 14, alignItems: 'center' }]}>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {S.members.filter((x) => x.id !== 'me').slice(0, 4).map((x) => (
            <View key={x.id} style={{ alignItems: 'center', gap: 2, maxWidth: 84 }}><Mallow a={x.a} size={38} anim={false} /><Text style={st.sub} numberOfLines={1}>{x.name.split(' ')[0]}</Text></View>
          ))}
        </View>
        {/* a live peek at the campfire itself */}
        <View style={[st.peek, { width: two ? 200 : 150 }]}>
          <CampScene members={S.members} compact />
        </View>
      </View>
      <View style={st.msg}>
        {!last ? <Text style={st.sub2}>The fire is quiet. Say hello to your campfire.</Text>
          : <Text style={st.sub2} numberOfLines={2}><Text style={{ fontFamily: F.bodyBold, color: C.cream }}>{who ? who.name : 'Ember (AI)'}: </Text>{last.text}</Text>}
      </View>
      <View style={{ gap: 6 }}>
        <View style={st.row}><Text style={[st.sub, { flex: 1 }]}>Tonight’s spark: {COOP_GOAL} embers together</Text><Text style={st.sub}>{coop}/{COOP_GOAL}</Text></View>
        <View style={st.track}><View style={[st.fill, { width: ((coop / COOP_GOAL) * 100 + '%') as any }]} /></View>
      </View>
    </Pressable>
  );

  // ---------- 5. something calm ----------
  const calm = [
    { key: 'breathe', icon: 'flame', t: 'Breathe with the fire', sub: '3 min', done: !!S.actDone.breathe, go: () => S.setModal({ type: 'breathe' }) },
    { key: 'nono', icon: 'picture', t: 'Hidden Picture', sub: 'Daily puzzle', done: S.puzzleSolvedToday('nono'), go: () => S.go('nono') },
    { key: 'sight', icon: 'eye', t: 'Line of Sight', sub: 'Daily puzzle', done: S.puzzleSolvedToday('sight'), go: () => S.go('sight') },
    { key: 'hotel', icon: 'key', t: 'Hotel Mystery', sub: 'Daily puzzle', done: S.puzzleSolvedToday('hotel'), go: () => S.go('hotel') },
  ];
  const calmCard = (
    <View style={{ gap: 10, flex: two ? 1 : undefined }}>
      <Text style={st.h2}>A calm moment</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {calm.map((c) => (
          <Pressable key={c.key} onPress={c.go} accessibilityRole="button" accessibilityLabel={c.t} style={(p: any) => [st.card, st.calm, p.hovered && { borderColor: C.lineHi }]}>
            <View style={[st.calmIco, c.key === 'breathe' && { backgroundColor: C.peach }]}><Icon name={c.done ? 'check' : c.icon} size={20} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[st.title, { fontSize: 14 }]} numberOfLines={1}>{c.t}</Text>
              <Text style={st.sub}>{c.done ? 'Done today' : c.sub}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // Account and testing links, kept quiet at the bottom.
  const foot = (
    <View style={{ gap: 8, alignItems: 'center', opacity: 0.85, marginTop: 4 }}>
      {S.email ? (
        <View style={[st.row, { justifyContent: 'center', flexWrap: 'wrap' }]}>
          <Text style={st.sub}>{'Signed in as ' + S.email + ' · ' + S.campfireName}</Text>
          <LinkBtn label="Sign out" onPress={() => S.signOut()} />
        </View>
      ) : hasBackend ? (
        // Trying the demo: a way back to the log in / create account screen.
        <View style={[st.row, { justifyContent: 'center', flexWrap: 'wrap' }]}>
          <Text style={st.sub}>You’re trying the demo</Text>
          <LinkBtn label="Leave demo" onPress={() => S.signOut()} />
        </View>
      ) : null}
      <View style={[st.row, { justifyContent: 'center', gap: 12, flexWrap: 'wrap' }]}>
        <Text style={st.sub}>Testing:</Text>
        <LinkBtn label="Replay the sign-up onboarding" onPress={() => S.startOnboarding()} />
        {(['day', 'night'] as const).map((k) => <LinkBtn key={k} label={'Reset · ' + k} onPress={() => setTimeout(() => S.resetDemo(k), 250)} />)}
      </View>
    </View>
  );

  if (!two) return <View style={{ gap: 14 }}>{hero}{alert}{stepsCard}{path}{fire}{calmCard}{foot}</View>;
  return (
    <View style={{ gap: 20 }}>
      {hero}
      {alert}
      <View style={{ flexDirection: 'row', gap: 20, alignItems: 'stretch' }}>
        <View style={{ flex: 1.25 }}>{stepsCard}</View>
        {fire}
      </View>
      {path}
      {calmCard}
      {foot}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  card: { backgroundColor: C.night2, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  h2: { fontFamily: F.display, fontSize: 19, color: C.cream },
  h3: { fontFamily: F.display, fontSize: 15.5, color: C.cream },
  big: { fontFamily: F.display, fontSize: 15, color: C.emberHi },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: C.cream },
  sub: { fontFamily: F.body, fontSize: 12.5, color: C.muted },
  sub2: { fontFamily: F.body, fontSize: 14, color: C.creamDim },
  hint: { fontFamily: F.body, fontSize: 12.5, color: C.muted, fontStyle: 'italic' },
  soon: { fontFamily: F.bodyBold, fontSize: 13, color: C.muted },
  // the camp
  hero: { position: 'relative', overflow: 'hidden' },
  star: { position: 'absolute', backgroundColor: '#FFF4E4', opacity: 0.85 },
  sun: { position: 'absolute', right: '12%', top: '22%', width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFE7A6', opacity: 0.9 },
  hill: { position: 'absolute' },
  sceneTop: { position: 'absolute', left: 18, right: 18, top: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  date: { fontFamily: F.label, fontSize: 11.5, letterSpacing: 0.8 },
  greet: { fontFamily: F.displayBold, fontSize: 26 },
  sceneChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  sceneChipT: { fontFamily: F.bodyBold, fontSize: 12.5 },
  stage: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bubble: { backgroundColor: '#FFF8EE', borderRadius: 16, paddingVertical: 9, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  bubbleT: { fontFamily: F.bodyBold, fontSize: 14.5, color: '#2A2340', textAlign: 'center' },
  bubbleTail: { position: 'absolute', bottom: -8, alignSelf: 'center', width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFF8EE' },
  log: { position: 'absolute', borderRadius: 6, backgroundColor: '#5B3A26', borderWidth: 2, borderColor: '#2E1C14' },
  mood: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.night3 },
  moodT: { fontFamily: F.displayMed, fontSize: 12, color: C.creamDim },
  track: { height: 10, borderRadius: 5, backgroundColor: C.night3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: C.ember },
  // steps
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: C.night3, borderWidth: 1, borderColor: 'transparent' },
  stepDone: { opacity: 0.75 },
  stepIco: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.night2, alignItems: 'center', justifyContent: 'center' },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: C.night4 },
  tagT: { fontFamily: F.bodyBold, fontSize: 11, color: C.creamDim },
  tick: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: C.lineHi, alignItems: 'center', justifyContent: 'center' },
  // path
  how: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: C.night3 },
  howIco: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.night2, alignItems: 'center', justifyContent: 'center' },
  howT: { fontFamily: F.body, fontSize: 13, color: C.muted, flexShrink: 1 },
  weekT: { fontFamily: F.label, fontSize: 11, color: C.muted, letterSpacing: 0.6 },
  focus: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: C.line },
  focusT: { fontFamily: F.bodyBold, fontSize: 13, color: C.cream },
  focusS: { fontFamily: F.body, fontSize: 12.5, color: C.muted },
  trailLine: { position: 'absolute', left: 16, right: 16, height: 4, borderRadius: 2, backgroundColor: C.line },
  stone: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stoneOn: { transform: [{ scale: 1.15 }], shadowColor: C.ember, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  stoneD: { fontFamily: F.label, fontSize: 11, color: C.muted },
  stoneN: { fontFamily: F.bodyBold, fontSize: 11, color: C.cream },
  legend: { width: 12, height: 12, borderRadius: 6 },
  dayBox: { gap: 8, padding: 14, borderRadius: 14, backgroundColor: C.night3 },
  // campfire + calm
  peek: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
  msg: { padding: 12, borderRadius: 14, backgroundColor: C.night3 },
  calm: { flexGrow: 1, flexBasis: 220, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16 },
  calmIco: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.night3, alignItems: 'center', justifyContent: 'center' },
}));
