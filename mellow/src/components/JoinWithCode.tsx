// Join a friend's campfire with their invite code (supabase/campfire-invites.sql).
// Two steps: look the code up first (name and free seats, nobody's names), then join.
// `askToLeave`: show what you'd leave behind before switching (the invite sheet). In onboarding the
// person was only just seated at an automatic fire, so there is nothing to warn about.
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../state';
import * as sync from '../lib/sync';
import { C, F, themed } from '../theme';
import { Btn, T } from './ui';

const SEATS = 4;

export function JoinWithCode({ askToLeave, onJoined }: { askToLeave?: boolean; onJoined?: (name: string) => void }) {
  const S = useApp();
  const [code, setCode] = useState('');
  const [found, setFound] = useState<{ name: string; members: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!S.uid) return <T muted style={{ fontSize: 14 }}>Sign in to join a friend’s campfire with their code.</T>;

  const look = async () => {
    const c = code.trim();
    if (!c || busy) return;
    setBusy(true); setNote(null); setFound(null);
    const r = await sync.peekCampfire(c);
    setBusy(false);
    if (r.status === 'error') return setNote('Couldn’t check the code. Check your connection and try again.');
    if (r.status === 'not_found') return setNote('No campfire has that code. Check it with your friend.');
    if (r.mine) return setNote('You’re already at ' + r.name + '.');
    if (r.members >= SEATS) return setNote(r.name + ' is full right now. Ask your friend to try again later.');
    setFound({ name: r.name, members: r.members });
  };

  const join = async () => {
    if (busy) return;
    setBusy(true);
    const r = await S.joinCampfire(code.trim());
    setBusy(false);
    if (r.status === 'joined' || r.status === 'already') {
      setFound(null); setCode('');
      S.toast('You’re at ' + r.name + ' now.');
      onJoined?.(r.name);
    } else if (r.status === 'full') { setFound(null); setNote(r.name + ' filled up a moment ago.'); }
    else if (r.status === 'not_found') { setFound(null); setNote('No campfire has that code. Check it with your friend.'); }
    else setNote('Couldn’t join. Check your connection and try again.');
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={code} onChangeText={(v) => { setCode(v.toUpperCase()); setFound(null); setNote(null); }} onSubmitEditing={look}
          placeholder="e.g. PINE-7K2Q" placeholderTextColor={C.muted} autoCapitalize="characters" autoCorrect={false} returnKeyType="search"
          accessibilityLabel="Invite code" style={st.input} />
        <Btn label={busy && !found ? 'Checking…' : 'Find'} onPress={look} disabled={!code.trim() || busy} />
      </View>
      {note ? <Text style={st.note} accessibilityLiveRegion="polite">{note}</Text> : null}
      {found ? (
        <View style={st.card}>
          <Text style={st.name}>{found.name}</Text>
          <T muted style={{ fontSize: 14 }}>{found.members + ' of ' + SEATS + ' seats taken'}</T>
          {askToLeave && S.campfireId ? (
            <T style={{ fontSize: 14, color: C.creamDim }}>{'You’ll leave ' + S.campfireName + ' and its chat. Your marshmallow, streak and check-ins come with you.'}</T>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <Btn label={busy ? 'Joining…' : 'Join ' + found.name} onPress={join} disabled={busy} />
            <Btn label="Cancel" kind="ghost" onPress={() => setFound(null)} disabled={busy} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  input: { flex: 1, minWidth: 0, minHeight: 44, backgroundColor: C.night, borderWidth: 1, borderColor: C.line, borderRadius: 10, color: C.cream, paddingHorizontal: 12, fontFamily: F.display, fontSize: 17, letterSpacing: 1.5 },
  note: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.amber },
  card: { backgroundColor: C.night3, borderRadius: 14, padding: 14, gap: 4 },
  name: { fontFamily: F.display, fontSize: 18, color: C.cream },
}));
