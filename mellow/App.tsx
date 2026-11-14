import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { AppProvider, Route, useApp } from './src/state';
import { C, F } from './src/theme';
import { Icon, Mallow } from './src/components/Pixel';
import { ModalHost } from './src/modals/Modals';
import { MAX_W, SIDEBAR_W, useLayout } from './src/layout';
import Home from './src/screens/Home';
import Campfire from './src/screens/Campfire';
import Activities from './src/screens/Activities';
import Journey from './src/screens/Journey';
import Wardrobe from './src/screens/Wardrobe';

const NAV: [Route, string, string][] = [['home', 'Home', 'home'], ['campfire', 'Campfire', 'flame'], ['activities', 'Activities', 'play'], ['journey', 'My Journey', 'leaf']];
const LOGO = { name: '', color: 'vanilla', face: 'happy', hat: 'none', glasses: 'none', acc: 'none', item: 'none' };

function Shell() {
  const S = useApp();
  const { wide, pad } = useLayout();
  const insets = useSafeAreaInsets();
  const scroll = useRef<any>(null);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [S.route]);
  const Screen = { home: Home, campfire: Campfire, activities: Activities, journey: Journey, wardrobe: Wardrobe }[S.route];

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {wide ? (
          <View style={st.side}>
            <View style={st.brand}><Mallow a={LOGO} size={40} anim={false} /><View><Text style={st.brandT}>Mellow</Text><Text style={st.brandS}>A cozy fire for hard days</Text></View></View>
            <View style={{ gap: 6 }}>
              {NAV.map(([k, l, ic]) => {
                const on = S.route === k;
                return (
                  <Pressable key={k} onPress={() => S.go(k)} style={(p: any) => [st.nav, on && { backgroundColor: C.night4 }, p.hovered && !on && { backgroundColor: C.night3 }]}>
                    <Icon name={ic} size={20} color={on ? C.emberHi : C.muted} /><Text style={[st.navT, on && { color: C.cream }]}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 'auto', gap: 12 }}>
              <Pressable onPress={() => S.go('wardrobe')} style={st.mechip}>
                <Mallow a={S.avatar} size={44} anim={false} />
                <View style={{ flex: 1 }}><Text style={st.meN}>{S.avatar.name}</Text><Text style={st.meS}>Customize your marshmallow</Text></View>
              </Pressable>
              <Pressable onPress={() => S.setModal({ type: 'support' })}><Text style={st.help}>Need to talk to someone now?</Text></Pressable>
            </View>
          </View>
        ) : null}
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: pad, paddingTop: wide ? 30 : 14, paddingBottom: wide ? 60 : 110 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <View style={{ width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}>
            {!wide ? (
              <View style={st.mtop}>
                <View style={st.brand}><Mallow a={LOGO} size={32} anim={false} /><Text style={[st.brandT, { fontSize: 22 }]}>Mellow</Text></View>
                <Pressable onPress={() => S.go('wardrobe')} style={st.meBtn} accessibilityLabel="Customize your marshmallow"><Mallow a={S.avatar} size={34} anim={false} /></Pressable>
              </View>
            ) : null}
            <Screen />
          </View>
        </ScrollView>
      </View>
      {!wide ? (
        <View style={[st.bnav, { paddingBottom: 6 + insets.bottom }]}>
          {NAV.map(([k, l, ic]) => {
            const on = S.route === k;
            return (
              <Pressable key={k} onPress={() => S.go(k)} style={st.bbtn}>
                <Icon name={ic} size={22} color={on ? C.emberHi : C.muted} /><Text style={[st.bT, on && { color: C.cream }]}>{l.replace('My ', '')}</Text>
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
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({ Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.night }} />;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.night },
  side: { width: SIDEBAR_W, borderRightWidth: 1, borderRightColor: C.line, paddingVertical: 26, paddingHorizontal: 18, gap: 22, backgroundColor: 'rgba(18,23,46,.86)' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandT: { fontFamily: F.displayBold, fontSize: 24, color: C.cream },
  brandS: { fontFamily: F.displayMed, fontSize: 11.5, color: C.muted },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  navT: { fontFamily: F.displayMed, fontSize: 15.5, color: C.creamDim },
  mechip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.night2 },
  meN: { fontFamily: F.display, fontSize: 16, color: C.cream },
  meS: { fontFamily: F.body, fontSize: 12, color: C.muted },
  help: { fontFamily: F.body, fontSize: 13, color: C.muted, textDecorationLine: 'underline' },
  mtop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  meBtn: { borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.night2, padding: 4 },
  bnav: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 6, paddingHorizontal: 8, backgroundColor: 'rgba(18,23,46,.97)', borderTopWidth: 1, borderTopColor: C.line },
  bbtn: { alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  bT: { fontFamily: F.displayMed, fontSize: 12, color: C.muted },
  toast: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.cream, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, maxWidth: '90%' },
  toastT: { fontFamily: F.bodyBold, fontSize: 14, color: C.ink, flexShrink: 1 },
});
