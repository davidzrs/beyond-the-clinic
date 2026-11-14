import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { AppProvider, Route, useApp } from './src/state';
import { autoMode, C, F, onTheme, setThemeMode, themed, themeMode, themeVersion } from './src/theme';
import { Icon, Mallow } from './src/components/Pixel';
import { ModalHost } from './src/modals/Modals';
import { ThemeToggle } from './src/components/ThemeToggle';
import { DailyCheckin } from './src/components/DailyCheckin';
import { AuthGate, useAuth } from './src/auth';
import { MAX_W, SIDEBAR_W, useLayout } from './src/layout';
import { onScrollLock, registerPageScroll } from './src/scrollLock';
import Home from './src/screens/Home';
import Campfire from './src/screens/Campfire';
import Journey from './src/screens/Journey';
import Wardrobe from './src/screens/Wardrobe';
import Clinic from './src/screens/Clinic';
import Insights from './src/screens/Insights';
import Games from './src/screens/Games';
import GameScreen from './src/screens/GameScreen';

// Four tabs. The wardrobe, insights and the care-team view are sub-pages with a back link.
const NAV: [Route, string, string][] = [['home', 'Today', 'home'], ['campfire', 'Campfire', 'flame'], ['journey', 'Journey', 'leaf'], ['games', 'Games', 'play']];
const LOGO = { name: '', color: 'vanilla', face: 'happy', hat: 'none', glasses: 'none', acc: 'none', item: 'none' };

