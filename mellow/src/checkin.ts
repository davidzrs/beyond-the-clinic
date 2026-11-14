// PHQ-9 check-in, the 2-week plan it builds, and the date helpers they share.
// Cut-offs come from our analysis of the Moodpath PHQ-9 dataset (see data-analysis/ and RESEARCH.md).

export const PHQ_ITEMS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself, or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading or watching TV',
  'Moving or speaking so slowly that others could notice, or being so restless that you move around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself in some way',
];
export const PHQ_OPTIONS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];
// An answer at or above the cut-off puts that question "in the zone" (Youden cut-offs from our analysis).
export const PHQ_CUTS = [2, 2, 3, 3, 2, 2, 2, 1, 1];

export function phqScore(a: number[]) { return a.reduce((s, v) => s + (v || 0), 0); }
export function severity(score: number) {
  if (score <= 4) return 'Minimal';
  if (score <= 9) return 'Mild';
  if (score <= 14) return 'Moderate';
  if (score <= 19) return 'Moderately severe';
  return 'Severe';
}
export function needsSupport(a: number[]) { return (a[8] || 0) >= 1; }

// alt: a gentler way to do the same step on days when going out is hard.
export type PlanTask = { t: string; icon: string; dur: string; area: string; act?: string; retake?: boolean; alt?: string };
type Area = { item: number; area: string; icon: string; basis: string; tasks: PlanTask[] };

// One area per PHQ-9 question (except question 9, which always goes to real support, never self-help).
export const AREAS: Area[] = [
  { item: 0, area: 'Interest', icon: 'star', basis: 'Behavioural activation', tasks: [
    { t: '10 minutes of something you used to enjoy', icon: 'star', dur: '10 min', area: 'Interest' },
    { t: 'Plan one nice thing for tomorrow', icon: 'note', dur: '2 min', area: 'Interest' }] },
  { item: 1, area: 'Mood', icon: 'heart', basis: 'Three good things', tasks: [
    { t: 'Write down 3 good things from today', icon: 'note', dur: '3 min', area: 'Mood' },
    { t: 'Say hi to someone at your fire', icon: 'chat', dur: '2 min', area: 'Mood', act: 'campfire' }] },
  { item: 2, area: 'Sleep', icon: 'moon', basis: 'CBT for insomnia', tasks: [
    { t: 'Get up at the same time as yesterday', icon: 'sky', dur: 'Morning', area: 'Sleep' },
    { t: 'Phone away after 23:00', icon: 'moon', dur: 'Tonight', area: 'Sleep' }] },
  { item: 3, area: 'Energy', icon: 'walk', basis: 'Exercise for depression', tasks: [
    { t: 'Take a walk somewhere green, or by the water', icon: 'forest', dur: '15 min', area: 'Energy', alt: 'Hard to go out? A forest or sea video, or VR, counts too.' },
    { t: 'Five minutes of gentle stretching', icon: 'leaf', dur: '5 min', area: 'Energy' }] },
  { item: 4, area: 'Appetite', icon: 'drink', basis: 'Regular, balanced meals', tasks: [
    { t: 'Eat lunch at a set time', icon: 'drink', dur: 'Midday', area: 'Appetite' },
    { t: 'Prepare a simple snack for tomorrow', icon: 'drink', dur: '5 min', area: 'Appetite' }] },
  { item: 5, area: 'Self-worth', icon: 'heart', basis: 'Self-compassion', tasks: [
    { t: 'Write yourself what you would tell a friend', icon: 'heart', dur: '3 min', area: 'Self-worth' },
    { t: 'Note one small win from today', icon: 'star', dur: '1 min', area: 'Self-worth' }] },
  { item: 6, area: 'Focus', icon: 'clock', basis: 'Sleep and movement help focus', tasks: [
    { t: 'One 15-minute focus block', icon: 'clock', dur: '15 min', area: 'Focus' },
    { t: 'Write a 3-item to-do list', icon: 'note', dur: '2 min', area: 'Focus' }] },
  { item: 7, area: 'Restlessness', icon: 'flame', basis: 'Slow breathing and movement', tasks: [
    { t: 'Breathe with the flame', icon: 'flame', dur: '3 min', area: 'Restlessness', act: 'breathe' },
    { t: 'A short walk around the block', icon: 'walk', dur: '10 min', area: 'Restlessness' }] },
];

