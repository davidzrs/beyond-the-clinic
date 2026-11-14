import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state';
import { MOOD_KEYS, MOODS, MoodKey } from '../data';
import { C, F, themed } from '../theme';
import { Icon, Mallow } from './Pixel';
import { addDays, ymd } from '../checkin';

const ND = Platform.OS !== 'web';

// First thing you see each day: your streak, and one question. Answering it keeps the streak going.
export function DailyCheckin() {
  const S = useApp();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<MoodKey | null>(null);
  const [count, setCount] = useState(S.streakCount);
  const pop = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: ND }).start(); }, []);
  if (!S.showDaily && !picked) return null;

  const bare = { ...S.avatar, hat: 'none', glasses: 'none', acc: 'none', item: 'none' };
  const close = () => Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: ND }).start(() => { setPicked(null); S.dismissDaily(); });
  const answer = (k: MoodKey) => {
    setPicked(k);
    const n = S.answerMood(k);
    setCount(n);
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.35, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: ND }),
    ]).start();
    setTimeout(close, 1700);
  };

  // The last 7 days, lit up for the days in the streak (including today once you answer).
  const lastDay = picked ? ymd(new Date()) : S.streak.last;
  const n = picked ? count : S.streakCount;
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6));
  const lit = (d: Date) => { const k = ymd(d); return n > 0 && k <= lastDay && k > ymd(addDays(new Date(lastDay + 'T12:00:00'), -n)); };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.wrap, { opacity: fade, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={st.top}>
        <Animated.View style={[st.flame, { transform: [{ scale: pop }] }]}>
          <Icon name="ember" size={46} />
          <Text style={st.count}>{n}</Text>
        </Animated.View>
        <Text style={st.streakT}>{n === 0 ? 'Start a streak today' : n === 1 ? '1-day streak' : n + '-day streak'}</Text>
        <View style={st.week}>
          {days.map((d, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 5 }}>
              <Text style={st.wd}>{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</Text>
              <View style={[st.dot, lit(d) && st.dotOn, i === 6 && !lit(d) && st.dotToday]}>{lit(d) ? <Icon name="check" size={14} color={C.white} /> : null}</View>
            </View>
          ))}
        </View>
      </View>

      <View style={st.card}>
        {picked ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 10 }}>
            <Mallow a={bare} face={MOODS[picked].face} size={72} />
            <Text style={st.q}>{n > 1 ? n + ' days in a row. See you tomorrow!' : 'Nice start. See you tomorrow!'}</Text>
            <Text style={st.reply}>{MOODS[picked].reply}</Text>
          </View>
        ) : (
          <>
            <Text style={st.q}>How are you feeling today?</Text>
            <Text style={st.reply}>One tap keeps your streak going.</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              {MOOD_KEYS.map((k) => (
                <Pressable key={k} onPress={() => answer(k)} accessibilityLabel={MOODS[k].label} style={(p: any) => [st.mood, p.pressed && { transform: [{ scale: 0.96 }] }]}>
                  <Mallow a={bare} face={MOODS[k].face} size={40} anim={false} />
                  <Text style={st.moodT} numberOfLines={1}>{MOODS[k].label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>

      {!picked ? <Pressable onPress={close} style={{ alignSelf: 'center', padding: 10 }}><Text style={st.later}>Not now</Text></Pressable> : <View style={{ height: 44 }} />}
    </Animated.View>
  );
}

const st = themed(() => StyleSheet.create({
  wrap: { backgroundColor: C.navyDeep, paddingHorizontal: 20, justifyContent: 'center', gap: 32, zIndex: 50 },
  top: { alignItems: 'center', gap: 10 },
  flame: { width: 120, height: 120, borderRadius: 60, backgroundColor: C.peach, alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: F.displayBold, fontSize: 30, color: C.ink, marginTop: -4 },
  streakT: { fontFamily: F.display, fontSize: 22, color: C.heroText },
  week: { flexDirection: 'row', gap: 10, marginTop: 6 },
  wd: { fontFamily: F.label, fontSize: 12, color: C.heroDim },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,.35)', alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: C.fire, borderColor: C.fire },
  dotToday: { borderColor: C.heroText, borderStyle: 'dashed' },
  card: { backgroundColor: C.night2, borderRadius: 22, padding: 18, gap: 4, width: '100%', maxWidth: 520, alignSelf: 'center' },
  q: { fontFamily: F.display, fontSize: 21, color: C.cream, textAlign: 'center' },
  reply: { fontFamily: F.body, fontSize: 14, color: C.creamDim, textAlign: 'center' },
  mood: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.night3 },
  moodT: { fontFamily: F.displayMed, fontSize: 12, color: C.creamDim },
  later: { fontFamily: F.bodyBold, fontSize: 15, color: C.heroDim, textDecorationLine: 'underline' },
}));
