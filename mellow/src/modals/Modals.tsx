import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../state';
import { Member, OTHER_CAMPS, SYNC_OPTS, SYNC_PICKS } from '../data';
import { C, F, themed } from '../theme';
import { Icon, Mallow } from '../components/Pixel';
import { Btn, Eyebrow, H2, IconBtn, Reply, T, Tab } from '../components/ui';
import { BreatheScreen } from '../components/BreatheScreen';
import { useLayout } from '../layout';
import { CheckinFlow, PlanCalendar, Report } from './Checkin';
import { fromYmd, niceDate } from '../checkin';

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
    case 'sync': return <Sheet title="MindSync" eyebrow="With Pinehollow" onClose={close}><SyncGame members={S.members} onShare={(t) => { S.sendChat(t); S.finishAct('sync', 'MindSync', 'sync'); close(); S.go('campfire'); }} /></Sheet>;
    case 'breathe': return <BreatheScreen onClose={(breaths) => { if (breaths > 0) { if (m.quest) S.doQuest(m.quest); else S.finishAct('breathe', 'Breathe with the Flame', 'flame'); } close(); }} />;
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
    // A chat message sounded like a crisis: it was held, and this opens instead.
    case 'crisis': return (
      <Sheet title="It sounds like things are really hard right now" eyebrow="Support" onClose={close}>
        <View style={{ gap: 10 }}>
          <T style={{ color: C.creamDim }}>I’m Mellow’s AI, so I can’t help the way a person can, and I won’t try to. But you deserve to talk to someone now. Your message stayed private: it wasn’t posted at the campfire.</T>
          <View style={st.sup}><Text style={st.supT}>If you’re in danger right now</Text><T style={{ color: C.creamDim, fontSize: 14 }}>Call 112, the emergency number in Finland and across the EU.</T></View>
          <View style={st.sup}><Text style={st.supT}>Talk to someone tonight</Text><T style={{ color: C.creamDim, fontSize: 14 }}>MIELI Crisis Helpline, open 24/7: 09 2525 0111.</T></View>
          <View style={st.sup}>
            <Text style={st.supT}>Your care team</Text>
            {m.alerted
              ? <T style={{ color: C.creamDim, fontSize: 14 }}>As you agreed, we’ve let your care team know, so someone can reach out. They don’t see what you wrote.</T>
              : <><T style={{ color: C.creamDim, fontSize: 14 }}>Your care team hasn’t been told. You can still ask them for a call.</T><Btn label="Request a call" kind="ghost" sm onPress={() => { S.toast('Prototype: your clinic would get a call request.'); close(); }} /></>}
          </View>
          <View style={st.sup}><Text style={st.supT}>Something calming, right now</Text><Btn label="Breathe with the flame" kind="plum" sm onPress={() => S.setModal({ type: 'breathe' })} /></View>
        </View>
      </Sheet>
    );
    case 'support': return (
      <Sheet title="You don’t have to carry it alone" eyebrow="Support" onClose={close}>
        <View style={{ gap: 10 }}>
          <View style={st.sup}><Text style={st.supT}>If you’re in danger right now</Text><T style={{ color: C.creamDim, fontSize: 14 }}>Call your local emergency number. In Finland and across the EU that’s 112.</T></View>
          <View style={st.sup}><Text style={st.supT}>Reach your trusted person</Text><T style={{ color: C.creamDim, fontSize: 14 }}>You chose Maria (sister) as your trusted person. Mellow can send her a short note asking her to check in on you.</T><Btn label="Ask Maria to check in" sm onPress={() => { S.toast('Prototype: Maria would get a gentle check-in note.'); close(); }} /></View>
          <View style={st.sup}><Text style={st.supT}>Your care team</Text><T style={{ color: C.creamDim, fontSize: 14 }}>Your clinic can see the check-ins you chose to share. You can ask them for a call.</T><Btn label="Request a call" kind="ghost" sm onPress={() => { S.toast('Prototype: your clinic would get a call request.'); close(); }} /></View>
          <View style={st.sup}><Text style={st.supT}>Something calming, right now</Text><Btn label="Breathe with the flame" kind="plum" sm onPress={() => S.setModal({ type: 'breathe' })} /></View>
          {S.uid ? (
            <View style={st.sup}>
              <Text style={st.supT}>Crisis alerts</Text>
              <T style={{ color: C.creamDim, fontSize: 14 }}>{S.consent ? 'On: if a chat message sounds like a crisis, your care team is told that it happened (never what you wrote).' : 'Off: your care team isn’t told when a chat message sounds like a crisis.'}</T>
              <Btn label={S.consent ? 'Turn off' : 'Turn on'} kind="ghost" sm onPress={() => S.answerConsent(!S.consent)} />
            </View>
          ) : null}
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
  aiNote: { fontFamily: F.body, fontSize: 12.5, color: C.muted },
}));
