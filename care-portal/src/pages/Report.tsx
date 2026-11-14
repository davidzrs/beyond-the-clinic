import { useMemo, useRef, useState } from 'react';
import { DAYS, fmtDate, LEVEL, phqBand, TODAY_DAY, type Level } from '../data';
import { buildReport, PERIOD, type ReportRow } from '../report';
import { go, useStore } from '../store';
import { Icon, Logo } from '../components/ui';

// Plain hex colours (not CSS classes) inside the paper, so the PDF capture looks exactly like the screen.
const HUE: Record<Level, string> = { high: '#d03b3b', watch: '#e0a019', steady: '#2f8b54', calibrating: '#94a0b2' };
const TINT: Record<Level, string> = { high: '#fdeceb', watch: '#fdf4de', steady: '#e5f4ea', calibrating: '#eef1f5' };

export default function Report() {
  const S = useStore();
  const end = S.day;
  const R = useMemo(() => buildReport(end), [end]);
  const paper = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const range = `${fmtDate(R.start)} – ${fmtDate(R.end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const fileName = `mellow-care-report-${fmtDate(R.end, { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-')}.pdf`;

  const download = async () => {
    if (!paper.current) return;
    setBusy(true);
    try { await savePdf(paper.current, fileName); S.say('Report downloaded'); }
    catch { S.say('Could not create the PDF. Try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{S.user?.clinic}</p>
          <h1>Biweekly report</h1>
          <p className="muted">One page on what changed in the last {PERIOD} days. Sent to the care team every two weeks.</p>
        </div>
        <div className="report-actions">
          <div className="pager-mini">
            <button className="icon-btn pager-btn" onClick={() => S.setDay(Math.max(PERIOD, end - PERIOD))} disabled={end - PERIOD < PERIOD} aria-label="Previous report"><Icon name="back" size={16} /></button>
            <span className="small">{range}</span>
            <button className="icon-btn pager-btn" onClick={() => S.setDay(Math.min(TODAY_DAY, end + PERIOD))} disabled={end >= TODAY_DAY} aria-label="Next report"><Icon name="next" size={16} /></button>
          </div>
          <button className="btn primary" onClick={download} disabled={busy}><Icon name="download" size={16} /> {busy ? 'Creating PDF…' : 'Download PDF'}</button>
        </div>
      </header>

      <div className="paper-wrap">
        <div className="paper" ref={paper}>
          <div className="rp-head">
            <div className="rp-logo"><Logo /></div>
            <div className="rp-title">
              <span>Biweekly report</span>
              <b>{range}</b>
            </div>
          </div>
          <div className="rp-meta">
            <span>{S.user?.clinic}</span>
            <span>Prepared for {S.user?.name} · {R.total} patients sharing</span>
          </div>

          <section className="rp-summary">
            <h4>In short</h4>
            <ul>{R.summary.map((s) => <li key={s}>{s}</li>)}</ul>
          </section>

          <div className="rp-kpis">
            {R.counts.map((c) => (
              <div key={c.level} className="rp-kpi" style={{ borderTopColor: HUE[c.level] }}>
                <div className="rp-kpi-n"><b>{c.now}</b><Change level={c.level} n={c.now - c.prev} /></div>
                <span><Dot level={c.level} /> {LEVEL[c.level].label}</span>
              </div>
            ))}
          </div>

          <section>
            <h4>Needs attention</h4>
            {R.attention.length ? (
              <table className="rp-table">
                <thead><tr><th>Patient</th><th>Status</th><th className="num">Score</th><th>Last 14 days</th><th>Main reasons</th></tr></thead>
                <tbody>
                  {R.attention.slice(0, 6).map((r) => (
                    <tr key={r.p.id} onClick={() => go('/patients/' + r.p.id)}>
                      <td><b>{r.p.name}</b></td>
                      <td><Pill level={r.level} /></td>
                      <td className="num"><b>{r.now}</b>{r.prev != null && <small> from {r.prev}</small>}</td>
                      <td><MiniStrip r={r} start={R.start} end={R.end} /></td>
                      <td className="rp-reasons">{r.reasons.length ? r.reasons.slice(0, 2).map((x) => x.label + ' ' + x.change.replace(' vs usual', '')).join(' · ') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="rp-empty">Nobody is above their usual range right now.</p>}
          </section>

          <div className="rp-cols">
            <section>
              <h4>Changes since last report</h4>
              <ul className="rp-list">
                {R.worse.map((r) => <li key={'w' + r.p.id}><Arrow up /> <b>{r.p.name}</b> {label(r.prevLevel)} → {LEVEL[r.level].label}</li>)}
                {R.better.map((r) => <li key={'b' + r.p.id}><Arrow /> <b>{r.p.name}</b> {label(r.prevLevel)} → {LEVEL[r.level].label}{r.peak != null && r.peak >= 55 ? ` (peaked at ${r.peak})` : ''}</li>)}
                {R.newcomers.map((r) => <li key={'n' + r.p.id}><span className="rp-new">New</span> <b>{r.p.name}</b> started sharing on {fmtDate(r.p.firstDay)}</li>)}
                {!R.worse.length && !R.better.length && !R.newcomers.length && <li className="rp-empty">No level changes.</li>}
              </ul>
            </section>
            <section>
              <h4>PHQ-9 this period</h4>
              {R.phq.length ? (
                <table className="rp-table compact">
                  <tbody>
                    {R.phq.slice(0, 6).map((q) => {
                      const up = q.prevScore != null ? q.score - q.prevScore : null;
                      const flag = q.score >= 10 || (up != null && up >= 5);
                      return (
                        <tr key={q.p.id + q.day}>
                          <td><b>{q.p.name}</b><small> · {fmtDate(q.day)}</small></td>
                          <td className="num"><b style={flag ? { color: HUE.high } : undefined}>{q.score}</b></td>
                          <td>{phqBand(q.score)}</td>
                          <td className="num"><small>{up == null ? 'first' : delta(up)}</small></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : <p className="rp-empty">No PHQ-9 taken in this period.</p>}
            </section>
          </div>

          <section>
            <h4>Check-in gaps</h4>
            <p className="rp-text">
              {R.lowEngagement.length
                ? R.lowEngagement.slice(0, 5).map((r) => `${r.p.name} (${r.missed} of ${r.days} days missed)`).join(' · ')
                : 'Everyone checked in on most days.'}
            </p>
          </section>

          <footer className="rp-foot">
            <span>Numbers in brackets: change since the last report ({fmtDate(R.end - PERIOD)}). Mellow Care · generated {fmtDate(Math.min(DAYS, R.end), { day: 'numeric', month: 'short', year: 'numeric' })}. Scores are an explainable early-warning heuristic built from each person’s own baseline, not a diagnosis. Only patients who consented to share are included.</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

// The browser draws the report itself (SVG foreignObject), so text and spacing match the screen exactly.
async function savePdf(el: HTMLElement, fileName: string) {
  const [{ domToCanvas }, { jsPDF }] = await Promise.all([import('modern-screenshot'), import('jspdf')]);
  try { await document.fonts?.ready; } catch { /* fonts API missing */ }
  const canvas = await domToCanvas(el, {
    scale: 2, backgroundColor: '#ffffff',
    style: { border: '0', boxShadow: 'none', borderRadius: '0', margin: '0' },
  });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const pw = 210, ph = 297;
  const ratio = canvas.height / canvas.width;
  let w = pw, h = pw * ratio;
  if (h > ph) { h = ph; w = ph / ratio; } // always one page
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pw - w) / 2, 0, w, h, undefined, 'FAST');
  pdf.setProperties({ title: 'Mellow Care biweekly report', creator: 'Mellow Care' });
  pdf.save(fileName);
}

const delta = (n: number) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '±0');
// More people needing a call is bad news; more people steady is good news. "Learning normal" is neutral.
function Change({ level, n }: { level: Level; n: number }) {
  const good = level === 'steady' ? n > 0 : level === 'high' || level === 'watch' ? n < 0 : false;
  const bad = level === 'steady' ? n < 0 : level === 'high' || level === 'watch' ? n > 0 : false;
  const color = n === 0 || (!good && !bad) ? '#94a0b2' : good ? HUE.steady : HUE.high;
  return <span className="rp-change" style={{ color }}>({n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'})</span>;
}
const label = (l: Level | 'new') => (l === 'new' ? 'New' : LEVEL[l].label);

function Dot({ level }: { level: Level }) {
  return (
    <svg className="rp-dot" width="9" height="9" viewBox="0 0 10 10" aria-hidden>
      {level === 'calibrating' ? <circle cx="5" cy="5" r="3.8" fill="none" stroke={HUE[level]} strokeWidth="2" /> : <circle cx="5" cy="5" r="5" fill={HUE[level]} />}
    </svg>
  );
}
function Pill({ level }: { level: Level }) {
  return <span className="rp-pill" style={{ background: TINT[level] }}><span className="rp-glyph" style={{ color: HUE[level] }}>{level === 'calibrating' ? '○' : '●'}</span>{LEVEL[level].label}</span>;
}
function Arrow({ up }: { up?: boolean }) {
  return <span className="rp-arrow" style={{ color: up ? HUE.high : HUE.steady }}>{up ? '▲' : '▼'}</span>;
}
function MiniStrip({ r, start, end }: { r: ReportRow; start: number; end: number }) {
  const n = end - start + 1;
  return (
    <svg width={n * 6} height={20} viewBox={`0 0 ${n * 6} 20`} aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const v = r.p.risk[start + i - 1];
        if (v == null || start + i < r.p.firstDay) return <rect key={i} x={i * 6} y={17} width={4} height={3} rx={1} fill="#e2e8f0" />;
        const h = Math.max(3, (v / 100) * 20);
        return <rect key={i} x={i * 6} y={20 - h} width={4} height={h} rx={1} fill={v >= 55 ? HUE.high : v >= 30 ? HUE.watch : '#9fcdb1'} />;
      })}
    </svg>
  );
}
