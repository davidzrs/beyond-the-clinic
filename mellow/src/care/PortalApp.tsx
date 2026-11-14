// The care team portal, rendered as plain web pages inside the Mellow website.
// Loaded on demand (see Portal.web.tsx), so patients never download it or its stylesheet.
import React, { useEffect } from 'react';
import App from './App';
import './styles.css';

const FONTS = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400..700&family=Nunito+Sans:opsz,wght@6..12,400..800&display=swap';

export default function PortalApp() {
  useEffect(() => {
    // The portal's own type: Outfit for headings, Nunito Sans for text.
    if (!document.querySelector('link[data-care-fonts]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = FONTS; l.setAttribute('data-care-fonts', '');
      document.head.appendChild(l);
    }
    const prevTitle = document.title;
    document.title = 'Mellow Care · Clinician portal';
    if (!window.location.pathname.startsWith('/care')) window.history.replaceState(null, '', '/care/login');
    return () => { document.title = prevTitle; };
  }, []);
  // The app's root doesn't scroll on the web; the portal is a normal scrolling page, so give it its own scroller.
  return (
    <div className="care-root" style={{ position: 'fixed', inset: 0, overflow: 'auto', background: 'var(--bg)' }}>
      <App />
    </div>
  );
}
