import { useState } from 'react';
import { DAYS, fmtDate, fmtLong, LEVEL, levelOf, phqBand, riskAt, SIGNALS, signalNow, slice, THRESHOLDS, weeksAt, checkInAt, type Patient as P, type SignalDef, type SignalKey } from '../data';
import { go, useStore } from '../store';
import { Avatar, Card, Hint, Icon, LevelPill } from '../components/ui';
import { LineChart } from '../components/Charts';
import { AddToCalendar } from '../components/Calendar';
import { DateTimePicker } from '../components/DateTimePicker';

const SHOWN: SignalKey[] = ['sleepHours', 'restingHr', 'hrvRmssd', 'morningSteps', 'screenMinutes', 'messagesSent', 'mood', 'lateNightScreenMinutes'];

export default function Patient({ p, openCall }: { p: P; openCall: boolean }) {
  const S = useStore();
  const day = S.day;
  const risk = riskAt(p, day);
  const level = levelOf(risk);
  const reasons = p.reasonsAt(day);
  const [calling, setCalling] = useState(openCall);
  if (day < p.firstDay) {
    return (
      <div className="page">
        <button className="back" onClick={() => go('/patients')}><Icon name="back" size={16} /> All patients</button>
        <section className="card empty-state">
          <Avatar initials={p.initials} />
          <h2>{p.name} isn’t sharing yet on {fmtLong(day)}</h2>
          <p className="muted">They started sharing their Mellow trends on {fmtLong(p.firstDay)}, after their last TMS session.</p>
          <button className="btn primary" onClick={() => S.setDay(p.firstDay + 14 > DAYS ? DAYS : p.firstDay + 14)}>Jump to {fmtDate(Math.min(DAYS, p.firstDay + 14))}</button>
        </section>
      </div>
    );
  }
  const notes = S.notes.filter((n) => n.patientId === p.id);
  const calls = S.calls.filter((c) => c.patientId === p.id);
  const startDay = Math.max(1, p.firstDay);
  const peak = p.risk.slice(0, day).reduce<{ d: number; v: number } | null>((m, v, i) => (v != null && (!m || v > m.v) ? { d: i + 1, v } : m), null);
  const qs = p.questionnaires.filter((q) => q.day <= day);
  const firstScore = (() => { const i = p.risk.findIndex((v) => v != null); return i < 0 ? null : i + 1; })();
  const lastPhq = [...qs].reverse().find((q) => q.phq9 != null);

  return (
    <div className="page">
      <button className="back" onClick={() => go('/patients')}><Icon name="back" size={16} /> All patients</button>

      <header className={'phead lvhead-' + level}>
        <div className="who big">
          <Avatar initials={p.initials} level={level} />
          <div>
            <h1>{p.name}{p.isSam && <span className="tag">live demo</span>}</h1>
            <p className="muted">{weeksAt(p, day)} weeks after last TMS session · sharing since {fmtDate(p.firstDay)} · checked in {checkInAt(p, day)}</p>
          </div>
        </div>
        <div className="phead-score">
          <div>
            <span className="muted small">Early-warning score · {fmtDate(day)}</span>
            <div className="hero-n">{risk ?? '—'}<small>/100</small></div>
          </div>
          <LevelPill level={level} big />
        </div>
        <div className="phead-actions">
          <button className="btn primary" onClick={() => setCalling(true)}><Icon name="phone" size={16} /> Schedule call</button>
          <button className="btn" onClick={() => { S.markReviewed(p.id); S.say('Marked as reviewed'); }}><Icon name="check" size={16} /> {S.reviewed[p.id] ? 'Reviewed ' + new Date(S.reviewed[p.id]).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Mark reviewed'}</button>
        </div>
      </header>

      <div className="grid-2">
        <Card className="span-2" title="Score over time" sub={`${LEVEL[level].hint}${peak ? ` Highest so far: ${peak.v} on ${fmtDate(peak.d)}.` : ''}`}>
          <LineChart
            ariaLabel={`Early-warning score for ${p.name}, ${DAYS} days`}
            values={p.risk.slice(startDay - 1)} startDay={startDay} endDay={DAYS} cutoff={day}
            domain={[0, 100]} height={230} yTicks={[0, 30, 55, 100]} xTicks={6} fmt={(v) => String(Math.round(v))} area endLabel
            bands={[{ from: THRESHOLDS.high, to: 100, className: 'band-high', label: 'Call suggested · 55+' }, { from: THRESHOLDS.watch, to: THRESHOLDS.high, className: 'band-watch', label: 'Worth watching · 30–54' }]}
            markers={[...(firstScore && firstScore > startDay + 2 ? [{ day: firstScore, label: 'Baseline learnt' }] : []), ...p.events]}
            tip={(d, v) => <><b>{v ?? '—'} · {LEVEL[levelOf(v)].label}</b><span>{fmtLong(d)}</span></>}
          />
          {day < DAYS && <p className="muted small">Viewing as of {fmtLong(day)}. Later days are shaded.</p>}
        </Card>

        <Card title="Why the score moved" sub="This week, compared with this person’s usual">
          {reasons.length ? (
            <ul className="reasons">
              {reasons.map((r) => (
                <li key={r.key}>
                  <b>{r.text}</b>
                  {r.key === 'checkin' ? (
                    <>
                      <div className="zbar"><i style={{ width: '100%' }} /></div>
                      <span className="muted small">Answered by the patient in the Mellow app</span>
                    </>
                  ) : (
                    <>
                      <div className="zbar"><i style={{ width: Math.min(100, (Math.abs(r.z) / 4) * 100) + '%' }} /></div>
                      <span className="muted small">{Math.abs(r.z).toFixed(1)}× their usual day-to-day swing</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="muted">{level === 'calibrating' ? 'Not enough days yet to know this person’s normal.' : 'Nothing has moved outside the usual range this week.'}</p>}
          <div className="consent"><Icon name="shield" size={16} /> Shared by the patient: trends, scores and questionnaires. Not shared: messages, location, app content.</div>
        </Card>

        <Card title="Questionnaires" sub={lastPhq ? `Last PHQ-9: ${lastPhq.phq9} (${phqBand(lastPhq.phq9!)}) on ${fmtDate(lastPhq.day)}` : 'No PHQ-9 yet'}>
          <LineChart
            ariaLabel="PHQ-9 scores over time" connect startDay={startDay} endDay={DAYS} cutoff={day}
            domain={[0, 27]} height={150} yTicks={[0, 5, 10, 15, 20, 27]} xTicks={4} fmt={(v) => String(Math.round(v))} dots
            bands={[{ from: 10, to: 27, className: 'band-high', label: 'Moderate or worse · 10+' }, { from: 5, to: 10, className: 'band-watch' }]}
            {...phqValues(p, startDay)}
            tip={(d) => { const q = p.questionnaires.find((x) => x.day === d); return q?.phq9 != null ? <><b>PHQ-9 {q.phq9} · {phqBand(q.phq9)}</b><span>{fmtLong(d)}</span></> : <><b>No PHQ-9</b><span>{fmtLong(d)}</span></>; }}
          />
          <table className="qtable">
            <thead><tr><th>Date</th><th className="num">PHQ-9</th><th>Severity</th><th className="num">WHO-5</th></tr></thead>
            <tbody>
              {[...qs].reverse().slice(0, 5).map((q) => (
                <tr key={q.day}><td>{fmtDate(q.day)}</td><td className="num">{q.phq9 ?? '—'}</td><td>{q.phq9 != null ? phqBand(q.phq9) : <span className="muted">WHO-5 only</span>}</td><td className="num">{q.who5 ?? '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="span-2" title="Signals" sub={<SignalLegend from={p.baseline.from} to={p.baseline.to} />}>
          <div className="signals">
            {SHOWN.map((k) => <SignalTile key={k} p={p} k={k} day={day} />)}
          </div>
        </Card>

        <Card title="Notes" sub="Visible to the care team only">
          <NoteBox onAdd={(t) => { S.addNote(p.id, t); S.say('Note saved'); }} />
          <ul className="notes">
            {notes.map((n) => <li key={n.id}><p>{n.text}</p><span className="muted small">{n.author} · {new Date(n.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></li>)}
            {!notes.length && <li className="muted small">No notes yet.</li>}
          </ul>
        </Card>

        <Card title="Calls" sub="Visible to the care team only">
          <ul className="calls">
            {calls.map((c) => <li key={c.id}><Icon name="clock" size={16} /><div><b>{c.when}</b><span className="muted small">{c.reason}</span><AddToCalendar call={c} patientName={p.name} /></div><button className="link" onClick={() => S.cancelCall(c.id)}>Cancel</button></li>)}
            {!calls.length && <li className="muted small">No call scheduled.</li>}
          </ul>
          <button className="btn" onClick={() => setCalling(true)}><Icon name="phone" size={15} /> Schedule a call</button>
        </Card>
      </div>

      {calling && <CallDialog p={p} reasons={reasons.map((r) => r.text)} onClose={() => setCalling(false)} />}
    </div>
  );
}

function phqValues(p: P, startDay: number) {
  const values: (number | null)[] = Array(DAYS - startDay + 1).fill(null);
  p.questionnaires.forEach((q) => { if (q.phq9 != null && q.day >= startDay) values[q.day - startDay] = q.phq9; });
  return { values };
}

function SignalTile({ p, k, day }: { p: P; k: SignalKey; day: number }) {
  const def = SIGNALS.find((s) => s.key === k)!;
  const { recent, base, sd, z } = signalNow(p, k, day);
  const from = Math.max(p.firstDay, day - 41);
  const vals = slice(p.series[k], from, day);
  const clampR = (v: number) => Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, v));
  const band = base != null && sd != null ? { lo: clampR(base - sd), hi: clampR(base + sd) } : null;
  const all = vals.filter((v): v is number => v != null).concat(band ? [band.lo, band.hi] : []);
  if (!all.length) return null;
  let lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
  const worse = z == null ? 0 : def.worse === 'both' ? Math.abs(z) : def.worse === 'up' ? z : -z;
  const flag = worse >= 1.6 ? 'off' : worse >= 1 ? 'drift' : 'ok';
  const dir = (z ?? 0) >= 0 ? 'up' : 'down';
  // Far out in the harmless direction (e.g. many more steps): say so, but without a warning colour.
  const harmless = flag === 'ok' && z != null && Math.abs(z) >= 1;
  const chip = flag === 'off' ? (dir === 'up' ? 'Above usual' : 'Below usual') : flag === 'drift' ? (dir === 'up' ? 'Drifting up' : 'Drifting down') : harmless ? (dir === 'up' ? 'Higher than usual' : 'Lower than usual') : 'Usual';
  return (
    <div className={'sig sig-' + flag}>
      <div className="sig-head">
        <span>{def.label}</span>
        <Hint className={'sig-flag ' + flag} tip={<><b>{chip}</b><span>{harmless ? 'Outside the usual range, in a harmless direction.' : FLAG_HELP[flag]}</span></>}>{chip}</Hint>
      </div>
      <div className="sig-val">
        <b>{recent != null ? def.fmt(recent) : '—'}</b>
        <span className="muted small">this week</span>
      </div>
      {z != null && base != null && sd != null && recent != null && <RangeGauge z={z} def={def} base={base} sd={sd} recent={recent} />}
      {band && <div className="sig-range small">Usual <b>{def.range(band.lo, band.hi)}</b></div>}
      <LineChart compact ariaLabel={def.label + ', last 6 weeks'} values={vals} startDay={from} endDay={day} domain={[lo, hi]} height={44}
        baseline={band ?? undefined} fmt={def.fmt} />
    </div>
  );
}

// Where this week sits against the person's own usual range, in steps of their normal day-to-day swing.
// Grey = usual, amber = drifting, red = outside usual. Only the worrying side has amber and red.
function SignalLegend({ from, to }: { from: number; to: number }) {
  return (
    <span className="sig-legend">
      <span>This week’s average <span className="lg-dot" /> against this person’s usual range, learned {fmtDate(from)} – {fmtDate(to)}.</span>
      <span className="lg-keys"><i className="g-ok" /> Usual <i className="g-drift" /> Drifting <i className="g-off" /> Outside usual</span>
    </span>
  );
}

const FLAG_HELP = {
  ok: 'Within this person’s normal range, or moving in a harmless direction.',
  drift: 'Further from normal than a typical week (1–1.6× their usual day-to-day swing). Worth keeping an eye on.',
  off: 'Rarely this far from normal in their usual weeks (1.6× their usual swing or more). One of the reasons a call may be suggested.',
} as const;
const ZONE_NAME = { ok: 'Usual', drift: 'Drifting', off: 'Outside usual' } as const;

function RangeGauge({ z, def, base, sd, recent }: { z: number; def: SignalDef; base: number; sd: number; recent: number }) {
  const segs: [number, number, keyof typeof ZONE_NAME][] = [[-3, -1.6, 'off'], [-1.6, -1, 'drift'], [-1, 1, 'ok'], [1, 1.6, 'drift'], [1.6, 3, 'off']];
  // Both sides show where drifting / outside usual would start. The harmless side (e.g. more steps) is paler: it's never flagged.
  const harmless = (a: number) => def.worse !== 'both' && (a < 0 ? def.worse === 'up' : def.worse === 'down') && a !== -1;
  const at = (k: number) => Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, base + k * sd));
  // the zone in real units: "below 649 steps", "649–973 steps", "above 2,362 steps"
  const zone = (a: number, b: number) => (a <= -3 ? 'Below ' + def.fmt(at(b)) : b >= 3 ? 'Above ' + def.fmt(at(a)) : def.range(at(a), at(b)));
  const pos = ((Math.max(-3, Math.min(3, z)) + 3) / 6) * 100;
  const swing = Math.abs(z) < 0.1 ? 'Right at their usual average' : `${Math.abs(z).toFixed(1)}× their usual day-to-day swing ${z < 0 ? 'below' : 'above'} average (${def.fmt(base)})`;
  return (
    <div className="gauge" role="img" aria-label={def.label + ': ' + swing}>
      {segs.map(([a, b, kind]) => (
        <Hint key={a} className={'g-seg g-' + kind + (harmless(a) ? ' soft' : '')} style={{ width: ((b - a) / 6) * 100 + '%' }}
          tip={<><b>{ZONE_NAME[kind]}</b><span>{zone(a, b)}</span></>} />
      ))}
      <Hint className="g-dot" style={{ left: pos + '%' }}
        tip={<><b>This week: {def.fmt(recent)}</b><span>{swing}</span></>} />
    </div>
  );
}

function NoteBox({ onAdd }: { onAdd: (t: string) => void }) {
  const [t, setT] = useState('');
  return (
    <form className="notebox" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onAdd(t.trim()); setT(''); } }}>
      <textarea value={t} onChange={(e) => setT(e.target.value)} placeholder="Add a note, e.g. ‘Called, sleeping more since job change. Follow up Friday.’" rows={2} />
      <button className="btn sm" type="submit" disabled={!t.trim()}><Icon name="note" size={14} /> Save note</button>
    </form>
  );
}

function CallDialog({ p, reasons, onClose }: { p: P; reasons: string[]; onClose: () => void }) {
  const S = useStore();
  const base = new Date(); base.setMinutes(0, 0, 0);
  const dates = [1, 3, 24, 26, 48].map((h) => { const d = new Date(base.getTime() + h * 3600e3); if (d.getHours() < 9) d.setHours(9); if (d.getHours() > 17) { d.setDate(d.getDate() + 1); d.setHours(9); } return d; });
  const label = (d: Date) => d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const uniq = [...new Set(dates.map(label))];
  const [slot, setSlot] = useState<string>(uniq[0]); // a suggested time, or 'own'
  const [own, setOwn] = useState<Date | null>(null); // time picked in the calendar
  // the reason box grows with its text, so 2–3 lines stay readable
  const grow = (el: HTMLTextAreaElement | null) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 2 + 'px'; } };
  const lc = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const [reason, setReason] = useState(reasons.length ? `Check in about ${reasons.slice(0, 2).map(lc).join(' and ')}` : 'Routine check-in');
  const ownBad = slot === 'own' && (!own || own.getTime() < Date.now());
  const chosen = slot === 'own' ? own : dates.find((d) => label(d) === slot) ?? null;
  const schedule = () => {
    if (!chosen || ownBad) return;
    const l = label(chosen);
    S.addCall(p.id, l, reason, chosen.toISOString()); S.say('Call scheduled · ' + l); onClose();
  };
  return (
    <div className="scrim" onClick={onClose}>
      <div className="dialog wide" role="dialog" aria-modal aria-labelledby="calltitle" onClick={(e) => e.stopPropagation()}>
        <header><h3 id="calltitle">Schedule a call with {p.name}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></header>
        <div className="slots">
          {uniq.map((s) => <button key={s} className={'slot' + (s === slot ? ' on' : '')} onClick={() => setSlot(s)}>{s}</button>)}
          <button className={'slot pick' + (slot === 'own' ? ' on' : '')} onClick={() => setSlot('own')}>
            <Icon name="calendar" size={15} /> Pick another time
          </button>
        </div>
        {slot === 'own' && <DateTimePicker value={own} onChange={setOwn} />}
        <label className="reason-field">
          <span>Reason for the call <em>Only the care team sees this</em></span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} ref={grow} onInput={(e) => grow(e.currentTarget)} />
        </label>
        <footer>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={schedule} disabled={!chosen || ownBad}><Icon name="phone" size={15} /> Schedule{chosen && !ownBad ? ' · ' + label(chosen) : ''}</button>
        </footer>
      </div>
    </div>
  );
}
