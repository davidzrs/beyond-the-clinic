import { useEffect, useMemo, useRef, useState } from 'react';
import { dateOf, fmtLong } from '../data';
import { Icon } from './ui';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAY = 864e5;

// The "View as of" date as a button: ‹ day ›, and a click opens a month calendar to jump to any day.
export function DateButton({ day, min, max, today, onChange }: { day: number; min: number; max: number; today: number; onChange: (d: number) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const start = dateOf(1).getTime(); // UTC midnight of day 1
  const toDay = (utc: number) => Math.round((utc - start) / DAY) + 1;
  const sel = dateOf(day);
  const [view, setView] = useState({ y: sel.getUTCFullYear(), m: sel.getUTCMonth() });
  useEffect(() => { if (open) setView({ y: sel.getUTCFullYear(), m: sel.getUTCMonth() }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);

  const cells = useMemo(() => {
    const first = Date.UTC(view.y, view.m, 1);
    const lead = (new Date(first).getUTCDay() + 6) % 7;
    const daysIn = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    const rows = Math.ceil((lead + daysIn) / 7);
    return Array.from({ length: rows * 7 }, (_, i) => first + (i - lead) * DAY);
  }, [view]);
  const firstMonth = dateOf(min), lastMonth = dateOf(max);
  const canPrev = view.y * 12 + view.m > firstMonth.getUTCFullYear() * 12 + firstMonth.getUTCMonth();
  const canNext = view.y * 12 + view.m < lastMonth.getUTCFullYear() * 12 + lastMonth.getUTCMonth();
  const shift = (n: number) => setView((v) => { const d = new Date(Date.UTC(v.y, v.m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const pick = (d: number) => { onChange(d); setOpen(false); };

  return (
    <div className="datebtn" ref={box}>
      <button className="datebtn-step" onClick={() => onChange(Math.max(min, day - 1))} disabled={day <= min} aria-label="Previous day"><Icon name="back" size={15} /></button>
      <button className={'datebtn-main' + (open ? ' open' : '')} onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open}>
        <Icon name="calendar" size={16} />
        <span>{fmtLong(day)}</span>
        {day === today && <em>Today</em>}
      </button>
      <button className="datebtn-step" onClick={() => onChange(Math.min(max, day + 1))} disabled={day >= max} aria-label="Next day"><Icon name="next" size={15} /></button>

      {open && (
        <div className="datepop" role="dialog" aria-label="Choose a date">
          <div className="dtp-head">
            <button type="button" className="icon-btn" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month"><Icon name="back" size={16} /></button>
            <b>{new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</b>
            <button type="button" className="icon-btn" onClick={() => shift(1)} disabled={!canNext} aria-label="Next month"><Icon name="next" size={16} /></button>
          </div>
          <div className="dtp-grid">
            {WEEKDAYS.map((w) => <span key={w} className="dtp-wd">{w}</span>)}
            {cells.map((utc) => {
              const d = toDay(utc);
              const out = new Date(utc).getUTCMonth() !== view.m;
              const ok = d >= min && d <= max;
              const cls = ['dtp-day', out && 'out', !ok && 'off', d === today && 'today', d === day && 'on'].filter(Boolean).join(' ');
              return <button type="button" key={utc} className={cls} disabled={!ok} onClick={() => pick(d)}>{new Date(utc).getUTCDate()}</button>;
            })}
          </div>
          <div className="datepop-foot">
            <span className="muted small">Data from {fmtLong(min)}</span>
            <button className="link small" onClick={() => pick(today)} disabled={day === today}>Back to today</button>
          </div>
        </div>
      )}
    </div>
  );
}
