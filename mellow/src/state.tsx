import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar } from './pixel/sprites';
import { ACTS, CHAT0, COOP_GOAL, ME_DEFAULT, Member, MEMBERS, MoodKey, Msg, QUEST_POOL, Quest, REPLIES } from './data';

export type Route = 'home' | 'campfire' | 'activities' | 'journey' | 'wardrobe';
export type ModalState = null | { type: string; [k: string]: any };
const ROUTES: Route[] = ['home', 'campfire', 'activities', 'journey', 'wardrobe'];

function nowTime() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function readHash(): Route { if (Platform.OS !== 'web') return 'home'; const h = (window.location.hash || '').replace('#', '') as Route; return ROUTES.includes(h) ? h : 'home'; }

function useAppState() {
  const [route, setRoute] = useState<Route>(readHash);
  const [avatar, setAvatarS] = useState<Avatar>(ME_DEFAULT);
  const [mood, setMood] = useState<MoodKey | null>(null);
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
  const toastT = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('mellow.avatar').then((v) => { if (v) { try { setAvatarS({ ...ME_DEFAULT, ...JSON.parse(v) }); } catch {} } }).catch(() => {});
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const h = () => setRoute(readHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  const go = (r: Route) => {
    setRoute(r);
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

  return { route, go, avatar, setAvatar, mood, setMood, embers, coop, quests, questState, doQuest, swapQuest, actDone, doActivity, finishAct, actLog, chat, sendChat, bubbles, members, modal, setModal, toastMsg, toast, hopId, wave, talkReminder, setTalkReminder, chatDraft, setChatDraft };
}

export type AppState = ReturnType<typeof useAppState>;
const Ctx = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const s = useAppState();
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
export function useApp() { const s = useContext(Ctx); if (!s) throw new Error('useApp outside provider'); return s; }
