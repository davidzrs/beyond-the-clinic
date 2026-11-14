import { useState } from 'react';
import { DAYS, fmtDate, fmtLong, LEVEL, levelOf, phqBand, riskAt, SIGNALS, signalNow, slice, THRESHOLDS, weeksAt, checkInAt, type Patient as P, type SignalKey } from '../data';
import { go, useStore } from '../store';
import { Avatar, Card, Icon, LevelPill } from '../components/ui';
import { LineChart } from '../components/Charts';

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

        <Card title="Why the score moved" sub="This week compared with this person’s usual">
          {reasons.length ? (
            <ul className="reasons">
              {reasons.map((r) => (
                <li key={r.key}>
                  <div><b>{r.label}</b><span>{r.change}</span></div>
                  <div className="zbar" title={`${r.z.toFixed(1)} SD from usual`}><i style={{ width: Math.min(100, (Math.abs(r.z) / 4) * 100) + '%' }} /></div>
                  <span className="muted small">{Math.abs(r.z).toFixed(1)} SD from usual</span>
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

        <Card className="span-2" title="Signals" sub="Last 6 weeks. The grey band is this person’s usual range (baseline ± 1 SD); the value is this week’s average.">
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

        <Card title="Calls" sub="Mellow tells the patient a call is coming, in plain words.">
          <ul className="calls">
            {calls.map((c) => <li key={c.id}><Icon name="clock" size={16} /><div><b>{c.when}</b><span className="muted small">{c.reason}</span></div><button className="link" onClick={() => S.cancelCall(c.id)}>Cancel</button></li>)}
            {!calls.length && <li className="muted small">No call scheduled.</li>}
          </ul>
          <button className="btn" onClick={() => setCalling(true)}><Icon name="phone" size={15} /> Schedule a call</button>
        </Card>
      </div>

      {calling && <CallDialog p={p} reasons={reasons.map((r) => r.label + ' ' + r.change)} onClose={() => setCalling(false)} />}
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
  const all = vals.filter((v): v is number => v != null).concat(base != null && sd != null ? [base - sd, base + sd] : []);
  if (!all.length) return null;
  let lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
  const worse = z == null ? 0 : def.worse === 'both' ? Math.abs(z) : def.worse === 'up' ? z : -z;
  const flag = worse >= 1.6 ? 'off' : worse >= 1 ? 'drift' : 'ok';
  return (
    <div className={'sig sig-' + flag}>
      <div className="sig-head">
        <span>{def.label}</span>
        <span className={'sig-flag ' + flag}>{flag === 'off' ? 'Outside usual' : flag === 'drift' ? 'Drifting' : 'Usual'}</span>
      </div>
      <div className="sig-val">
        <b>{recent != null ? def.fmt(recent) : '—'}</b>
        {recent != null && base != null && <span className="muted small">{def.delta(recent, base)} vs usual {def.fmt(base)}</span>}
      </div>
      <LineChart compact ariaLabel={def.label + ', last 6 weeks'} values={vals} startDay={from} endDay={day} domain={[lo, hi]} height={58}
        baseline={base != null && sd != null ? { lo: base - sd, hi: base + sd } : undefined} fmt={def.fmt} />
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
  const slots = [1, 3, 24, 26, 48].map((h) => { const d = new Date(base.getTime() + h * 3600e3); if (d.getHours() < 9) d.setHours(9); if (d.getHours() > 17) { d.setDate(d.getDate() + 1); d.setHours(9); } return d; })
    .map((d) => d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }));
  const uniq = [...new Set(slots)];
  const [slot, setSlot] = useState(uniq[0]);
  const [reason, setReason] = useState(reasons.length ? 'Check-in: ' + reasons.slice(0, 2).join(', ') : 'Routine check-in');
  return (
    <div className="scrim" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal aria-labelledby="calltitle" onClick={(e) => e.stopPropagation()}>
        <header><h3 id="calltitle">Schedule a call with {p.name}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></header>
        <p className="muted small">The patient gets a gentle heads-up in Mellow: “Your care team would like to check in.”</p>
        <div className="slots">{uniq.map((s) => <button key={s} className={'slot' + (s === slot ? ' on' : '')} onClick={() => setSlot(s)}>{s}</button>)}</div>
        <label>Reason (shown to the care team)<input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <footer>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => { S.addCall(p.id, slot, reason); S.say('Call scheduled · ' + slot); onClose(); }}><Icon name="phone" size={15} /> Schedule</button>
        </footer>
      </div>
    </div>
  );
}
