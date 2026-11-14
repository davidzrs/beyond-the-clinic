// Turns the shared demo data (../mellow/src/demo/demoData.json) into patients a clinician can follow.
// Sam's 90 days are the same timeline the Mellow app shows. The other clinic patients only have a
// snapshot in the JSON (score + reasons for "today"), so their histories are generated here from a
// fixed seed: same numbers on every load, ending exactly at the snapshot score on the last day.
import raw from '../../mellow/src/demo/demoData.json';

type Driver = { key: string; label: string; z: number; from: number; to: number; change: string };
type Q = { day: number; date: string; who5: number; phq9?: number };
type RawPerson = { name: string; role: string; series: Record<string, (number | null)[]>; drivers: Driver[][]; questionnaires: Q[] };
type RawClinic = { patient: string; weeksSinceTms: number; risk: number | null; level: string; drivers: string[]; lastCheckIn: string };
type Raw = {
  days: number; startDate: string; generatedFrom: string;
  events: { relapseStart: number; firstAlertDay: number; firstHighDay: number; carePlanDay: number; recoveredDay: number };
  people: Record<string, RawPerson>; clinic: RawClinic[];
};
const D = raw as unknown as Raw;

export const DAYS = D.days; // 90
export const SOURCE = D.generatedFrom;

// ---------- dates ----------
export function dateOf(day: number) {
  const d = new Date(D.startDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + day - 1);
  return d;
}
export const fmtDate = (day: number, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  dateOf(day).toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' });
export const fmtLong = (day: number) => fmtDate(day, { weekday: 'short', day: 'numeric', month: 'short' });
// The demo's last day is "today" when the real date is past it.
export const TODAY_DAY = (() => {
  const start = new Date(D.startDate + 'T00:00:00Z').getTime();
  const n = Math.floor((Date.now() - start) / 86400000) + 1;
  return Math.max(1, Math.min(DAYS, n));
})();

// ---------- levels ----------
export type Level = 'calibrating' | 'steady' | 'watch' | 'high';
export const levelOf = (r: number | null | undefined): Level => (r == null ? 'calibrating' : r >= 55 ? 'high' : r >= 30 ? 'watch' : 'steady');
export const LEVEL: Record<Level, { label: string; hint: string; rank: number }> = {
  high: { label: 'Call suggested', hint: 'Several signals match this person’s early warning signs.', rank: 3 },
  watch: { label: 'Worth watching', hint: 'A few signals moved away from this person’s usual range.', rank: 2 },
  steady: { label: 'Steady', hint: 'Everything is within this person’s usual range.', rank: 1 },
  calibrating: { label: 'Learning normal', hint: 'Not enough days yet to know what normal looks like.', rank: 0 },
};
export const THRESHOLDS = { watch: 30, high: 55 };

// ---------- signals ----------
export type SignalKey = 'sleepHours' | 'restingHr' | 'hrvRmssd' | 'morningSteps' | 'steps' | 'screenMinutes' | 'lateNightScreenMinutes' | 'messagesSent' | 'mood';
export type SignalDef = {
  key: SignalKey; label: string; unit: string; worse: 'up' | 'down' | 'both';
  fmt: (v: number) => string; delta: (to: number, from: number) => string;
  range: (lo: number, hi: number) => string; // "970–2,360 steps"
  min?: number; max?: number; // physical limits for the usual range
};
const pct = (to: number, from: number) => { const p = Math.round(((to - from) / (from || 1)) * 100); return (p > 0 ? '+' : p < 0 ? '−' : '±') + Math.abs(p) + '%'; };
const signed = (v: number, d = 0, u = '') => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d) + u;
const loc = (v: number) => Math.round(v).toLocaleString('en-GB');
const sig = (key: SignalKey, label: string, worse: SignalDef['worse'], n: (v: number) => string, u: string, delta: SignalDef['delta'], lim: { min?: number; max?: number } = { min: 0 }): SignalDef =>
  ({ key, label, unit: u.trim(), worse, fmt: (v) => n(v) + u, delta, range: (lo, hi) => n(lo) + '–' + n(hi) + u, ...lim });
