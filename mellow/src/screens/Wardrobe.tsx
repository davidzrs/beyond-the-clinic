import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../state';
import { ACCS, Avatar, COLORS, FACES, GLASSES, HATS, ITEMS, WARDROBE_FACES } from '../pixel/sprites';
import { C, F } from '../theme';
import { Mallow, StageView } from '../components/Pixel';
import { Btn, Eyebrow, H1, Panel, T, Tab } from '../components/ui';
import { useLayout } from '../layout';

type Key = 'color' | 'face' | 'hat' | 'glasses' | 'acc' | 'item';
const TABS: [Key, string][] = [['color', 'Color'], ['face', 'Face'], ['hat', 'Hat'], ['glasses', 'Glasses'], ['acc', 'Extras'], ['item', 'Holding']];

export default function Wardrobe() {
  const S = useApp();
  const { cw } = useLayout();
  const two = cw >= 820;
  const [d, setD] = useState<Avatar>(S.avatar);
  const [tab, setTab] = useState<Key>('color');
  const src: Record<string, { label: string }> = ({
    color: COLORS, face: Object.fromEntries(WARDROBE_FACES.map((k) => [k, FACES[k]])), hat: HATS, glasses: GLASSES, acc: ACCS, item: ITEMS,
  } as Record<Key, Record<string, { label: string }>>)[tab];
  const pick = (o: Record<string, unknown>) => { const k = Object.keys(o); return k[Math.floor(Math.random() * k.length)]; };
  const rand = () => setD({ ...d, color: pick(COLORS), face: WARDROBE_FACES[Math.floor(Math.random() * 6)], hat: pick(HATS), glasses: pick(GLASSES), acc: pick(ACCS), item: pick(ITEMS) });
  const changed = JSON.stringify(d) !== JSON.stringify(S.avatar);
  const optW = two ? 104 : (cw - 36 - 20) / 3;

  const preview = (
    <View style={{ gap: 16 }}>
      <Panel style={{ padding: 0 }}>
        <StageView a={d} maxSize={two ? 460 : 420} />
        <View style={st.stageUi}><Text style={st.nm}>{d.name || 'You'}</Text><T muted style={{ fontSize: 13 }}>Live preview</T></View>
      </Panel>
      <View style={st.sizes}>
        {([[36, 'CHAT'], [56, 'FIRE'], [80, 'HOME']] as const).map(([sz, l]) => (
          <View key={l} style={{ alignItems: 'center', gap: 4 }}><Mallow a={d} size={sz} anim={false} /><Text style={st.sizeL}>{l}</Text></View>
        ))}
      </View>
    </View>
  );

  const editor = (
    <Panel>
      <Text style={st.label}>NAME</Text>
      <TextInput value={d.name} maxLength={16} onChangeText={(v) => setD({ ...d, name: v })} style={st.input} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginVertical: 14 }}>
        {TABS.map(([k, l]) => <Tab key={k} label={l} on={tab === k} onPress={() => setTab(k)} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {Object.entries(src).map(([k, o]) => {
          const on = d[tab] === k;
          const prev = { ...d, [tab]: k } as Avatar;
          return (
            <Pressable key={k} onPress={() => setD(prev)} accessibilityState={{ selected: on }}
              style={(p: any) => [st.opt, { width: optW }, on && st.optOn, p.hovered && !on && { borderColor: C.lineHi, transform: [{ translateY: -3 }] }]}>
              <Mallow a={prev} size={Math.min(76, optW - 16)} anim={false} />
              <Text style={[st.optT, on && { color: C.emberHi }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
        <Btn label="Surprise me" kind="ghost" icon="refresh" onPress={rand} />
        <Btn label="Undo changes" kind="ghost" onPress={() => setD(S.avatar)} disabled={!changed} />
        <Btn label="Save look" onPress={() => { S.setAvatar(d); S.toast('Saved. Looking cozy, ' + (d.name || 'friend') + '.'); }} disabled={!changed} />
      </View>
    </Panel>
  );

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 6 }}>
        <Eyebrow>Wardrobe</Eyebrow>
        <H1>Your marshmallow</H1>
        <T style={{ color: C.creamDim }}>This is how you show up at the fire, on Home and in chat. Change it whenever you like.</T>
      </View>
      {two ? (
        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>{preview}</View>
          <View style={{ flex: 1.25 }}>{editor}</View>
        </View>
      ) : <View style={{ gap: 20 }}>{preview}{editor}</View>}
    </View>
  );
}

const st = StyleSheet.create({
  stageUi: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.night3 },
  nm: { fontFamily: F.display, fontSize: 18, color: C.cream },
  sizes: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 18, padding: 14, backgroundColor: C.night3, borderRadius: 14 },
  sizeL: { fontFamily: F.label, fontSize: 11, color: C.muted },
  label: { fontFamily: F.label, fontSize: 11, color: C.muted, letterSpacing: 0.6, marginBottom: 6 },
  input: { backgroundColor: C.night, borderWidth: 1, borderColor: C.line, borderRadius: 10, color: C.cream, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.body, fontSize: 15 },
  opt: { alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.night3 },
  optOn: { borderColor: C.ember, backgroundColor: '#3a2f3e' },
  optT: { fontFamily: F.displayMed, fontSize: 13.5, color: C.creamDim },
});
