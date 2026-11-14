// First run after creating an account: a short onboarding (about a minute) that gets to know you and
// seats you at a campfire. Answers stay on this device for now (AsyncStorage 'mellow.onboarding'); what it
// does change is your marshmallow and your first 2-week plan, built from the things you picked.
// Steps: welcome → 6 questions in 3 parts (a checkpoint closes each part) → matching → your campfire → your first week.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state';
import { C, F, themed, themeMode } from '../theme';
import { CampScene, Icon, Mallow } from './Pixel';
import { ThemeToggle } from './ThemeToggle';
import { addDays, AREAS, buildPlan } from '../checkin';
import { Avatar, COLORS } from '../pixel/sprites';

const ND = Platform.OS !== 'web';
const buzz = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); };

type Opt = { id: string; e: string; t: string; s?: string };
const STAGES: Opt[] = [
  { id: 'recent', e: '🌱', t: 'I finished TMS recently', s: 'In the last few months' },
  { id: 'while', e: '🌳', t: 'I finished TMS a while ago', s: 'More than six months ago' },
  { id: 'during', e: '🔄', t: 'I’m still in treatment', s: 'Mellow sits alongside it' },
  { id: 'other', e: '🧭', t: 'Something else', s: 'Another treatment, or just looking after myself' },
];
// Each one is an area of the 2-week plan (see AREAS in checkin.ts).
const NEEDS: Opt[] = [
  { id: 'Sleep', e: '😴', t: 'Sleeping better' },
  { id: 'Energy', e: '⚡', t: 'Having more energy' },
  { id: 'Mood', e: '🌦️', t: 'Getting through low days' },
  { id: 'Interest', e: '🎈', t: 'Enjoying things again' },
  { id: 'Restlessness', e: '🍃', t: 'Feeling calmer' },
  { id: 'Focus', e: '🎯', t: 'Focusing on things' },
  { id: 'Self-worth', e: '💛', t: 'Being kinder to myself' },
  { id: 'Appetite', e: '🍲', t: 'Eating regularly' },
];
const MAX_NEEDS = 3;
const LIKES: Opt[] = [
  { id: 'walks', e: '🌲', t: 'Walks outside' },
  { id: 'music', e: '🎧', t: 'Music' },
  { id: 'films', e: '🎬', t: 'Films & series' },
  { id: 'puzzles', e: '🧩', t: 'Puzzles & games' },
  { id: 'reading', e: '📚', t: 'Reading' },
  { id: 'cooking', e: '🍳', t: 'Cooking & baking' },
  { id: 'animals', e: '🐾', t: 'Animals' },
  { id: 'making', e: '🎨', t: 'Making things' },
  { id: 'tea', e: '🍵', t: 'Tea & coffee' },
];
const STYLES: Opt[] = [
  { id: 'talk', e: '🗣️', t: 'I like to chat', s: 'Happy to start a conversation' },
  { id: 'listen', e: '👂', t: 'I’d rather listen first', s: 'Reading along is completely fine' },
  { id: 'both', e: '🌗', t: 'A bit of both', s: 'Depends on the day' },
];
const TIMES: (Opt & { at: string; word: string })[] = [
  { id: 'morning', e: '🌅', t: 'Mornings', at: '09:00', word: 'mornings' },
  { id: 'afternoon', e: '☀️', t: 'Afternoons', at: '14:00', word: 'afternoons' },
  { id: 'evening', e: '🌆', t: 'Evenings', at: '19:30', word: 'evenings' },
  { id: 'late', e: '🌙', t: 'Late at night', at: '22:00', word: 'late evenings' },
];
const SIGNALS: Opt[] = [
  { id: 'sleep', e: '🛌', t: 'Sleep and heart rate', s: 'From your watch or phone' },
  { id: 'steps', e: '👣', t: 'Steps', s: 'How much you move in a day' },
  { id: 'screen', e: '📱', t: 'Screen time', s: 'Daily totals only, never which apps' },
];
const HAT_PICK = ['none', 'beanie', 'cap', 'sprout', 'bucket', 'crown'];
// What the demo campfire friends are into, to show what you have in common.
const TAGS: Record<string, string[]> = { juno: ['music', 'puzzles', 'reading'], teo: ['walks', 'cooking'], ama: ['making', 'tea', 'films'] };
const likeLabel = (id: string) => (LIKES.find((l) => l.id === id)?.t || id).toLowerCase();

