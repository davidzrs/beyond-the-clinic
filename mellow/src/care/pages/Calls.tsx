import { byId, levelOf, riskAt } from '../data';
import { go, useStore } from '../store';
import { Avatar, Card, Icon, LevelPill } from '../components/ui';

export default function Calls() {
  const S = useStore();
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{S.user?.clinic}</p>
          <h1>Scheduled calls</h1>
          <p className="muted">Calls you or your team booked from a patient’s page.</p>
        </div>
      </header>
      <Card>
        {S.calls.length ? (
          <ul className="calls big">
            {S.calls.map((c) => {
              const p = byId(c.patientId); if (!p) return null;
              const lv = levelOf(riskAt(p, S.day));
              return (
                <li key={c.id}>
                  <Avatar initials={p.initials} level={lv} />
                  <div className="grow"><b className="linkish" onClick={() => go('/patients/' + p.id)}>{p.name}</b><span className="muted small">{c.reason}</span></div>
                  <LevelPill level={lv} />
                  <span className="when"><Icon name="clock" size={15} /> {c.when}</span>
                  <button className="link" onClick={() => S.cancelCall(c.id)}>Cancel</button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty-state">
            <Icon name="phone" size={28} />
            <p><b>No calls scheduled</b></p>
            <p className="muted">Open a patient flagged “Call suggested” and press Schedule call.</p>
            <button className="btn primary" onClick={() => go('/patients')}>See patients</button>
          </div>
        )}
      </Card>
    </div>
  );
}
