import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { TODAY_DAY } from './data';

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
export type Call = { id: string; patientId: string; when: string; at?: string; reason: string; createdAt: number }; // at = start time (ISO)

export const DEMO_ACCOUNTS: (Clinician & { password: string })[] = [
  { name: 'Dr. Laura Aalto', role: 'Psychiatrist', email: 'laura.aalto@pinehollow.fi', clinic: 'Pinehollow Clinic · TMS maintenance', password: 'mellow' },
  { name: 'Mikko Saari', role: 'Psychiatric nurse', email: 'mikko.saari@pinehollow.fi', clinic: 'Pinehollow Clinic · TMS maintenance', password: 'mellow' },
];

type Store = {
  user: Clinician | null; signIn: (email: string, password: string) => boolean; signOut: () => void;
  day: number; setDay: (d: number) => void;
  notes: Note[]; addNote: (patientId: string, text: string) => void;
  calls: Call[]; addCall: (patientId: string, when: string, reason: string, at?: string) => void; cancelCall: (id: string) => void;
  reviewed: Record<string, number>; markReviewed: (patientId: string) => void;
  toast: string | null; say: (m: string) => void;
};
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Clinician | null>(sessLoad);
  const [day, setDay] = useState<number>(() => load('mellowcare.day', TODAY_DAY));
  const [notes, setNotes] = useState<Note[]>(() => load('mellowcare.notes', []));
  const [calls, setCalls] = useState<Call[]>(() => load('mellowcare.calls', []));
  const [reviewed, setReviewed] = useState<Record<string, number>>(() => load('mellowcare.reviewed', {}));
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => save('mellowcare.day', day), [day]);
  useEffect(() => save('mellowcare.notes', notes), [notes]);
  useEffect(() => save('mellowcare.calls', calls), [calls]);
  useEffect(() => save('mellowcare.reviewed', reviewed), [reviewed]);

  const say = useCallback((m: string) => { setToast(m); window.setTimeout(() => setToast((t) => (t === m ? null : t)), 2600); }, []);
  const signIn = useCallback((email: string, password: string) => {
    const a = DEMO_ACCOUNTS.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
    if (!a) return false;
    const { password: _pw, ...c } = a; void _pw;
    setUser(c);
    try { sessionStorage.setItem('mellowcare.session', JSON.stringify(c)); } catch { /* ignore */ }
    return true;
  }, []);
  const signOut = useCallback(() => { setUser(null); try { sessionStorage.removeItem('mellowcare.session'); } catch { /* ignore */ } go('/login'); }, []);
  const uid = () => Math.random().toString(36).slice(2, 9);

  const value = useMemo<Store>(() => ({
    user, signIn, signOut, day, setDay,
    notes, addNote: (patientId, text) => setNotes((n) => [{ id: uid(), patientId, text, at: Date.now(), author: user?.name ?? 'Clinician' }, ...n]),
    calls, addCall: (patientId, when, reason, at) => setCalls((c) => [...c, { id: uid(), patientId, when, at, reason, createdAt: Date.now() }]),
    cancelCall: (id) => setCalls((c) => c.filter((x) => x.id !== id)),
    reviewed, markReviewed: (patientId) => setReviewed((r) => ({ ...r, [patientId]: Date.now() })),
    toast, say,
  }), [user, signIn, signOut, day, notes, calls, reviewed, toast, say]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useStore = () => { const s = useContext(Ctx); if (!s) throw new Error('StoreProvider missing'); return s; };
