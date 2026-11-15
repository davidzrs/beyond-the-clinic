import { useState, type FormEvent } from 'react';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, go, useStore } from '../store';
import { exitPortal } from '../exit';
import { Icon, Logo } from '../components/ui';

export default function Login() {
  const S = useStore();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [intro, setIntro] = useState(true); // judges: a spotlight on the demo account when the page opens
  const signIn = async (em: string, p: string) => {
    setBusy(true);
    const problem = await S.signIn(em, p);
    setBusy(false);
    if (problem) setErr(problem);
    else go('/patients');
  };
  const submit = (e: FormEvent) => { e.preventDefault(); signIn(email, pw); };
  const demo = DEMO_ACCOUNTS[0];
  const fill = (a: typeof demo) => { setEmail(a.email); setPw(a.password); setErr(''); };
  return (
    <div className="login">
      <aside className="login-art">
        <Logo />
        <div className="login-copy">
          <p className="eyebrow light">For care teams</p>
          <h1>See who might need a call, between visits.</h1>
          <p>Patients who chose to share their Mellow trends after TMS. Each score compares a person with their own normal: sleep, heart, activity, phone use and check-ins.</p>
          <ul className="login-points">
            <li><Icon name="shield" /> Trends and scores only. No chats, no location, no raw data.</li>
            <li><Icon name="users" /> Sorted by who has moved furthest from their usual week.</li>
            <li><Icon name="phone" /> Every flag comes with the reasons, so a call can start well.</li>
          </ul>
        </div>
        <Campfire />
      </aside>
      <main className="login-main">
        <form className="login-card" onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="muted">Pinehollow Clinic staff</p>
          {/* The demo account, highlighted: one click fills in the form. */}
          <button type="button" className="demo-cta" onClick={() => fill(demo)}>
            <span className="demo-badge">★ Recommended for judges</span>
            <span className="demo-cta-row">
              <span className="demo-cta-ico" aria-hidden>▶</span>
              <span className="demo-cta-text"><b>Use the demo clinician account</b><span>{demo.name} · {demo.role} · fills in the form</span></span>
            </span>
          </button>
          <div className="or-line"><span>or sign in with your work email</span></div>
          <label>Work email<input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} autoComplete="username" placeholder="you@clinic.fi" required /></label>
          <label>Password<input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} autoComplete="current-password" placeholder="••••••" required /></label>
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn primary wide" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="muted small center">
            Other demo account: <button type="button" className="link" onClick={() => fill(DEMO_ACCOUNTS[1])}>{DEMO_ACCOUNTS[1].name} · {DEMO_ACCOUNTS[1].role}</button> (password <code>{DEMO_PASSWORD}</code>)
          </p>
        </form>
        <p className="center"><button type="button" className="link" onClick={exitPortal}>← Not a clinician? Back to Mellow</button></p>
        <p className="muted small center">Prototype for Junction 2026 · demo patients with synthetic data, stored in Supabase</p>
      </main>
      {intro && (
        <div className="demo-spot" role="dialog" aria-modal="true" aria-labelledby="demo-spot-title">
          <div className="demo-spot-card">
            <span className="demo-badge static">★ For judges</span>
            <h2 id="demo-spot-title">Try Mellow Care with the demo account</h2>
            <p>{demo.name} is a demo psychiatrist with a clinic of patients on synthetic data. One click signs you in.</p>
            <button type="button" className="btn primary wide demo-go" disabled={busy} onClick={() => { fill(demo); setIntro(false); signIn(demo.email, demo.password); }}>
              {busy ? 'Signing in…' : '▶  Sign in as the demo clinician'}
            </button>
            <button type="button" className="link" onClick={() => setIntro(false)}>I have my own account</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Campfire() {
  return (
    <svg className="login-fire" viewBox="0 0 120 60" aria-hidden>
      <rect x="20" y="48" width="80" height="6" rx="3" fill="#2A3366" />
      <rect x="36" y="42" width="48" height="7" rx="3.5" fill="#7A4A2A" transform="rotate(-8 60 45)" />
      <rect x="36" y="42" width="48" height="7" rx="3.5" fill="#8C5632" transform="rotate(8 60 45)" />
      <path d="M60 10c8 9 12 15 12 22a12 12 0 0 1-24 0c0-5 3-9 6-12 0 5 2 7 4 8-1-7 0-12 2-18z" fill="#FFB45E" />
      <path d="M60 24c4 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z" fill="#FFE3B0" />
      <rect x="92" y="34" width="12" height="11" rx="4.5" fill="#FFF6E4" />
      <rect x="16" y="36" width="11" height="10" rx="4" fill="#FFF6E4" />
    </svg>
  );
}
