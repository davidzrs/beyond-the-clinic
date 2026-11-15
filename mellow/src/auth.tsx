// Sign-up / log-in with Supabase (email + password, no email confirmation).
// If no backend is configured, the app runs locally as before. With a backend, the demo is a seeded account (DEMO_PATIENT).
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  // The care team side lives under /care (e.g. /care/login, /care/patients) on the same website.
  const [careTeam, setCareTeam] = useState(() => Platform.OS === 'web' && typeof window !== 'undefined' && !!window.location?.pathname?.startsWith('/care'));
  const openCareTeam = () => {
    if (Platform.OS === 'web') window.history.pushState(null, '', '/care/login');
    setCareTeam(true);
  };
  // Back / forward across the /care boundary: entering shows the portal; leaving reloads the page,
  // the same way signing out of the portal does, so none of the portal's styles linger in the app.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const on = () => {
      const inCare = window.location.pathname.startsWith('/care');
      if (inCare && !careTeam) setCareTeam(true);
      else if (!inCare && careTeam) window.location.reload();
    };
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, [careTeam]);
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

  if (careTeam) return <CarePortal />; // the portal handles its own sign-in and checks the account is care team
  if (session === undefined || (session && !role)) return <View style={{ flex: 1, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.ember} /></View>;
  if (role === 'clinician') return <CarePortal />; // a clinician who signed in on the patient form
  if (!session && !guest) return <AuthScreen onCareTeam={openCareTeam} />;
  return <Ctx.Provider value={{ session: session || null, guest: !session, signOut }}>{children}</Ctx.Provider>;
}

const LOGO = { name: '', color: 'vanilla', face: 'happy', hat: 'beanie', glasses: 'none', acc: 'scarf', item: 'mug' };

// A seeded demo patient (scripts/seed-care.mjs). Tapping it fills the log-in form, like the portal's demo accounts.
const DEMO_PATIENT = { name: 'Aino Virtanen', email: 'aino.virtanen@mellow.test', password: '123123123' };

function AuthScreen({ onCareTeam }: { onCareTeam: () => void }) {
  const insets = useSafeAreaInsets();
  const short = useWindowDimensions().height < 760; // laptops and small phones: tighter, so everything fits without scrolling
  const [mode, setMode] = useState<'up' | 'in'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sign-up only: the Terms must be accepted. Crisis alerts and the rest of privacy are asked in the onboarding.
  const [tos, setTos] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const submit = async () => {
    if (!supabase || busy) return;
    setError(null);
    if (!email.includes('@')) return setError('Please enter your email.');
    if (password.length < 6) return setError('Your password needs at least 6 characters.');
    if (mode === 'up' && !name.trim()) return setError('What should your campfire call you?');
    if (mode === 'up' && !tos) return setError('Please accept the Terms of Service to join.');
    setBusy(true);
    // A new account opens on the onboarding (see state.tsx). Noted before signing up, because the app
    // switches to the new account as soon as the session arrives.
    const pending = email.trim().toLowerCase();
    if (mode === 'up') await AsyncStorage.setItem('mellow.onboard.pending', pending).catch(() => {});
    const res = mode === 'up'
      ? await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim(), tos_accepted_at: new Date().toISOString(), tos_version: TERMS_VERSION } } })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (mode === 'up' && (res.error || !res.data.session)) AsyncStorage.removeItem('mellow.onboard.pending').catch(() => {});
    if (res.error) setError(friendly(res.error.message));
    else if (mode === 'up' && !res.data.session) setError('Almost there: check your email to confirm, then log in.');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.night }}>
      <ScrollView contentContainerStyle={[st.wrap, { paddingTop: insets.top + (short ? 12 : 24), paddingBottom: insets.bottom + (short ? 12 : 24) }, short && { gap: 14 }]} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Mallow a={LOGO} size={short ? 68 : 96} />
          <Text style={st.title}>Mellow</Text>
          <Text style={st.sub}>A cozy fire for hard days</Text>
        </View>

        <View style={st.card}>
          <View style={st.tabs}>
            {([['in', 'Log in'], ['up', 'Create account']] as const).map(([k, l]) => (
              <Pressable key={k} onPress={() => { setMode(k); setError(null); }} accessibilityRole="tab" accessibilityState={{ selected: mode === k }} style={[st.tab, mode === k && st.tabOn]}>
                <Text style={[st.tabT, mode === k && st.tabTOn]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          {mode === 'up' ? <Field label="Your name" value={name} onChange={setName} placeholder="How your campfire will see you" autoComplete="name" /> : null}
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" keyboard="email-address" autoComplete="email" />
          <Field label="Password" value={password} onChange={setPassword} placeholder="At least 6 characters" secure autoComplete={mode === 'up' ? 'new-password' : 'current-password'} onSubmit={submit} />

          {mode === 'up' ? (
            <View style={{ gap: 4, marginTop: 10 }}>
              <Check checked={tos} onToggle={() => setTos(!tos)} label="I agree to the Terms of Service">
                <Text style={st.checkT}>I agree to the <Text style={st.link} onPress={() => setShowTerms(true)} accessibilityRole="link">Terms of Service</Text>.</Text>
              </Check>
            </View>
          ) : null}

          {error ? <Text style={st.error} accessibilityLiveRegion="polite">{error}</Text> : null}

          <Pressable onPress={submit} disabled={busy} accessibilityRole="button" style={(p: any) => [st.go, (p.pressed || busy) && { opacity: 0.8 }]}>
            {busy ? <ActivityIndicator color={C.emberInk} /> : <Text style={st.goT}>{mode === 'up' ? 'Join a campfire' : 'Log in'}</Text>}
          </Pressable>
        </View>

        {/* The two other ways in, side by side so both fit on a laptop screen without scrolling. */}
        <View style={st.others}>
          <Pressable onPress={() => { setMode('in'); setEmail(DEMO_PATIENT.email); setPassword(DEMO_PATIENT.password); setError(null); }}
            accessibilityRole="button" accessibilityLabel={'Fill in the demo account of ' + DEMO_PATIENT.name}
            style={(p: any) => [st.careTeam, (p.hovered || p.pressed) && { borderColor: C.lineHi }]}>
            <Text style={st.careTeamT}>Demo account</Text>
            <Text style={st.careTeamS}>{DEMO_PATIENT.email}</Text>
            <Text style={st.careTeamS}>Password {DEMO_PATIENT.password}</Text>
          </Pressable>
          <Pressable onPress={onCareTeam} accessibilityRole="button" style={(p: any) => [st.careTeam, (p.hovered || p.pressed) && { borderColor: C.lineHi }]}>
            <Text style={st.careTeamT}>Part of a care team?</Text>
            <Text style={st.careTeamS}>Clinician or therapist sign-in</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Terms visible={showTerms} onClose={() => setShowTerms(false)} />
    </KeyboardAvoidingView>
  );
}

// A tickable box with its label. The whole row is the control, so it's easy to hit.
function Check({ checked, onToggle, label, children }: { checked: boolean; onToggle: () => void; label: string; children: React.ReactNode }) {
  return (
    <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked }} aria-checked={checked} accessibilityLabel={label} style={st.check}>
      {/* As tall as one line of text, so the box sits centred on the first line (one-line or several). */}
      {/* Drawn with a View (not an icon glyph): the glyph was clipped at the bottom on Android. */}
      <View style={st.box}>
        <View style={[st.boxIn, checked && { backgroundColor: C.ember, borderColor: C.ember }]}>{checked ? <Ionicons name="checkmark" size={14} color={C.emberInk} /> : null}</View>
      </View>
      <View style={{ flex: 1, gap: 3 }}>{children}</View>
    </Pressable>
  );
}

