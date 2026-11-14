// Your campfires: switch between them, start a new one, join a friend's with a code, or leave one.
// Opened by tapping the campfire's sign. Signed in only; the demo has a single made-up fire.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../state';
import { C, F, themed } from '../theme';
import { Icon } from './Pixel';
import { Btn, T } from './ui';
import { JoinWithCode } from './JoinWithCode';

type Open = null | 'create' | 'join' | 'leave';

export function FiresList({ onDone }: { onDone: () => void }) {
  const S = useApp();
  const [open, setOpen] = useState<Open>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const toggle = (o: Open) => { setOpen(open === o ? null : o); setNote(null); };

  if (!S.uid) return <T muted style={{ fontSize: 14 }}>Sign in to start your own campfire or join a friend’s.</T>;

  const create = async () => {
    if (busy || name.trim().length < 2) return;
    setBusy(true); setNote(null);
    const r = await S.createFire(name.trim());
    setBusy(false);
    if (r.status === 'created') { S.toast(r.name + ' is lit. Share its code from Invite.'); setName(''); onDone(); }
    else if (r.status === 'too_many') setNote('You’re at 6 campfires already. Leave one to start another.');
    else if (r.status === 'bad_name') setNote('Pick a name between 2 and 30 characters.');
    else setNote('Couldn’t start the campfire. Check your connection and try again.');
  };

  const leave = async () => {
    if (busy || !S.campfireId) return;
    const left = S.campfireName;
    setBusy(true); setNote(null);
    const r = await S.leaveFire(S.campfireId);
    setBusy(false);
    if (r === 'left') { S.toast('You left ' + left + '.'); setOpen(null); }
    else if (r === 'last') setNote('This is your only campfire, so you can’t leave it.');
    else setNote('Couldn’t leave. Check your connection and try again.');
  };

  const onlyOne = S.fires.length <= 1;
  return (
    <View style={{ gap: 14 }}>
      <View style={st.list} accessibilityRole="radiogroup">
        {S.fires.map((f, i) => {
          const on = f.id === S.campfireId;
          return (
            <Pressable key={f.id} onPress={() => { S.selectFire(f.id); onDone(); }} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={(p: any) => [st.row, i > 0 && st.rowSep, (p.hovered || p.pressed) && { backgroundColor: C.night4 }]}>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[st.name, on && { color: C.emberHi }]}>{f.name}</Text>
                <Text style={st.sub}>{f.count + (f.count === 1 ? ' person' : ' people') + ' · ' + (4 - f.count > 0 ? (4 - f.count) + ' free ' + (4 - f.count === 1 ? 'seat' : 'seats') : 'full')}</Text>
              </View>
              {on ? <Icon name="check" size={20} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 8 }}>
        <Btn label="Start a new campfire" kind={open === 'create' ? 'ember' : 'ghost'} icon="flame" onPress={() => toggle('create')} />
        {open === 'create' ? (
          <View style={st.panel}>
            <T style={{ fontSize: 14, color: C.creamDim }}>Give it a name. You’ll get a code to invite up to 3 people.</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput value={name} onChangeText={setName} onSubmitEditing={create} placeholder="e.g. Lakeside" placeholderTextColor={C.muted}
                maxLength={30} accessibilityLabel="Campfire name" returnKeyType="done" style={st.input} />
              <Btn label={busy ? 'Starting…' : 'Start'} onPress={create} disabled={busy || name.trim().length < 2} />
            </View>
          </View>
        ) : null}

        <Btn label="Join with a code" kind={open === 'join' ? 'ember' : 'ghost'} icon="key" onPress={() => toggle('join')} />
        {open === 'join' ? <View style={st.panel}><JoinWithCode onJoined={onDone} /></View> : null}
      </View>

      <View style={{ gap: 8 }}>
        {open === 'leave' ? (
          <View style={st.panel}>
            <T style={{ fontSize: 14, color: C.creamDim }}>{'Leave ' + S.campfireName + '? You won’t see its chat any more. Your other campfires stay, and you can come back with its code.'}</T>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Btn label={busy ? 'Leaving…' : 'Leave ' + S.campfireName} kind="plum" onPress={leave} disabled={busy} />
              <Btn label="Cancel" kind="ghost" onPress={() => setOpen(null)} disabled={busy} />
            </View>
          </View>
        ) : (
          <Pressable onPress={() => !onlyOne && toggle('leave')} disabled={onlyOne} accessibilityRole="button" style={st.leave}>
            <Text style={[st.leaveT, onlyOne && { color: C.muted, textDecorationLine: 'none' }]}>{'Leave ' + S.campfireName}</Text>
            {onlyOne ? <Text style={st.sub}>Your only campfire stays with you.</Text> : null}
          </Pressable>
        )}
      </View>
      {note ? <Text style={st.note} accessibilityLiveRegion="polite">{note}</Text> : null}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  list: { backgroundColor: C.night3, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10 },
  rowSep: { borderTopWidth: 1, borderTopColor: C.line },
  name: { fontFamily: F.display, fontSize: 17, color: C.cream },
  sub: { fontFamily: F.body, fontSize: 13.5, color: C.muted },
  panel: { backgroundColor: C.night3, borderRadius: 14, padding: 12, gap: 10 },
  input: { flex: 1, minWidth: 0, minHeight: 44, backgroundColor: C.night, borderWidth: 1, borderColor: C.line, borderRadius: 10, color: C.cream, paddingHorizontal: 12, fontFamily: F.body, fontSize: 16 },
  leave: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', gap: 2 },
  leaveT: { fontFamily: F.bodyBold, fontSize: 15, color: C.rose, textDecorationLine: 'underline' },
  note: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.amber },
}));
