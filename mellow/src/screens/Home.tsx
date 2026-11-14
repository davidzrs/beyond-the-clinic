import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { MOOD_KEYS, MOODS } from '../data';
import { C, F } from '../theme';
import { CampScene, Icon, Mallow, StageView } from '../components/Pixel';
import { Btn, Chip, Eyebrow, H1, H2, H3, IconBtn, LinkBtn, Panel, PTitle, Reply, T } from '../components/ui';
import { useLayout } from '../layout';

export default function Home() {
  const S = useApp();
  const { cw } = useLayout();
  const two = cw >= 980;
  const heroRow = cw >= 620;
  const now = new Date();
  const hr = now.getHours();
  const greet = hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const month = now.toLocaleDateString('en-GB', { month: 'long' });
  const dom = now.getDate();
  const showed = [1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13];
  const activeToday = !!S.mood || Object.keys(S.questState).length > 0;
  const last = S.chat[S.chat.length - 1];
  const lastM = S.members.find((m) => m.id === last.from) || S.members[2];
  const bare = { ...S.avatar, hat: 'none', glasses: 'none', acc: 'none', item: 'none' };
  const weekFaces = ['okay', 'content', 'tired', 'okay', 'content', 'happy', S.mood ? MOODS[S.mood].face : null];
  const days = Math.min(30, Math.max(dom, 15));

  const hero = (
    <Panel style={{ padding: 0, flexDirection: heroRow ? 'row' : 'column' }}>
      <View style={{ width: heroRow ? 250 : '100%' }}>
        <StageView a={S.avatar} face={S.mood ? MOODS[S.mood].face : null} maxSize={heroRow ? 250 : 340} />
        <View style={st.stageUi}>
          <Text style={st.nm}>{S.avatar.name}</Text>
          <Btn label="Customize" kind="ghost" sm onPress={() => S.go('wardrobe')} />
        </View>
      </View>
      <View style={{ flex: heroRow ? 1 : undefined, padding: 18, gap: 14 }}>
        <View style={{ gap: 4 }}><Eyebrow>Daily check-in</Eyebrow><H2>How are you feeling today?</H2></View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {MOOD_KEYS.map((k) => {
            const on = S.mood === k;
            return (
              <Pressable key={k} onPress={() => S.setMood(k)} accessibilityState={{ selected: on }}
                style={(p: any) => [st.mood, on && st.moodOn, p.hovered && !on && { borderColor: C.lineHi, transform: [{ translateY: -3 }] }]}>
                <Mallow a={bare} face={MOODS[k].face} size={44} anim={false} />
                <Text style={[st.moodT, on && { color: C.emberHi }]}>{MOODS[k].label}</Text>
              </Pressable>
            );
          })}
        </View>
        {S.mood ? (
          <Reply>
            <T>{MOODS[S.mood].reply}</T>
            {MOODS[S.mood].sug ? <LinkBtn label={MOODS[S.mood].sug!.label} onPress={() => { const a = MOODS[S.mood!].sug!.act; if (a === 'campfire') S.go('campfire'); else if (a === 'breathe') S.setModal({ type: 'breathe' }); else S.doQuest('sky'); }} /> : null}
            {MOODS[S.mood].support ? <LinkBtn label="Want to talk to someone now?" onPress={() => S.setModal({ type: 'support' })} /> : null}
          </Reply>
        ) : <T muted>One tap is enough. You can change it any time today.</T>}
      </View>
    </Panel>
  );

  const quests = (
    <Panel>
      <PTitle eyebrow="Picked for you today" title="Gentle quests" right={<Chip label="Do any, or none" bg="#4a3016" fg={C.emberHi} />} />
      <View style={{ gap: 10 }}>
        {S.quests.map((q) => {
          const done = S.questState[q.id];
          return (
            <View key={q.id} style={[st.quest, done && { backgroundColor: '#1f3a32' }]}>
              <View style={st.qico}><Icon name={done ? 'check' : q.icon} size={30} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.qt}>{q.title}</Text>
                <T muted style={{ fontSize: 13 }}>{q.dur} · +{q.ember} embers</T>
                <Text style={st.why}>Why this: {q.why}</Text>
              </View>
              {done ? <Text style={st.done}>Done</Text> : (
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <IconBtn icon="refresh" label={'Swap ' + q.title} onPress={() => S.swapQuest(q.id)} />
                  <Btn label={q.act ? 'Start' : 'Done'} kind="green" sm onPress={() => (q.act ? S.setModal({ type: q.act, quest: q.id }) : S.doQuest(q.id))} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Panel>
  );

  const fire = (
    <Panel style={{ padding: 0 }}>
      <CampScene members={S.members} compact />
      <View style={{ padding: 16, gap: 10 }}>
        <PTitle eyebrow="Your campfire" title="Pinehollow" right={<Chip label="2 new" />} />
        <View style={st.lastmsg}>
          <Mallow a={lastM.a} size={32} anim={false} />
          <Text numberOfLines={1} style={[st.qt, { flex: 1, fontFamily: F.body }]}><Text style={{ fontFamily: F.bodyBold }}>{lastM.id === 'me' ? 'You' : lastM.name}: </Text>{last.text}</Text>
        </View>
        <T muted>Sunday Talk in 2 days: “A film that feels like a warm blanket.”</T>
        <Btn label="Go to the fire" icon="flame" onPress={() => S.go('campfire')} />
      </View>
    </Panel>
  );

  const progress = (
    <Panel>
      <PTitle eyebrow="Your month so far" title="Little by little" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={st.stat}><Text style={st.statN}>{showed.length + (activeToday ? 1 : 0)}</Text><T muted style={{ fontSize: 12.5 }}>days you showed up in {month}</T></View>
        <View style={st.stat}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="ember" size={20} /><Text style={st.statN}>{S.embers}</Text></View><T muted style={{ fontSize: 12.5 }}>embers gathered</T></View>
      </View>
      <View style={st.cal}>
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
          <View key={d} style={[st.calD, (showed.includes(d) || (d === dom && activeToday)) && { backgroundColor: C.ember }, d === dom && { borderWidth: 2, borderColor: C.emberHi }]} />
        ))}
      </View>
      <T muted style={{ fontSize: 12.5, marginTop: 10 }}>No streaks to break here. Every day you show up just adds up.</T>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        {weekFaces.map((f, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 2 }}>
            {f ? <Mallow a={bare} face={f} size={34} anim={false} /> : <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 14, height: 14, borderWidth: 2, borderColor: C.line, borderStyle: 'dashed', borderRadius: 3 }} /></View>}
            <Text style={st.wd}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
          </View>
        ))}
      </View>
    </Panel>
  );

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 6 }}>
        <Eyebrow>{dateStr}</Eyebrow>
        <H1>{greet}, {S.avatar.name}</H1>
        <T style={{ color: C.creamDim }}>No rush today. Start wherever feels right.</T>
      </View>
      {two ? (
        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
          <View style={{ flex: 1.45, gap: 20 }}>{hero}{quests}</View>
          <View style={{ flex: 1, gap: 20 }}>{fire}{progress}</View>
        </View>
      ) : (
        <View style={{ gap: 20 }}>{hero}{quests}{fire}{progress}</View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  stageUi: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.night3 },
  nm: { fontFamily: F.display, fontSize: 18, color: C.cream },
  mood: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.night3 },
  moodOn: { borderColor: C.ember, backgroundColor: '#3a2f3e' },
  moodT: { fontFamily: F.displayMed, fontSize: 13, color: C.creamDim },
  quest: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: C.night3 },
  qico: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.night2, alignItems: 'center', justifyContent: 'center' },
  qt: { fontFamily: F.bodyBold, fontSize: 15, color: C.cream },
  why: { fontFamily: F.body, fontSize: 12.5, color: C.creamDim, marginTop: 2 },
  done: { fontFamily: F.display, fontSize: 14, color: C.moss },
  lastmsg: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.night3, borderRadius: 12, padding: 8 },
  stat: { flex: 1, backgroundColor: C.night3, borderRadius: 14, padding: 12, gap: 2 },
  statN: { fontFamily: F.display, fontSize: 28, color: C.cream },
  cal: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 12 },
  calD: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.night4 },
  wd: { fontFamily: F.label, fontSize: 11, color: C.muted },
});
