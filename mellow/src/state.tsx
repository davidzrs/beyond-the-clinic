import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar } from './pixel/sprites';
import { CHAT0, COOP_GOAL, ME_DEFAULT, Member, MEMBERS, MoodKey, Msg, QUEST_POOL, Quest, REPLIES } from './data';
import { addDays, buildPlan, Checkin, dayIndex, fromYmd, Plan, PlanTask, PLAN_DAYS, phqScore, ymd } from './checkin';
import { SAM } from './demo';
import { useAuth } from './auth';
import * as sync from './lib/sync';

export type Route = 'home' | 'campfire' | 'journey' | 'games' | 'nono' | 'sight' | 'hotel' | 'wardrobe' | 'clinic' | 'insights';
export type ModalState = null | { type: string; [k: string]: any };
const ROUTES: Route[] = ['home', 'campfire', 'journey', 'games', 'nono', 'sight', 'hotel', 'wardrobe', 'clinic', 'insights'];
export const TABS: Route[] = ['home', 'campfire', 'journey', 'games'];

// Check-in history = Sam's fortnightly PHQ-9 totals from the demo data, spread over the items
// (sleep and energy first, never question 9). The current plan comes from the latest one.
const FILL = [2, 3, 0, 1, 5, 6, 4, 7];
function answersFor(score: number) {
  const a = Array(9).fill(0); let left = score;
  for (let round = 0; left > 0 && round < 3; round++) for (const i of FILL) { if (left > 0) { a[i]++; left--; } }
  return a;
}
function seedCheckins(): Checkin[] {
  return SAM.questionnaires.filter((q) => q.phq9 != null).map((q) => { const answers = answersFor(q.phq9!); return { date: q.date, answers, score: phqScore(answers) }; });
}
function seedPlan(c: Checkin[]): Plan { const last = c[c.length - 1]; return buildPlan(last.answers, fromYmd(last.date)); }
function seedDone(p: Plan): Record<string, boolean> {
  const d: Record<string, boolean> = {}; const today = ymd(new Date());
  p.days.forEach((day, i) => { if (day.date < today) day.tasks.forEach((_, j) => { if ((i + j) % 4 !== 3) d[day.date + '-' + j] = true; }); });
  return d;
}
const SEED_C = seedCheckins();
const SEED_P = seedPlan(SEED_C);


function nowTime() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function readHash(): Route { if (Platform.OS !== 'web') return 'home'; const h = (window.location.hash || '').replace('#', '') as Route; return ROUTES.includes(h) ? h : 'home'; }

