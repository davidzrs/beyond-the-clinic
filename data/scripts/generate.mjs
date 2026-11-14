// Synthetic smartwatch + phone + check-in data for the Mellow demo.
// Calibrated to the open datasets summarised in data/processed/calibration.json.
// Deterministic: the same seed always produces the same data.
// Run: node data/scripts/generate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'synthetic');
const APP_OUT = path.resolve(ROOT, '..', 'mellow', 'src', 'demo');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(APP_OUT, { recursive: true });

let calib = null;
try { calib = JSON.parse(fs.readFileSync(path.join(ROOT, 'processed', 'calibration.json'), 'utf8')); } catch { /* defaults below */ }
const POP = {
  sleepH: calib?.fitbit.sleepHours.mean ?? 7.2,
  rhr: calib?.fitbit.restingHr.mean ?? 62,
  steps: calib?.fitbit.steps.mean ?? 8200,
  stepsCv: calib ? calib.fitbit.steps.withinPersonSd / calib.fitbit.steps.mean : 0.4,
  hourlyHr: calib?.fitbit.hourlyHr ?? [66, 65, 63, 62, 61, 63, 71, 74, 75, 78, 78, 78, 79, 77, 78, 77, 80, 80, 81, 80, 77, 73, 70, 68],
  // Depresjon: depressed vs control activity, used to shape the relapse effect
  actRatio: calib ? calib.depresjon.meanActivity.condition / calib.depresjon.meanActivity.control : 0.88,
  morningRatio: calib ? (calib.depresjon.hourlyProfile.condition.slice(6, 10).reduce((a, b) => a + b) / calib.depresjon.hourlyProfile.control.slice(6, 10).reduce((a, b) => a + b)) : 0.54,
  cvRatio: calib ? calib.depresjon.dayToDayCv.condition / calib.depresjon.dayToDayCv.control : 0.63,
};

// ---------- seeded random ----------
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeRng(seed) { const u = mulberry32(seed); const normal = () => { let a = 0, b = 0; while (!a) a = u(); while (!b) b = u(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); }; return { u, normal, pick: (arr) => arr[Math.floor(u() * arr.length)] }; }
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const smooth = (x) => x * x * (3 - 2 * x); // smoothstep 0..1

const DAYS = 90;
const START = new Date(Date.UTC(2026, 7, 17)); // 17 Aug 2026 -> day 90 = 14 Nov 2026
const dateOf = (i) => new Date(START.getTime() + i * 864e5).toISOString().slice(0, 10);
const weekday = (i) => new Date(START.getTime() + i * 864e5).getUTCDay(); // 0 Sun

// Relapse curve for Sam: drift starts day 52, peaks ~day 66, care plan kicks in day 63, recovered by ~day 84.
function relapseLevel(i, p) {
  if (!p.relapse) return 0;
  const { start, peak, recover, end } = p.relapse;
  if (i < start) return 0;
  if (i < peak) return smooth((i - start) / (peak - start));
  if (i < recover) return 1;
  if (i < end) return 1 - smooth((i - recover) / (end - recover));
  return 0;
}

const PERSONAS = [
  { id: 'sam', name: 'Sam', seed: 11, role: 'Post-TMS, 6 weeks after last session', base: { sleepH: 7.4, bed: 23.4, rhr: 61, hrv: 46, steps: 8400, screen: 190, mood: 3.9, social: 6 }, relapse: { start: 52, peak: 66, recover: 70, end: 84 } },
  { id: 'juno', name: 'Juno', seed: 22, role: 'Supporter', base: { sleepH: 7.8, bed: 23.0, rhr: 58, hrv: 58, steps: 9800, screen: 150, mood: 4.2, social: 9 } },
  { id: 'teo', name: 'Teo', seed: 33, role: 'At risk, early support', base: { sleepH: 6.9, bed: 0.1, rhr: 66, hrv: 38, steps: 7200, screen: 240, mood: 3.6, social: 5 } },
  { id: 'ama', name: 'Ama', seed: 44, role: 'Post-treatment, 5 months stable', base: { sleepH: 7.3, bed: 23.7, rhr: 63, hrv: 44, steps: 6600, screen: 210, mood: 3.8, social: 7 } },
];

