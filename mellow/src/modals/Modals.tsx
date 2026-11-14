import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../state';
import { Member, OTHER_CAMPS, SYNC_OPTS, SYNC_PICKS, WORDS } from '../data';
import { C, F, themed } from '../theme';
import { Icon, Mallow } from '../components/Pixel';
import { Btn, Eyebrow, H2, IconBtn, Reply, T, Tab } from '../components/ui';
import { startSoundscape, Scape } from '../audio/soundscape';
import { useLayout } from '../layout';
import { CheckinFlow, PlanCalendar, Report } from './Checkin';
import { fromYmd, niceDate } from '../checkin';
import { HiddenPicture, HotelMystery, LineOfSight } from '../games/PuzzleGames';

function Sheet({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: React.ReactNode }) {
  const { width, height } = useLayout();
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={[st.sheet, { width: Math.min(560, width - 32), maxHeight: height - 48 }]}>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <View style={st.head}>
              <View style={{ gap: 4, flex: 1 }}>{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}<H2>{title}</H2></View>
              <IconBtn icon="close" label="Close" onPress={onClose} />
            </View>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function scoreWord(g: string, t: string) {
  const res = Array(5).fill('miss'); const tc: Record<string, number> = {};
  for (let i = 0; i < 5; i++) { if (g[i] === t[i]) res[i] = 'hit'; else tc[t[i]] = (tc[t[i]] || 0) + 1; }
  for (let i = 0; i < 5; i++) { if (res[i] !== 'hit' && tc[g[i]]) { res[i] = 'near'; tc[g[i]]--; } }
  return res as ('hit' | 'near' | 'miss')[];
}
const TILE_BG = themed(() => ({ hit: C.forest, near: '#D99A00', miss: '#9AA4BC' }));

function WordsGame({ onDone }: { onDone: (won: boolean) => void }) {
  const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5);
  const target = WORDS[day % WORDS.length];
  const [rows, setRows] = useState<string[]>([]);
  const [cur, setCur] = useState('');
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState('');
  const press = useCallback((k: string) => {
    if (over) return; setMsg('');
    if (k === 'ENTER') {
      if (cur.length < 5) { setMsg('Five letters, please.'); return; }
      const nr = [...rows, cur]; setRows(nr); setCur('');
      if (cur === target || nr.length >= 6) { setOver(true); onDone(cur === target); }
      return;
    }
    if (k === 'DEL') { setCur((c) => c.slice(0, -1)); return; }
    if (/^[A-Z]$/.test(k) && cur.length < 5) setCur((c) => c + k);
  }, [cur, rows, over, target, onDone]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter') press('ENTER'); else if (e.key === 'Backspace') press('DEL'); else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase()); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [press]);
  const ks: Record<string, string> = {};
  rows.forEach((r) => scoreWord(r, target).forEach((s, i) => { const l = r[i], p = ks[l]; if (s === 'hit' || (s === 'near' && p !== 'hit') || !p) ks[l] = s; }));
  const won = rows.length > 0 && rows[rows.length - 1] === target;
  return (
    <View>
      <T muted style={{ fontSize: 14 }}>Guess the five-letter word. Green is the right spot, orange is in the word. Any five letters are a valid guess.</T>
      <View style={{ alignItems: 'center', gap: 6, marginVertical: 14 }}>
        {Array.from({ length: 6 }, (_, i) => {
          const g = rows[i]; const live = i === rows.length && !over; const word = g || (live ? cur : ''); const sc = g ? scoreWord(g, target) : null;
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
              {[0, 1, 2, 3, 4].map((j) => (
                <View key={j} style={[st.wt, sc ? { backgroundColor: TILE_BG[sc[j]], borderColor: TILE_BG[sc[j]] } : word[j] ? { borderColor: C.lineHi } : null]}>
                  <Text style={[st.wtT, sc && { color: C.white }]}>{word[j] || ''}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
      {over ? (
        <Reply><T><Text style={{ fontFamily: F.bodyBold }}>{won ? 'You found it: ' + target + '.' : 'Today’s word was ' + target + '.'}</Text> {won ? 'Nice work. Your campfire can see you played, not your score.' : 'Every guess warms you up for tomorrow. A new word arrives at midnight.'}</T></Reply>
      ) : msg ? <T muted style={{ textAlign: 'center', marginBottom: 8 }}>{msg}</T> : null}
      <View style={{ gap: 6, marginTop: 12 }}>
        {['QWERTYUIOP', 'ASDFGHJKL', '+ZXCVBNM-'].map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 5, justifyContent: 'center' }}>
            {row.split('').map((ch) => {
              const k = ch === '+' ? 'ENTER' : ch === '-' ? 'DEL' : ch; const s = ks[k];
              return (
                <Pressable key={k} onPress={() => press(k)} style={[st.key, k.length > 1 && { flex: 1.6 }, s === 'hit' && { backgroundColor: C.forest }, s === 'near' && { backgroundColor: '#D99A00' }, s === 'miss' && { backgroundColor: '#CBD2E0' }]}>
                  <Text style={[st.keyT, k.length > 1 && { fontSize: 12 }, (s === 'hit' || s === 'near') && { color: C.white }, s === 'miss' && { color: C.muted }]}>{k === 'DEL' ? 'Del' : k === 'ENTER' ? 'Enter' : k}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function LightGame({ onDone }: { onDone: () => void }) {
  const mk = (n: number) => { const t = Math.floor(Math.random() * n * n); return { n, t, cells: Array.from({ length: n * n }, (_, i) => (i === t ? 'sun' : Math.random() > 0.45 ? 'rain' : 'cloud')) }; };
  const [round, setRound] = useState(0);
  const [g, setG] = useState(() => mk(4));
  const [t0, setT0] = useState(() => Date.now());
  const [times, setTimes] = useState<number[]>([]);
  const [found, setFound] = useState(-1);
  const [wrong, setWrong] = useState(-1);
  const { width } = useLayout();
  const gridW = Math.min(340, width - 72);
  const cell = (gridW - (g.n - 1) * 8) / g.n;
  const click = (i: number) => {
    if (times.length >= 3 || found >= 0) return;
    if (i === g.t) {
      const nt = [...times, (Date.now() - t0) / 1000]; setTimes(nt); setFound(i);
      setTimeout(() => { setFound(-1); if (nt.length < 3) { setRound((r) => r + 1); setG(mk(5)); setT0(Date.now()); } else onDone(); }, 500);
    } else { setWrong(i); setTimeout(() => setWrong(-1), 350); }
  };
  if (times.length >= 3) {
    const avg = (times.reduce((a, b) => a + b, 0) / 3).toFixed(1);
    return <Reply><T><Text style={{ fontFamily: F.bodyBold }}>You found the light three times.</Text> Average {avg}s. There’s no target time. Over weeks, Mellow uses how this feels for you to notice what helps.</T></Reply>;
  }
  return (
    <View>
      <T muted style={{ fontSize: 14 }}>Round {round + 1} of 3. Tap the little sun hiding among the clouds.</T>
      <View style={{ width: gridW, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {g.cells.map((c, i) => (
          <Pressable key={round + '-' + i} onPress={() => click(i)} style={[st.lcell, { width: cell, height: cell }, found === i && { backgroundColor: C.amberSoft }, wrong === i && { backgroundColor: C.roseSoft }]}>
            <Icon name={c} size={cell * 0.7} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SyncGame({ members, onShare }: { members: Member[]; onShare: (t: string) => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const others = members.filter((m) => m.id !== 'me');
  const me = members.find((m) => m.id === 'me')!;
  const matches = pick ? others.filter((m) => SYNC_PICKS[m.id] === pick) : [];
  return (
    <View>
      <Eyebrow>Tonight’s prompt</Eyebrow>
      <Text style={st.prompt}>Something that feels like a Sunday morning</Text>
      <View style={{ gap: 8, marginVertical: 12 }}>
        {SYNC_OPTS.map((o) => (
          <Pressable key={o} onPress={() => setPick(o)} style={[st.syncopt, pick === o && { borderColor: C.ember }]}>
            <Text style={st.syncT}>{o}</Text>
            {pick ? (
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {others.filter((m) => SYNC_PICKS[m.id] === o).map((m) => <Mallow key={m.id} a={m.a} size={28} anim={false} />)}
                {pick === o ? <Mallow a={me.a} size={28} anim={false} /> : null}
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
      {pick ? (
        <Reply>
          <T><Text style={{ fontFamily: F.bodyBold }}>{matches.length ? 'In sync with ' + matches.map((m) => m.name).join(' and ') + '!' : 'A pick all your own.'}</Text> {matches.length ? 'Great minds. Tell them why in the chat?' : 'Different picks make the best conversations.'}</T>
          <Btn label="Share in the chat" sm onPress={() => onShare('MindSync: I picked “' + pick + '” for a Sunday morning.')} />
        </Reply>
      ) : null}
    </View>
  );
}

function Breathe({ onDone }: { onDone: () => void }) {
  const PH: [string, number, number][] = [['Breathe in', 4000, 1.4], ['Hold', 3000, 1.4], ['Breathe out', 6000, 0.8]];
  const [step, setStep] = useState(-1);
  const [cycle, setCycle] = useState(0);
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (step < 0 || step > 2) { Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' }).start(); return; }
    const [, ms, sc] = PH[step];
    Animated.timing(scale, { toValue: sc, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }).start();
    const id = setTimeout(() => { if (step < 2) setStep(step + 1); else if (cycle + 1 < 3) { setCycle(cycle + 1); setStep(0); } else setStep(3); }, ms);
    return () => clearTimeout(id);
  }, [step, cycle]);
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={st.breath}>
        <View style={st.ring} />
        <Animated.View style={{ transform: [{ scale }] }}><Icon name="flame" size={110} /></Animated.View>
      </View>
      <Text style={st.phase}>{step < 0 ? 'Ready when you are' : step === 3 ? 'Nicely done' : PH[step][0]}</Text>
      <T muted style={{ marginTop: 4 }}>{step < 0 ? 'Three slow breaths, about 40 seconds.' : step === 3 ? 'Take that calm with you.' : 'Breath ' + (cycle + 1) + ' of 3'}</T>
      <View style={{ marginTop: 16 }}>
        {step < 0 ? <Btn label="Begin" onPress={() => setStep(0)} /> : step === 3 ? <Btn label="Finish" kind="green" onPress={onDone} /> : null}
      </View>
    </View>
  );
}

function Soundscape({ kind }: { kind: 'forest' | 'sea' }) {
  const [on, setOn] = useState(false);
  const [vol, setVol] = useState(0.6);
  const ref = useRef<Scape | null>(null);
  useEffect(() => () => { ref.current?.stop(); }, []);
  const toggle = async () => {
    if (on) { ref.current?.stop(); ref.current = null; setOn(false); return; }
    try { ref.current = await startSoundscape(kind, vol); setOn(true); } catch { setOn(false); }
  };
  const setV = (v: number) => { const c = Math.max(0, Math.min(1, v)); setVol(c); ref.current?.setVolume(c); };
  const forest = kind === 'forest';
  return (
    <View>
      <View style={[st.art, { backgroundColor: forest ? '#232a55' : '#2d2f62' }]}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', backgroundColor: forest ? '#1d3028' : '#244a6e' }} />
        <View style={{ position: 'absolute', right: '14%', top: '16%', width: 18, height: 18, borderRadius: 4, backgroundColor: '#f4ecd0' }} />
        {forest ? [10, 24, 40, 58, 72, 88].map((x, i) => (
          <View key={i} style={{ position: 'absolute', left: (x + '%') as any, bottom: '30%', width: 0, height: 0, borderLeftWidth: 18, borderRightWidth: 18, borderBottomWidth: 50 + (i % 3) * 14, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: i % 2 ? '#1b2a2a' : '#16223a', marginLeft: -18 }} />
        )) : [0, 1, 2].map((i) => <View key={i} style={{ position: 'absolute', left: 0, right: 0, bottom: (18 + i * 14 + '%') as any, height: 6, backgroundColor: i === 1 ? '#3d6a90' : '#5a8ab0', opacity: 0.7 }} />)}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        <Btn label={on ? 'Pause' : 'Play'} kind={on ? 'ghost' : 'ember'} onPress={toggle} />
        <Text style={st.volL}>Volume</Text>
        <Btn label="−" kind="ghost" sm onPress={() => setV(vol - 0.1)} />
        <View style={st.volBar}><View style={{ width: (vol * 100 + '%') as any, height: '100%', backgroundColor: C.ember, borderRadius: 4 }} /></View>
        <Btn label="+" kind="ghost" sm onPress={() => setV(vol + 0.1)} />
      </View>
      <T muted style={{ fontSize: 13, marginTop: 12 }}>Generated on your device. Sound starts only when you press Play.</T>
    </View>
  );
}

function InviteBody() {
  const S = useApp();
  const [tab, setTab] = useState<'invite' | 'meet'>('invite');
  const code = 'PINE-7K2Q';
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
        <Tab label="Invite a friend" on={tab === 'invite'} onPress={() => setTab('invite')} />
        <Tab label="Meet other fires" on={tab === 'meet'} onPress={() => setTab('meet')} />
      </View>
      {tab === 'invite' ? (
        <View style={{ gap: 12 }}>
          <T style={{ color: C.creamDim }}>Bring someone you trust. They get their own marshmallow and a seat at a fire, and you can always wave to each other.</T>
          <View style={st.code}><Text selectable style={st.codeT}>{code}</Text></View>
          <Btn label="Copy invite code" onPress={() => { Clipboard.setStringAsync(code).then(() => S.toast('Invite code copied.'), () => S.toast('Select the code to copy it.')); }} />
          <T muted style={{ fontSize: 13 }}>Friends can join as supporters too. Nobody sees your check-ins unless you share them.</T>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {OTHER_CAMPS.map((c) => (
            <View key={c.n} style={st.camp}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.campN}>{c.n}</Text>
                <T muted style={{ fontSize: 13 }}>{c.d}</T>
                <View style={{ flexDirection: 'row', marginTop: 6 }}>{c.a.map((a, i) => <View key={i} style={{ marginRight: -6 }}><Mallow a={a} size={34} anim={false} /></View>)}</View>
              </View>
              <Btn label="Say hi" kind="ghost" sm onPress={() => S.toast('You said hi to ' + c.n + '.')} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function ModalHost() {
  const S = useApp();
  const m = S.modal;
  if (!m) return null;
  const close = () => S.setModal(null);
  switch (m.type) {
    case 'words': return <Sheet title="Ember Words" eyebrow="Daily game" onClose={close}><WordsGame onDone={() => S.finishAct('words', 'Ember Words', 'words')} /></Sheet>;
    case 'light': return <Sheet title="Find the Light" eyebrow="Daily game" onClose={close}><LightGame onDone={() => S.finishAct('light', 'Find the Light', 'sun')} /></Sheet>;
    case 'nono': return <Sheet title="Hidden Picture" eyebrow="Daily puzzle" onClose={close}><HiddenPicture onDone={() => S.finishAct('nono', 'Hidden Picture', 'picture')} /></Sheet>;
    case 'sight': return <Sheet title="Line of Sight" eyebrow="Daily puzzle" onClose={close}><LineOfSight onDone={() => S.finishAct('sight', 'Line of Sight', 'eye')} /></Sheet>;
    case 'hotel': return <Sheet title="Hotel Mystery" eyebrow="Daily puzzle" onClose={close}><HotelMystery onDone={() => S.finishAct('hotel', 'Hotel Mystery', 'key')} /></Sheet>;
    case 'sync': return <Sheet title="MindSync" eyebrow="With Pinehollow" onClose={close}><SyncGame members={S.members} onShare={(t) => { S.sendChat(t); S.finishAct('sync', 'MindSync', 'sync'); close(); S.go('campfire'); }} /></Sheet>;
    case 'breathe': return <Sheet title="Breathe with the Flame" eyebrow="Relax" onClose={close}><Breathe onDone={() => { if (m.quest) S.doQuest(m.quest); else S.finishAct('breathe', 'Breathe with the Flame', 'flame'); close(); }} /></Sheet>;
    case 'sound': return <Sheet title={m.kind === 'sea' ? 'Sea Breeze' : 'Forest at Dusk'} eyebrow="Soundscape" onClose={close}><Soundscape kind={m.kind} /></Sheet>;
    case 'phq': return <Sheet title="Your 2-week check-in" eyebrow="PHQ-9" onClose={close}><CheckinFlow /></Sheet>;
    case 'report': return <Sheet title="Your check-in" eyebrow={'PHQ-9 · ' + niceDate(fromYmd(m.c.date))} onClose={close}><Report c={m.c} /></Sheet>;
    case 'plan': return <Sheet title="Your next 2 weeks" eyebrow="Your plan" onClose={close}><PlanCalendar /></Sheet>;
    case 'invite': return <Sheet title="Invite or meet others" eyebrow="Pinehollow" onClose={close}><InviteBody /></Sheet>;
    case 'member': {
      const mem: Member = m.m;
      return (
        <Sheet title={mem.name} eyebrow={'At Pinehollow since ' + mem.since} onClose={close}>
          <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
            <View style={{ backgroundColor: C.night3, borderRadius: 14, padding: 8 }}><Mallow a={mem.a} size={104} /></View>
            <View style={{ flex: 1, gap: 6 }}><Eyebrow>Likes</Eyebrow><T>{mem.likes}</T><T muted style={{ fontSize: 13 }}>Played today’s Ember Words</T></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <Btn label="Wave" onPress={() => { S.wave(mem); close(); }} />
            <Btn label="Message at the fire" kind="ghost" onPress={() => { S.setChatDraft('@' + mem.name + ' '); close(); S.go('campfire'); }} />
          </View>
        </Sheet>
      );
    }
    case 'support': return (
      <Sheet title="You don’t have to carry it alone" eyebrow="Support" onClose={close}>
        <View style={{ gap: 10 }}>
          <View style={st.sup}><Text style={st.supT}>If you’re in danger right now</Text><T style={{ color: C.creamDim, fontSize: 14 }}>Call your local emergency number. In Finland and across the EU that’s 112.</T></View>
          <View style={st.sup}><Text style={st.supT}>Reach your trusted person</Text><T style={{ color: C.creamDim, fontSize: 14 }}>You chose Maria (sister) as your trusted person. Mellow can send her a short note asking her to check in on you.</T><Btn label="Ask Maria to check in" sm onPress={() => { S.toast('Prototype: Maria would get a gentle check-in note.'); close(); }} /></View>
          <View style={st.sup}><Text style={st.supT}>Your care team</Text><T style={{ color: C.creamDim, fontSize: 14 }}>Your clinic can see the check-ins you chose to share. You can ask them for a call.</T><Btn label="Request a call" kind="ghost" sm onPress={() => { S.toast('Prototype: your clinic would get a call request.'); close(); }} /></View>
          <View style={st.sup}><Text style={st.supT}>Something calming, right now</Text><Btn label="Breathe with the flame" kind="plum" sm onPress={() => S.setModal({ type: 'breathe' })} /></View>
        </View>
      </Sheet>
    );
    default: return null;
  }
}

const st = themed(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,42,.45)', alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: C.night2, borderRadius: 18, borderWidth: 1, borderColor: C.lineHi, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  wt: { width: 46, height: 46, borderRadius: 8, borderWidth: 2, borderColor: C.line, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' },
  wtT: { fontFamily: F.displayBold, fontSize: 22, color: C.cream },
  key: { flex: 1, maxWidth: 40, height: 44, borderRadius: 8, backgroundColor: C.night4, alignItems: 'center', justifyContent: 'center' },
  keyT: { fontFamily: F.display, fontSize: 15, color: C.cream },
  lcell: { borderRadius: 12, backgroundColor: C.night3, alignItems: 'center', justifyContent: 'center' },
  prompt: { fontFamily: F.display, fontSize: 21, color: C.cream, marginTop: 4 },
  syncopt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.night3, minHeight: 50 },
  syncT: { fontFamily: F.displayMed, fontSize: 15.5, color: C.cream },
  breath: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderStyle: 'dashed', borderColor: C.line },
  phase: { fontFamily: F.display, fontSize: 24, color: C.cream },
  art: { height: 140, borderRadius: 14, overflow: 'hidden' },
  volL: { fontFamily: F.label, fontSize: 12, color: C.muted },
  volBar: { flex: 1, minWidth: 60, height: 8, borderRadius: 4, backgroundColor: C.night4 },
  code: { backgroundColor: C.night, borderRadius: 12, padding: 14, alignItems: 'center' },
  codeT: { fontFamily: F.displayBold, fontSize: 26, letterSpacing: 3, color: C.cream },
  camp: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.night3, borderRadius: 14, padding: 12 },
  campN: { fontFamily: F.display, fontSize: 17, color: C.cream },
  sup: { backgroundColor: C.night3, borderRadius: 14, padding: 14, gap: 6 },
  supT: { fontFamily: F.display, fontSize: 17, color: C.cream },
}));
