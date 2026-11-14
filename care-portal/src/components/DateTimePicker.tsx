import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Icon } from './ui';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const pad = (n: number) => String(n).padStart(2, '0');
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Inline month calendar + a free time field (any hour, any minute), in the portal's own style.
export function DateTimePicker({ value, onChange }: { value: Date | null; onChange: (d: Date) => void }) {
  const now = new Date();
  const today = startOfDay(now);
  const [view, setView] = useState(() => { const d = value ?? now; return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [h, setH] = useState(value ? value.getHours() : 9);
  const [m, setM] = useState(value ? value.getMinutes() : 0);
  const day = value ? startOfDay(value) : null;

  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const daysIn = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const rows = Math.ceil((lead + daysIn) / 7);
    return Array.from({ length: rows * 7 }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i - lead + 1));
  }, [view]);

  const emit = (d: Date | null, hh: number, mm: number) => { if (d) onChange(new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm)); };
  const pickDay = (d: Date) => {
    let hh = h, mm = m;
    if (sameDay(d, now) && new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm) <= now) { hh = Math.min(23, now.getHours() + 1); mm = 0; setH(hh); setM(mm); }
    emit(d, hh, mm);
  };
  const setHour = (v: number) => { setH(v); emit(day, v, m); };
  const setMinute = (v: number) => { setM(v); emit(day, h, v); };
  const canPrev = view.getTime() > new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const past = !!value && value.getTime() <= now.getTime();

  return (
    <div className="dtp">
      <div className="dtp-cal">
        <div className="dtp-head">
          <button type="button" className="icon-btn" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} disabled={!canPrev} aria-label="Previous month"><Icon name="back" size={16} /></button>
          <b>{view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</b>
          <button type="button" className="icon-btn" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} aria-label="Next month"><Icon name="next" size={16} /></button>
        </div>
        <div className="dtp-grid">
          {WEEKDAYS.map((w) => <span key={w} className="dtp-wd">{w}</span>)}
          {cells.map((d) => {
            const out = d.getMonth() !== view.getMonth();
            const ok = d.getTime() >= today.getTime();
            const cls = ['dtp-day', out && 'out', !ok && 'off', sameDay(d, now) && 'today', day && sameDay(d, day) && 'on', (d.getDay() + 6) % 7 >= 5 && 'wkend'].filter(Boolean).join(' ');
            return <button type="button" key={d.toISOString()} className={cls} disabled={!ok} onClick={() => pickDay(d)} aria-pressed={!!day && sameDay(d, day)}>{d.getDate()}</button>;
          })}
        </div>
      </div>
      <div className="dtp-side">
        <span className="dtp-label">{day ? day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Choose a day'}</span>
        <div className="dtp-clock" aria-label="Time">
          <Spin value={h} max={23} step={1} onChange={setHour} label="Hour" />
          <span className="dtp-colon">:</span>
          <Spin value={m} max={59} step={5} onChange={setMinute} label="Minutes" />
        </div>
        <span className={'dtp-hint' + (past ? ' bad' : '')}>{past ? 'That time has already passed.' : 'Type any time, or use the arrows.'}</span>
      </div>
    </div>
  );
}

// One number you can type into or step with the arrows (buttons or ↑/↓ keys).
function Spin({ value, max, step, onChange, label }: { value: number; max: number; step: number; onChange: (v: number) => void; label: string }) {
  const [text, setText] = useState(pad(value));
  useEffect(() => setText(pad(value)), [value]);
  const wrap = (v: number) => ((v % (max + 1)) + max + 1) % (max + 1);
  const up = () => onChange(wrap(Math.floor(value / step) * step + step));
  const down = () => onChange(wrap(Math.ceil(value / step) * step - step));
  const commit = () => { const n = parseInt(text, 10); if (Number.isFinite(n) && n >= 0 && n <= max) onChange(n); else setText(pad(value)); };
  const key = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); up(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); down(); }
    else if (e.key === 'Enter') { e.preventDefault(); commit(); (e.target as HTMLInputElement).blur(); }
  };
  return (
    <div className="spin">
      <button type="button" onClick={up} aria-label={label + ' up'} tabIndex={-1}><Icon name="back" size={16} /></button>
      <input aria-label={label} inputMode="numeric" maxLength={2} value={text}
        onChange={(e) => { const t = e.target.value.replace(/\D/g, '').slice(0, 2); setText(t); const n = parseInt(t, 10); if (t.length === 2 && n <= max) onChange(n); }}
        onBlur={commit} onKeyDown={key} onFocus={(e) => e.target.select()} />
      <button type="button" onClick={down} aria-label={label + ' down'} tabIndex={-1}><Icon name="back" size={16} /></button>
    </div>
  );
}