function genPerson(p) {
  const R = makeRng(p.seed);
  const days = [];
  let moodState = 0; // slow-moving personal mood noise (AR(1))
  for (let i = 0; i < DAYS; i++) {
    const L = relapseLevel(i, p);
    const wd = weekday(i); const weekend = wd === 0 || wd === 6;
    moodState = 0.7 * moodState + 0.3 * R.normal() * 0.6;
    const b = p.base;
    // Sleep: relapse -> longer time in bed, later wake, lower efficiency, more awakenings
    const bedtime = b.bed + (weekend ? 0.6 : 0) + R.normal() * 0.35 + L * 0.9;
    const sleepH = clamp(b.sleepH + (weekend ? 0.4 : 0) + R.normal() * 0.55 + L * 1.3, 4.2, 11.5);
    const efficiency = clamp(0.92 - L * 0.07 + R.normal() * 0.025, 0.7, 0.98);
    const inBedH = sleepH / efficiency;
    const awakenings = Math.max(0, Math.round(2 + L * 4 + R.normal() * 1.2));
    const deepPct = clamp(0.18 - L * 0.05 + R.normal() * 0.02, 0.08, 0.26);
    const remPct = clamp(0.22 - L * 0.04 + R.normal() * 0.02, 0.12, 0.28);
    const sleepMin = Math.round(sleepH * 60);
    const deep = Math.round(sleepMin * deepPct), rem = Math.round(sleepMin * remPct), light = sleepMin - deep - rem;
    const wakeTime = (bedtime + inBedH) % 24;
    // Heart: relapse -> higher resting HR, lower HRV (autonomic marker)
    const restingHr = Math.round(b.rhr + R.normal() * 1.6 + L * 5 + (sleepH < 6 ? 1.5 : 0));
    const hrvRmssd = Math.round(clamp(b.hrv * (1 - L * 0.24) + R.normal() * 4.5, 15, 110));
    // Activity: Depresjon shows ~12% less activity, much later morning ramp-up, less day-to-day variation
    const cv = POP.stepsCv * (1 - L * (1 - POP.cvRatio)) * 0.85;
    const actFactor = 1 - L * (1 - POP.actRatio) * 2.2; // amplified a bit so the demo shows it clearly
    const steps = Math.round(clamp(b.steps * actFactor * (weekend ? 0.9 : 1) * (1 + R.normal() * cv), 900, 24000));
    const morningSteps = Math.round(steps * clamp(0.22 * (1 - L * (1 - POP.morningRatio)) + R.normal() * 0.03, 0.04, 0.4));
    const activeMin = Math.round(clamp(steps / 110 + R.normal() * 6, 5, 160));
    const outdoorMin = Math.round(clamp(55 - L * 38 + R.normal() * 15 + (weekend ? 20 : 0), 0, 240));
    // Phone: relapse -> much more screen time, especially late at night; fewer messages sent
    const screenMin = Math.round(clamp(b.screen * (1 + L * 1.4) + R.normal() * 30, 40, 720));
    const lateNightScreenMin = Math.round(clamp(12 + L * 70 + R.normal() * 8, 0, 240));
    const messagesSent = Math.max(0, Math.round(b.social * (1 - L * 0.65) + R.normal() * 2));
    // Check-in (1 Heavy .. 5 Bright); people skip some days, more often when low
    const moodRaw = b.mood + moodState - L * 1.8 + (sleepH < 6 ? -0.3 : 0) + (outdoorMin > 60 ? 0.2 : 0);
    const mood = clamp(Math.round(moodRaw), 1, 5);
    const checkedIn = R.u() > 0.08 + L * 0.25;
    days.push({
      day: i + 1, date: dateOf(i), weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][wd],
      sleepHours: r2(sleepH), timeInBedHours: r2(inBedH), sleepEfficiency: r2(efficiency), bedtime: r2(bedtime % 24), wakeTime: r2(wakeTime), awakenings,
      deepMin: deep, remMin: rem, lightMin: light,
      restingHr, hrvRmssd, steps, morningSteps, activeMinutes: activeMin, outdoorMinutes: outdoorMin,
      screenMinutes: screenMin, lateNightScreenMinutes: lateNightScreenMin, messagesSent,
      mood: checkedIn ? mood : '', relapseLevel: r2(L),
    });
  }
  return days;
}

