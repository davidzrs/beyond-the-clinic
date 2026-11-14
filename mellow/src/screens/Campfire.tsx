import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state';
import { COOP_GOAL, ME_DEFAULT, MEMBERS } from '../data';
import type { Avatar } from '../pixel/sprites';
import { C, F, themed } from '../theme';
import { CampFull, Icon, Mallow } from '../components/Pixel';
import { Btn, IconBtn, T } from '../components/ui';
import { useLayout } from '../layout';
import { ThemeToggle } from '../components/ThemeToggle';

type SheetKind = null | 'chat' | 'talk' | 'spark';

// Slides up from the bottom over the fire; tap outside or the close button to go back to the scene.
function BottomSheet({ visible, title, onClose, tall, corner, children }: { visible: boolean; title: string; onClose: () => void; tall?: boolean; corner?: boolean; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { height, width } = useLayout();
  // On wide screens a `corner` sheet is a floating panel in the bottom-right, so the fire and every
  // marshmallow stay in view (and stay tappable). On phones it is a regular sheet from the bottom.
  if (corner && width >= 760) {
    if (!visible) return null;
    return (
      <KeyboardAvoidingView behavior="padding" pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'flex-end', padding: 20, paddingBottom: 20 + insets.bottom }]}>
        <View style={[st.sheet, st.panel, { width: Math.min(400, width * 0.42), height: Math.min(600, height - 150) }]}>
          <View style={st.sheetHead}>
            <Text style={st.sheetT}>{title}</Text>
            <IconBtn icon="close" label="Close" onPress={onClose} />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    );
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior="padding" style={st.sheetWrap} pointerEvents="box-none">
        <View style={[st.sheet, { width: Math.min(640, width), maxHeight: height * 0.85, paddingBottom: insets.bottom + 14 }, tall && { height: height * 0.75 }]}>
          <View style={st.grab} />
          <View style={st.sheetHead}>
            <Text style={st.sheetT}>{title}</Text>
            <IconBtn icon="close" label="Close" onPress={onClose} />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Chat() {
  const S = useApp();
  const listRef = useRef<any>(null);
  const inputRef = useRef<any>(null);
  const text = S.chatDraft;
  // Anyone who ever wrote here: current seats first, then the demo friends, then a plain fallback,
  // so a message from someone who isn't sitting at the fire right now can never crash the chat.
  const byId: Record<string, { name: string; a: Avatar }> = { ...Object.fromEntries(MEMBERS.map((m) => [m.id, m])), ...Object.fromEntries(S.members.map((m) => [m.id, m])), ...S.chatPeople };
  const who = (id: string) => byId[id] || { name: 'Friend', a: ME_DEFAULT };
  useEffect(() => { setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80); }, [S.chat.length]);
  // The draft is only cleared once the message is really posted (it may be blocked by moderation).
  const submit = async () => { const t = text.trim(); if (!t || S.sending) return; if (await S.sendChat(t)) S.setChatDraft(''); };
  return (
    <View style={{ flex: 1, gap: 10 }}>
      <Text style={st.note}>Only the 4 of you can see this.</Text>
      <ScrollView ref={listRef} style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
        {S.chat.map((c) => {
          const m = who(c.from); const me = c.from === 'me';
          return (
            <View key={c.id} style={[st.msg, me && { flexDirection: 'row-reverse' }]}>
              <Mallow a={m.a} size={32} anim={false} />
              <View style={[st.bub, me && st.bubMe]}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                  <Text style={[st.who, me && { color: C.emberInk }]}>{me ? 'You' : m.name}</Text>
                  <Text style={[st.time, me && { color: C.emberInk, opacity: 0.7 }]}>{c.time}</Text>
                </View>
                <Text style={[st.msgT, me && { color: C.emberInk }]}>{c.text}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0 }}>
        {['Share a small win', 'What are you listening to?', 'Something that made you smile'].map((p) => (
          <Pressable key={p} onPress={() => { S.setChatDraft(p + ': '); inputRef.current?.focus(); }} style={st.pchip}>
            <Text style={st.pchipT}>{p}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {S.chatBanned ? (
        <View style={st.warn} accessibilityRole="alert">
          <Text style={st.warnT}>You can still read the chat, but you can’t post anymore after {S.strikes} messages that broke the campfire rules. If you think this is a mistake, talk to your care team.</Text>
        </View>
      ) : (
        <>
          {S.chatWarning ? <View style={st.warn} accessibilityRole="alert"><Text style={st.warnT}>{S.chatWarning}</Text></View> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput ref={inputRef} value={text} onChangeText={S.setChatDraft} onSubmitEditing={submit} editable={!S.sending} placeholder="Say something to the fire…" placeholderTextColor={C.muted} style={st.input} returnKeyType="send" />
            <Btn label={S.sending ? 'Sending…' : 'Send'} onPress={submit} disabled={!text.trim() || S.sending} />
          </View>
        </>
      )}
    </View>
  );
}

// The fire fills the screen. Chat, Sunday Talk, games and invites are buttons on top of it.
export default function Campfire() {
  const S = useApp();
  const insets = useSafeAreaInsets();
  const { wide, width } = useLayout();
  const [sheet, setSheet] = useState<SheetKind>(S.chatDraft.startsWith('@') ? 'chat' : null);
  const close = () => setSheet(null);
  const [open, setOpen] = useState(false);
  // New messages since you last opened the chat (the latest one also shows as a bubble at the fire).
  const [seen, setSeen] = useState(S.chat.length - 2);
  const unread = Math.max(0, S.chat.length - seen);
  useEffect(() => { if (sheet === 'chat') setSeen(S.chat.length); }, [sheet, S.chat.length]);
  const coop = Math.min(S.coop, COOP_GOAL);
  const actions: [string, string, () => void][] = [
    ['chat', 'Chat', () => setSheet('chat')],
    ['calendar', 'Sunday Talk', () => setSheet('talk')],
    ['sync', 'Play together', () => S.setModal({ type: 'sync' })],
    ['people', 'Invite', () => S.setModal({ type: 'invite' })],
  ];

  return (
    <View style={{ flex: 1 }}>
      <CampFull rightInset={sheet === 'chat' && width >= 760 ? Math.min(400, width * 0.42) + 20 : 0} members={S.members} bubbles={S.bubbles} hopId={S.hopId} onPick={(m) => (m.id === 'me' ? S.go('wardrobe') : S.setModal({ type: 'member', m }))} />

      <View style={[st.top, { paddingTop: insets.top + (wide ? 18 : 10) }]} pointerEvents="box-none">
        <View style={st.sign}>
          <Text style={st.signT}>Pinehollow</Text>
          <Text style={st.signS}>4 at the fire</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <ThemeToggle bg={C.glass} color={C.emberHi} />
        <Pressable onPress={() => setSheet('spark')} style={st.spark} accessibilityLabel={'Tonight’s spark: ' + coop + ' of ' + COOP_GOAL + ' embers'}>
          <Icon name="ember" size={15} />
          <Text style={st.sparkT}>{coop}/{COOP_GOAL}</Text>
          <View style={st.sparkTrack}><View style={[st.sparkFill, { width: ((coop / COOP_GOAL) * 100 + '%') as any }]} /></View>
        </Pressable>
        </View>
      </View>

      {/* Actions: a vertical stack under the arrow, hidden until you open it so the fire stays clear. */}
      <View style={[st.menu, { top: insets.top + (wide ? 18 : 10) + 56 }]} pointerEvents="box-none">
        <Pressable onPress={() => setOpen(!open)} style={st.round} accessibilityRole="button" accessibilityLabel={open ? 'Hide actions' : 'Show actions'} accessibilityState={{ expanded: open }}>
          <Icon name={open ? 'up' : 'down'} size={24} color={C.ember} />
          {!open && unread > 0 ? <View style={st.badge}><Text style={st.badgeT}>{unread}</Text></View> : null}
        </Pressable>
        {open ? actions.map(([ic, label, onPress]) => (
          <Pressable key={label} onPress={onPress} style={st.action} accessibilityRole="button" accessibilityLabel={label}>
            <Text style={st.actionT} numberOfLines={1}>{label}</Text>
            <View style={st.round}>
              <Icon name={ic} size={22} color={C.ember} />
              {label === 'Chat' && unread > 0 ? <View style={st.badge}><Text style={st.badgeT}>{unread}</Text></View> : null}
            </View>
          </Pressable>
        )) : null}
      </View>

      <BottomSheet visible={sheet === 'chat'} title="Fireside chat" onClose={close} tall corner><Chat /></BottomSheet>
      <BottomSheet visible={sheet === 'talk'} title="Sunday Talk" onClose={close}>
        <View style={{ gap: 10 }}>
          <Text style={st.when}>Sunday · 19:00 · about 30 min</Text>
          <Text style={st.quote}>“A film that feels like a warm blanket.”</Text>
          <T style={{ color: C.creamDim }}>Come to talk or just to listen. Nobody has to speak.</T>
          <Btn label={S.talkReminder ? 'Reminder set' : 'Remind me'} kind={S.talkReminder ? 'green' : 'ember'} icon={S.talkReminder ? 'check' : 'clock'} onPress={() => S.setTalkReminder(!S.talkReminder)} />
        </View>
      </BottomSheet>
      <BottomSheet visible={sheet === 'spark'} title="Tonight’s spark" onClose={close}>
        <View style={{ gap: 10 }}>
          <Text style={st.quote}>Gather {COOP_GOAL} embers together</Text>
          <View style={st.track}><View style={[st.fill, { width: ((coop / COOP_GOAL) * 100 + '%') as any }]} /></View>
          <T style={{ color: C.creamDim }}>{S.coop >= COOP_GOAL ? 'The fire is roaring. Everyone pitched in tonight.' : coop + ' of ' + COOP_GOAL + '. Any puzzle or plan step you finish adds an ember for the whole fire.'}</T>
          <Btn label="Play today’s puzzles" onPress={() => { close(); S.go('games'); }} />
        </View>
      </BottomSheet>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 14 },
  sign: { backgroundColor: '#5e3b24', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 2, borderColor: '#3f2716' },
  signT: { fontFamily: F.display, color: '#f6dcb0', fontSize: 18 },
  signS: { fontFamily: F.displayMed, color: '#e0b98a', fontSize: 11.5 },
  spark: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.glass, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  sparkT: { fontFamily: F.display, fontSize: 13.5, color: C.ember },
  sparkTrack: { width: 44, height: 6, borderRadius: 3, backgroundColor: C.night4, overflow: 'hidden' },
  sparkFill: { height: '100%', backgroundColor: C.fire, borderRadius: 3 },
  menu: { position: 'absolute', right: 14, alignItems: 'flex-end', gap: 10 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.fire, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeT: { fontFamily: F.display, fontSize: 11.5, color: C.white },
  action: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  round: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.glass, alignItems: 'center', justifyContent: 'center' },
  actionT: { fontFamily: F.displayMed, fontSize: 13, color: C.cream, backgroundColor: C.glass, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { backgroundColor: C.night2, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 8 },
  panel: { borderRadius: 22, paddingTop: 14, paddingBottom: 14, borderWidth: 1, borderColor: C.line, boxShadow: '0px 12px 40px rgba(0,0,0,0.35)' } as any,
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sheetT: { fontFamily: F.display, fontSize: 20, color: C.cream },
  note: { fontFamily: F.body, fontSize: 12.5, color: C.muted },
  msg: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bub: { flexShrink: 1, maxWidth: '82%', backgroundColor: C.night3, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubMe: { backgroundColor: C.ember },
  who: { fontFamily: F.display, fontSize: 13.5, color: C.cream },
  time: { fontFamily: F.body, fontSize: 11.5, color: C.muted },
  msgT: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: C.cream },
  pchip: { borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.night3, paddingHorizontal: 10, paddingVertical: 5 },
  pchipT: { fontFamily: F.body, fontSize: 12.5, color: C.creamDim },
  input: { flex: 1, minWidth: 0, backgroundColor: C.night, borderWidth: 1, borderColor: C.line, borderRadius: 10, color: C.cream, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.body, fontSize: 15 },
  warn: { backgroundColor: C.amberSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  warnT: { fontFamily: F.body, fontSize: 13.5, lineHeight: 19, color: C.amber },
  when: { fontFamily: F.display, fontSize: 15, color: C.forest },
  quote: { fontFamily: F.displayMed, fontSize: 20, lineHeight: 26, color: C.cream },
  track: { height: 12, borderRadius: 6, backgroundColor: C.night4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: C.fire },
}));