function useAppState() {
  const { session, signOut } = useAuth();
  const uid = session?.user.id || null;
  // Signed in, a person sits at one or more campfires; campfireId is the one on screen (remembered on
  // this device). The demo has a single made-up Pinehollow.
  const [fires, setFires] = useState<sync.Fire[]>([]);
  const [campfireId, setCampfireId] = useState<string | null>(null);
  const fire = fires.find((f) => f.id === campfireId);
  const campfireName = fire?.name || 'Pinehollow';
  const campfireCode = fire?.code || null;
  const [mates, setMates] = useState<sync.Mate[]>([]);
  const [route, setRoute] = useState<Route>(readHash);
  const [avatar, setAvatarS] = useState<Avatar>(ME_DEFAULT);
  const [mood, setMood] = useState<MoodKey | null>(null);
  // Daily streak: answering "How are you feeling today?" once a day keeps it going. Demo: 6 days up to yesterday.
  const [streak, setStreak] = useState<{ count: number; last: string }>(() => ({ count: 6, last: ymd(addDays(new Date(), -1)) }));
  const [moodLoaded, setMoodLoaded] = useState(false);
  const [dailyDismissed, setDailyDismissed] = useState(false);
  const [embers, setEmbers] = useState(86);
  const [coop, setCoop] = useState(8);
  const [quests, setQuests] = useState<Quest[]>(QUEST_POOL.slice(0, 3));
  const [questState, setQS] = useState<Record<string, boolean>>({});
  const [actDone, setActDone] = useState<Record<string, boolean>>({});
  const [actLog, setActLog] = useState<{ icon: string; t: string; d: string }[]>([]);
  const [chat, setChat] = useState<Msg[]>(CHAT0);
  const [bubbles, setBubbles] = useState<Record<string, string>>({ juno: 'Anything by Studio Ghibli. Always.' });
  const [modal, setModalS] = useState<ModalState>(null);
  // Web: an open overlay (breathing, plan, check-in…) gets its own browser history entry,
  // so the browser's back button closes it instead of doing nothing.
  const hist = useRef({ entry: false, closing: false, reopen: false, hash: null as string | null });
  const setModal = (m: ModalState) => {
    setModalS(m);
    if (Platform.OS !== 'web') return;
    const h = hist.current;
    if (h.closing) { h.reopen = !!m; return; } // one closed and another opened straight away: re-add the entry after the back
    if (m && !h.entry) { window.history.pushState({ mellowModal: true }, '', window.location.href); h.entry = true; }
    else if (!m && h.entry) { h.entry = false; h.closing = true; window.history.back(); } // the popstate below finishes it
  };
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onPop = () => {
      const h = hist.current;
      if (h.closing) {
        h.closing = false;
        if (h.hash) { const r = h.hash; h.hash = null; window.location.hash = r; }
        if (h.reopen) { h.reopen = false; window.history.pushState({ mellowModal: true }, '', window.location.href); h.entry = true; }
        return;
      }
      if (h.entry) { h.entry = false; setModalS(null); } // back button while an overlay is open
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [hopId, setHop] = useState<string | null>(null);
  const [talkReminder, setTalkReminder] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  // Bumped by openChat(): asks the campfire screen to open its chat sheet.
  const [chatOpenN, setChatOpenN] = useState(0);
  // Chat moderation: strikes from blocked messages, and the last warning shown above the input.
  const [strikes, setStrikes] = useState(0);
  const [chatWarning, setChatWarning] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [demoDay, setDemoDay] = useState(90); // which of Sam's 90 synthetic days My Journey shows
  const [lastTab, setLastTab] = useState<Route>('home');
  const [checkins, setCheckins] = useState<Checkin[]>(SEED_C);
  const [plan, setPlanS] = useState<Plan>(SEED_P);
  const [planDone, setPlanDone] = useState<Record<string, boolean>>(() => seedDone(SEED_P));
  // Daily puzzles: the dates each one was solved. One puzzle a day, so a date appears at most once.
  const [solved, setSolved] = useState<Record<string, string[]>>({});
  // Which puzzle tutorials have been seen (shown once, the first time a puzzle is opened).
  const [tutorials, setTutorials] = useState<Record<string, boolean>>({});
  const [tutorialsLoaded, setTutorialsLoaded] = useState(false);
  const toastT = useRef<any>(null);
  // Onboarding after creating an account: the sign-up screen leaves a note with the new email, and this
  // account's first open picks it up. It can also be replayed from Home (demo), without changing the plan.
  const [onboarding, setOnboarding] = useState(false);
  const [obLoaded, setObLoaded] = useState(false);
  const [obReplay, setObReplay] = useState(false);
  useEffect(() => {
    const mine = (session?.user.email || '').toLowerCase();
    AsyncStorage.getItem('mellow.onboard.pending').then((v) => { if (v && mine && v === mine) setOnboarding(true); })
      .catch(() => {}).finally(() => setObLoaded(true));
  }, []);

  const loadFires = async () => { if (!uid) return [] as sync.Fire[]; const list = await sync.myFires(uid); setFires(list); return list; };
  // Who sits at the fire on screen.
  useEffect(() => {
    setMates([]);
    if (!uid || !campfireId) return;
    let alive = true;
    sync.firemates(campfireId, uid).then((m) => { if (alive) setMates(m); });
    return () => { alive = false; };
  }, [uid, campfireId]);

  // Signed in: profile, streak, today's mood and campfire come from Supabase.
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const today = ymd(new Date());
      const [p, m, fire, k] = await Promise.all([
        sync.loadProfile(uid, (session?.user.user_metadata as any)?.name || 'Friend'),
        sync.todaysMood(uid, today),
        sync.ensureCampfire().then(() => loadFires()),
        sync.myStrikes(uid),
      ]);
      setStrikes(k);
      if (p) {
        setAvatarS({ ...ME_DEFAULT, ...(p.avatar || {}), name: p.name });
        setStreak({ count: p.streak_count || 0, last: p.streak_last || '' });
        // Crisis alerts: answered with a checkbox at sign-up (kept in the account's metadata). The first
        // time we see the profile, copy it there so the send-message function can read it.
        // Older accounts that never answered count as "no" until they turn it on under Support.
        const fromSignUp = (session?.user.user_metadata as any)?.crisis_consent;
        if (p.crisis_consent == null && typeof fromSignUp === 'boolean') { setConsent(fromSignUp); sync.saveCrisisConsent(uid, fromSignUp); }
        else setConsent(p.crisis_consent ?? null);
      }
      if (m) setMood(m);
      if (fire.length) {
        const saved = await AsyncStorage.getItem('mellow.v2.fire').catch(() => null);
        setCampfireId(fire.find((f) => f.id === saved)?.id || fire[0].id);
      }
      setMoodLoaded(true);
    })().catch(() => {}).finally(() => setMoodLoaded(true)); // never leave the start screen covered if loading fails
  }, [uid]);

  // Ember's polls: votes[messageId][userId] = 'a' | 'b' (mine is under 'me').
  const [votes, setVotes] = useState<Record<number, Record<string, 'a' | 'b'>>>({});
  const addVote = (v: sync.Vote) => setVotes((all) => ({ ...all, [v.message_id]: { ...all[v.message_id], [v.user_id === uid ? 'me' : v.user_id]: v.choice } }));
  const castVote = (messageId: number, choice: 'a' | 'b') => {
    setVotes((all) => ({ ...all, [messageId]: { ...all[messageId], me: choice } }));
    if (uid) sync.vote(messageId, choice);
  };
  // Crisis alerts to the care team: null = not asked yet, then the person's answer.
  const [consent, setConsent] = useState<boolean | null>(null);
  const answerConsent = (yes: boolean) => { setConsent(yes); if (uid) sync.saveCrisisConsent(uid, yes); };

  // Signed in: the campfire chat is the real one, read from Supabase and kept live.
  const [chatPeople, setChatPeople] = useState<Record<string, { name: string; a: Avatar }>>({});
  useEffect(() => {
    if (!uid || !campfireId) return;
    let alive = true;
    const toMsg = (r: sync.ChatRow): Msg => {
      const d = new Date(r.created_at);
      // No author = Ember, the campfire's AI.
      return {
        id: r.id, from: r.user_id === null ? 'ember' : r.user_id === uid ? 'me' : r.user_id, text: r.text,
        time: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'),
        kind: r.kind || 'text', poll: r.poll || undefined,
      };
    };
    const learn = async (ids: (string | null)[]) => {
      const people = await sync.peopleById([...new Set(ids)].filter((x): x is string => !!x && x !== uid));
      if (alive && people.length) setChatPeople((p) => ({ ...p, ...Object.fromEntries(people.map((m) => [m.id, { name: m.name, a: { ...ME_DEFAULT, ...(m.avatar || {}), name: m.name } as Avatar }])) }));
    };
    sync.loadMessages(campfireId).then((rows) => {
      if (!alive) return;
      setChat(rows.map(toMsg)); // an empty campfire starts empty: no made-up messages for real people
      learn(rows.map((r) => r.user_id));
      sync.loadVotes(rows.filter((r) => r.kind === 'spark').map((r) => r.id)).then((vs) => { if (alive) vs.forEach(addVote); });
      sync.requestSpark(campfireId); // quiet for 2 days? Ember drops a poll (it arrives below, live)
    });
    const off = sync.onMessages(campfireId, (r) => {
      setChat((c) => (c.some((x) => x.id === r.id) ? c : [...c, toMsg(r)]));
      if (r.user_id && r.user_id !== uid) { learn([r.user_id]); bubble(r.user_id, r.text); }
    });
    const offVotes = sync.onVotes(addVote);
    return () => { alive = false; off(); offVotes(); };
  }, [uid, campfireId]);

  useEffect(() => {
    if (uid) return; // demo mode below keeps everything on this device
    AsyncStorage.getItem('mellow.avatar').then((v) => { if (v) { try { setAvatarS({ ...ME_DEFAULT, ...JSON.parse(v) }); } catch {} } }).catch(() => {});
    AsyncStorage.multiGet(['mellow.v2.streak', 'mellow.v2.mood']).then((r) => {
      try {
        const [s, m] = r.map((x) => x[1]);
        if (s) setStreak(JSON.parse(s));
        if (m) { const v = JSON.parse(m); if (v.date === ymd(new Date())) setMood(v.key); }
      } catch {}
    }).catch(() => {}).finally(() => setMoodLoaded(true));
    AsyncStorage.getItem('mellow.v2.puzzles').then((v) => { if (v) { try { setSolved(JSON.parse(v)); } catch {} } }).catch(() => {});
    AsyncStorage.getItem('mellow.v2.tutorials').then((v) => { if (v) { try { setTutorials(JSON.parse(v)); } catch {} } }).catch(() => {}).finally(() => setTutorialsLoaded(true));
    AsyncStorage.multiGet(['mellow.v2.checkins', 'mellow.v2.plan', 'mellow.v2.planDone']).then((r) => {
      try {
        const [c, p, d] = r.map((x) => x[1]);
        if (c) setCheckins(JSON.parse(c));
        if (p) setPlanS(JSON.parse(p));
        if (d) setPlanDone(JSON.parse(d));
      } catch {}
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const h = () => setRoute(readHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  const go = (r: Route) => {
    setRoute(r);
    if (TABS.includes(r)) setLastTab(r);
    if (Platform.OS !== 'web') return;
    // Going to a page closes any open overlay; its history entry is removed first, then the page is added.
    if (hist.current.entry) setModal(null);
    if (hist.current.closing) hist.current.hash = r;
    else if (window.location.hash !== '#' + r) window.location.hash = r;
  };
  // Open the campfire chat with a message already started ("@Juno ", "I picked … because ").
  const openChat = (draft: string) => { setChatDraft(draft); setChatOpenN((n) => n + 1); go('campfire'); };
  const setAvatar = (a: Avatar) => {
    setAvatarS(a); AsyncStorage.setItem('mellow.avatar', JSON.stringify(a)).catch(() => {});
    if (uid) { const { name, ...look } = a; sync.saveProfile(uid, { name: name || 'Friend', avatar: look }); }
  };
  const toast = (m: string) => { setToastMsg(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(null), 2800); };
  // Seats: real campfire friends first, demo friends fill any empty seats; you always sit front-left.
  const others: Member[] = [
    ...mates.map((m) => ({ id: m.id, name: m.name, a: { ...ME_DEFAULT, ...(m.avatar || {}), name: m.name } as Avatar })),
    ...MEMBERS.filter((m) => m.id !== 'me'),
  ].slice(0, 3);
  const me: Member = { id: 'me', name: avatar.name || 'You', a: avatar };
  const members: Member[] = [others[0], others[1], me, others[2]];
  const bubble = (id: string, text: string) => {
    const t = text.length > 70 ? text.slice(0, 68) + '…' : text;
    setBubbles((b) => ({ ...b, [id]: t }));
    setTimeout(() => setBubbles((b) => { const n = { ...b }; if (n[id] === t) delete n[id]; return n; }), 5000);
  };
  const gainEmbers = (n: number, label?: string, icon?: string) => {
    setEmbers((e) => e + n); setCoop((c) => Math.min(COOP_GOAL, c + 1));
    if (label) setActLog((l) => [{ icon: icon || 'star', t: label, d: 'Today' }, ...l]);
  };
  // Signed in, my messages are checked by Gemini (send-message Edge Function) before anyone sees them.
  // Returns false when the message was not posted, so the chat keeps the draft.
  const sendChat = async (text: string, from = 'me'): Promise<boolean> => {
    if (from === 'me' && uid && campfireId) {
      setSending(true);
      const r = await sync.sendMessage(campfireId, text);
      setSending(false);
      if (r.status === 'error') { toast(r.message); return false; }
      setStrikes(r.strikes);
      if (r.status === 'blocked') {
        const left = sync.MAX_STRIKES - r.strikes;
        setChatWarning((r.reason ? r.reason + ' ' : '') + `This message wasn’t sent. ${left} more and you’ll lose access to the chat.`);
        return false;
      }
      if (r.status === 'banned') { setChatWarning(null); return false; }
      // Sounds like a crisis: the message is held (friends don't see it) and support opens instead.
      if (r.status === 'crisis') { setChatWarning(null); setChatDraft(''); setModal({ type: 'crisis', alerted: r.alerted }); return false; }
      setChatWarning(null);
      // Real chat: show it now under its database id; the live update for the same message is then skipped.
      const id = (r.status === 'sent' && r.id) || Date.now() + Math.random();
      setChat((c) => (c.some((x) => x.id === id) ? c : [...c, { id, from: 'me', text, time: nowTime() }]));
      bubble('me', text);
      return true;
    }
    setChat((c) => [...c, { id: Date.now() + Math.random(), from, text, time: nowTime() }]);
    bubble(from, text);
    if (from === 'me') {
      const who = ['juno', 'teo', 'ama'][Math.floor(Math.random() * 3)];
      setTimeout(() => { const r = REPLIES[Math.floor(Math.random() * REPLIES.length)]; setChat((c) => [...c, { id: Date.now() + Math.random(), from: who, text: r, time: nowTime() }]); bubble(who, r); }, 1800 + Math.random() * 1200);
    }
    return true;
  };
  const doQuest = (id: string) => {
    const q = QUEST_POOL.find((x) => x.id === id);
    setQS((s) => ({ ...s, [id]: true })); setActDone((s) => ({ ...s, [id]: true }));
    gainEmbers(q ? q.ember : 2, q ? q.title : 'Quest', q ? q.icon : 'star');
    toast('+' + (q ? q.ember : 2) + ' embers. ' + campfireName + '’s fire grows a little.');
    if (q && !quests.find((x) => x.id === id)) setQuests((qs) => [q, ...qs.slice(0, 2)]);
  };
  const swapQuest = (id: string) => setQuests((qs) => { const used = new Set(qs.map((q) => q.id)); const next = QUEST_POOL.find((q) => !used.has(q.id) && !questState[q.id]); if (!next) return qs; return qs.map((q) => (q.id === id ? next : q)); });
  const finishAct = (id: string, title: string, icon: string) => { if (!actDone[id]) { setActDone((s) => ({ ...s, [id]: true })); gainEmbers(2, title, icon); } };
  const today = ymd(new Date());
  const puzzleSolvedToday = (id: string) => (solved[id] || []).includes(today);
  const puzzleCount = (id: string) => (solved[id] || []).length;
  const solvePuzzle = (id: string, title: string, icon: string) => {
    if (puzzleSolvedToday(id)) return;
    const next = { ...solved, [id]: [...(solved[id] || []), today] };
    setSolved(next); AsyncStorage.setItem('mellow.v2.puzzles', JSON.stringify(next)).catch(() => {});
    finishAct(id, title, icon);
  };
  const markTutorialSeen = (id: string) => {
    if (tutorials[id]) return;
    const next = { ...tutorials, [id]: true };
    setTutorials(next); AsyncStorage.setItem('mellow.v2.tutorials', JSON.stringify(next)).catch(() => {});
  };
  const wave = (m: Member) => { setHop(m.id); setTimeout(() => setHop(null), 800); toast('You waved at ' + m.name + '.'); setTimeout(() => bubble(m.id, '*waves back*'), 900); };

  const saveDone = (d: Record<string, boolean>) => { setPlanDone(d); AsyncStorage.setItem('mellow.v2.planDone', JSON.stringify(d)).catch(() => {}); };
  const saveCheckin = (answers: number[]) => {
    const c: Checkin = { date: ymd(new Date()), answers, score: phqScore(answers) };
    if (uid) sync.savePhq9(uid, answers, c.score);
    const next = [...checkins.filter((x) => x.date !== c.date), c];
    setCheckins(next); AsyncStorage.setItem('mellow.v2.checkins', JSON.stringify(next)).catch(() => {});
    return c;
  };
  const adoptPlan = (answers: number[]) => {
    const p = buildPlan(answers);
    setPlanS(p); AsyncStorage.setItem('mellow.v2.plan', JSON.stringify(p)).catch(() => {});
    saveDone({});
    toast('Added to your plan. Small steps, two weeks.');
  };
  const doTask = (key: string, task: PlanTask) => { saveDone({ ...planDone, [key]: true }); gainEmbers(2, task.t, task.icon); toast('Nice. +2 embers for the fire.'); };
  const undoTask = (key: string) => { const d = { ...planDone }; delete d[key]; saveDone(d); };
  // A game page always goes back to Games, even when it was opened straight from a link.
  const backTo: Route = route === 'nono' || route === 'sight' || route === 'hotel' ? 'games' : lastTab;
  const back = () => go(backTo);
  const answerMood = (k: MoodKey) => {
    const today = ymd(new Date());
    setMood(k); AsyncStorage.setItem('mellow.v2.mood', JSON.stringify({ date: today, key: k })).catch(() => {});
    const next = streak.last === today ? streak : { count: streak.last === ymd(addDays(new Date(), -1)) ? streak.count + 1 : 1, last: today };
    if (uid) sync.submitCheckin(uid, today, k, next); // POST /rpc/submit_checkin (also when changing today's answer)
    if (next === streak) return streak.count;
    setStreak(next); AsyncStorage.setItem('mellow.v2.streak', JSON.stringify(next)).catch(() => {});
    return next.count;
  };
  // Streak still counts today if you answered yesterday; it only shows as broken after a missed day.
  const streakAlive = streak.last === ymd(new Date()) || streak.last === ymd(addDays(new Date(), -1));
  const streakCount = streakAlive ? streak.count : 0;
  const showDaily = moodLoaded && obLoaded && !onboarding && !mood && !dailyDismissed;
  const startOnboarding = () => { setModal(null); setObReplay(true); setOnboarding(true); };
  // Answers stay on this device for now. A real sign-up also gets the 2-week plan built from them.
  // Sit at a friend's fire with their invite code. The chat, seats and code follow the new campfire id.
  // Switch the fire on screen; the seats, chat and code follow campfireId.
  const selectFire = (id: string) => { setCampfireId(id); AsyncStorage.setItem('mellow.v2.fire', id).catch(() => {}); };
  // Take a seat at a friend's fire with their code, and go there (the other fires stay).
  const joinCampfire = async (code: string): Promise<sync.Joined> => {
    if (!uid) return { status: 'error' };
    const r = await sync.joinByCode(code);
    if (r.status === 'joined' || r.status === 'already') { await loadFires(); selectFire(r.id); }
    return r;
  };
  // Start a new fire and go there; its invite code is ready to share.
  const createFire = async (name: string): Promise<sync.Created> => {
    if (!uid) return { status: 'error' };
    const r = await sync.createCampfire(name);
    if (r.status === 'created') { await loadFires(); selectFire(r.id); }
    return r;
  };
  // Leave a fire (never the last one) and move to another.
  const leaveFire = async (id: string): Promise<'left' | 'last' | 'not_member' | 'error'> => {
    if (!uid) return 'error';
    const r = await sync.leaveCampfire(id);
    if (r === 'left') { const list = await loadFires(); if (id === campfireId && list.length) selectFire(list[0].id); }
    return r;
  };
  const finishOnboarding = (o: { answers: any; plan?: Plan }) => {
    AsyncStorage.removeItem('mellow.onboard.pending').catch(() => {});
    if (o.answers) AsyncStorage.setItem('mellow.onboarding', JSON.stringify({ ...o.answers, at: new Date().toISOString() })).catch(() => {});
    if (o.plan && !obReplay) { setPlanS(o.plan); AsyncStorage.setItem('mellow.v2.plan', JSON.stringify(o.plan)).catch(() => {}); saveDone({}); }
    setObReplay(false); setOnboarding(false); go('home');
  };
  // Testing only: put the demo back to its starting point (keeps your marshmallow).
  const [resetN, setResetN] = useState(0);
  const [skyOverride, setSkyOverride] = useState<'day' | 'night' | null>(null); // null = follow the clock
  const resetDemo = (sky: 'day' | 'night' | null = null) => {
    setSkyOverride(sky);
    AsyncStorage.multiRemove(['mellow.v2.streak', 'mellow.v2.mood', 'mellow.v2.checkins', 'mellow.v2.plan', 'mellow.v2.planDone']).catch(() => {});
    setStreak({ count: 6, last: ymd(addDays(new Date(), -1)) }); setMood(null); setDailyDismissed(false);
    setCheckins(SEED_C); setPlanS(SEED_P); setPlanDone(seedDone(SEED_P));
    setEmbers(86); setCoop(8); setQS({}); setActDone({}); setActLog([]); setQuests(QUEST_POOL.slice(0, 3));
    setChat(CHAT0); setModal(null); setResetN((n) => n + 1);
    go('home');
  };
  const planDay = Math.max(0, dayIndex(plan));
  // The PHQ-9 asks about the last 2 weeks, so it only opens on the last day of the 2-week plan (never earlier).
  const checkinDue = planDay >= PLAN_DAYS - 1;
  const nextCheckin = addDays(fromYmd(plan.start), PLAN_DAYS - 1);
  const checkinIn = Math.max(0, PLAN_DAYS - 1 - planDay);

  return { uid, email: session?.user.email || null, signOut, campfireId, campfireName, campfireCode, fireCount: uid ? mates.length + 1 : 4, fires, selectFire, joinCampfire, createFire, leaveFire, resetN, resetDemo, skyOverride, streak, streakCount, answerMood, showDaily, moodLoaded: moodLoaded && obLoaded, onboarding, startOnboarding, finishOnboarding, dismissDaily: () => setDailyDismissed(true), lastTab, back, backTo, checkins, saveCheckin, plan, adoptPlan, planDone, doTask, undoTask, planDay, checkinDue, nextCheckin, checkinIn, route, go, avatar, setAvatar, mood, setMood, embers, coop, quests, questState, doQuest, swapQuest, actDone, finishAct, puzzleSolvedToday, puzzleCount, solvePuzzle, tutorials, tutorialsLoaded, markTutorialSeen, actLog, chat, chatPeople, votes, castVote, consent, answerConsent, sendChat, sending, strikes, chatBanned: strikes >= sync.MAX_STRIKES, chatWarning, bubbles, members, modal, setModal, toastMsg, toast, hopId, wave, talkReminder, setTalkReminder, chatDraft, setChatDraft, chatOpenN, openChat, messageAt: (name: string) => openChat('@' + name + ' '), demoDay, setDemoDay };
}

export type AppState = ReturnType<typeof useAppState>;
const Ctx = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const s = useAppState();
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
export function useApp() { const s = useContext(Ctx); if (!s) throw new Error('useApp outside provider'); return s; }
