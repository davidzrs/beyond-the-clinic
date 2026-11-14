// What Mellow may read and share: the same toggles in the onboarding and under Support → Privacy & sharing.
// Signals and the clinic summary are kept on this device for now (UI for the demo). Crisis alerts are real:
// the send-message function checks profiles.crisis_consent before telling the care team.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../state';
import { C, F, themed } from '../theme';

const ND = Platform.OS !== 'web';
const buzz = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); };

const SIGNALS: { id: 'sleep' | 'steps' | 'screen'; e: string; t: string; s: string }[] = [
  { id: 'sleep', e: '🛌', t: 'Sleep and heart rate', s: 'From your watch or phone' },
  { id: 'steps', e: '👣', t: 'Steps', s: 'How much you move in a day' },
  { id: 'screen', e: '📱', t: 'Screen time', s: 'Daily totals only, never which apps' },
];

// One line for the Support sheet: what's on right now.
export function privacySummary(p: { sleep: boolean; steps: boolean; screen: boolean; care: boolean }, crisis: boolean | null) {
  const n = SIGNALS.filter((x) => p[x.id]).length;
  return [crisis ? 'Crisis alerts on' : 'Crisis alerts off', n ? `${n} of 3 signals on` : 'No signals on', p.care ? 'clinic summary on' : 'clinic summary off'].join(' · ');
}

export function PrivacySettings() {
  const S = useApp();
  const p = S.privacy;
  return (
    <View style={{ gap: 14 }}>
      <View style={st.card}>
        <Text style={st.cardH}>From your phone or watch</Text>
        {SIGNALS.map((o, k) => (
          <Row key={o.id} e={o.e} t={o.t} s={o.s} on={p[o.id]} line={k > 0} onPress={() => S.setPrivacy({ [o.id]: !p[o.id] })} />
        ))}
      </View>
      <View style={st.card}>
        <Text style={st.cardH}>Your care team</Text>
        <Row e="🩺" t="Share a summary with my clinic" s="Every 2 weeks: check-ins, sleep and mood trends. Never your chats." on={p.care} onPress={() => S.setPrivacy({ care: !p.care })} />
        {p.care ? (
          <View style={{ gap: 6, paddingTop: 4 }}>
            <Text style={st.s}>Got a code from your clinic? (optional)</Text>
            <TextInput value={p.code} onChangeText={(v) => S.setPrivacy({ code: v.toUpperCase() })} placeholder="e.g. HELS-2041" placeholderTextColor={C.muted}
              autoCapitalize="characters" autoCorrect={false} maxLength={12} style={st.input} />
          </View>
        ) : null}
        <Row e="🛟" t="Crisis alerts" line on={!!S.consent} onPress={() => S.answerConsent(!S.consent)}
          s="If something I write in the chat sounds like a crisis, my care team learns that it happened and when, never what I wrote. An AI does this check; it can be wrong and never diagnoses." />
      </View>
      <View style={st.note}>
        <Ionicons name="lock-closed-outline" size={16} color={C.muted} />
        <Text style={st.noteT}>Mellow only compares you with your own normal. Your campfire never sees any of this.</Text>
      </View>
    </View>
  );
}

function Row({ e, t, s, on, line, onPress }: { e: string; t: string; s: string; on: boolean; line?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { buzz(); onPress(); }} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={t}
      style={[st.row, line && st.line]}>
      <Text style={st.e}>{e}</Text>
      <View style={{ flex: 1 }}><Text style={st.t}>{t}</Text><Text style={st.s}>{s}</Text></View>
      <Toggle on={on} />
    </Pressable>
  );
}

export function Toggle({ on }: { on: boolean }) {
  const x = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.timing(x, { toValue: on ? 1 : 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start(); }, [on]);
  return (
    <View style={[st.switch, { backgroundColor: on ? C.moss : C.night4 }]}>
      <Animated.View style={[st.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }]} />
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  card: { gap: 10, padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.night2 },
  cardH: { fontFamily: F.label, fontSize: 12, letterSpacing: 1.1, color: C.muted, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  line: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12 },
  e: { fontSize: 22, width: 30, textAlign: 'center' },
  t: { fontFamily: F.bodyBold, fontSize: 15.5, color: C.cream },
  s: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 1 },
  switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  input: { fontFamily: F.bodyBold, fontSize: 16, letterSpacing: 1.5, color: C.cream, backgroundColor: C.night3, borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  noteT: { flex: 1, fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted },
}));
