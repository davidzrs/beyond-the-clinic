import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Fixed ports so the portal never fights with Expo/Metro (8081) or other Vite apps (5173).
// strictPort: if 5180 is taken, Vite stops with an error instead of quietly moving to 5181, 5182...
export const DEV_PORT = 5180;
export const PREVIEW_PORT = 5181;

export default defineConfig({
  plugins: [react()],
  // Same Supabase project as the app: read its keys from mellow/.env.
  envDir: '../mellow',
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  server: {
    host: 'localhost',
    port: DEV_PORT,
    strictPort: true,
    // The demo data lives in ../mellow so the app and the portal share one source.
    fs: { allow: ['..'] },
  },
  preview: { host: 'localhost', port: PREVIEW_PORT, strictPort: true },
});