// PHQ-9 every 14 days (score only; item 9 kept at 0 in this demo). WHO-5 weekly (0-100).
function questionnaires(p, days) {
  const R = makeRng(p.seed + 100);
  const out = [];
  for (let i = 6; i < DAYS; i += 7) {
    const L = days[i].relapseLevel;
    const who5 = Math.round(clamp(72 - L * 40 + R.normal() * 6, 0, 100) / 4) * 4;
    const row = { day: i + 1, date: days[i].date, who5 };
    if ((i + 1) % 14 === 0) row.phq9 = Math.round(clamp(4 + L * 10 + R.normal() * 1.5, 0, 27));
    out.push(row);
  }
  return out;
}

// ---------- Mellow's early-warning score (same logic the app would run on-device) ----------
// For each signal: z-score of the last-7-day mean against the person's own 28-day baseline that ends a week earlier.
const SIGNALS = [
  { key: 'sleepHours', label: 'Sleep', dir: 'both', unit: 'h', weight: 1 },
  { key: 'sleepEfficiency', label: 'Sleep quality', dir: 'down', unit: '%', weight: 0.8, scale: 100 },
  { key: 'restingHr', label: 'Resting heart rate', dir: 'up', unit: 'bpm', weight: 0.9 },
  { key: 'hrvRmssd', label: 'Heart rate variability', dir: 'down', unit: 'ms', weight: 1 },
  { key: 'steps', label: 'Steps', dir: 'down', unit: '', weight: 0.8 },
  { key: 'morningSteps', label: 'Morning activity', dir: 'down', unit: '', weight: 0.9 },
  { key: 'screenMinutes', label: 'Screen time', dir: 'up', unit: 'min', weight: 0.9 },
  { key: 'lateNightScreenMinutes', label: 'Late-night phone use', dir: 'up', unit: 'min', weight: 0.7 },
  { key: 'messagesSent', label: 'Messages to friends', dir: 'down', unit: '', weight: 0.8 },
  { key: 'mood', label: 'Check-in mood', dir: 'down', unit: '', weight: 1.2 },
];
const avg = (a) => { const v = a.filter((x) => x !== '' && x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const stdev = (a) => { const v = a.filter((x) => x !== '' && x != null); const m = avg(v); return v.length > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)) : null; };
// The baseline uses only the person's own "steady" days, so a slow drift can't quietly become the new normal.
function riskFor(days, i, steadyIdx) {
  if (i < 34) return { risk: null, drivers: [] };
  const recent = days.slice(i - 6, i + 1);
  const baseIdx = steadyIdx.filter((j) => j < i - 6).slice(-28);
  if (baseIdx.length < 21) return { risk: null, drivers: [] };
  const base = baseIdx.map((j) => days[j]);
  const drivers = []; let score = 0, wsum = 0;
  for (const s of SIGNALS) {
    const rv = avg(recent.map((d) => d[s.key])), bm = avg(base.map((d) => d[s.key])), bs = stdev(base.map((d) => d[s.key]));
    if (rv == null || bm == null || !bs) continue;
    const z = (rv - bm) / bs; // how many of your usual day-to-day swings the last week moved
    const bad = s.dir === 'up' ? z : s.dir === 'down' ? -z : Math.abs(z);
    score += clamp(bad - 0.3, 0, 3) * s.weight; wsum += s.weight * 3;
    if (bad > 1) {
      const sc = s.scale || 1; const delta = (rv - bm) * sc;
      const fmt = (v) => (s.unit === 'h' || s.key === 'mood' ? r1(v) : Math.round(v));
      drivers.push({ key: s.key, label: s.label, z: r1(bad), from: fmt(bm * sc), to: fmt(rv * sc), change: (delta > 0 ? '+' : '−') + Math.abs(fmt(delta)) + (s.unit ? ' ' + s.unit : '') });
    }
  }
  drivers.sort((a, b) => b.z - a.z);
  return { risk: Math.round(clamp((score / wsum) * 100 * 1.15, 0, 100)), drivers: drivers.slice(0, 4) };
}
const level = (risk) => (risk == null ? 'calibrating' : risk >= 55 ? 'high' : risk >= 30 ? 'watch' : 'steady');

