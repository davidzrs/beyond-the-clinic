// Numbers for the biweekly report: everything is computed from the same patient data the portal shows.
import { LEVEL, levelOf, PATIENTS, riskAt, phqBand, type Level, type Patient, type Reason } from './data';

export const PERIOD = 14;

export type ReportRow = {
  p: Patient; now: number | null; prev: number | null; level: Level; prevLevel: Level | 'new';
  peak: number | null; reasons: Reason[]; missed: number; days: number;
};
export type PhqRow = { p: Patient; day: number; score: number; prevScore: number | null };

export function buildReport(end: number) {
  const start = Math.max(1, end - PERIOD + 1);
  const prevEnd = end - PERIOD;
  const rows: ReportRow[] = PATIENTS.filter((p) => p.firstDay <= end).map((p) => {
    const now = riskAt(p, end);
    const prev = prevEnd >= p.firstDay ? riskAt(p, prevEnd) : null;
    let peak: number | null = null;
    for (let d = Math.max(start, p.firstDay); d <= end; d++) { const v = riskAt(p, d); if (v != null && (peak == null || v > peak)) peak = v; }
    const from = Math.max(start, p.firstDay);
    const mood = p.series.mood.slice(from - 1, end);
    return {
      p, now, prev, level: levelOf(now), prevLevel: prevEnd >= p.firstDay ? levelOf(prev) : 'new',
      peak, reasons: p.reasonsAt(end), missed: mood.filter((v) => v == null).length, days: mood.length,
    };
  });
  const count = (l: Level, which: 'level' | 'prevLevel' = 'level') => rows.filter((r) => r[which] === l).length;
  const rank = (l: Level | 'new') => (l === 'new' ? -1 : LEVEL[l].rank);

  const attention = rows.filter((r) => r.level === 'high' || r.level === 'watch')
    .sort((a, b) => rank(b.level) - rank(a.level) || (b.now ?? 0) - (a.now ?? 0));
  const worse = rows.filter((r) => r.prevLevel !== 'new' && r.prevLevel !== 'calibrating' && r.level !== 'calibrating' && rank(r.level) > rank(r.prevLevel));
  const better = rows.filter((r) => r.prevLevel !== 'new' && r.prevLevel !== 'calibrating' && rank(r.level) < rank(r.prevLevel));
  const newcomers = rows.filter((r) => r.p.firstDay >= start);
  const lowEngagement = rows.filter((r) => r.days >= 7 && r.missed / r.days >= 0.4).sort((a, b) => b.missed / b.days - a.missed / a.days);

  const phq: PhqRow[] = [];
  for (const p of PATIENTS) {
    const qs = p.questionnaires.filter((q) => q.phq9 != null);
    qs.forEach((q, i) => { if (q.day >= start && q.day <= end) phq.push({ p, day: q.day, score: q.phq9!, prevScore: i > 0 ? qs[i - 1].phq9! : null }); });
  }
  phq.sort((a, b) => b.score - a.score);

  const summary: string[] = [];
  const high = count('high'), highPrev = count('high', 'prevLevel');
  summary.push(high === 0 ? 'Nobody currently needs a call.' : `${high} ${high === 1 ? 'patient needs' : 'patients need'} a call${highPrev !== high ? ` (${high > highPrev ? '+' : '−'}${Math.abs(high - highPrev)} vs the last report)` : ''}.`);
  if (worse.length) summary.push(`${list(worse.map((r) => r.p.name))} moved to a higher level.`);
  if (better.length) summary.push(`${list(better.map((r) => r.p.name))} ${better.length === 1 ? 'is' : 'are'} doing better than two weeks ago.`);
  const flagged = phq.filter((q) => q.score >= 10 || (q.prevScore != null && q.score - q.prevScore >= 5));
  if (flagged.length) summary.push(`${flagged.length} PHQ-9 ${flagged.length === 1 ? 'result needs' : 'results need'} a look (10+ or up 5+).`);
  if (!worse.length && !better.length && !flagged.length) summary.push('No other changes worth flagging.');

  return {
    start, end, rows, total: rows.length, attention, worse, better, newcomers, lowEngagement, phq, summary,
    counts: (['high', 'watch', 'steady', 'calibrating'] as Level[]).map((l) => ({ level: l, now: count(l), prev: count(l, 'prevLevel') })),
  };
}

function list(names: string[]) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}
export { phqBand };
