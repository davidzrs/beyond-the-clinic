import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar } from './pixel/sprites';
import { ACTS, CHAT0, COOP_GOAL, ME_DEFAULT, Member, MEMBERS, MoodKey, Msg, QUEST_POOL, Quest, REPLIES } from './data';
import { addDays, buildPlan, Checkin, dayIndex, fromYmd, Plan, PlanTask, PLAN_DAYS, phqScore, ymd } from './checkin';
import { SAM } from './demo';

export type Route = 'home' | 'campfire' | 'activities' | 'journey' | 'games' | 'wardrobe' | 'clinic' | 'insights';
export type ModalState = null | { type: string; [k: string]: any };
const ROUTES: Route[] = ['home', 'campfire', 'activities', 'journey', 'games', 'wardrobe', 'clinic', 'insights'];
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
  const [modal, setModal] = useState<ModalState>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [hopId, setHop] = useState<string | null>(null);
  const [talkReminder, setTalkReminder] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [demoDay, setDemoDay] = useState(90); // which of Sam's 90 synthetic days My Journey shows
  const [lastTab, setLastTab] = useState<Route>('home');
  const [checkins, setCheckins] = useState<Checkin[]>(SEED_C);
  const [plan, setPlanS] = useState<Plan>(SEED_P);
  const [planDone, setPlanDone] = useState<Record<string, boolean>>(() => seedDone(SEED_P));
  const toastT = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('mellow.avatar').then((v) => { if (v) { try { setAvatarS({ ...ME_DEFAULT, ...JSON.parse(v) }); } catch {} } }).catch(() => {});
    AsyncStorage.multiGet(['mellow.v2.streak', 'mellow.v2.mood']).then((r) => {
      try {
        const [s, m] = r.map((x) => x[1]);
        if (s) setStreak(JSON.parse(s));
        if (m) { const v = JSON.parse(m); if (v.date === ymd(new Date())) setMood(v.key); }
      } catch {}
    }).catch(() => {}).finally(() => setMoodLoaded(true));
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
    if (Platform.OS === 'web' && window.location.hash !== '#' + r) window.location.hash = r;
  };
  const setAvatar = (a: Avatar) => { setAvatarS(a); AsyncStorage.setItem('mellow.avatar', JSON.stringify(a)).catch(() => {}); };
  const toast = (m: string) => { setToastMsg(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(null), 2800); };
  const members: Member[] = MEMBERS.map((m) => (m.id === 'me' ? { id: 'me', name: avatar.name || 'You', a: avatar } : m));
  const bubble = (id: string, text: string) => {
    const t = text.length > 70 ? text.slice(0, 68) + '…' : text;
    setBubbles((b) => ({ ...b, [id]: t }));
    setTimeout(() => setBubbles((b) => { const n = { ...b }; if (n[id] === t) delete n[id]; return n; }), 5000);
  };
  const gainEmbers = (n: number, label?: string, icon?: string) => {
    setEmbers((e) => e + n); setCoop((c) => Math.min(COOP_GOAL, c + 1));
    if (label) setActLog((l) => [{ icon: icon || 'star', t: label, d: 'Today' }, ...l]);
  };
  const sendChat = (text: string, from = 'me') => {
    setChat((c) => [...c, { id: Date.now() + Math.random(), from, text, time: nowTime() }]);
    bubble(from, text);
    if (from === 'me') {
      const who = ['juno', 'teo', 'ama'][Math.floor(Math.random() * 3)];
      setTimeout(() => { const r = REPLIES[Math.floor(Math.random() * REPLIES.length)]; setChat((c) => [...c, { id: Date.now() + Math.random(), from: who, text: r, time: nowTime() }]); bubble(who, r); }, 1800 + Math.random() * 1200);
    }
  };
  const doQuest = (id: string) => {
    const q = QUEST_POOL.find((x) => x.id === id);
    setQS((s) => ({ ...s, [id]: true })); setActDone((s) => ({ ...s, [id]: true }));
    gainEmbers(q ? q.ember : 2, q ? q.title : 'Quest', q ? q.icon : 'star');
    toast('+' + (q ? q.ember : 2) + ' embers. Pinehollow’s fire grows a little.');
    if (q && !quests.find((x) => x.id === id)) setQuests((qs) => [q, ...qs.slice(0, 2)]);
  };
  const swapQuest = (id: string) => setQuests((qs) => { const used = new Set(qs.map((q) => q.id)); const next = QUEST_POOL.find((q) => !used.has(q.id) && !questState[q.id]); if (!next) return qs; return qs.map((q) => (q.id === id ? next : q)); });
  const doActivity = (id: string, title: string) => {
    setActDone((s) => ({ ...s, [id]: true }));
    if (QUEST_POOL.find((x) => x.id === id)) setQS((s) => ({ ...s, [id]: true }));
    const a = ACTS.find((x) => x.id === id); gainEmbers(2, title, a ? a.icon : 'star'); toast('Nice. +2 embers for the fire.');
  };
  const finishAct = (id: string, title: string, icon: string) => { if (!actDone[id]) { setActDone((s) => ({ ...s, [id]: true })); gainEmbers(2, title, icon); } };
  const wave = (m: Member) => { setHop(m.id); setTimeout(() => setHop(null), 800); toast('You waved at ' + m.name + '.'); setTimeout(() => bubble(m.id, '*waves back*'), 900); };

  const saveDone = (d: Record<string, boolean>) => { setPlanDone(d); AsyncStorage.setItem('mellow.v2.planDone', JSON.stringify(d)).catch(() => {}); };
  const saveCheckin = (answers: number[]) => {
    const c: Checkin = { date: ymd(new Date()), answers, score: phqScore(answers) };
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
  const back = () => go(lastTab);
  const answerMood = (k: MoodKey) => {
    const today = ymd(new Date());
    setMood(k); AsyncStorage.setItem('mellow.v2.mood', JSON.stringify({ date: today, key: k })).catch(() => {});
    if (streak.last === today) return streak.count;
    const next = { count: streak.last === ymd(addDays(new Date(), -1)) ? streak.count + 1 : 1, last: today };
    setStreak(next); AsyncStorage.setItem('mellow.v2.streak', JSON.stringify(next)).catch(() => {});
    return next.count;
  };
  // Streak still counts today if you answered yesterday; it only shows as broken after a missed day.
  const streakAlive = streak.last === ymd(new Date()) || streak.last === ymd(addDays(new Date(), -1));
  const streakCount = streakAlive ? streak.count : 0;
  const showDaily = moodLoaded && !mood && !dailyDismissed;
  const planDay = Math.max(0, dayIndex(plan));
  const checkinDue = planDay >= PLAN_DAYS - 1;

  return { streak, streakCount, answerMood, showDaily, dismissDaily: () => setDailyDismissed(true), lastTab, back, checkins, saveCheckin, plan, adoptPlan, planDone, doTask, undoTask, planDay, checkinDue, route, go, avatar, setAvatar, mood, setMood, embers, coop, quests, questState, doQuest, swapQuest, actDone, doActivity, finishAct, actLog, chat, sendChat, bubbles, members, modal, setModal, toastMsg, toast, hopId, wave, talkReminder, setTalkReminder, chatDraft, setChatDraft, demoDay, setDemoDay };
}

export type AppState = ReturnType<typeof useAppState>;
const Ctx = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const s = useAppState();
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
export function useApp() { const s = useContext(Ctx); if (!s) throw new Error('useApp outside provider'); return s; }
