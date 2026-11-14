// Leaving the care portal: sign out and start the website fresh on the patient sign-in.
// (A full page load also unloads the portal's stylesheet, so nothing of it lingers in the app.)
import { supabase } from '../lib/supabase';

export async function exitPortal() {
  try { await supabase?.auth.signOut(); } catch { /* already signed out */ }
  if (typeof window !== 'undefined') window.location.assign('/');
}