export function focusAreas(a: number[]) {
  const z = AREAS.filter((x) => (a[x.item] || 0) >= PHQ_CUTS[x.item]).map((x) => ({ ...x, v: a[x.item] }));
  // Sleep first (it lifts almost everything else), then the most frequent problems.
  return z.sort((p, q) => (p.item === 2 ? -1 : q.item === 2 ? 1 : (q.v - p.v) || (p.item - q.item)));
}

export const PLAN_DAYS = 14;
export type PlanDay = { date: string; tasks: PlanTask[] };
export type Plan = { start: string; days: PlanDay[]; areas: string[] };

export function ymd(d: Date) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export function fromYmd(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function addDays(d: Date, n: number) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); x.setDate(x.getDate() + n); return x; }
export function dayIndex(plan: Plan, now = new Date()) { return Math.round((addDays(now, 0).getTime() - fromYmd(plan.start).getTime()) / 864e5); }
export function niceDate(d: Date) { return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }

// Small, basic anchors that fill the day when the check-in didn't flag enough areas. Morning light, sleep
// and contact are the signals that moved first before relapse in our demo data (see data/README.md).
export const KEEP_UP_AREA = 'Keep your anchors';
export const KEEP_UP_BASIS = 'Keeping routines steady protects against relapse';
const KEEP_UP: PlanTask[] = [
  { t: 'Open a window for some fresh air', icon: 'sky', dur: '2 min', area: KEEP_UP_AREA },
  { t: 'Drink a glass of water when you wake up', icon: 'drink', dur: 'Morning', area: KEEP_UP_AREA },
  { t: 'Phone away by 23:00', icon: 'moon', dur: 'Evening', area: KEEP_UP_AREA },
  { t: 'Write down 3 good things from today', icon: 'note', dur: '3 min', area: KEEP_UP_AREA },
  { t: 'Stretch for 5 minutes', icon: 'leaf', dur: '5 min', area: KEEP_UP_AREA },
  { t: 'Get 5 minutes of sunlight', icon: 'sun', dur: '5 min', area: KEEP_UP_AREA },
  { t: 'Spend time in a forest or by the sea', icon: 'forest', dur: '20 min', area: KEEP_UP_AREA, alt: 'Hard to go out? A forest or sea video, or VR, counts too.' },
  { t: 'Breathe with the flame', icon: 'flame', dur: '3 min', area: KEEP_UP_AREA, act: 'breathe' },
];
// The n-th anchor, skipping any whose text is already on that day.
function anchor(n: number, day: PlanTask[]) {
  for (let i = 0; i < KEEP_UP.length; i++) { const t = KEEP_UP[(n + i) % KEEP_UP.length]; if (!day.some((x) => x.t === t.t)) return t; }
  return KEEP_UP[n % KEEP_UP.length];
}

// Always 2 small things a day: from the focus areas first (rotating), topped up with basic anchors.
// Day 14 is the next check-in, plus one anchor.
export function buildPlan(a: number[], start = new Date()): Plan {
  const zone = focusAreas(a);
  const fromZone = Math.min(2, zone.length);
  const days: PlanDay[] = [];
  let k = 0;
  for (let d = 0; d < PLAN_DAYS; d++) {
    const date = ymd(addDays(start, d));
    const tasks: PlanTask[] = [];
    if (d === PLAN_DAYS - 1) {
      tasks.push({ t: 'Your 2-week check-in', icon: 'clipboard', dur: '2 min', area: 'Check-in', retake: true });
      tasks.push(anchor(d * 2, tasks));
    } else {
      for (let s = 0; s < fromZone; s++) { const z = zone[k % zone.length]; tasks.push(z.tasks[Math.floor(k / zone.length) % 2]); k++; }
      while (tasks.length < 2) tasks.push(anchor(d * 2 + tasks.length, tasks));
    }
    days.push({ date, tasks });
  }
  return { start: ymd(start), days, areas: zone.map((z) => z.area) };
}

export type Checkin = { date: string; answers: number[]; score: number };
