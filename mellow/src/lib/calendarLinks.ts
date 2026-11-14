// "Add to calendar" links that work everywhere without extra libraries: they open Google Calendar
// (the app on Android, the website elsewhere) or Outlook with the event already filled in.
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // 20261115T170000Z
const enc = encodeURIComponent;

export type CalEvent = { title: string; start: Date; minutes: number; details?: string; weekly?: boolean };

export function googleCalendarUrl(e: CalEvent) {
  const end = new Date(e.start.getTime() + e.minutes * 60e3);
  const recur = e.weekly ? '&recur=' + enc('RRULE:FREQ=WEEKLY') : '';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(e.title)}&dates=${stamp(e.start)}/${stamp(end)}&details=${enc(e.details || '')}${recur}`;
}

export function outlookCalendarUrl(e: CalEvent) {
  const end = new Date(e.start.getTime() + e.minutes * 60e3);
  return `https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${enc(e.title)}&startdt=${enc(e.start.toISOString())}&enddt=${enc(end.toISOString())}&body=${enc(e.details || '')}`;
}

/** The next time a weekly slot happens (weekday 0 = Sunday), in the phone's own time zone. */
export function nextWeekly(weekday: number, hour: number, minute = 0, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  if (d.getTime() < now.getTime() - 30 * 60e3) d.setDate(d.getDate() + 7); // this week's one is over
  return d;
}