// Prototype terms for the Junction demo. Bump TERMS_VERSION when the text changes.
const TERMS_VERSION = '2026-11-15';
const TERMS: [string, string][] = [
  ['Mellow is not a medical service', 'Mellow helps you stay well between appointments. It doesn’t diagnose, treat or replace your care team, and it isn’t an emergency service. If you are in danger, call 112.'],
  ['Mellow uses AI', 'Some parts of Mellow are run by an AI and are always labelled as such: checking chat messages before they are posted, and Ember’s questions at the campfire. The AI can be wrong. It never gives medical advice.'],
  ['The campfire chat', 'Be kind. Messages that insult, threaten, harass, share someone else’s private details, push anyone towards self-harm, or advertise are not posted. Each one counts as a strike, and after 3 strikes you can read the chat but no longer post.'],
  ['When a message sounds like a crisis', 'It isn’t posted. Instead you see who you can talk to right away. If you turned on crisis alerts (asked when you join, and under Support), your care team is alerted and can read that message and the chat just before it, with everyone else’s names hidden.'],
  ['Your data', 'Your check-ins and questionnaires are shared with your care team only if you chose to share them. Chat messages are only seen by the people at your campfire. You can ask us to delete your account and data at any time.'],
  ['This is a prototype', 'Mellow was built for Junction 2026. Demo patients use synthetic data. Please don’t rely on it for your care.'],
];

function Terms({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable onPress={() => {}} style={st.terms}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, gap: 14 }}>
            <Text style={st.termsH}>Terms of Service</Text>
            <Text style={st.checkS}>Version {TERMS_VERSION}</Text>
            {TERMS.map(([h, t]) => (
              <View key={h} style={{ gap: 4 }}>
                <Text style={st.termsT}>{h}</Text>
                <Text style={st.termsP}>{t}</Text>
              </View>
            ))}
            <Pressable onPress={onClose} accessibilityRole="button" style={st.go}><Text style={st.goT}>Close</Text></Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
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
  wrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 20, width: '100%', maxWidth: 460, alignSelf: 'center' },
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
  check: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4 },
  box: { height: 20, width: 22, alignItems: 'center', justifyContent: 'center' },
  boxIn: { width: 19, height: 19, borderRadius: 5, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  checkT: { fontFamily: F.body, fontSize: 14.5, lineHeight: 20, color: C.cream },
  checkS: { fontFamily: F.body, fontSize: 12.5, lineHeight: 17, color: C.muted },
  link: { fontFamily: F.bodyBold, color: C.emberHi, textDecorationLine: 'underline' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  terms: { width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: C.night2, borderRadius: 20, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  termsH: { fontFamily: F.displayBold, fontSize: 24, color: C.cream },
  termsT: { fontFamily: F.display, fontSize: 16, color: C.cream },
  termsP: { fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: C.creamDim },
  others: { flexDirection: 'row', gap: 10 },
  careTeam: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 10, paddingHorizontal: 12, minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: C.line },
  careTeamT: { fontFamily: F.display, fontSize: 15, color: C.cream },
  careTeamS: { fontFamily: F.body, fontSize: 12.5, color: C.muted, textAlign: 'center' },
}));
