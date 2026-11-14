import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { fmtLong } from '../data';

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el); setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export type Band = { from: number; to: number; className: string; label?: string };
type LineProps = {
  values: (number | null)[]; // index 0 = day `startDay`
  startDay: number; endDay: number; // x-domain (inclusive)
  cutoff?: number; // last day drawn (the demo "today")
  domain: [number, number]; height: number;
  bands?: Band[]; baseline?: { lo: number; hi: number };
  markers?: { day: number; label: string }[];
  yTicks?: number[]; xTicks?: number; fmt: (v: number) => string;
  tip?: (day: number, v: number | null) => ReactNode;
  stroke?: string; area?: boolean; dots?: boolean; connect?: boolean; endLabel?: boolean; compact?: boolean;
  ariaLabel: string;
};

// One line, one axis. Hover anywhere for a crosshair + tooltip on the nearest day.
export function LineChart(p: LineProps) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = p.compact ? 4 : 36, padR = p.endLabel ? 52 : p.compact ? 6 : 12, padT = p.markers?.length ? 22 : 8, padB = p.compact ? 6 : 24;
  const W = Math.max(w, 10), H = p.height;
  const iw = W - padL - padR, ih = H - padT - padB;
  const [y0, y1] = p.domain;
  const x = (day: number) => padL + ((day - p.startDay) / Math.max(1, p.endDay - p.startDay)) * iw;
  const y = (v: number) => padT + ih - ((Math.max(y0, Math.min(y1, v)) - y0) / (y1 - y0)) * ih;
  const cutoff = p.cutoff ?? p.endDay;
  const visibleMarkers = (p.markers ?? []).filter((m) => m.day <= cutoff && m.day >= p.startDay);
  const pts: { d: number; v: number }[] = [];
  p.values.forEach((v, i) => { const d = p.startDay + i; if (v != null && d <= cutoff && d <= p.endDay) pts.push({ d, v }); });
  // break the path where days are missing
  let path = '', prev = -9;
  for (const q of pts) { path += (q.d - prev > (p.connect ? 1e9 : 2) || prev < 0 ? 'M' : 'L') + x(q.d).toFixed(1) + ' ' + y(q.v).toFixed(1); prev = q.d; }
  const areaPath = p.area && pts.length ? `M${x(pts[0].d)} ${y(y0)} ` + pts.map((q) => `L${x(q.d).toFixed(1)} ${y(q.v).toFixed(1)}`).join(' ') + ` L${x(pts[pts.length - 1].d)} ${y(y0)} Z` : '';
  const last = pts[pts.length - 1];
  const hv = hover != null ? (p.values[hover - p.startDay] ?? null) : null;
  const xt = p.xTicks ? Array.from({ length: p.xTicks }, (_, i) => Math.round(p.startDay + (i * (p.endDay - p.startDay)) / (p.xTicks! - 1))) : [];

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    if (cutoff < p.startDay) return; // nothing drawn yet
    const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const day = Math.round(p.startDay + ((e.clientX - r.left) / r.width) * (p.endDay - p.startDay));
    setHover(Math.max(p.startDay, Math.min(Math.min(cutoff, p.endDay), day)));
  };

  return (
    <div ref={ref} className="chart" style={{ height: H }}>
      {w > 0 && (
        <svg width={W} height={H} role="img" aria-label={p.ariaLabel}>
          {p.bands?.map((b) => (
            <g key={b.className + b.from}>
              <rect x={padL} width={iw} y={y(b.to)} height={Math.max(0, y(b.from) - y(b.to))} className={b.className} />
              {b.label && !p.compact && <text x={padL + 8} y={y(b.to) + 14} className="band-label">{b.label}</text>}
            </g>
          ))}
          {p.baseline && <rect x={padL} width={iw} y={y(p.baseline.hi)} height={Math.max(1, y(p.baseline.lo) - y(p.baseline.hi))} className="baseline-band" />}
          {p.yTicks?.map((t) => (
            <g key={t}>
              <line x1={padL} x2={padL + iw} y1={y(t)} y2={y(t)} className="grid" />
              {!p.compact && <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="tick">{p.fmt(t)}</text>}
            </g>
          ))}
          {xt.map((d) => <text key={d} x={x(d)} y={H - 6} textAnchor="middle" className="tick">{fmtLong(d).replace(/^\w+ /, '')}</text>)}
          {visibleMarkers.map((m, i, arr) => {
            // neighbours closer than ~90px: push the first label left and the second right
            const near = (a?: { day: number }) => a && Math.abs(x(a.day) - x(m.day)) < 90;
            const anchor = near(arr[i + 1]) ? 'end' : near(arr[i - 1]) ? 'start' : x(m.day) > padL + iw - 40 ? 'end' : 'middle';
            const dx = anchor === 'end' ? 3 : anchor === 'start' ? -3 : 0;
            return (
              <g key={m.day}>
                <line x1={x(m.day)} x2={x(m.day)} y1={padT - 4} y2={padT + ih} className="marker" />
                <text x={x(m.day) + dx} y={padT - 8} textAnchor={anchor} className="marker-label">{m.label}</text>
              </g>
            );
          })}
          {cutoff < p.endDay && <rect x={Math.max(padL, x(cutoff))} width={Math.max(0, x(p.endDay) - Math.max(padL, x(cutoff)))} y={padT} height={ih} className="future" />}
          {areaPath && <path d={areaPath} className="area" style={p.stroke ? { fill: p.stroke } : undefined} />}
          <path d={path} className="line" style={p.stroke ? { stroke: p.stroke } : undefined} />
          {p.dots && pts.map((q) => <circle key={q.d} cx={x(q.d)} cy={y(q.v)} r={4.5} className="dot" style={p.stroke ? { fill: p.stroke } : undefined} />)}
          {last && !p.dots && <circle cx={x(last.d)} cy={y(last.v)} r={4.5} className="dot" style={p.stroke ? { fill: p.stroke } : undefined} />}
          {last && p.endLabel && <text x={x(last.d) + 9} y={y(last.v) + 4} className="end-label">{p.fmt(last.v)}</text>}
          {hover != null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} className="crosshair" />
              {hv != null && <circle cx={x(hover)} cy={y(hv)} r={5} className="dot hover" style={p.stroke ? { fill: p.stroke } : undefined} />}
            </g>
          )}
          <rect x={padL} y={0} width={iw} height={H} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
      )}
      {hover != null && w > 0 && (
        <div className="tooltip" style={{ left: Math.min(Math.max(x(hover), 70), W - 70), top: hv != null ? Math.max(0, y(hv) - 12) : padT }}>
          {p.tip ? p.tip(hover, hv) : <><b>{hv != null ? p.fmt(hv) : 'No data'}</b><span>{fmtLong(hover)}</span></>}
        </div>
      )}
    </div>
  );
}