export const SIGNALS: SignalDef[] = [
  sig('sleepHours', 'Sleep', 'both', (v) => v.toFixed(1), ' h', (a, b) => signed(a - b, 1, ' h')),
  sig('restingHr', 'Resting heart rate', 'up', (v) => String(Math.round(v)), ' bpm', (a, b) => signed(Math.round(a - b), 0, ' bpm')),
  sig('hrvRmssd', 'Heart rate variability', 'down', (v) => String(Math.round(v)), ' ms', pct),
  sig('morningSteps', 'Morning activity', 'down', loc, ' steps', pct),
  sig('steps', 'Daily steps', 'down', loc, '', pct),
  sig('screenMinutes', 'Screen time', 'up', (v) => (v / 60).toFixed(1), ' h', (a, b) => signed((a - b) / 60, 1, ' h')),
  sig('lateNightScreenMinutes', 'Late-night phone use', 'up', (v) => String(Math.round(v)), ' min', (a, b) => signed(Math.round(a - b), 0, ' min')),
  sig('messagesSent', 'Messages to friends', 'down', (v) => v.toFixed(0), ' / day', pct),
  sig('mood', 'Check-in mood', 'down', (v) => v.toFixed(1), ' / 5', (a, b) => signed(a - b, 1), { min: 1, max: 5 }),
];
export const SIGNAL = Object.fromEntries(SIGNALS.map((s) => [s.key, s])) as Record<SignalKey, SignalDef>;

// ---------- patient model ----------
export type Reason = { key: SignalKey | string; label: string; change: string; text: string; z: number }; // change = compact ("−48%"), text = plain sentence
export type Questionnaire = { day: number; phq9?: number; who5?: number };
export type Patient = {
  id: string; name: string; initials: string; isSam: boolean;
  firstDay: number; // first day with data (1-based, shared calendar)
  weeksAtEnd: number; // weeks after the last TMS session on the demo's last day
  risk: (number | null)[]; // one value per calendar day, null = no score yet
  series: Record<SignalKey, (number | null)[]>;
  baseline: { from: number; to: number }; // days used as "usual"
  reasonsAt: (day: number) => Reason[];
  questionnaires: Questionnaire[];
  lastCheckIn: string;
  events: { day: number; label: string }[];
};

