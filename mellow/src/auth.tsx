// Sign-up / log-in with Supabase (email + password, no email confirmation).
// If no backend is configured, or you choose "Try the demo", the app runs locally as before.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { hasBackend, supabase } from './lib/supabase';
import { C, F, themed } from './theme';
import { Mallow } from './components/Pixel';
import { CarePortal } from './care/Portal';

type AuthState = { session: Session | null; guest: boolean; signOut: () => Promise<void> };
const Ctx = createContext<AuthState>({ session: null, guest: true, signOut: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(hasBackend ? undefined : null);
  const [guest, setGuest] = useState(!hasBackend);
  // One website, two ways in: patients get the Mellow app, care team accounts get the clinician portal.
  const [doctor, setDoctor] = useState(() => typeof window !== 'undefined' && !!window.location?.hash?.startsWith('#/'));
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => setSession(null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const id = session?.user.id;
    if (!supabase || !id) { setRole(null); return; }
    supabase.from('profiles').select('role').eq('id', id).maybeSingle().then(({ data }) => setRole((data as any)?.role || 'patient'), () => setRole('patient'));
  }, [session?.user.id]);
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setGuest(!hasBackend); };

  if (doctor) return <CarePortal />; // the portal handles its own sign-in and checks the account is care team
  if (session === undefined || (session && !role)) return <View style={{ flex: 1, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.ember} /></View>;
  if (role === 'clinician') return <CarePortal />; // a clinician who signed in on the patient form
  if (!session && !guest) return <AuthScreen onGuest={() => setGuest(true)} onDoctor={() => setDoctor(true)} />;
  return <Ctx.Provider value={{ session: session || null, guest: !session, signOut }}>{children}</Ctx.Provider>;
}

const LOGO = { name: '', color: 'vanilla', face: 'happy', hat: 'beanie', glasses: 'none', acc: 'scarf', item: 'mug' };

function AuthScreen({ onGuest, onDoctor }: { onGuest: () => void; onDoctor: () => void }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'up' | 'in'>('up');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!supabase || busy) return;
    setError(null);
    if (!email.includes('@')) return setError('Please enter your email.');
    if (password.length < 6) return setError('Your password needs at least 6 characters.');
    if (mode === 'up' && !name.trim()) return setError('What should your campfire call you?');
    setBusy(true);
    const res = mode === 'up'
      ? await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (res.error) setError(friendly(res.error.message));
    else if (mode === 'up' && !res.data.session) setError('Almost there: check your email to confirm, then log in.');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.night }}>
      <ScrollView contentContainerStyle={[st.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Mallow a={LOGO} size={96} />
          <Text style={st.title}>Mellow</Text>
          <Text style={st.sub}>A cozy fire for hard days</Text>
        </View>

        <View style={st.card}>
          <View style={st.tabs}>
            {([['up', 'Create account'], ['in', 'Log in']] as const).map(([k, l]) => (
              <Pressable key={k} onPress={() => { setMode(k); setError(null); }} accessibilityRole="tab" accessibilityState={{ selected: mode === k }} style={[st.tab, mode === k && st.tabOn]}>
                <Text style={[st.tabT, mode === k && st.tabTOn]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          {mode === 'up' ? <Field label="Your name" value={name} onChange={setName} placeholder="How your campfire will see you" autoComplete="name" /> : null}
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" keyboard="email-address" autoComplete="email" />
          <Field label="Password" value={password} onChange={setPassword} placeholder="At least 6 characters" secure autoComplete={mode === 'up' ? 'new-password' : 'current-password'} onSubmit={submit} />

          {error ? <Text style={st.error} accessibilityLiveRegion="polite">{error}</Text> : null}

          <Pressable onPress={submit} disabled={busy} accessibilityRole="button" style={(p: any) => [st.go, (p.pressed || busy) && { opacity: 0.8 }]}>
            {busy ? <ActivityIndicator color={C.emberInk} /> : <Text style={st.goT}>{mode === 'up' ? 'Join a campfire' : 'Log in'}</Text>}
          </Pressable>
        </View>

        <Pressable onPress={onGuest} style={{ alignSelf: 'center', padding: 10 }}><Text style={st.guest}>Just looking? Try the demo</Text></Pressable>
        <Pressable onPress={onDoctor} accessibilityRole="button" style={(p: any) => [st.doctor, (p.hovered || p.pressed) && { borderColor: C.lineHi }]}>
          <Text style={st.doctorT}>Are you a doctor?</Text>
          <Text style={st.doctorS}>Care team sign-in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, secure, keyboard, autoComplete, onSubmit }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; secure?: boolean; keyboard?: 'email-address'; autoComplete?: any; onSubmit?: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={st.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.muted} secureTextEntry={secure}
        keyboardType={keyboard} autoCapitalize={keyboard || secure ? 'none' : 'words'} autoCorrect={false} autoComplete={autoComplete}
        onSubmitEditing={onSubmit} accessibilityLabel={label} style={st.input} />
    </View>
  );
}

function friendly(m: string) {
  if (/invalid login/i.test(m)) return 'That email and password don’t match.';
  if (/already registered/i.test(m)) return 'There’s already an account with that email. Try logging in.';
  if (/rate limit/i.test(m)) return 'Too many tries. Wait a minute and try again.';
  return m;
}

const st = themed(() => StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 24, width: '100%', maxWidth: 460, alignSelf: 'center' },
  title: { fontFamily: F.displayBold, fontSize: 34, color: C.cream },
  sub: { fontFamily: F.body, fontSize: 15, color: C.creamDim },
  card: { backgroundColor: C.night2, borderRadius: 24, padding: 18, gap: 14, borderWidth: 1, borderColor: C.line },
  tabs: { flexDirection: 'row', backgroundColor: C.night3, borderRadius: 999, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  tabOn: { backgroundColor: C.night2 },
  tabT: { fontFamily: F.bodyBold, fontSize: 14, color: C.muted },
  tabTOn: { color: C.cream },
  label: { fontFamily: F.bodyBold, fontSize: 13.5, color: C.creamDim },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.night3, paddingHorizontal: 14, fontFamily: F.body, fontSize: 16, color: C.cream },
  error: { fontFamily: F.bodyBold, fontSize: 13.5, color: C.rose },
  go: { backgroundColor: C.ember, borderRadius: 999, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  goT: { fontFamily: F.bodyBold, fontSize: 16, color: C.emberInk },
  guest: { fontFamily: F.bodyBold, fontSize: 14.5, color: C.creamDim, textDecorationLine: 'underline' },
  doctor: { alignSelf: 'center', alignItems: 'center', gap: 2, paddingVertical: 10, paddingHorizontal: 22, minHeight: 44, borderRadius: 16, borderWidth: 1, borderColor: C.line },
  doctorT: { fontFamily: F.display, fontSize: 15, color: C.cream },
  doctorS: { fontFamily: F.body, fontSize: 12.5, color: C.muted },
}));
