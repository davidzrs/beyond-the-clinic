// Reads the open datasets in data/raw and writes small processed tables plus a
// calibration summary to data/processed. Run: node data/scripts/analyze.mjs
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'raw');
const OUT = path.join(ROOT, 'processed');
fs.mkdirSync(OUT, { recursive: true });

const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const csvLines = (f) => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/);
async function* stream(f) { const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity }); for await (const l of rl) yield l; }
function parseUS(ts) { // "4/12/2016 7:21:05 AM"
  const [d, t, ap] = ts.split(' '); const [mo, da, yr] = d.split('/').map(Number); let [h, mi, s] = t.split(':').map(Number);
  if (ap === 'PM' && h < 12) h += 12; if (ap === 'AM' && h === 12) h = 0;
  return { date: `${yr}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`, hour: h, min: mi, sec: s || 0 };
}
function writeCsv(file, rows) { const keys = Object.keys(rows[0]); fs.writeFileSync(file, [keys.join(','), ...rows.map((o) => keys.map((k) => o[k]).join(','))].join('\n') + '\n'); }

// ---------- Fitbit (RTI / Zenodo 53894) ----------
const FIT_DIRS = ['fitbit_mar_apr/Fitabase Data 3.12.16-4.11.16', 'fitbit_apr_may/Fitabase Data 4.12.16-5.12.16'].map((d) => path.join(RAW, d));
const fitDaily = new Map(); // key id|date -> row
const day = (id, date) => { const k = id + '|' + date; if (!fitDaily.has(k)) fitDaily.set(k, { id, date, steps: '', sleepMin: '', inBedMin: '', restingHr: '', meanHr: '' }); return fitDaily.get(k); };

for (const dir of FIT_DIRS) {
  const act = path.join(dir, 'dailyActivity_merged.csv');
  if (fs.existsSync(act)) for (const l of csvLines(act).slice(1)) { const c = l.split(','); const [mo, da, yr] = c[1].split('/').map(Number); const date = `${yr}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`; const st = +c[2]; if (st > 0) day(c[0], date).steps = st; }
  const slp = path.join(dir, 'sleepDay_merged.csv');
  if (fs.existsSync(slp)) for (const l of csvLines(slp).slice(1)) { const c = l.split(','); const p = parseUS(c[1]); const d = day(c[0], p.date); d.sleepMin = +c[3]; d.inBedMin = +c[4]; }
}
// minuteSleep gives sleep for both exports (sleepDay only exists in the second); fill gaps from it.
for (const dir of FIT_DIRS) {
  const f = path.join(dir, 'minuteSleep_merged.csv'); if (!fs.existsSync(f)) continue;
  const agg = new Map();
  let first = true;
  for await (const l of stream(f)) { if (first) { first = false; continue; } const c = l.split(','); const p = parseUS(c[1]); const key = c[0] + '|' + p.date; const a = agg.get(key) || { asleep: 0, bed: 0 }; a.bed++; if (c[2] === '1') a.asleep++; agg.set(key, a); }
  for (const [k, a] of agg) { const [id, date] = k.split('|'); const d = day(id, date); if (d.sleepMin === '') { d.sleepMin = a.asleep; d.inBedMin = a.bed; } }
}
// Heart rate: per-day mean and a resting estimate (10th percentile of 1-minute means), plus an hourly profile.
const hourly = Array.from({ length: 24 }, () => []);
for (const dir of FIT_DIRS) {
  const f = path.join(dir, 'heartrate_seconds_merged.csv'); if (!fs.existsSync(f)) continue;
  const minutes = new Map(); let first = true;
  for await (const l of stream(f)) {
    if (first) { first = false; continue; }
    const c = l.split(','); const p = parseUS(c[1]); const k = `${c[0]}|${p.date}|${p.hour}|${p.min}`;
    const m = minutes.get(k) || [0, 0]; m[0] += +c[2]; m[1]++; minutes.set(k, m);
  }
  const perDay = new Map();
  for (const [k, [s, n]] of minutes) { const [id, date, hour] = k.split('|'); const v = s / n; const key = id + '|' + date; (perDay.get(key) || perDay.set(key, []).get(key)).push(v); hourly[+hour].push(v); }
  for (const [k, vals] of perDay) { if (vals.length < 120) continue; const [id, date] = k.split('|'); const d = day(id, date); d.restingHr = r(pct(vals, 0.1)); d.meanHr = r(mean(vals)); }
}
const fitRows = [...fitDaily.values()].sort((a, b) => (a.id + a.date).localeCompare(b.id + b.date));
writeCsv(path.join(OUT, 'fitbit_daily.csv'), fitRows);
const num = (k) => fitRows.map((x) => x[k]).filter((v) => v !== '' && v > 0);
const sleepH = num('sleepMin').filter((m) => m > 120).map((m) => m / 60);
const effic = fitRows.filter((x) => x.sleepMin > 120 && x.inBedMin > 0).map((x) => x.sleepMin / x.inBedMin);
const rhr = num('restingHr');
const steps = num('steps');
// within-person day-to-day variability
const byId = (k) => { const m = new Map(); for (const x of fitRows) if (x[k] !== '' && x[k] > 0) (m.get(x.id) || m.set(x.id, []).get(x.id)).push(+x[k]); return [...m.values()].filter((a) => a.length >= 7); };
const withinSd = (k, f = (v) => v) => r(mean(byId(k).map((a) => sd(a.map(f)))), 2);

