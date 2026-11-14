// Creates the demo patients and clinicians as real Supabase accounts and fills in their data.
//   node scripts/seed-care.mjs   (from the mellow folder)
// Every account uses the password 123123123. Safe to run again: existing accounts are reused and
// their rows overwritten. Patients' trends come from the same generator the portal used offline
// (src/data.ts), so the numbers match what the team has already seen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(fs.readFileSync(path.join(here, '../.env'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const URL = env.EXPO_PUBLIC_SUPABASE_URL, KEY = env.EXPO_PUBLIC_SUPABASE_KEY;
if (!URL || !KEY) throw new Error('Missing Supabase URL or key in mellow/.env');
const PASSWORD = '123123123';

// Load the portal's data model in Node (same code, JSON loaded from disk instead of a bundler import).
const src = fs.readFileSync(path.join(here, '../src/care/data.ts'), 'utf8').replace(
  /import raw from '([^']+)';/,
  (_, p) => `import { readFileSync as __r } from 'node:fs';\nconst raw = JSON.parse(__r(${JSON.stringify(path.resolve(path.join(here, '../src/care'), p))}, 'utf8'));`,
);
const tmp = path.join(here, '.data.gen.ts');
fs.writeFileSync(tmp, src);
const D = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);

// Full names for the clinic list (the portal shows them as initial + surname).
const FULL = {
  'A. Virtanen': 'Aino Virtanen', 'L. Korhonen': 'Lauri Korhonen', 'M. Nieminen': 'Mikael Nieminen', 'Sam K.': 'Sam Kallio',
  'J. Mäkinen': 'Juha Mäkinen', 'E. Hämäläinen': 'Eveliina Hämäläinen', 'K. Laine': 'Kaisa Laine', 'P. Heikkinen': 'Pekka Heikkinen',
  'R. Koskinen': 'Riikka Koskinen', 'T. Järvinen': 'Tuomas Järvinen', 'N. Lehtonen': 'Noora Lehtonen', 'O. Salminen': 'Otto Salminen',
};
const CLINICIANS = [
  { name: 'Dr. Laura Aalto', email: 'laura.aalto@pinehollow.fi' },
  { name: 'Mikko Saari', email: 'mikko.saari@pinehollow.fi' },
];
const emailOf = (full) => full.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.') + '@mellow.test';
const ymd = (d) => d.toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function account(name, email) {
  const sb = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let { data, error } = await sb.auth.signUp({ email, password: PASSWORD, options: { data: { name } } });
  if (error && /already|registered|exists/i.test(error.message)) ({ data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD }));
  if (error) throw new Error(email + ': ' + error.message);
  if (!data.session) throw new Error(email + ': no session (is "Confirm email" switched off?)');
  return { sb, id: data.user.id };
}

const out = [];
for (const c of CLINICIANS) {
  await account(c.name, c.email);
  out.push(['clinician', c.name, c.email]);
  await sleep(400);
}
for (const p of D.PATIENTS) {
  const full = FULL[p.name] || p.name;
  const email = emailOf(full);
  const { sb, id } = await account(full, email);
  await sb.from('profiles').update({ name: full, weeks_since_tms: p.weeksAtEnd, streak_count: 0 }).eq('id', id);
  const rows = [];
  for (let d = p.firstDay; d <= D.DAYS; d++) {
    const v = (k) => p.series[k][d - 1];
    const risk = D.riskAt(p, d);
    rows.push({
      user_id: id, day: ymd(D.dateOf(d)),
      sleep_hours: v('sleepHours'), resting_hr: v('restingHr'), hrv_rmssd: v('hrvRmssd'),
      steps: v('steps') == null ? null : Math.round(v('steps')), morning_steps: v('morningSteps') == null ? null : Math.round(v('morningSteps')),
      screen_minutes: v('screenMinutes') == null ? null : Math.round(v('screenMinutes')),
      late_night_screen_minutes: v('lateNightScreenMinutes') == null ? null : Math.round(v('lateNightScreenMinutes')),
      messages_sent: v('messagesSent') == null ? null : Math.round(v('messagesSent')),
      mood: v('mood'), risk, reasons: risk == null ? null : p.reasonsAt(d),
    });
  }
  const r1 = await sb.from('daily_metrics').upsert(rows, { onConflict: 'user_id,day' });
  if (r1.error) throw new Error(email + ' metrics: ' + r1.error.message);
  const qs = p.questionnaires.map((q) => ({ user_id: id, day: ymd(D.dateOf(q.day)), phq9: q.phq9 ?? null, who5: q.who5 ?? null }));
  if (qs.length) {
    const r2 = await sb.from('questionnaires').upsert(qs, { onConflict: 'user_id,day' });
    if (r2.error) throw new Error(email + ' questionnaires: ' + r2.error.message);
  }
  out.push(['patient', full, email, rows.length + ' days', qs.length + ' questionnaires']);
  await sleep(400);
}
console.log(out.map((r) => r.join(' | ')).join('\n'));
console.log('\nPassword for every account: ' + PASSWORD);