export const mean = (a: (number | null | undefined)[]) => { const v = a.filter((x): x is number => x != null && !Number.isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
export const sd = (a: (number | null)[]) => { const v = a.filter((x): x is number => x != null); const m = mean(v); if (m == null || v.length < 2) return null; return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); };
export const slice = (a: (number | null)[], from: number, to: number) => a.slice(Math.max(0, from - 1), Math.max(0, to)); // inclusive days

function baselineStats(p: Pick<Patient, 'series' | 'baseline'>, key: SignalKey) {
  const w = slice(p.series[key], p.baseline.from, p.baseline.to);
  return { m: mean(w), s: sd(w) };
}
export function signalNow(p: Patient, key: SignalKey, day: number) {
  const recent = mean(slice(p.series[key], day - 6, day));
  const { m, s } = baselineStats(p, key);
  const z = recent != null && m != null && s ? (recent - m) / s : null;
  return { recent, base: m, sd: s, z };
}
const isWorse = (def: SignalDef, z: number) => (def.worse === 'both' ? Math.abs(z) : def.worse === 'up' ? z : -z);

// A change in plain words, e.g. "Morning activity 48% lower than usual", "Sleeping 1.3 h more than usual".
export function describeChange(key: string, label: string, now: number, usual: number): string {
  const up = now >= usual;
  const pctOf = () => Math.abs(Math.round(((now - usual) / (usual || 1)) * 100)) + '%';
  const d = Math.abs(now - usual);
  switch (key) {
    case 'sleepHours': return `Sleeping ${d.toFixed(1)} h ${up ? 'more' : 'less'} than usual`;
    case 'sleepEfficiency': return `Sleep quality ${Math.round(d * (usual <= 1 ? 100 : 1))} points ${up ? 'higher' : 'lower'} than usual`;
    case 'restingHr': return `Resting heart rate ${Math.round(d)} bpm ${up ? 'higher' : 'lower'} than usual`;
    case 'hrvRmssd': return `Heart rate variability ${pctOf()} ${up ? 'higher' : 'lower'} than usual`;
    case 'morningSteps': return `Morning activity ${pctOf()} ${up ? 'higher' : 'lower'} than usual`;
    case 'steps': return `${pctOf()} ${up ? 'more' : 'fewer'} steps than usual`;
    case 'screenMinutes': return `${(d / 60).toFixed(1)} h ${up ? 'more' : 'less'} screen time than usual`;
    case 'lateNightScreenMinutes': return `${Math.round(d)} min ${up ? 'more' : 'less'} phone use late at night`;
    case 'messagesSent': return `${pctOf()} ${up ? 'more' : 'fewer'} messages to friends`;
    case 'mood': return `Check-in mood ${d.toFixed(1)} points ${up ? 'higher' : 'lower'} than usual`;
    default: return `${label} ${up ? 'higher' : 'lower'} than usual`;
  }
}

function computedReasons(p: Patient, day: number): Reason[] {
  if (day - p.firstDay < 14) return [];
  const out: Reason[] = [];
  for (const def of SIGNALS) {
    if (def.key === 'steps' || def.key === 'lateNightScreenMinutes') continue; // covered by morning activity / screen time
    const { recent, base, z } = signalNow(p, def.key, day);
    if (recent == null || base == null || z == null) continue;
    const w = isWorse(def, z);
    if (w >= 0.8) out.push({ key: def.key, label: def.label, change: def.delta(recent, base), text: describeChange(def.key, def.label, recent, base), z: w });
  }
  out.sort((a, b) => b.z - a.z);
  const strong = out.filter((r) => r.z >= 1.5);
  // A flagged person always gets at least their biggest shift as the reason.
  return (strong.length ? strong : (p.risk[day - 1] ?? 0) >= 30 ? out.slice(0, 1) : []).slice(0, 3);
}

// ---------- seeded generator for the snapshot patients ----------
function rng(seedStr: string) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const KEYWORDS: [RegExp, SignalKey[]][] = [
  [/sleep/i, ['sleepHours']], [/morning activity/i, ['morningSteps', 'steps']], [/resting hr/i, ['restingHr']], [/hrv/i, ['hrvRmssd']],
  [/screen/i, ['screenMinutes', 'lateNightScreenMinutes']], [/messages/i, ['messagesSent']], [/mood/i, ['mood']],
];
// Effect of a full relapse-like shift (drift = 1) on each signal.
const EFFECT: Record<SignalKey, (base: number) => number> = {
  sleepHours: () => 1.4, restingHr: () => 6, hrvRmssd: (b) => -0.24 * b, morningSteps: (b) => -0.5 * b, steps: (b) => -0.32 * b,
  screenMinutes: () => 128, lateNightScreenMinutes: () => 40, messagesSent: (b) => -0.7 * b, mood: () => -2.2,
};

function synthPatient(row: RawClinic): Patient {
  const r = rng(row.patient);
  const gauss = () => (r() + r() + r() + r() - 2) * 0.87;
  const target = row.risk ?? 18;
  const level = levelOf(row.risk);
  const firstDay = Math.max(1, DAYS - row.weeksSinceTms * 7 + 1);
  const calib = firstDay + 6;
  const onset = level === 'high' ? DAYS - 9 - Math.floor(r() * 6) : level === 'watch' ? DAYS - 5 - Math.floor(r() * 4) : DAYS + 1;
  const rest = 8 + r() * 10;
  // risk: quiet baseline, then an eased climb to the snapshot value
  const risk: (number | null)[] = [];
  let wob = 0;
  for (let d = 1; d <= DAYS; d++) {
    if (d < calib) { risk.push(null); continue; }
    wob = wob * 0.6 + gauss() * 3;
    let v: number;
    if (level === 'steady' || level === 'calibrating') v = target + wob * 0.9 + Math.sin(d / 5 + r()) * 2;
    else if (d < onset) v = rest + wob;
    else { const t = (d - onset) / (DAYS - onset); v = rest + (target - rest) * (t * t * (3 - 2 * t)) + wob * 0.7; }
    risk.push(Math.round(Math.max(1, Math.min(97, v))));
  }
  risk[DAYS - 1] = row.risk;
  const drift = risk.map((v) => (v == null ? 0 : Math.max(0, Math.min(1, (v - 14) / 48))));
  const emphasised = new Set<SignalKey>();
  for (const d of row.drivers) for (const [re, keys] of KEYWORDS) if (re.test(d)) keys.forEach((k) => emphasised.add(k));
  if (!emphasised.size && (level === 'watch' || level === 'high')) { const pick = KEYWORDS[Math.floor(r() * KEYWORDS.length)][1]; pick.forEach((k) => emphasised.add(k)); }
  const base: Record<SignalKey, number> = {
    sleepHours: 6.8 + r() * 0.9, restingHr: 57 + r() * 10, hrvRmssd: 36 + r() * 22, morningSteps: 1300 + r() * 1200, steps: 6500 + r() * 4000,
    screenMinutes: 150 + r() * 90, lateNightScreenMinutes: 10 + r() * 20, messagesSent: 5 + r() * 6, mood: 3.6 + r() * 0.9,
  };
  const noise: Record<SignalKey, number> = { sleepHours: 0.45, restingHr: 1.6, hrvRmssd: 4, morningSteps: 380, steps: 1700, screenMinutes: 22, lateNightScreenMinutes: 8, messagesSent: 1.6, mood: 0.45 };
  const series = {} as Record<SignalKey, (number | null)[]>;
  for (const def of SIGNALS) {
    const k = def.key; const b = base[k];
    const strength = emphasised.has(k) ? 1 : 0.1;
    series[k] = risk.map((_, i) => {
      const d = i + 1; if (d < firstDay) return null;
      if (k === 'mood' && r() < 0.18) return null; // skipped check-ins
      let v = b + EFFECT[k](b) * drift[i] * strength + gauss() * noise[k];
      if (k === 'mood') v = Math.round(Math.max(1, Math.min(5, v)));
      else if (k === 'sleepHours') v = Math.round(Math.max(3, v) * 100) / 100;
      else v = Math.round(Math.max(0, v));
      return v;
    });
  }
  const questionnaires: Questionnaire[] = [];
  for (let d = firstDay + 13; d <= DAYS; d += 14) {
    const rv = risk[d - 1] ?? target;
    questionnaires.push({ day: d, phq9: Math.round(Math.max(0, Math.min(27, 2 + rv / 5.2 + gauss() * 1.3))), who5: Math.round(Math.max(8, Math.min(96, 78 - rv * 0.62 + gauss() * 5)) / 4) * 4 });
  }
  const p: Patient = {
    id: slug(row.patient), name: row.patient, initials: initials(row.patient), isSam: false, firstDay, weeksAtEnd: row.weeksSinceTms,
    risk, series, baseline: { from: firstDay, to: Math.max(firstDay + 6, Math.min(onset - 1, firstDay + 27)) },
    reasonsAt: () => [], questionnaires, lastCheckIn: row.lastCheckIn, events: [],
  };
  p.reasonsAt = (day) => computedReasons(p, day);
  return p;
}

function samPatient(row: RawClinic | undefined): Patient {
  const s = D.people.sam; const E = D.events;
  const series = Object.fromEntries(SIGNALS.map((d) => [d.key, s.series[d.key]])) as Record<SignalKey, (number | null)[]>;
  return {
    id: 'sam-k', name: 'Sam K.', initials: 'SK', isSam: true, firstDay: 1, weeksAtEnd: Math.max(row?.weeksSinceTms ?? 0, Math.round(DAYS / 7)),
    risk: s.series.risk.map((v) => (v == null ? null : Math.round(v))), series, baseline: { from: 7, to: 34 },
    reasonsAt: (day) => (s.drivers[day - 1] || []).map((d) => ({ key: d.key, label: d.label, change: d.change.replace(' %', '%'), text: describeChange(d.key, d.label, d.to, d.from), z: d.z })),
    questionnaires: s.questionnaires.map((q) => ({ day: q.day, phq9: q.phq9, who5: q.who5 })),
    lastCheckIn: 'today',
    events: [
      { day: E.firstAlertDay, label: 'First alert' },
      { day: E.carePlanDay, label: 'Care plan' },
      { day: E.recoveredDay, label: 'Back to usual' },
    ],
  };
}

function slug(n: string) { return n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function initials(n: string) { return n.replace(/[^A-Za-zÀ-ÿ ]/g, ' ').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase(); }

export const PATIENTS: Patient[] = D.clinic.map((row) => (row.patient.startsWith('S.') ? samPatient(row) : synthPatient(row)));
export const byId = (id: string) => PATIENTS.find((p) => p.id === id);

export const riskAt = (p: Patient, day: number) => (day < p.firstDay ? null : p.risk[day - 1] ?? null);
export const phqBand = (v: number) => (v >= 20 ? 'Severe' : v >= 15 ? 'Moderately severe' : v >= 10 ? 'Moderate' : v >= 5 ? 'Mild' : 'Minimal');
export const weeksAt = (p: Patient, day: number) => Math.max(0, p.weeksAtEnd - Math.round((DAYS - day) / 7));
export const checkInAt = (p: Patient, day: number) => (p.isSam || day < DAYS ? 'today' : p.lastCheckIn.replace('0d ago', 'today'));
