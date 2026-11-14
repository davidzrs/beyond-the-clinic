import { useEffect, useMemo, useState } from 'react';
import { checkInAt, fmtLong, LEVEL, levelOf, PATIENTS, riskAt, weeksAt, type Level, type Patient } from '../data';
import { go, useStore } from '../store';
import { Avatar, Icon, LevelIcon, LevelPill } from '../components/ui';
import { Meter, Strip } from '../components/Charts';

type Filter = 'all' | Level;
const PAGE_SIZE = 5;

export default function Patients() {
  const S = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const pickFilter = (f: Filter) => { setFilter(f); setPage(0); };
  const rows = useMemo(() => PATIENTS.filter((p) => S.day >= p.firstDay).map((p) => {
    const risk = riskAt(p, S.day); const prev = riskAt(p, S.day - 7);
    return { p, risk, level: levelOf(risk), delta: risk != null && prev != null ? risk - prev : null, reasons: p.reasonsAt(S.day) };
  }).sort((a, b) => LEVEL[b.level].rank - LEVEL[a.level].rank || (b.risk ?? -1) - (a.risk ?? -1)), [S.day]);
  const count = (l: Level) => rows.filter((r) => r.level === l).length;
  const shown = rows.filter((r) => (filter === 'all' || r.level === filter) && r.p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const upcoming = S.calls.length;
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1);
  const visible = shown.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);
  const prev = () => setPage(Math.max(0, cur - 1));
  const next = () => setPage(Math.min(pages - 1, cur + 1));
  // ← / → flip pages when you're not typing in a field
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target; if (t instanceof Element && t.closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(0, Math.min(p, pages - 1) - 1));
      if (e.key === 'ArrowRight') setPage((p) => Math.min(pages - 1, p + 1));
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [pages]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{S.user?.clinic}</p>
          <h1>Who might need a call</h1>
          <p className="muted">Sorted by how far each person’s week has moved from their own normal · {fmtLong(S.day)}</p>
        </div>
      </header>

      <div className="stats">
        <Stat level="high" n={count('high')} label="calls suggested" onClick={() => pickFilter('high')} active={filter === 'high'} />
        <Stat level="watch" n={count('watch')} label="worth watching" onClick={() => pickFilter('watch')} active={filter === 'watch'} />
        <Stat level="steady" n={count('steady')} label="steady" onClick={() => pickFilter('steady')} active={filter === 'steady'} />
        <button className="stat" onClick={() => go('/calls')}>
          <span className="stat-n">{upcoming}</span>
          <span className="stat-l"><Icon name="phone" size={15} /> calls scheduled</span>
        </button>
      </div>

      <section className="card flush">
        <div className="toolbar">
          <div className="seg" role="tablist" aria-label="Filter by level">
            {(['all', 'high', 'watch', 'steady', 'calibrating'] as Filter[]).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} className={'seg-' + f + (filter === f ? ' on' : '')} onClick={() => pickFilter(f)}>
                {f === 'all' ? `All · ${rows.length}` : <>{<LevelIcon level={f} />}{LEVEL[f].label} · {count(f)}</>}
              </button>
            ))}
          </div>
          <div className="tool-right">
            {pages > 1 && (
              <div className="pager-mini" aria-label="Pages">
                <button className="icon-btn pager-btn" onClick={prev} disabled={cur === 0} aria-label="Previous page"><Icon name="back" size={16} /></button>
                <span className="small">{cur + 1} / {pages}</span>
                <button className="icon-btn pager-btn" onClick={next} disabled={cur === pages - 1} aria-label="Next page"><Icon name="next" size={16} /></button>
              </div>
            )}
            <label className="search"><Icon name="search" size={16} /><input placeholder="Search patients" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></label>
          </div>
        </div>
        <table className="ptable">
          <thead>
            <tr><th>Patient</th><th>Status</th><th className="num">Score</th><th>Last 4 weeks</th><th>Why</th><th /></tr>
          </thead>
          <tbody>
            {visible.map(({ p, risk, level, delta, reasons }) => (
              <Row key={p.id} p={p} risk={risk} level={level} delta={delta} reasons={reasons.map((r) => r.label + ' ' + r.change.replace(' vs usual', ''))} />
            ))}
            {!shown.length && <tr><td colSpan={6} className="empty">No patients match.</td></tr>}
          </tbody>
        </table>
        {shown.length > 0 && (
          <footer className="pager">
            <span className="muted small">{cur * PAGE_SIZE + 1}–{cur * PAGE_SIZE + visible.length} of {shown.length} patients</span>
            <div className="pager-ctl">
              <button className="icon-btn pager-btn" onClick={prev} disabled={cur === 0} aria-label="Previous page"><Icon name="back" size={18} /></button>
              <div className="pager-dots">
                {Array.from({ length: pages }, (_, i) => (
                  <button key={i} className={i === cur ? 'on' : ''} onClick={() => setPage(i)} aria-label={'Page ' + (i + 1)} aria-current={i === cur ? 'page' : undefined}>{i + 1}</button>
                ))}
              </div>
              <button className="icon-btn pager-btn" onClick={next} disabled={cur === pages - 1} aria-label="Next page"><Icon name="next" size={18} /></button>
            </div>
          </footer>
        )}
      </section>
      <p className="muted small">The score (0–100) is an explainable early-warning heuristic built from each person’s own baseline. It is not a diagnosis. Only patients who consented to share appear here.</p>
    </div>
  );

  function Row({ p, risk, level, delta, reasons }: { p: Patient; risk: number | null; level: Level; delta: number | null; reasons: string[] }) {
    const reviewed = S.reviewed[p.id];
    const call = S.calls.find((c) => c.patientId === p.id);
    return (
      <tr className={'prow lvrow-' + level} onClick={() => go('/patients/' + p.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go('/patients/' + p.id)}>
        <td>
          <div className="who">
            <Avatar initials={p.initials} level={level} />
            <div>
              <b>{p.name}{p.isSam && <span className="tag">live demo</span>}</b>
              <span className="muted small">{weeksAt(p, S.day)} wk after TMS · checked in {checkInAt(p, S.day)}</span>
            </div>
          </div>
        </td>
        <td><LevelPill level={level} />{call ? <span className="sub-note"><Icon name="phone" size={13} /> {call.when}</span> : reviewed ? <span className="sub-note"><Icon name="check" size={13} /> Reviewed</span> : null}</td>
        <td className="num">
          <div className="score-cell">
            <b>{risk ?? '—'}</b>
            {delta != null && Math.abs(delta) >= 3 && <span className={'delta ' + (delta > 0 ? 'up' : 'down')}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)}</span>}
          </div>
          <Meter value={risk} level={level} />
        </td>
        <td><Strip values={p.risk} end={S.day} /></td>
        <td className="why">{reasons.length ? reasons.map((r) => <span key={r}>{r}</span>) : <span className="muted">{level === 'calibrating' ? 'Still learning this person’s normal' : 'Within usual range'}</span>}</td>
        <td className="act">
          {level === 'high' && !call
            ? <button className="btn primary sm" onClick={(e) => { e.stopPropagation(); go('/patients/' + p.id + '?call=1'); }}><Icon name="phone" size={14} /> Call</button>
            : <span className="chev">›</span>}
        </td>
      </tr>
    );
  }
}

function Stat({ level, n, label, onClick, active }: { level: Level; n: number; label: string; onClick: () => void; active: boolean }) {
  return (
    <button className={'stat st-' + level + (active ? ' on' : '')} onClick={onClick} aria-pressed={active}>
      <span className="stat-n">{n}</span>
      <span className="stat-l"><LevelIcon level={level} /> {label}</span>
    </button>
  );
}