// ---------- minute-level night for Sam (hypnogram + heart rate) ----------
function night(p, d, seed) {
  const R = makeRng(seed);
  const start = 23 * 60 + 15; const totalMin = Math.round(d.timeInBedHours * 60);
  const out = []; let hr = d.restingHr + 8; let stage = 'awake';
  for (let m = 0; m < totalMin; m++) {
    const t = m / totalMin; const cycle = (m % 95) / 95;
    if (m < 12) stage = 'awake';
    else if (R.u() < (d.awakenings / totalMin) * 4) stage = 'awake';
    else if (cycle < 0.35 && t < 0.6) stage = 'deep';
    else if (cycle > 0.75 && t > 0.25) stage = 'rem';
    else stage = 'light';
    const target = d.restingHr + { awake: 9, light: 2, deep: -3, rem: 5 }[stage] + (t > 0.9 ? 4 : 0);
    hr = hr + (target - hr) * 0.15 + R.normal() * 0.8;
    const mm = (start + m) % 1440;
    out.push({ time: `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`, stage, hr: Math.round(hr) });
  }
  return out;
}
// 24-hour heart rate profile (hourly), shaped like the real Fitbit population curve
function dayHr(d) { const shift = d.restingHr - 61; return POP.hourlyHr.map((v, h) => Math.round(v + shift - (h >= 6 && h <= 9 ? d.relapseLevel * 4 : 0))); }

// ---------- clinician panel ----------
function clinicPanel() {
  const R = makeRng(777);
  const names = ['A. Virtanen', 'L. Korhonen', 'M. Nieminen', 'S. (you)', 'J. Mäkinen', 'E. Hämäläinen', 'K. Laine', 'P. Heikkinen', 'R. Koskinen', 'T. Järvinen', 'N. Lehtonen', 'O. Salminen'];
  const reasons = [['Sleep +1.4 h vs usual', 'Morning activity −48%'], ['Resting HR +6 bpm', 'HRV −22%'], ['Screen time +2.1 h', 'Messages −70%'], ['Check-ins dropped to 2/7'], ['Mood check-ins lower 5 days running'], [], [], [], [], [], [], []];
  return names.map((n, i) => {
    const risk = i === 3 ? null : Math.round(clamp(i < 5 ? 78 - i * 9 + R.normal() * 4 : 12 + R.u() * 18, 0, 100));
    return { patient: n, weeksSinceTms: 2 + Math.floor(R.u() * 20), risk, level: level(risk), drivers: i === 3 ? ['See Sam’s live timeline'] : reasons[i], lastCheckIn: i === 3 ? 'today' : `${Math.floor(R.u() * 3)}d ago` };
  });
}

