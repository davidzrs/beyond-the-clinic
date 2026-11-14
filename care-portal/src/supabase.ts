// The portal talks to the same Supabase project as the Mellow app (keys from mellow/.env).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.EXPO_PUBLIC_SUPABASE_KEY as string | undefined;

export const supabase = url && key ? createClient(url, key, { auth: { storageKey: 'mellowcare.auth' } }) : null;
