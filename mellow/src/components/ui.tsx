import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { C, F, themed } from '../theme';
import { Icon } from './Pixel';

export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) { return <Text style={[s.h1, style]}>{children}</Text>; }
export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) { return <Text style={[s.h2, style]}>{children}</Text>; }
export function H3({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) { return <Text style={[s.h3, style]}>{children}</Text>; }
export function Eyebrow({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) { return <Text style={[s.eyebrow, style]}>{typeof children === 'string' ? children.toUpperCase() : children}</Text>; }
export function T({ children, style, muted, numberOfLines }: { children: React.ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[s.t, muted && { color: C.muted, fontSize: 13.5 }, style]}>{children}</Text>;
}

export function Panel({ children, style, raised }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; raised?: boolean }) {
  return <View style={[s.panel, raised && { backgroundColor: C.night3 }, style]}>{children}</View>;
}

export function PTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  return (
    <View style={s.ptitle}>
      <View style={{ gap: 3, flexShrink: 1 }}>{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}<H2>{title}</H2></View>
      {right}
    </View>
  );
}

type BtnKind = 'ember' | 'ghost' | 'green' | 'plum';
const BTN: Record<BtnKind, { bg: string; fg: string }> = themed(() => ({
  ember: { bg: C.ember, fg: C.emberInk },
  ghost: { bg: C.night4, fg: C.cream },
  green: { bg: C.forest, fg: C.white },
  plum: { bg: C.plum, fg: C.white },
}));
export function Btn({ label, onPress, kind = 'ember', sm, icon, disabled, style }: { label: string; onPress?: () => void; kind?: BtnKind; sm?: boolean; icon?: string; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const k = BTN[kind];
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={(st: any) => [s.btn, sm && s.btnSm, { backgroundColor: k.bg, opacity: disabled ? 0.5 : 1, transform: [{ translateY: st.pressed ? 1 : st.hovered ? -2 : 0 }, { scale: st.pressed ? 0.98 : 1 }] }, style]}>
      {icon ? <Icon name={icon} size={sm ? 16 : 18} color={k.fg} /> : null}
      <Text style={[s.btnT, sm && { fontSize: 13.5 }, { color: k.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconBtn({ icon, onPress, label }: { icon: string; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={(st: any) => [s.iconbtn, (st.hovered || st.pressed) && { backgroundColor: C.line }]}>
      <Icon name={icon} size={16} />
    </Pressable>
  );
}

export function Chip({ label, bg = C.night4, fg = C.creamDim, style }: { label: string; bg?: string; fg?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.chip, { backgroundColor: bg }, style]}><Text style={[s.chipT, { color: fg }]}>{label}</Text></View>;
}

export function Pill({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityState={{ selected: on }} style={(st: any) => [s.pill, on && s.pillOn, st.hovered && !on && { borderColor: C.lineHi }]}>
      <Text style={[s.pillT, on && { color: on === true && false ? C.emberInk : C.cream }]}>{label}</Text>
    </Pressable>
  );
}

export function Tab({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.tab, on && { backgroundColor: C.ember }]}>
      <Text style={[s.tabT, on && { color: C.emberInk }]}>{label}</Text>
    </Pressable>
  );
}

export function Reply({ children }: { children: React.ReactNode }) { return <View style={s.reply}>{children}</View>; }
export function LinkBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress}><Text style={s.link}>{label}</Text></Pressable>;
}

export const s = themed(() => StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 32, lineHeight: 38, color: C.cream, letterSpacing: -0.3 },
  h2: { fontFamily: F.display, fontSize: 21, lineHeight: 26, color: C.cream },
  h3: { fontFamily: F.display, fontSize: 16.5, lineHeight: 21, color: C.cream },
  eyebrow: { fontFamily: F.label, fontSize: 12, letterSpacing: 0.7, color: C.muted },
  t: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.cream },
  panel: { backgroundColor: C.night2, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 18, overflow: 'hidden' },
  ptitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11, alignSelf: 'flex-start' },
  btnSm: { paddingHorizontal: 12, paddingVertical: 7 },
  btnT: { fontFamily: F.display, fontSize: 15 },
  iconbtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.night4, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  chipT: { fontFamily: F.label, fontSize: 11.5 },
  pill: { borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.night2, paddingHorizontal: 14, paddingVertical: 7 },
  pillOn: { backgroundColor: C.night4, borderColor: C.ember },
  pillT: { fontFamily: F.displayMed, fontSize: 14, color: C.creamDim },
  tab: { borderRadius: 999, backgroundColor: C.night3, paddingHorizontal: 13, paddingVertical: 7 },
  tabT: { fontFamily: F.displayMed, fontSize: 14, color: C.creamDim },
  reply: { backgroundColor: C.night3, borderRadius: 14, padding: 14, gap: 8 },
  link: { fontFamily: F.bodyBold, color: C.emberHi, textDecorationLine: 'underline', fontSize: 15 },
}));
