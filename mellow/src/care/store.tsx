import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEMO_PATIENTS, patientFromRows, setPatients, TODAY_DAY, type MetricRow, type ProfileRow } from './data';
import { supabase } from './supabase';
import { exitPortal } from './exit';

// ---------- tiny hash router: #/login, #/patients, #/patients/:id, #/calls ----------
export function useHashRoute() {
  const read = () => (window.location.hash.replace(/^#/, '') || '/patients');
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => setPath(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}
export const go = (path: string) => { window.location.hash = path; window.scrollTo({ top: 0 }); };

// ---------- persistence (per browser; demo only) ----------
const load = <T,>(k: string, fallback: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const sessLoad = () => { try { const v = sessionStorage.getItem('mellowcare.session'); return v ? (JSON.parse(v) as Clinician) : null; } catch { return null; } };

export type Clinician = { name: string; role: string; email: string; clinic: string };
export type Note = { id: string; patientId: string; text: string; at: number; author: string };
export type Call = { id: string; patientId: string; when: string; reason: string; createdAt: number };

// Real Supabase accounts (created by mellow/scripts/seed-care.mjs). Any @pinehollow.fi account is care team.
const CLINIC = 'Pinehollow Clinic · TMS maintenance';
export const DEMO_PASSWORD = '123123123';
export const DEMO_ACCOUNTS: (Clinician & { password: string })[] = [
  { name: 'Dr. Laura Aalto', role: 'Psychiatrist', email: 'laura.aalto@pinehollow.fi', clinic: CLINIC, password: DEMO_PASSWORD },
  { name: 'Mikko Saari', role: 'Psychiatric nurse', email: 'mikko.saari@pinehollow.fi', clinic: CLINIC, password: DEMO_PASSWORD },
];
const roleTitle = (name: string) => (/^dr\.?\s/i.test(name) ? 'Psychiatrist' : 'Psychiatric nurse');

type Store = {
  user: Clinician | null; signIn: (email: string, password: string) => Promise<string | null>; signOut: () => void;
  loading: boolean; live: boolean; refresh: () => Promise<void>;
  day: number; setDay: (d: number) => void;
  notes: Note[]; addNote: (patientId: string, text: string) => void;
  calls: Call[]; addCall: (patientId: string, when: string, reason: string) => void; cancelCall: (id: string) => void;
  reviewed: Record<string, number>; markReviewed: (patientId: string) => void;
  toast: string | null; say: (m: string) => void;
};
const Ctx = createContext<Store | null>(null);

// Supabase returns at most 1000 rows per request; page through bigger tables.
async function all<T>(table: string, cols = '*'): Promise<T[]> {
  if (!supabase) return [];
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(cols).range(from, from + 999);
    if (error) throw error;
    out.push(...((data || []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Clinician | null>(supabase ? null : sessLoad);
  const [loading, setLoading] = useState(!!supabase);
  const [live, setLive] = useState(false); // true once real patients are loaded from Supabase
  const [day, setDay] = useState<number>(() => load('mellowcare.day', TODAY_DAY));
  const [notes, setNotes] = useState<Note[]>(() => (supabase ? [] : load('mellowcare.notes', [])));
  const [calls, setCalls] = useState<Call[]>(() => (supabase ? [] : load('mellowcare.calls', [])));
  const [reviewed, setReviewed] = useState<Record<string, number>>(() => load('mellowcare.reviewed', {}));
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => save('mellowcare.day', day), [day]);
  useEffect(() => { if (!supabase) save('mellowcare.notes', notes); }, [notes]);
  useEffect(() => { if (!supabase) save('mellowcare.calls', calls); }, [calls]);
  useEffect(() => save('mellowcare.reviewed', reviewed), [reviewed]);

  const say = useCallback((m: string) => { setToast(m); window.setTimeout(() => setToast((t) => (t === m ? null : t)), 2600); }, []);

  // Everything a clinician can see: every patient's profile, daily summary, check-ins and questionnaires.
  const refresh = useCallback(async () => {
    if (!supabase) return;
    const [profiles, metrics, checkins, qs, phq, noteRows, callRows] = await Promise.all([
      all<ProfileRow & { role: string }>('profiles', 'id, name, role, weeks_since_tms'),
      all<MetricRow>('daily_metrics'),
      all<{ user_id: string; day: string; mood: string }>('checkins', 'user_id, day, mood'),
      all<{ user_id: string; day: string; phq9: number | null; who5: number | null }>('questionnaires'),
      all<{ user_id: string; created_at: string; score: number }>('phq9', 'user_id, created_at, score'),
      all<{ id: number; patient_id: string; text: string; created_at: string; author_name: string | null }>('care_notes'),
      all<{ id: number; patient_id: string; when_text: string; reason: string | null; created_at: string }>('care_calls'),
    ]);
    const by = <T extends { user_id: string }>(rows: T[], id: string) => rows.filter((r) => r.user_id === id);
    setPatients(profiles.filter((p) => p.role === 'patient').map((p) => patientFromRows(p, by(metrics, p.id), by(checkins, p.id), by(qs, p.id), by(phq, p.id))));
    setNotes(noteRows.map((n) => ({ id: String(n.id), patientId: n.patient_id, text: n.text, at: Date.parse(n.created_at), author: n.author_name || 'Care team' })).sort((a, b) => b.at - a.at));
    setCalls(callRows.map((c) => ({ id: String(c.id), patientId: c.patient_id, when: c.when_text, reason: c.reason || '', createdAt: Date.parse(c.created_at) })));
    setLive(true);
  }, []);

  // Restore a session, check the account is care team, then load the clinic.
  const enter = useCallback(async (): Promise<string | null> => {
    if (!supabase) return 'No Supabase connection.';
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 'Not signed in.';
    const { data: prof } = await supabase.from('profiles').select('name, role').eq('id', session.user.id).maybeSingle();
    if (!prof || prof.role !== 'clinician') { await supabase.auth.signOut(); return 'This account isn’t part of a care team.'; }
    await refresh();
    setUser({ name: prof.name, role: roleTitle(prof.name), email: session.user.email || '', clinic: CLINIC });
    return null;
  }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    enter().catch(() => {}).finally(() => setLoading(false));
  }, [enter]);

  // Live: when a patient checks in (or anything a clinician can see changes), re-read within a moment.
  // Also re-read when the tab comes back into focus, in case a change was missed.
  useEffect(() => {
    if (!supabase || !user) return;
    let t: number | undefined;
    const soon = () => { window.clearTimeout(t); t = window.setTimeout(() => { refresh().catch(() => {}); }, 400); };
    // One channel per table, so a table that isn't enabled for live updates can't silence the others.
    const chans = ['checkins', 'daily_metrics', 'questionnaires', 'phq9', 'care_notes', 'care_calls'].map((table) =>
      supabase!.channel('care-live-' + table)
        .on('postgres_changes', { event: '*', schema: 'public', table }, soon)
        .subscribe((status) => { if (status === 'CHANNEL_ERROR') console.warn('[care-live] no live updates for', table); }));
    const onFocus = () => soon();
    window.addEventListener('focus', onFocus);
    const poll = window.setInterval(soon, 30000);
    return () => { window.clearTimeout(t); window.clearInterval(poll); window.removeEventListener('focus', onFocus); chans.forEach((c) => supabase?.removeChannel(c)); };
  }, [user, refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      const a = DEMO_ACCOUNTS.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
      if (!a) return 'That email and password don’t match a demo account.';
      const { password: _pw, ...c } = a; void _pw;
      setUser(c);
      try { sessionStorage.setItem('mellowcare.session', JSON.stringify(c)); } catch { /* ignore */ }
      return null;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return /invalid/i.test(error.message) ? 'That email and password don’t match.' : error.message;
    setLoading(true);
    try { return await enter(); } finally { setLoading(false); }
  }, [enter]);
  // Signing out of the portal leaves it for the Mellow sign-in page (one website for everyone).
  const signOut = useCallback(() => {
    setUser(null); setLive(false); setPatients(DEMO_PATIENTS);
    try { sessionStorage.removeItem('mellowcare.session'); } catch { /* ignore */ }
    exitPortal();
  }, []);
  const uid = () => Math.random().toString(36).slice(2, 9);

  const addNote = useCallback((patientId: string, text: string) => {
    const author = user?.name ?? 'Clinician';
    const temp: Note = { id: uid(), patientId, text, at: Date.now(), author };
    setNotes((n) => [temp, ...n]);
    if (supabase) supabase.from('care_notes').insert({ patient_id: patientId, text, author_name: author }).select('id').single()
      .then(({ data, error }) => { if (error) say('Couldn’t save the note: ' + error.message); else setNotes((n) => n.map((x) => (x.id === temp.id ? { ...x, id: String(data.id) } : x))); });
  }, [user, say]);
  const addCall = useCallback((patientId: string, when: string, reason: string) => {
    const temp: Call = { id: uid(), patientId, when, reason, createdAt: Date.now() };
    setCalls((c) => [...c, temp]);
    if (supabase) supabase.from('care_calls').insert({ patient_id: patientId, when_text: when, reason }).select('id').single()
      .then(({ data, error }) => { if (error) say('Couldn’t save the call: ' + error.message); else setCalls((c) => c.map((x) => (x.id === temp.id ? { ...x, id: String(data.id) } : x))); });
  }, [say]);
  const cancelCall = useCallback((id: string) => {
    setCalls((c) => c.filter((x) => x.id !== id));
    if (supabase && /^\d+$/.test(id)) supabase.from('care_calls').delete().eq('id', Number(id)).then(({ error }) => { if (error) say('Couldn’t cancel: ' + error.message); });
  }, [say]);

  const value = useMemo<Store>(() => ({
    user, signIn, signOut, loading, live, refresh, day, setDay,
    notes, addNote, calls, addCall, cancelCall,
    reviewed, markReviewed: (patientId) => setReviewed((r) => ({ ...r, [patientId]: Date.now() })),
    toast, say,
  }), [user, signIn, signOut, loading, live, refresh, day, notes, addNote, calls, addCall, cancelCall, reviewed, toast, say]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useStore = () => { const s = useContext(Ctx); if (!s) throw new Error('StoreProvider missing'); return s; };
