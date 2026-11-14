import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Fonts are bundled (no Google Fonts request): works offline and the PDF export can embed them.
import '@fontsource-variable/outfit';
import '@fontsource-variable/nunito-sans';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
