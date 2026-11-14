import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../state';
import { ACCS, Avatar, COLORS, FACES, GLASSES, HATS, ITEMS, WARDROBE_FACES } from '../pixel/sprites';
import { C, F, themed } from '../theme';
import { Mallow } from '../components/Pixel';
import { Btn, H2 } from '../components/ui';
import { useLayout } from '../layout';
import { BackLink } from '../components/BackLink';

type Key = 'color' | 'face' | 'hat' | 'glasses' | 'acc' | 'item';
const TABS: [Key, string][] = [['color', 'Body'], ['face', 'Face'], ['hat', 'Hat'], ['glasses', 'Glasses'], ['acc', 'Extras'], ['item', 'Holding']];

// The whole editor fits on one screen: preview and name on top, then the tabs and every option of the tab.
export default function Wardrobe() {
  const S = useApp();
  const { cw } = useLayout();
  const [d, setD] = useState<Avatar>(S.avatar);
  const [tab, setTab] = useState<Key>('color');
  const src: Record<string, { label: string }> = ({
    color: COLORS, face: Object.fromEntries(WARDROBE_FACES.map((k) => [k, FACES[k]])), hat: HATS, glasses: GLASSES, acc: ACCS, item: ITEMS,
  } as Record<Key, Record<string, { label: string }>>)[tab];
  const pick = (o: Record<string, unknown>) => { const k = Object.keys(o); return k[Math.floor(Math.random() * k.length)]; };
  const rand = () => setD({ ...d, color: pick(COLORS), face: WARDROBE_FACES[Math.floor(Math.random() * 6)], hat: pick(HATS), glasses: pick(GLASSES), acc: pick(ACCS), item: pick(ITEMS) });
  const changed = JSON.stringify(d) !== JSON.stringify(S.avatar);
  const w = Math.min(cw, 640);
  const prev = Math.min(170, Math.round(w * 0.42));
  const cols = w >= 560 ? 6 : 3;
  const optW = Math.floor((w - (cols - 1) * 8) / cols);
  const save = () => { S.setAvatar(d); S.toast('Saved. Looking cozy, ' + (d.name || 'friend') + '.'); };

  return (
    <View style={{ gap: 12, width: w, alignSelf: 'center' }}>
      <BackLink />
      <H2>Your marshmallow</H2>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[st.preview, { width: prev, height: prev }]}>
          <Mallow a={d} size={Math.round(prev * 0.78)} />
        </View>
        <View style={{ flex: 1, gap: 8, justifyContent: 'space-between' }}>
          <View style={{ gap: 4 }}>
            <Text style={st.label}>NAME</Text>
            <TextInput value={d.name} maxLength={16} onChangeText={(v) => setD({ ...d, name: v })} style={st.input} />
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Btn label="Surprise" kind="ghost" sm icon="refresh" onPress={rand} style={{ flex: 1 }} />
            <Btn label="Undo" kind="ghost" sm onPress={() => setD(S.avatar)} disabled={!changed} style={{ flex: 1 }} />
          </View>
          <Btn label={changed ? 'Save look' : 'Saved'} icon={changed ? undefined : 'check'} onPress={save} disabled={!changed} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {TABS.map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} accessibilityState={{ selected: tab === k }} style={[st.tab, tab === k && st.tabOn]}>
            <Text style={[st.tabT, tab === k && { color: C.emberInk }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(src).map(([k, o]) => {
          const on = d[tab] === k;
          const p = { ...d, [tab]: k } as Avatar;
          return (
            <Pressable key={k} onPress={() => setD(p)} accessibilityState={{ selected: on }} accessibilityLabel={o.label}
              style={(s: any) => [st.opt, { width: optW }, on && st.optOn, s.hovered && !on && { borderColor: C.lineHi }]}>
              <Mallow a={p} size={Math.min(54, optW - 30)} anim={false} />
              <Text style={[st.optT, on && { color: C.ember }]} numberOfLines={1}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  preview: { borderRadius: 22, backgroundColor: C.peach, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: F.label, fontSize: 11, color: C.muted, letterSpacing: 0.6 },
  input: { backgroundColor: C.night2, borderWidth: 1, borderColor: C.line, borderRadius: 10, color: C.cream, paddingHorizontal: 12, paddingVertical: 9, fontFamily: F.body, fontSize: 15 },
  tab: { borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.night2, paddingHorizontal: 12, paddingVertical: 6 },
  tabOn: { backgroundColor: C.ember, borderColor: C.ember },
  tabT: { fontFamily: F.displayMed, fontSize: 14, color: C.creamDim },
  opt: { alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.night2 },
  optOn: { borderColor: C.ember, backgroundColor: C.navySoft },
  optT: { fontFamily: F.displayMed, fontSize: 12.5, color: C.creamDim },
}));