type Step = 'welcome' | 'stage' | 'needs' | 'likes' | 'style' | 'look' | 'signals' | 'match' | 'fire' | 'plan';
const STEPS: Step[] = ['welcome', 'stage', 'needs', 'likes', 'style', 'look', 'signals', 'match', 'fire', 'plan'];
// The 6 questions (stage … signals) fill the bar. A checkpoint closes each part.
const Q = 6;
const PARTS = [{ at: 2, label: 'About you' }, { at: 5, label: 'Your campfire' }, { at: 6, label: 'Privacy' }];

export function Onboarding() {
  const S = useApp();
  if (!S.onboarding || !S.moodLoaded) return null;
  return <Flow />;
}

function Flow() {
  const S = useApp();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const [stage, setStage] = useState<string | null>(null);
  const [needs, setNeeds] = useState<string[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [style, setStyle] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [look, setLook] = useState<Avatar>(S.avatar);
  const [signals, setSignals] = useState<Record<string, boolean>>({});
  const [care, setCare] = useState(false);
  const [code, setCode] = useState('');
  const [found, setFound] = useState(0); // matching: how many lines are ticked
  const [hop, setHop] = useState(false);
  const cheer = () => { buzz(); setHop(true); setTimeout(() => setHop(false), 460); };
  const first = (S.avatar.name || '').trim().split(/\s+/)[0] || 'there';
  useEffect(() => { const t = setTimeout(() => { setHop(true); setTimeout(() => setHop(false), 460); }, 450); return () => clearTimeout(t); }, []); // hello!

  // Each step slides in from the side it comes from (see Enter).
  const dir = useRef(1);
  const goTo = (n: number) => { dir.current = n > i ? 1 : -1; setI(n); };
  const canBack = step !== 'welcome' && step !== 'match';
  const back = () => goTo(step === 'fire' ? STEPS.indexOf('signals') : i - 1);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (canBack) back(); return true; });
    return () => sub.remove();
  }, [i]);

  // Matching: three lines tick off one by one, then the campfire appears.
  useEffect(() => {
    if (step !== 'match') return;
    setFound(0);
    const t = [700, 1400, 2100].map((ms, k) => setTimeout(() => { setFound(k + 1); buzz(); }, ms));
    const done = setTimeout(() => goTo(STEPS.indexOf('fire')), 2900);
    return () => { t.forEach(clearTimeout); clearTimeout(done); };
  }, [step]);

  // Your first two weeks, built from what you'd like help with (the same plan My Journey will show).
  const plan = useMemo(() => {
    const a = Array(9).fill(0);
    needs.forEach((n) => { const z = AREAS.find((x) => x.area === n); if (z) a[z.item] = 3; });
    return buildPlan(a);
  }, [needs]);
  const timeOpt = TIMES.find((t) => t.id === time);
  const others = S.members.filter((m) => m.id !== 'me');

  const toggle = (list: string[], set: (v: string[]) => void, id: string, max = 99) => {
    if (list.includes(id)) { buzz(); set(list.filter((x) => x !== id)); return; }
    if (list.length >= max) return;
    set([...list, id]); cheer();
  };
  const finish = (skipped = false) => {
    buzz();
    S.finishOnboarding(skipped ? { answers: null } : { answers: { stage, needs, likes, style, time, signals, care, code: code.trim() || null }, plan });
  };
  const next = () => {
    if (step === 'look' && JSON.stringify(look) !== JSON.stringify(S.avatar)) S.setAvatar(look);
    if (step === 'plan') return finish();
    buzz(); goTo(i + 1);
  };

  const valid = step === 'stage' ? !!stage : step === 'needs' ? needs.length > 0 : step === 'likes' ? likes.length > 0 : step === 'style' ? !!style && !!time : true;
  const label = ({ welcome: 'Let’s go', signals: 'Find my campfire', fire: 'Join the fire', plan: 'Let’s do it!' } as Record<string, string>)[step] || 'Next';
  const hint = step === 'needs' ? `${needs.length} of ${MAX_NEEDS} picked`
    : step === 'likes' ? (likes.length ? `${likes.length} picked` : 'Pick at least one')
    : step === 'style' && !valid ? 'Two quick ones on this page'
    : step === 'signals' ? 'All optional. You can change these anytime in Support.' : null;

  const filled = Math.max(0, Math.min(Q, i - 1));
  const part = PARTS.find((p) => i <= p.at);

  let body: React.ReactNode = null;
  if (step === 'welcome') body = (
    <View style={st.welcome}>
      <View style={st.hello}><Text style={st.helloT}>{'Hi ' + first + '!'}</Text><View style={st.helloTail} /></View>
      <View style={st.sun}><Mallow a={look} face="happy" size={128} hop={hop} /></View>
      <Text style={st.bigT}>Let’s find your campfire</Text>
      <Text style={st.lead}>A campfire is a small group of people who get it. A few quick questions first, so we can seat you somewhere that feels right. It takes about a minute.</Text>
      <View style={st.parts}>
        {[['🙂', 'About you'], ['🔥', 'Your campfire'], ['🔒', 'Privacy'], ['🌱', 'Your first week']].map(([e, t], k) => (
          <View key={t} style={st.partRow}>
            <View style={st.partNum}><Text style={st.partNumT}>{k + 1}</Text></View>
            <Text style={st.partE}>{e}</Text>
            <Text style={st.partT}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
  else if (step === 'stage') body = (
    <>
      <Say a={look} hop={hop} text="Where are you right now?" sub="So we can sit you with people at a similar point." />
      <View style={st.list}>{STAGES.map((o) => <OptionRow key={o.id} o={o} on={stage === o.id} onPress={() => { setStage(o.id); cheer(); }} />)}</View>
    </>
  );
  else if (step === 'needs') body = (
    <>
      <Say a={look} hop={hop} text="What would you like a little help with?" sub={`Pick up to ${MAX_NEEDS}. Your first plan is built around them.`} />
      <View style={st.list}>{NEEDS.map((o) => {
        const on = needs.includes(o.id);
        return <OptionRow key={o.id} o={o} multi on={on} dim={!on && needs.length >= MAX_NEEDS} onPress={() => toggle(needs, setNeeds, o.id, MAX_NEEDS)} />;
      })}</View>
    </>
  );
  else if (step === 'likes') body = (
    <>
      <Say a={look} hop={hop} text="What do you enjoy, even a little?" sub="Pick as many as you like. It helps us find people you’ll click with." />
      <View style={st.grid}>{LIKES.map((o) => <Tile key={o.id} o={o} on={likes.includes(o.id)} onPress={() => toggle(likes, setLikes, o.id)} />)}</View>
    </>
  );
  else if (step === 'style') body = (
    <>
      <Say a={look} hop={hop} text="How do you like to be in a group?" sub="There’s no wrong answer. Some fires are chatty, some are quiet." />
      <View style={st.list}>{STYLES.map((o) => <OptionRow key={o.id} o={o} on={style === o.id} onPress={() => { setStyle(o.id); cheer(); }} />)}</View>
      <Text style={st.q2}>When are you usually around?</Text>
      <View style={st.pills}>{TIMES.map((o) => (
        <Pressable key={o.id} onPress={() => { setTime(o.id); cheer(); }} accessibilityRole="radio" accessibilityState={{ checked: time === o.id }}
          style={(p: any) => [st.pill, time === o.id && st.pillOn, p.pressed && { transform: [{ scale: 0.97 }] }, p.hovered && time !== o.id && { borderColor: C.lineHi }]}>
          <Text style={st.pillE}>{o.e}</Text><Text style={st.pillT}>{o.t}</Text>
        </Pressable>
      ))}</View>
    </>
  );
  else if (step === 'look') body = (
    <>
      <Say a={look} hop={hop} text="Now, your marshmallow!" sub="This is how your campfire sees you. You can dress it up later in the Wardrobe." />
      <View style={st.preview}>
        <View style={st.sunSm}><Mallow a={look} size={116} hop={hop} /></View>
        <Text style={st.previewName}>{look.name || 'You'}</Text>
      </View>
      <Text style={st.q2}>Flavour</Text>
      <View style={st.swatches}>{Object.entries(COLORS).map(([k, c]) => (
        <Pressable key={k} onPress={() => { setLook({ ...look, color: k }); cheer(); }} accessibilityRole="radio" accessibilityLabel={c.label} accessibilityState={{ checked: look.color === k }}
          style={[st.swatch, look.color === k && st.swatchOn]}>
          <View style={[st.swatchIn, { backgroundColor: c.base, borderColor: c.shade }]} />
          <Text style={st.swatchT} numberOfLines={1}>{c.label}</Text>
        </Pressable>
      ))}</View>
      <Text style={st.q2}>Hat</Text>
      <View style={st.hats}>{HAT_PICK.map((h) => (
        <Pressable key={h} onPress={() => { setLook({ ...look, hat: h }); cheer(); }} accessibilityRole="radio" accessibilityLabel={h === 'none' ? 'No hat' : h} accessibilityState={{ checked: look.hat === h }}
          style={[st.hat, look.hat === h && st.hatOn]}>
          <Mallow a={{ ...look, hat: h }} size={46} anim={false} />
        </Pressable>
      ))}</View>
    </>
  );
  else if (step === 'signals') body = (
    <>
      <Say a={look} hop={hop} text="Can Mellow notice the small things?" sub="Sleep and movement often change before mood does. Turn on only what you’re comfortable with." />
      <View style={st.card}>
        <Text style={st.cardH}>From your phone or watch</Text>
        {SIGNALS.map((o, k) => (
          <Pressable key={o.id} onPress={() => { setSignals({ ...signals, [o.id]: !signals[o.id] }); buzz(); }} accessibilityRole="switch" accessibilityState={{ checked: !!signals[o.id] }}
            style={[st.sigRow, k > 0 && st.sigLine]}>
            <Text style={st.sigE}>{o.e}</Text>
            <View style={{ flex: 1 }}><Text style={st.optT}>{o.t}</Text><Text style={st.optS}>{o.s}</Text></View>
            <Toggle on={!!signals[o.id]} />
          </Pressable>
        ))}
      </View>
      <View style={st.card}>
        <Text style={st.cardH}>Your care team</Text>
        <Pressable onPress={() => { setCare(!care); buzz(); }} accessibilityRole="switch" accessibilityState={{ checked: care }} style={st.sigRow}>
          <Text style={st.sigE}>🩺</Text>
          <View style={{ flex: 1 }}><Text style={st.optT}>Share a summary with my clinic</Text><Text style={st.optS}>Every 2 weeks: check-ins, sleep and mood trends. Never your chats.</Text></View>
          <Toggle on={care} />
        </Pressable>
        {care ? (
          <View style={{ gap: 6, paddingTop: 4 }}>
            <Text style={st.optS}>Got a code from your clinic? (optional)</Text>
            <TextInput value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="e.g. HELS-2041" placeholderTextColor={C.muted}
              autoCapitalize="characters" autoCorrect={false} maxLength={12} style={st.input} />
          </View>
        ) : null}
      </View>
      <View style={st.privacy}>
        <Ionicons name="lock-closed-outline" size={16} color={C.muted} />
        <Text style={st.privacyT}>Mellow only compares you with your own normal. Your campfire never sees any of this.</Text>
      </View>
    </>
  );
  else if (step === 'match') {
    const likeWord = likes.length ? likeLabel(likes[0]) : 'the same things';
    const lines = [
      `Looking for people who also like ${likeWord}`,
      `Finding people around in the ${timeOpt?.word || 'evenings'}`,
      stage === 'during' ? 'Keeping it gentle while you’re in treatment' : 'Finding people at a similar point',
    ];
    body = (
      <View style={st.match}>
        <Pulse><Mallow a={look} size={110} hop={found > 0 && found < 3} /></Pulse>
        <Text style={st.bigT}>Finding your campfire…</Text>
        <View style={{ gap: 12, alignSelf: 'stretch' }}>{lines.map((t, k) => (
          <View key={k} style={[st.found, { opacity: found >= k ? 1 : 0.35 }]}>
            <Ionicons name={found > k ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={found > k ? C.moss : C.muted} />
            <Text style={st.foundT}>{t}</Text>
          </View>
        ))}</View>
      </View>
    );
  } else if (step === 'fire') {
    const reasons: { e: string; t: string }[] = [];
    others.forEach((m) => {
      const shared = (TAGS[m.id] || []).filter((t) => likes.includes(t));
      if (shared.length) reasons.push({ e: LIKES.find((l) => l.id === shared[0])!.e, t: `${m.name} is into ${likeLabel(shared[0])} too` });
    });
    reasons.splice(2); // at most two "likes it too", so the other reasons fit
    if (stage === 'recent') reasons.push({ e: '🌱', t: 'Others here also finished TMS in the last few months' });
    if (stage === 'while') reasons.push({ e: '🌳', t: 'Others here are a while past treatment too' });
    if (timeOpt) reasons.push({ e: timeOpt.e, t: `Most of the group is around in the ${timeOpt.word}` });
    if (style === 'listen') reasons.push({ e: '👂', t: 'Quiet is welcome here. Nobody has to talk.' });
    body = (
      <>
        <Say a={look} face="excited" hop={hop} text="Found them! I think you’ll like it here." />
        <View style={st.fireCard}>
          <View style={st.scene}><CampScene members={S.members} compact /></View>
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ gap: 2 }}>
              <Text style={st.eyebrow}>YOUR CAMPFIRE</Text>
              <Text style={st.fireName}>{S.campfireName}</Text>
              <Text style={st.optS}>{others.length + 1} people, the same faces every week. Small on purpose.</Text>
            </View>
            <View style={st.mates}>{others.map((m, k) => {
              const shared = (TAGS[m.id] || []).find((t) => likes.includes(t));
              return (
                <View key={m.id} style={st.mate}>
                  <Mallow a={m.a} size={46} delay={k * 0.5} />
                  <Text style={st.mateN} numberOfLines={1}>{m.name}</Text>
                  <Text style={st.mateL} numberOfLines={2}>{shared ? '♥ ' + likeLabel(shared) : m.likes || 'New here too'}</Text>
                </View>
              );
            })}</View>
            {reasons.length ? (
              <View style={{ gap: 8 }}>
                <Text style={st.cardH}>Why this fire</Text>
                {reasons.slice(0, 4).map((r, k) => (
                  <View key={k} style={st.reason}><Text style={st.reasonE}>{r.e}</Text><Text style={st.reasonT}>{r.t}</Text></View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
        <View style={st.talk}>
          <View style={st.talkIcon}><Icon name="calendar" size={20} /></View>
          <View style={{ flex: 1 }}>
            <Text style={st.optT}>Sunday Talk</Text>
            <Text style={st.optS}>Sundays at 19:00 · 30 minutes, with a guide. Come whenever you like.</Text>
          </View>
        </View>
      </>
    );
  } else if (step === 'plan') {
    const dayName = (d: number) => (d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : addDays(new Date(), d).toLocaleDateString('en-GB', { weekday: 'long' }));
    body = (
      <>
        <Say a={look} hop={hop} text="Here’s a gentle first week." sub="Small things, a couple a day. Skip any you don’t feel like." />
        <View style={st.card}>
          <View style={{ gap: 6 }}>
            <Text style={st.planH}>Your first week</Text>
            <View style={st.chips}>{needs.map((n) => {
              const o = NEEDS.find((x) => x.id === n)!;
              return <View key={n} style={st.chip}><Text style={st.chipT}>{o.e + ' ' + o.t}</Text></View>;
            })}</View>
          </View>
          <View style={st.daily}>
            <Icon name="ember" size={20} />
            <View style={{ flex: 1 }}><Text style={st.optT}>Every day: light your flame</Text><Text style={st.optS}>One tap to say how you are. Keeps your streak going.</Text></View>
          </View>
          <View>{plan.days.slice(0, 4).map((d, k, all) => (
            <View key={d.date} style={st.day}>
              <View style={st.rail}>
                <View style={[st.railDot, k === 0 && st.railDotOn]} />
                {k < all.length - 1 ? <View style={st.railLine} /> : null}
              </View>
              <View style={{ flex: 1, gap: 6, paddingBottom: 14 }}>
                <Text style={[st.dayT, k === 0 && { color: C.emberHi }]}>{dayName(k)}</Text>
                {d.tasks.map((t, j) => (
                  <View key={j} style={st.task}>
                    <Icon name={t.icon} size={18} />
                    <Text style={st.taskT}>{t.t}</Text>
                    <Text style={st.taskD}>{t.dur}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}</View>
          <View style={st.daily}>
            <Icon name="clock" size={20} />
            <View style={{ flex: 1 }}><Text style={st.optT}>{'A gentle nudge around ' + (timeOpt?.at || '19:30')}</Text><Text style={st.optS}>When you’re usually around. Never more than once a day.</Text></View>
          </View>
        </View>
        <Text style={st.footnote}>In two weeks, a short check-in shapes your next plan. You’ll find it all in My Journey.</Text>
      </>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, st.root, { paddingTop: insets.top }]}>
      <View style={st.top}>
        {canBack ? (
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={(p: any) => [st.backBtn, (p.hovered || p.pressed) && { backgroundColor: C.night4 }]}>
            <Ionicons name="chevron-back" size={24} color={C.creamDim} />
          </Pressable>
        ) : <View style={st.backBtn} />}
        {step !== 'welcome' ? <Progress filled={filled} /> : <View style={{ flex: 1 }} />}
        {/* Day or night, picked before you start (changing it redraws the app, so only on the first page). */}
        {step === 'welcome' ? <ThemeToggle bg={C.night4} color={themeMode() === 'day' ? C.plum : undefined} /> : <View style={st.backBtn} />}
      </View>
      {part && step !== 'welcome' ? <Text style={st.partLabel}>{part.label.toUpperCase()}</Text> : null}
      <ScrollView key={step} style={{ flex: 1 }} contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Enter key={step} dir={i === 0 ? 0 : dir.current}>{body}</Enter>
      </ScrollView>
      {step !== 'match' ? (
        <View style={[st.foot, { paddingBottom: insets.bottom + 14 }]}>
          <View style={st.footIn}>
            {hint ? <Text style={st.hint}>{hint}</Text> : null}
            <Pressable onPress={next} disabled={!valid} accessibilityRole="button" accessibilityState={{ disabled: !valid }}
              style={(p: any) => [st.next, !valid && st.nextOff, p.pressed && valid && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}>
              <Text style={[st.nextT, !valid && { color: C.muted }]}>{label}</Text>
            </Pressable>
            {step === 'welcome' ? <Pressable onPress={() => finish(true)} hitSlop={6}><Text style={st.skip}>Skip for now</Text></Pressable> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Enter({ dir, children }: { dir: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(dir ? 0 : 1)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(); }, []);
  return <Animated.View style={[st.inner, { opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [28 * dir, 0] }) }] }]}>{children}</Animated.View>;
}

// The marshmallow asking the question, in a speech bubble.
function Say({ a, text, sub, hop, face }: { a: Avatar; text: string; sub?: string; hop?: boolean; face?: string }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={st.say}>
        <Mallow a={a} size={68} hop={hop} face={face} />
        <View style={st.bubble}>
          <View style={st.tail} />
          <Text style={st.bubbleT}>{text}</Text>
        </View>
      </View>
      {sub ? <Text style={st.sub}>{sub}</Text> : null}
    </View>
  );
}

function Mark({ on, multi }: { on: boolean; multi?: boolean }) {
  return (
    <View style={[st.mark, on && st.markOn]}>
      {on ? <Ionicons name="checkmark" size={16} color={C.emberInk} /> : multi ? <Ionicons name="add" size={18} color={C.muted} /> : null}
    </View>
  );
}

function OptionRow({ o, on, dim, multi, onPress }: { o: Opt; on: boolean; dim?: boolean; multi?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole={multi ? 'checkbox' : 'radio'} accessibilityState={{ checked: on }} accessibilityLabel={o.t}
      style={(p: any) => [st.opt, on && st.optOn, dim && { opacity: 0.45 }, p.hovered && !on && { borderColor: C.lineHi }, p.pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={[st.emoji, on && { backgroundColor: C.night2 }]}><Text style={st.emojiT}>{o.e}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={st.optT}>{o.t}</Text>
        {o.s ? <Text style={st.optS}>{o.s}</Text> : null}
      </View>
      <Mark on={on} multi={multi} />
    </Pressable>
  );
}

function Tile({ o, on, onPress }: { o: Opt; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={o.t}
      style={(p: any) => [st.tile, on && st.optOn, p.hovered && !on && { borderColor: C.lineHi }, p.pressed && { transform: [{ scale: 0.96 }] }]}>
      <View style={st.tileMark}><Mark on={on} multi /></View>
      <Text style={st.tileE}>{o.e}</Text>
      <Text style={st.tileT} numberOfLines={2}>{o.t}</Text>
    </Pressable>
  );
}

function Toggle({ on }: { on: boolean }) {
  const x = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.timing(x, { toValue: on ? 1 : 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start(); }, [on]);
  return (
    <View style={[st.switch, { backgroundColor: on ? C.moss : C.night4 }]}>
      <Animated.View style={[st.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }]} />
    </View>
  );
}

// The bar across the top, with a checkpoint at the end of each part that pops green when you pass it.
function Progress({ filled }: { filled: number }) {
  const w = useRef(new Animated.Value(filled / Q)).current;
  useEffect(() => { Animated.timing(w, { toValue: filled / Q, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [filled]);
  return (
    <View style={st.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: Q, now: filled }}>
      <View style={st.track}>
        <Animated.View style={[st.fill, { width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      {PARTS.map((p) => <Checkpoint key={p.at} left={p.at / Q} done={filled >= p.at} label={p.label} />)}
    </View>
  );
}
function Checkpoint({ left, done, label }: { left: number; done: boolean; label: string }) {
  const pop = useRef(new Animated.Value(done ? 1 : 0)).current;
  useEffect(() => {
    if (done) Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: ND }).start();
    else pop.setValue(0);
  }, [done]);
  return (
    <View style={[st.cp, { left: (left * 100 + '%') as any }]} accessibilityLabel={label + (done ? ', done' : '')}>
      <View style={st.cpIn} />
      <Animated.View style={[st.cpDone, { opacity: pop.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }), transform: [{ scale: pop }] }]}>
        <Ionicons name="checkmark" size={14} color={C.night2} />
      </Animated.View>
    </View>
  );
}

// A soft glow breathing behind the marshmallow while we look for a campfire.
function Pulse({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    l.start(); return () => l.stop();
  }, []);
  return (
    <View style={st.pulseBox}>
      <Animated.View style={[st.glow, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.12] }) }] }]} />
      <Animated.View style={[st.glow2, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }]} />
      {children}
    </View>
  );
}

const st = themed(() => {
  const day = themeMode() === 'day';
  const shade = day ? '#22683F' : '#C98538'; // the darker lip under the main button
  return StyleSheet.create({
    root: { backgroundColor: C.night, zIndex: 60 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingTop: 10, height: 56, width: '100%', maxWidth: 600, alignSelf: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    bar: { flex: 1, height: 26, justifyContent: 'center', marginRight: 11 },
    track: { height: 12, borderRadius: 6, backgroundColor: C.night4, overflow: 'hidden' },
    fill: { height: 12, borderRadius: 6, backgroundColor: C.moss },
    cp: { position: 'absolute', top: 1, width: 24, height: 24, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
    cpIn: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.night2, borderWidth: 3, borderColor: C.night4 },
    cpDone: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: C.moss, borderWidth: 2, borderColor: C.night, alignItems: 'center', justifyContent: 'center' },
    partLabel: { fontFamily: F.label, fontSize: 11.5, letterSpacing: 1.4, color: C.muted, textAlign: 'center', marginTop: 2 },
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
    inner: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 16 },

    say: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bubble: { flex: 1, backgroundColor: C.night2, borderRadius: 18, borderWidth: 1.5, borderColor: C.line, paddingVertical: 12, paddingHorizontal: 15 },
    tail: { position: 'absolute', left: -8, top: '50%', marginTop: -7, width: 14, height: 14, backgroundColor: C.night2, borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: C.line, transform: [{ rotate: '45deg' }] },
    bubbleT: { fontFamily: F.display, fontSize: 19, lineHeight: 24, color: C.cream },
    sub: { fontFamily: F.body, fontSize: 14.5, lineHeight: 20, color: C.creamDim },

    list: { gap: 10 },
    opt: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 16, borderWidth: 2, borderColor: C.line, backgroundColor: C.night2, borderBottomWidth: 4 },
    optOn: { borderColor: C.ember, backgroundColor: C.navySoft },
    emoji: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.night3, alignItems: 'center', justifyContent: 'center' },
    emojiT: { fontSize: 22 },
    optT: { fontFamily: F.bodyBold, fontSize: 15.5, color: C.cream },
    optS: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 1 },
    mark: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: C.lineHi, alignItems: 'center', justifyContent: 'center' },
    markOn: { backgroundColor: C.ember, borderColor: C.ember },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { flexBasis: '30%', flexGrow: 1, minHeight: 104, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: C.line, backgroundColor: C.night2 },
    tileMark: { position: 'absolute', top: 6, right: 6, transform: [{ scale: 0.8 }] },
    tileE: { fontSize: 30 },
    tileT: { fontFamily: F.bodyBold, fontSize: 13.5, color: C.cream, textAlign: 'center' },

    q2: { fontFamily: F.display, fontSize: 17, color: C.cream, marginTop: 4 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: C.line, backgroundColor: C.night2 },
    pillOn: { borderColor: C.ember, backgroundColor: C.navySoft },
    pillE: { fontSize: 16 },
    pillT: { fontFamily: F.bodyBold, fontSize: 14, color: C.cream },

    preview: { alignItems: 'center', gap: 6 },
    sunSm: { width: 150, height: 150, borderRadius: 75, backgroundColor: C.peach, alignItems: 'center', justifyContent: 'center' },
    previewName: { fontFamily: F.display, fontSize: 18, color: C.cream },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    swatch: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 14, borderWidth: 2, borderColor: C.line, backgroundColor: C.night2 },
    swatchOn: { borderColor: C.ember, backgroundColor: C.navySoft },
    swatchIn: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
    swatchT: { fontFamily: F.bodyBold, fontSize: 13, color: C.cream },
    hats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    hat: { flexBasis: '14%', flexGrow: 1, aspectRatio: 1, maxHeight: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 2, borderColor: C.line, backgroundColor: C.night2 },
    hatOn: { borderColor: C.ember, backgroundColor: C.navySoft },

    card: { gap: 10, padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.night2 },
    cardH: { fontFamily: F.label, fontSize: 12, letterSpacing: 1.1, color: C.muted, textTransform: 'uppercase' },
    sigRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
    sigLine: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12 },
    sigE: { fontSize: 22, width: 30, textAlign: 'center' },
    switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
    knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
    input: { fontFamily: F.bodyBold, fontSize: 16, letterSpacing: 1.5, color: C.cream, backgroundColor: C.night3, borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14 },
    privacy: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
    privacyT: { flex: 1, fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted },

    welcome: { alignItems: 'center', gap: 14, paddingTop: 8 },
    hello: { backgroundColor: C.night2, borderWidth: 1.5, borderColor: C.line, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 18 },
    helloT: { fontFamily: F.displayBold, fontSize: 22, color: C.cream },
    helloTail: { position: 'absolute', bottom: -8, left: '50%', marginLeft: -7, width: 14, height: 14, backgroundColor: C.night2, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: C.line, transform: [{ rotate: '45deg' }] },
    sun: { width: 176, height: 176, borderRadius: 88, backgroundColor: C.peach, alignItems: 'center', justifyContent: 'center' },
    bigT: { fontFamily: F.displayBold, fontSize: 26, lineHeight: 31, color: C.cream, textAlign: 'center' },
    lead: { fontFamily: F.body, fontSize: 15.5, lineHeight: 22, color: C.creamDim, textAlign: 'center', maxWidth: 420 },
    parts: { alignSelf: 'stretch', gap: 8, marginTop: 4 },
    partRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.night2, borderWidth: 1.5, borderColor: C.line },
    partNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.night4, alignItems: 'center', justifyContent: 'center' },
    partNumT: { fontFamily: F.label, fontSize: 12.5, color: C.creamDim },
    partE: { fontSize: 18 },
    partT: { fontFamily: F.bodyBold, fontSize: 15, color: C.cream },

    match: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, paddingTop: 40 },
    pulseBox: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
    glow: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: C.peach },
    glow2: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 3, borderColor: C.fire },
    found: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.night2, borderWidth: 1.5, borderColor: C.line },
    foundT: { flex: 1, fontFamily: F.bodyBold, fontSize: 14.5, color: C.cream },

    fireCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: C.line, backgroundColor: C.night2 },
    scene: { width: '100%' },
    eyebrow: { fontFamily: F.label, fontSize: 11.5, letterSpacing: 1.4, color: C.emberHi },
    fireName: { fontFamily: F.displayBold, fontSize: 28, color: C.cream },
    mates: { flexDirection: 'row', gap: 8 },
    mate: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14, backgroundColor: C.night3 },
    mateN: { fontFamily: F.bodyBold, fontSize: 14, color: C.cream },
    mateL: { fontFamily: F.body, fontSize: 12, lineHeight: 16, color: C.muted, textAlign: 'center' },
    reason: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    reasonE: { fontSize: 18, width: 26, textAlign: 'center' },
    reasonT: { flex: 1, fontFamily: F.bodySemi, fontSize: 14, lineHeight: 19, color: C.creamDim },
    talk: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.night2 },
    talkIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' },

    planH: { fontFamily: F.displayBold, fontSize: 22, color: C.cream },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.navySoft },
    chipT: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.cream },
    daily: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: C.night3 },
    day: { flexDirection: 'row', gap: 12 },
    rail: { width: 16, alignItems: 'center', paddingTop: 3 },
    railDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: C.lineHi, backgroundColor: C.night2 },
    railDotOn: { borderColor: C.ember, backgroundColor: C.ember },
    railLine: { flex: 1, width: 2, backgroundColor: C.line, marginTop: 3 },
    dayT: { fontFamily: F.label, fontSize: 14, color: C.creamDim },
    task: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.line },
    taskT: { flex: 1, fontFamily: F.bodySemi, fontSize: 14, lineHeight: 19, color: C.cream },
    taskD: { fontFamily: F.bodyBold, fontSize: 12, color: C.muted },
    footnote: { fontFamily: F.body, fontSize: 13.5, lineHeight: 19, color: C.muted, textAlign: 'center', paddingHorizontal: 10 },

    foot: { paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.night },
    footIn: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 10 },
    hint: { fontFamily: F.bodyBold, fontSize: 13, color: C.muted, textAlign: 'center' },
    next: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ember, borderBottomWidth: 4, borderBottomColor: shade },
    nextOff: { backgroundColor: C.night4, borderBottomColor: C.line },
    nextT: { fontFamily: F.displayBold, fontSize: 17, letterSpacing: 0.3, color: C.emberInk },
    skip: { fontFamily: F.bodyBold, fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 4 },
  });
});
