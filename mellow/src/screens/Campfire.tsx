import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../state';
import { COOP_GOAL } from '../data';
import { C, F } from '../theme';
import { CampScene, Mallow } from '../components/Pixel';
import { Btn, Chip, Eyebrow, H1, H2, Panel, PTitle, T } from '../components/ui';
import { useLayout } from '../layout';

export default function Campfire() {
  const S = useApp();
  const { cw } = useLayout();
  const two = cw >= 980;
  const listRef = useRef<any>(null);
  const inputRef = useRef<any>(null);
  const text = S.chatDraft;
  useEffect(() => { setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60); }, [S.chat.length]);
  useEffect(() => { if (text.startsWith('@')) inputRef.current?.focus(); }, []);
  const submit = () => { const t = text.trim(); if (!t) return; S.sendChat(t); S.setChatDraft(''); };
  const byId = Object.fromEntries(S.members.map((m) => [m.id, m]));

  const chat = (
    <Panel style={{ gap: 12 }}>
      <PTitle eyebrow="Fireside chat" title="Tonight at Pinehollow" right={<Chip label="Only your 4 can see this" />} />
      <ScrollView ref={listRef} style={{ height: 340 }} contentContainerStyle={{ gap: 10, paddingRight: 4 }} nestedScrollEnabled>
        {S.chat.map((c) => {
          const m = byId[c.from]; const me = c.from === 'me';
          return (
            <View key={c.id} style={[st.msg, me && { flexDirection: 'row-reverse' }]}>
              <Mallow a={m.a} size={34} anim={false} />
              <View style={[st.bub, me && { backgroundColor: '#3d3150' }]}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                  <Text style={st.who}>{me ? 'You' : m.name}</Text><Text style={st.time}>{c.time}</Text>
                </View>
                <T>{c.text}</T>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {['Share a small win', 'What are you listening to?', 'Something that made you smile'].map((p) => (
          <Pressable key={p} onPress={() => { S.setChatDraft(p + ': '); inputRef.current?.focus(); }} style={(st2: any) => [st.pchip, st2.hovered && { borderColor: C.lineHi }]}>
            <Text style={st.pchipT}>{p}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput ref={inputRef} value={text} onChangeText={S.setChatDraft} onSubmitEditing={submit} placeholder="Say something to the fire…" placeholderTextColor={C.muted} style={st.input} returnKeyType="send" />
        <Btn label="Send" onPress={submit} disabled={!text.trim()} />
      </View>
    </Panel>
  );

  const side = (
    <View style={{ gap: 20 }}>
      <Panel>
        <PTitle eyebrow="At the fire" title="Members" right={<Chip label="4 of 4" />} />
        <View style={{ gap: 8 }}>
          {S.members.map((m) => (
            <View key={m.id} style={st.member}>
              <Mallow a={m.a} size={44} anim={false} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.mname}>{m.id === 'me' ? m.name + ' (you)' : m.name}</Text>
                <Text numberOfLines={1} style={st.mlikes}>{m.id === 'me' ? 'Here since Oct 4' : m.likes}</Text>
              </View>
              {m.id === 'me' ? <Btn label="Edit" kind="ghost" sm onPress={() => S.go('wardrobe')} /> : <Btn label="Wave" kind="ghost" sm onPress={() => S.wave(m)} />}
            </View>
          ))}
        </View>
      </Panel>
      <Panel>
        <Eyebrow>Tonight’s spark</Eyebrow>
        <H2 style={{ marginTop: 4 }}>Gather {COOP_GOAL} embers together</H2>
        <View style={st.track}>
          <View style={[st.fill, { width: ((Math.min(S.coop, COOP_GOAL) / COOP_GOAL) * 100 + '%') as any }]} />
        </View>
        <T muted>{S.coop >= COOP_GOAL ? 'The fire is roaring. Everyone pitched in tonight.' : S.coop + ' of ' + COOP_GOAL + '. Any quest or game you finish adds an ember for the whole fire.'}</T>
        <Btn label="Find something to do" sm style={{ marginTop: 12 }} onPress={() => S.go('activities')} />
      </Panel>
      <Panel style={{ backgroundColor: '#262049' }}>
        <Eyebrow>Weekly gathering</Eyebrow>
        <H2 style={{ marginTop: 4 }}>Sunday Talk</H2>
        <Text style={st.when}>Sunday · 19:00 · about 30 min</Text>
        <Text style={st.quote}>“A film that feels like a warm blanket.”</Text>
        <T muted>Come to talk or just to listen. Nobody has to speak.</T>
        <Btn label={S.talkReminder ? 'Reminder set' : 'Remind me'} kind={S.talkReminder ? 'green' : 'ember'} sm style={{ marginTop: 12 }} onPress={() => S.setTalkReminder(!S.talkReminder)} />
      </Panel>
    </View>
  );

  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14 }}>
        <View style={{ gap: 6, flexShrink: 1 }}>
          <Eyebrow>Your campfire</Eyebrow>
          <H1>Pinehollow</H1>
          <T style={{ color: C.creamDim }}>Four marshmallows, one fire. Lit on October 4. Tap anyone at the fire to say hi.</T>
        </View>
        <Btn label="Invite or meet others" kind="plum" icon="people" onPress={() => S.setModal({ type: 'invite' })} />
      </View>
      <View style={st.frame}>
        <CampScene members={S.members} bubbles={S.bubbles} hopId={S.hopId} onPick={(m) => (m.id === 'me' ? S.go('wardrobe') : S.setModal({ type: 'member', m }))} />
      </View>
      {two ? (
        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
          <View style={{ flex: 1.5 }}>{chat}</View>
          <View style={{ flex: 1 }}>{side}</View>
        </View>
      ) : <View style={{ gap: 20 }}>{chat}{side}</View>}
    </View>
  );
}

const st = StyleSheet.create({
  frame: { borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  msg: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bub: { flex: 1, backgroundColor: C.night3, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  who: { fontFamily: F.display, fontSize: 14, color: C.cream },
  time: { fontFamily: F.body, fontSize: 12, color: C.muted },
  pchip: { borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.night3, paddingHorizontal: 10, paddingVertical: 4 },
  pchipT: { fontFamily: F.body, fontSize: 12.5, color: C.creamDim },
  input: { flex: 1, minWidth: 0, backgroundColor: C.night, borderWidth: 1, borderColor: C.line, borderRadius: 10, color: C.cream, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.body, fontSize: 15 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.night3, borderRadius: 14, padding: 8 },
  mname: { fontFamily: F.display, fontSize: 16, color: C.cream },
  mlikes: { fontFamily: F.body, fontSize: 12.5, color: C.muted },
  track: { height: 12, borderRadius: 6, backgroundColor: C.night4, marginVertical: 12, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: C.ember },
  when: { fontFamily: F.display, fontSize: 15, color: C.emberHi, marginTop: 6 },
  quote: { fontFamily: F.displayMed, fontSize: 19, lineHeight: 25, color: C.cream, marginVertical: 10 },
});