// ---------- write ----------
function toCsv(rows) { const keys = Object.keys(rows[0]); return [keys.join(','), ...rows.map((o) => keys.map((k) => (Array.isArray(o[k]) ? '"' + o[k].join('; ') + '"' : o[k] ?? '')).join(','))].join('\n') + '\n'; }
const people = {};
for (const p of PERSONAS) {
  const days = genPerson(p);
  const steady = [];
  days.forEach((d, i) => {
    const { risk, drivers } = riskFor(days, i, steady);
    d.risk = risk ?? ''; d.riskLevel = level(risk); d.drivers = drivers.map((x) => x.label + ' ' + x.change); d._drivers = drivers;
    if (risk == null || risk < 30) steady.push(i);
  });
  const q = questionnaires(p, days);
  people[p.id] = { p, days, q };
  fs.writeFileSync(path.join(OUT, `${p.id}_daily.csv`), toCsv(days.map(({ _drivers, ...d }) => d)));
  fs.writeFileSync(path.join(OUT, `${p.id}_questionnaires.csv`), toCsv(q.map((x) => ({ phq9: '', ...x }))));
}
const sam = people.sam.days;
const nights = { stable: night(PERSONAS[0], sam[29], 501), relapse: night(PERSONAS[0], sam[65], 502), today: night(PERSONAS[0], sam[89], 503) };
fs.writeFileSync(path.join(OUT, 'sam_night_minutes_day30.csv'), toCsv(nights.stable));
fs.writeFileSync(path.join(OUT, 'sam_night_minutes_day66.csv'), toCsv(nights.relapse));
const panel = clinicPanel();
fs.writeFileSync(path.join(OUT, 'clinic_panel.csv'), toCsv(panel));

// Compact bundle for the app
const firstAlert = sam.findIndex((d) => d.riskLevel === 'watch' || d.riskLevel === 'high');
const firstHigh = sam.findIndex((d) => d.riskLevel === 'high');
const recovered = sam.findIndex((d, i) => i > firstHigh && d.riskLevel === 'steady');
const app = {
  generatedFrom: 'Synthetic, calibrated to RTI Fitbit (Zenodo 53894, CC BY 4.0) and Depresjon (Zenodo 1219550, CC BY-NC 4.0)',
  days: DAYS, startDate: dateOf(0),
  events: { relapseStart: PERSONAS[0].relapse.start + 1, firstAlertDay: firstAlert + 1, firstHighDay: firstHigh + 1, carePlanDay: firstHigh + 2, recoveredDay: recovered + 1 },
  people: Object.fromEntries(Object.entries(people).map(([id, { p, days, q }]) => [id, {
    name: p.name, role: p.role,
    series: Object.fromEntries(['sleepHours', 'sleepEfficiency', 'restingHr', 'hrvRmssd', 'steps', 'morningSteps', 'screenMinutes', 'lateNightScreenMinutes', 'messagesSent', 'mood', 'risk', 'outdoorMinutes', 'deepMin', 'remMin', 'lightMin', 'bedtime'].map((k) => [k, days.map((d) => (d[k] === '' ? null : d[k]))])),
    drivers: days.map((d) => d._drivers),
    questionnaires: q,
  }])),
  samNights: { day30: nights.stable.filter((_, i) => i % 5 === 0), day66: nights.relapse.filter((_, i) => i % 5 === 0) },
  samDayHr: { day30: dayHr(sam[29]), day66: dayHr(sam[65]) },
  population: { sleepH: POP.sleepH, rhr: POP.rhr, steps: POP.steps, depressedMorningRatio: Math.round(POP.morningRatio * 100) / 100, depressedActivityRatio: Math.round(POP.actRatio * 100) / 100 },
  clinic: panel,
};
fs.writeFileSync(path.join(APP_OUT, 'demoData.json'), JSON.stringify(app));
fs.writeFileSync(path.join(OUT, 'demo_bundle.json'), JSON.stringify(app, null, 1));

console.log('Sam risk by day:', sam.map((d) => (d.risk === '' ? '.' : d.risk)).join(' '));
console.log('events', app.events);
console.log('day 66 drivers:', sam[65].drivers);
console.log('PHQ-9:', people.sam.q.filter((x) => x.phq9 != null).map((x) => `d${x.day}:${x.phq9}`).join(' '));
console.log('bundle size', fs.statSync(path.join(APP_OUT, 'demoData.json')).size, 'bytes');
