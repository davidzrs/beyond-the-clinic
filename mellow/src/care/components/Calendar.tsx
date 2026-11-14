import { useEffect, useRef, useState } from 'react';
import { careUrl, type Call } from '../store';
import { Icon } from './ui';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Calls booked before times were stored only have the label ("Sat 14 Nov, 18:00"): read the date back from it.
export function callStart(c: Call): Date | null {
  if (c.at) return new Date(c.at);
  const m = c.when.match(/(\d{1,2}) (\w{3})\w*,? (\d{1,2}):(\d{2})/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].slice(0, 3));
  if (month < 0) return null;
  const created = new Date(c.createdAt);
  const d = new Date(created.getFullYear(), month, +m[1], +m[3], +m[4]);
  if (d.getTime() < c.createdAt - 864e5) d.setFullYear(d.getFullYear() + 1); // booked in December for January
  return d;
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // 20261114T160000Z
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

// "Add to calendar": Google Calendar, Outlook, or an .ics file (Apple Calendar and anything else).
export function AddToCalendar({ call, patientName }: { call: Call; patientName: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);

  const start = callStart(call);
  if (!start) return null;
  const end = new Date(start.getTime() + 15 * 60e3);
  const title = `Call with ${patientName} · Mellow Care`;
  const link = location.origin + careUrl('/patients/' + call.patientId);
  const details = `${call.reason}\n\nPatient page: ${link}`;
  const enc = encodeURIComponent;
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(title)}&dates=${stamp(start)}/${stamp(end)}&details=${enc(details)}`;
  const outlook = `https://outlook.office.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${enc(title)}&startdt=${enc(start.toISOString())}&enddt=${enc(end.toISOString())}&body=${enc(details)}`;
  const ics = () => {
    const body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mellow Care//Clinician portal//EN', 'BEGIN:VEVENT',
      `UID:${call.id}@mellow-care`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:${icsText(title)}`, `DESCRIPTION:${icsText(details)}`, `URL:${link}`,
      'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(title)}`, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR', '',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `call-${patientName.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}.ics` });
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setOpen(false);
  };

  return (
    <span className="cal" ref={box}>
      <button className="link cal-btn" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} aria-expanded={open} aria-haspopup="menu">
        <Icon name="calendar" size={15} /> Add to calendar
      </button>
      {open && (
        <span className="cal-menu" role="menu">
          <a role="menuitem" href={google} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Google Calendar</a>
          <a role="menuitem" href={outlook} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Outlook</a>
          <button role="menuitem" onClick={ics}>Apple Calendar / other (.ics)</button>
        </span>
      )}
    </span>
  );
}
