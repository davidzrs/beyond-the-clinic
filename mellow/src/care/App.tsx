import { useEffect, type ReactNode } from 'react';
import { byId, DAYS, fmtLong, levelOf, PATIENTS, riskAt, TODAY_DAY } from './data';
import { go, StoreProvider, useHashRoute, useStore } from './store';
import { Icon, Logo } from './components/ui';
import Login from './pages/Login';
import Patients from './pages/Patients';
import Patient from './pages/Patient';
import Calls from './pages/Calls';
import Report from './pages/Report';

export default function App() {
  return <StoreProvider><Router /></StoreProvider>;
}

function Router() {
  const S = useStore();
  const route = useHashRoute();
  const [path, query] = route.split('?');
  useEffect(() => { if (S.loading) return; if (!S.user && path !== '/login') go('/login'); if (S.user && path === '/login') go('/patients'); }, [S.user, S.loading, path]);
  if (S.loading) return <div className="page"><p className="muted">Loading patients…</p></div>;
  if (!S.user || path === '/login') return <Login />;

  let page = <Patients />;
  const m = path.match(/^\/patients\/([\w-]+)/);
  if (m) { const p = byId(m[1]); page = p ? <Patient key={p.id} p={p} openCall={query === 'call=1'} /> : <NotFound />; }
  else if (path === '/calls') page = <Calls />;
  else if (path === '/report') page = <Report />;
  return <Shell active={m ? 'patients' : path === '/calls' ? 'calls' : path === '/report' ? 'report' : 'patients'}>{page}</Shell>;
}

function Shell({ active, children }: { active: 'patients' | 'calls' | 'report'; children: ReactNode }) {
  const S = useStore();
  const flagged = PATIENTS.filter((p) => S.day >= p.firstDay && levelOf(riskAt(p, S.day)) === 'high').length;
  return (
    <div className="shell">
      <nav className="side">
        <Logo />
        <a className={active === 'patients' ? 'on' : ''} href="#/patients"><Icon name="users" /> Patients {flagged > 0 && <span className="count">{flagged}</span>}</a>
        <a className={active === 'calls' ? 'on' : ''} href="#/calls"><Icon name="phone" /> Calls {S.calls.length > 0 && <span className="count soft">{S.calls.length}</span>}</a>
        <a className={active === 'report' ? 'on' : ''} href="#/report"><Icon name="report" /> Biweekly report</a>
        <div className="side-foot">
          <div className="me"><span className="avatar me-av">{S.user!.name.split(' ').filter((w) => !w.endsWith('.')).map((w) => w[0]).join('')}</span><div><b>{S.user!.name}</b><span>{S.user!.role}</span></div></div>
          <button className="side-btn" onClick={S.signOut}><Icon name="logout" size={16} /> Sign out</button>
        </div>
      </nav>
      <div className="main">
        <div className="topbar">
          <span className="muted small asof">Data as of <b>{fmtLong(S.day)}</b>{S.day !== TODAY_DAY && <span className="past-tag">Looking back {TODAY_DAY - S.day} {TODAY_DAY - S.day === 1 ? 'day' : 'days'}</span>}</span>
          <label className="replay" title="Drag to see the clinic as it was on any earlier day">
            <span className="small">View as of</span>
            <input type="range" min={14} max={DAYS} value={S.day} onChange={(e) => S.setDay(+e.target.value)} aria-label="View data as of date" />
            <button className="link small" onClick={() => S.setDay(TODAY_DAY)} disabled={S.day === TODAY_DAY}>Back to today</button>
          </label>
        </div>
        {children}
      </div>
      {S.toast && <div className="toast" role="status">{S.toast}</div>}
    </div>
  );
}

function NotFound() {
  return <div className="page"><h1>Patient not found</h1><button className="btn" onClick={() => go('/patients')}>Back to patients</button></div>;
}
