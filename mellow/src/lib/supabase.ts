// Supabase client. Keys come from mellow/.env (EXPO_PUBLIC_* values are bundled into the app).
// Without them the app runs in local demo mode, exactly as before.
import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

export const hasBackend = !!(url && key);

export const supabase: SupabaseClient | null = hasBackend
  ? createClient(url, key, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    })
  : null;

// Keep the login fresh while the app is open, pause when it goes to the background (native only).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => {
    if (s === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