function Shell() {
  const S = useApp();
  const { wide, pad } = useLayout();
  const insets = useSafeAreaInsets();
  const scroll = useRef<any>(null);
  // A game board switches page scrolling off while a finger drags across it (see src/scrollLock.ts).
  const [scrollLocked, setScrollLocked] = useState(false);
  useEffect(() => onScrollLock(setScrollLocked), []);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [S.route]);
  useEffect(() => {
    // Android back button: a sub-page goes back to its tab instead of closing the app.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!NAV.some(([k]) => k === S.route)) { S.back(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [S.route, S.lastTab]);
  const full = S.route === 'campfire'; // the campfire scene fills the screen
  const Screen = { home: Home, campfire: Campfire, journey: Journey, games: Games, nono: GameScreen, sight: GameScreen, hotel: GameScreen, wardrobe: Wardrobe, clinic: Clinic, insights: Insights }[S.route];

  return (
    <View style={[st.root, { paddingTop: full && !wide ? 0 : insets.top }, !wide && !full && { backgroundColor: C.navyDeep }]}>
      <StatusBar style={wide && themeMode() === 'day' ? 'dark' : 'light'} />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {wide ? (
          <View style={st.side}>
            <View style={st.brand}><Mallow a={LOGO} size={40} anim={false} /><View><Text style={st.brandT}>Mellow</Text><Text style={st.brandS}>A cozy fire for hard days</Text></View></View>
            <View style={{ gap: 6 }}>
              {NAV.map(([k, l, ic]) => {
                const on = S.route === k || (S.backTo === k && !NAV.some(([n]) => n === S.route));
                return (
                  <Pressable key={k} onPress={() => S.go(k)} style={(p: any) => [st.nav, on && { backgroundColor: C.night4 }, p.hovered && !on && { backgroundColor: C.night3 }]}>
                    <Icon name={ic} size={20} color={on ? C.emberHi : C.muted} /><Text style={[st.navT, on && { color: C.cream }]}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 'auto', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><ThemeToggle bg={C.night3} color={C.emberHi} /><Text style={st.meS}>{themeMode() === 'day' ? 'Day mode' : 'Night mode'}</Text></View>
              <Pressable onPress={() => S.go('wardrobe')} style={st.mechip}>
                <Mallow a={S.avatar} size={44} anim={false} />
                <View style={{ flex: 1 }}><Text style={st.meN}>{S.avatar.name}</Text><Text style={st.meS}>Customize your marshmallow</Text></View>
              </Pressable>
              <Pressable onPress={() => S.setModal({ type: 'support' })}><Text style={st.help}>Need to talk to someone now?</Text></Pressable>
            </View>
          </View>
        ) : null}
        {full ? <View style={{ flex: 1 }}><Screen /></View> : <ScrollView ref={(r) => { scroll.current = r; registerPageScroll(r); }} scrollEnabled={!scrollLocked} style={{ flex: 1, backgroundColor: C.night }} contentContainerStyle={{ paddingHorizontal: pad, paddingTop: wide ? 30 : 14, paddingBottom: wide ? 60 : 110 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <View style={{ width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}>
            {!wide ? (
              <View style={[st.mtop, { marginHorizontal: -pad, paddingHorizontal: pad }, (S.route === 'home' || S.route === 'journey') ? { marginBottom: 0 } : st.mtopRound]}>
                <View style={st.brand}><Mallow a={LOGO} size={32} anim={false} /><Text style={[st.brandT, { fontSize: 22, color: C.heroText }]}>Mellow</Text></View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ThemeToggle />
                  <Pressable onPress={() => S.go('wardrobe')} style={st.meBtn} accessibilityLabel="Customize your marshmallow"><Mallow a={S.avatar} size={34} anim={false} /></Pressable>
                </View>
              </View>
            ) : null}
            <Screen />
          </View>
        </ScrollView>}
      </View>
      {!wide ? (
        <View style={[st.bnav, { paddingBottom: 8 + insets.bottom }, full && st.bnavOver]} pointerEvents="box-none">
          {/* Soft fade so content melts into the bar instead of stopping at a hard line */}
          {!full ? <View pointerEvents="none" style={st.fade}>{[0.15, 0.35, 0.55, 0.75, 0.9].map((o) => <View key={o} style={{ flex: 1, backgroundColor: C.night, opacity: o }} />)}</View> : null}
          {NAV.map(([k, l, ic]) => {
            const on = S.route === k || (S.backTo === k && !NAV.some(([n]) => n === S.route));
            const fg = full ? (on ? '#FFFFFF' : 'rgba(255,255,255,.75)') : on ? C.emberHi : C.muted;
            return (
              <Pressable key={k} onPress={() => S.go(k)} style={[st.bbtn, on && (full ? st.bbtnOnOver : st.bbtnOn)]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <Icon name={ic} size={22} color={fg} /><Text style={[st.bT, { color: fg }, on && { fontFamily: F.display }]}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {S.toastMsg ? (
        <View pointerEvents="none" style={[st.toast, { bottom: (wide ? 24 : 90) + insets.bottom }]}>
          <Icon name="ember" size={20} /><Text style={st.toastT}>{S.toastMsg}</Text>
        </View>
      ) : null}
      <ModalHost />
      <DailyCheckin key={S.resetN} />
    </View>
  );
}

function Themed() {
  const [v, setV] = useState(themeVersion());
  useEffect(() => onTheme(() => setV(themeVersion())), []);
  useEffect(() => {
    // Follow the clock: when it turns 7:00 or 19:00, switch.
    let last = autoMode();
    const id = setInterval(() => { const m = autoMode(); if (m !== last) { last = m; setThemeMode(m); } }, 60000);
    return () => clearInterval(id);
  }, []);
  return <Shell key={v} />;
}

export default function App() {
  const [loaded] = useFonts({ Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.night }} />;
  return (
    <SafeAreaProvider>
      <AuthGate>
        <ForUser />
      </AuthGate>
    </SafeAreaProvider>
  );
}

// A fresh app state per account (and one for the demo), so switching users never mixes data.
function ForUser() {
  const { session } = useAuth();
  return (
    <AppProvider key={session?.user.id || 'demo'}>
      <Themed />
    </AppProvider>
  );
}

const st = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.night },
  side: { width: SIDEBAR_W, borderRightWidth: 1, borderRightColor: C.line, paddingVertical: 26, paddingHorizontal: 18, gap: 22, backgroundColor: C.night2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandT: { fontFamily: F.displayBold, fontSize: 24, color: C.cream },
  brandS: { fontFamily: F.displayMed, fontSize: 11.5, color: C.muted },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  navT: { fontFamily: F.displayMed, fontSize: 15.5, color: C.creamDim },
  mechip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.night2 },
  meN: { fontFamily: F.display, fontSize: 16, color: C.cream },
  meS: { fontFamily: F.body, fontSize: 12, color: C.muted },
  help: { fontFamily: F.body, fontSize: 13, color: C.muted, textDecorationLine: 'underline' },
  mtop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: -14, paddingTop: 10, paddingBottom: 10, backgroundColor: C.navyDeep },
  mtopRound: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22, paddingBottom: 14 },
  meBtn: { borderRadius: 12, backgroundColor: C.peach, padding: 4 },
  // The tab bar is the page colour (no border), with a short fade above it; the active tab sits in a soft pill.
  bnav: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 6, paddingHorizontal: 12, backgroundColor: C.night },
  bnavOver: { backgroundColor: 'rgba(8,12,30,.28)' },
  fade: { position: 'absolute', left: 0, right: 0, top: -18, height: 18 },
  bbtn: { alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16 },
  bbtnOn: { backgroundColor: C.navySoft },
  bbtnOnOver: { backgroundColor: 'rgba(255,255,255,.2)' },
  bT: { fontFamily: F.displayMed, fontSize: 12, color: C.muted },
  toast: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.ember, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, maxWidth: '90%' },
  toastT: { fontFamily: F.bodyBold, fontSize: 14, color: C.emberInk, flexShrink: 1 },
}));
