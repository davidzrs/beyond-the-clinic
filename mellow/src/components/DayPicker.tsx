// A small month calendar in a pop-up, for jumping to any day of the timeline.
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, themed } from '../theme';
import { Icon } from './Pixel';
import { dateOfDay } from '../demo';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAY = 864e5;

export function DayPicker({ visible, day, min, max, onPick, onClose }: { visible: boolean; day: number; min: number; max: number; onPick: (d: number) => void; onClose: () => void }) {
  const start = dateOfDay(1).getTime();
  const toDay = (utc: number) => Math.round((utc - start) / DAY) + 1;
  const sel = dateOfDay(day);
  const [view, setView] = useState({ y: sel.getUTCFullYear(), m: sel.getUTCMonth() });
  const first = dateOfDay(min), last = dateOfDay(max);
  const idx = (y: number, m: number) => y * 12 + m;
  const canPrev = idx(view.y, view.m) > idx(first.getUTCFullYear(), first.getUTCMonth());
  const canNext = idx(view.y, view.m) < idx(last.getUTCFullYear(), last.getUTCMonth());
  const shift = (n: number) => setView((v) => { const d = new Date(Date.UTC(v.y, v.m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const weeks = useMemo(() => {
    const f = Date.UTC(view.y, view.m, 1);
    const lead = (new Date(f).getUTCDay() + 6) % 7;
    const n = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    const cells = Array.from({ length: Math.ceil((lead + n) / 7) * 7 }, (_, i) => f + (i - lead) * DAY);
    return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  }, [view]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={() => setView({ y: sel.getUTCFullYear(), m: sel.getUTCMonth() })}>
      <Pressable style={st.scrim} onPress={onClose}>
        <Pressable style={st.card} onPress={() => {}}>
          <View style={st.head}>
            <Pressable onPress={() => shift(-1)} disabled={!canPrev} accessibilityLabel="Previous month" style={[st.nav, !canPrev && { opacity: 0.3 }]}><Icon name="back" size={16} /></Pressable>
            <Text style={st.month}>{new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</Text>
            <Pressable onPress={() => shift(1)} disabled={!canNext} accessibilityLabel="Next month" style={[st.nav, !canNext && { opacity: 0.3 }]}><Icon name="chevron" size={16} /></Pressable>
          </View>
          <View style={st.week}>{WEEKDAYS.map((w) => <Text key={w} style={st.wd}>{w}</Text>)}</View>
          {weeks.map((wk, i) => (
            <View key={i} style={st.week}>
              {wk.map((utc) => {
                const d = toDay(utc);
                const out = new Date(utc).getUTCMonth() !== view.m;
                const ok = d >= min && d <= max;
                const on = d === day;
                return (
                  <Pressable key={utc} disabled={!ok} onPress={() => { onPick(d); onClose(); }} accessibilityLabel={dateOfDay(d).toDateString()}
                    style={[st.cell, on && { backgroundColor: C.ember }, d === max && !on && { borderWidth: 1.5, borderColor: C.ember }]}>
                    <Text style={[st.num, (out || !ok) && { color: C.muted, opacity: ok ? 0.7 : 0.35 }, on && { color: C.emberInk }]}>{new Date(utc).getUTCDate()}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={st.foot}>
            <Text style={st.hint}>{dateOfDay(min).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })} – {dateOfDay(max).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</Text>
            <Pressable onPress={() => { onPick(max); onClose(); }} accessibilityRole="button"><Text style={st.today}>Today</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = themed(() => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(8, 12, 28, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 340, backgroundColor: C.night2, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 16, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  nav: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.night3 },
  month: { fontFamily: F.display, fontSize: 17, color: C.cream },
  week: { flexDirection: 'row' },
  wd: { flex: 1, textAlign: 'center', fontFamily: F.label, fontSize: 11.5, color: C.muted, paddingVertical: 4 },
  cell: { flex: 1, height: 38, margin: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: F.label, fontSize: 14, color: C.cream },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
  hint: { fontFamily: F.body, fontSize: 12.5, color: C.muted },
  today: { fontFamily: F.label, fontSize: 13.5, color: C.ember },
}));
