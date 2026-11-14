import type { ReactNode } from 'react';
import { LEVEL, type Level } from '../data';

export function LevelPill({ level, big }: { level: Level; big?: boolean }) {
  return (
    <span className={'pill lv-' + level + (big ? ' big' : '')}>
      <LevelIcon level={level} />
      {LEVEL[level].label}
    </span>
  );
}

// Shape + colour, so the level never depends on colour alone.
export function LevelIcon({ level }: { level: Level }) {
  if (level === 'high') return <svg className="lv-icon" viewBox="0 0 12 12" aria-hidden><path d="M6 1.2 11 10.4H1z" /></svg>;
  if (level === 'watch') return <svg className="lv-icon" viewBox="0 0 12 12" aria-hidden><rect x="1.8" y="1.8" width="8.4" height="8.4" rx="1.5" transform="rotate(45 6 6)" /></svg>;
  if (level === 'steady') return <svg className="lv-icon" viewBox="0 0 12 12" aria-hidden><circle cx="6" cy="6" r="4.6" /></svg>;
  return <svg className="lv-icon" viewBox="0 0 12 12" aria-hidden><circle cx="6" cy="6" r="4" fill="none" strokeWidth="1.8" /></svg>;
}

export function Avatar({ initials, level }: { initials: string; level?: Level }) {
  return <span className={'avatar' + (level ? ' av-' + level : '')}>{initials}</span>;
}

export function Card({ title, sub, right, children, className }: { title?: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={'card ' + (className ?? '')}>
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <p className="muted small">{sub}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Icon({ name, size = 18 }: { name: 'users' | 'phone' | 'logout' | 'search' | 'back' | 'next' | 'note' | 'check' | 'shield' | 'clock' | 'x'; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (name) {
    case 'users': return <svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.7 2.5 3 5.2" /></svg>;
    case 'phone': return <svg {...p}><path d="M5 3.5h3.2l1.6 4.2-2.1 1.4a11 11 0 0 0 5.2 5.2l1.4-2.1 4.2 1.6V17a2.5 2.5 0 0 1-2.7 2.5C9.7 19 5 14.3 4.5 6.2A2.5 2.5 0 0 1 5 3.5Z" /></svg>;
    case 'logout': return <svg {...p}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" /></svg>;
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>;
    case 'back': return <svg {...p}><path d="M15 5l-7 7 7 7" /></svg>;
    case 'next': return <svg {...p}><path d="M9 5l7 7-7 7" /></svg>;
    case 'note': return <svg {...p}><path d="M5 4h10l4 4v12H5z" /><path d="M9 12h6M9 16h4" /></svg>;
    case 'check': return <svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
    case 'shield': return <svg {...p}><path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>;
    case 'clock': return <svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
    case 'x': return <svg {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
  }
}

export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#4FA2E2" />
        <path d="M26 3.6l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="#FFE3B0" />
        <rect x="7" y="8" width="18" height="16.5" rx="6.5" fill="#FFF6E4" />
        <path d="M7.2 19.5c.6 3 3.2 5 6.3 5h5c3.1 0 5.7-2 6.3-5-2.4 1.4-5.2 2-8.8 2s-6.4-.6-8.8-2z" fill="#FFD9A0" />
        <path d="M11.2 14.4q1.3-1.6 2.6 0M18.2 14.4q1.3-1.6 2.6 0" stroke="#1D2652" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M13.3 16.9h5.4a2.7 2.7 0 0 1-5.4 0z" fill="#1D2652" />
        <circle cx="10.2" cy="17.2" r="1.4" fill="#FF8FA3" opacity="0.75" />
        <circle cx="21.8" cy="17.2" r="1.4" fill="#FF8FA3" opacity="0.75" />
      </svg>
      <span><b>Mellow</b> Care</span>
    </span>
  );
}