// Thin 0–100 meter for the score in table rows.
export function Meter({ value, level }: { value: number | null; level: string }) {
  return (
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined} aria-label="Early-warning score">
      <div className={'meter-fill lv-' + level} style={{ width: (value ?? 0) + '%' }} />
      <i style={{ left: '30%' }} /><i style={{ left: '55%' }} />
    </div>
  );
}

// 28-day strip of the score: one tick per day, height = score.
export function Strip({ values, end, days = 28 }: { values: (number | null)[]; end: number; days?: number }) {
  const from = Math.max(1, end - days + 1);
  const cells = Array.from({ length: days }, (_, i) => { const d = from + i; return d <= end ? values[d - 1] ?? null : null; });
  return (
    <svg className="strip" viewBox={`0 0 ${days * 4} 22`} preserveAspectRatio="none" aria-hidden>
      {cells.map((v, i) => v == null
        ? <rect key={i} x={i * 4} y={19} width={3} height={3} rx={1} className="strip-empty" />
        : <rect key={i} x={i * 4} y={22 - Math.max(3, (v / 100) * 22)} width={3} height={Math.max(3, (v / 100) * 22)} rx={1} className={'strip-' + (v >= 55 ? 'high' : v >= 30 ? 'watch' : 'steady')} />)}
    </svg>
  );
}