// ---------- Depresjon (Simula / Zenodo 1219550) ----------
const DEP = path.join(RAW, 'depresjon', 'data');
const toNum = (v) => { const n = Number(v); return v === undefined || v === '' || !Number.isFinite(n) ? null : n; };
const scores = csvLines(path.join(DEP, 'scores.csv')).slice(1).map((l) => { const c = l.split(','); return { id: c[0], madrs1: toNum(c[10]), madrs2: toNum(c[11]) }; });
const scoreOf = Object.fromEntries(scores.map((s) => [s.id, s]));
const depRows = []; const profile = { condition: Array.from({ length: 24 }, () => []), control: Array.from({ length: 24 }, () => []) };
for (const group of ['condition', 'control']) {
  for (const file of fs.readdirSync(path.join(DEP, group))) {
    const id = file.replace('.csv', ''); const days = new Map();
    for (const l of csvLines(path.join(DEP, group, file)).slice(1)) {
      const [ts, date, a] = l.split(','); const hour = +ts.slice(11, 13); const v = +a;
      const d = days.get(date) || { sum: 0, n: 0, active: 0, night: 0, nightN: 0, hours: Array(24).fill(0) }; d.sum += v; d.n++; if (v > 100) d.active++; if (hour < 6) { d.night += v; d.nightN++; } d.hours[hour] += v; days.set(date, d);
    }
    for (const [date, d] of days) {
      if (d.n < 1440) continue; // full days only
      d.hours.forEach((v, h) => profile[group][h].push(v / 60));
      const sc = scoreOf[id] || {};
      depRows.push({ id, group, date, meanActivity: r(d.sum / d.n), activeMinutes: d.active, nightActivity: r(d.night / d.nightN), madrs: sc.madrs1 ?? '' });
    }
  }
}
writeCsv(path.join(OUT, 'depresjon_daily.csv'), depRows);
const g = (grp, k) => depRows.filter((x) => x.group === grp).map((x) => x[k]);
const depVar = (grp) => { const m = new Map(); for (const x of depRows.filter((y) => y.group === grp)) (m.get(x.id) || m.set(x.id, []).get(x.id)).push(x.meanActivity); return r(mean([...m.values()].filter((a) => a.length >= 5).map((a) => sd(a) / mean(a))), 3); };

const calib = {
  sources: {
    fitbit: 'Furberg et al. (2016), Crowd-sourced Fitbit datasets, Zenodo 10.5281/zenodo.53894, CC BY 4.0',
    depresjon: 'Garcia-Ceja et al. (2018), Depresjon, Zenodo 10.5281/zenodo.1219550, CC BY-NC 4.0',
  },
  fitbit: {
    participants: new Set(fitRows.map((x) => x.id)).size, personDays: fitRows.length,
    sleepHours: { mean: r(mean(sleepH), 2), sd: r(sd(sleepH), 2), p10: r(pct(sleepH, 0.1), 2), p90: r(pct(sleepH, 0.9), 2), withinPersonSd: withinSd('sleepMin', (m) => m / 60) },
    sleepEfficiency: { mean: r(mean(effic), 3), sd: r(sd(effic), 3) },
    restingHr: { mean: r(mean(rhr)), sd: r(sd(rhr)), withinPersonSd: withinSd('restingHr') },
    steps: { mean: Math.round(mean(steps)), sd: Math.round(sd(steps)), withinPersonSd: Math.round(withinSd('steps')) },
    hourlyHr: hourly.map((a) => r(mean(a))),
  },
  depresjon: {
    participants: { condition: new Set(g('condition', 'id')).size, control: new Set(g('control', 'id')).size },
    meanActivity: { condition: r(mean(g('condition', 'meanActivity'))), control: r(mean(g('control', 'meanActivity'))) },
    activeMinutes: { condition: Math.round(mean(g('condition', 'activeMinutes'))), control: Math.round(mean(g('control', 'activeMinutes'))) },
    nightActivity: { condition: r(mean(g('condition', 'nightActivity'))), control: r(mean(g('control', 'nightActivity'))) },
    dayToDayCv: { condition: depVar('condition'), control: depVar('control') },
    hourlyProfile: { condition: profile.condition.map((a) => r(mean(a))), control: profile.control.map((a) => r(mean(a))) },
    madrs: { mean: r(mean(scores.filter((s) => s.madrs1 != null).map((s) => s.madrs1))), values: scores.filter((s) => s.madrs1 != null).map((s) => s.madrs1) },
  },
};
fs.writeFileSync(path.join(OUT, 'calibration.json'), JSON.stringify(calib, null, 2));
console.log(JSON.stringify({ fitbit: { ...calib.fitbit, hourlyHr: undefined }, depresjon: { ...calib.depresjon, hourlyProfile: undefined, madrs: calib.depresjon.madrs.mean } }, null, 2));
