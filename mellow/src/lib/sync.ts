// Reads and writes for a signed-in user. Every call is fire-and-forget safe: errors are logged,
// never thrown, so the app keeps working offline or if a table is missing.
import { supabase } from './supabase';
import type { Avatar } from '../pixel/sprites';
import type { MoodKey } from '../data';

const warn = (what: string, e: unknown) => { if (e) console.warn('[supabase] ' + what, (e as any)?.message || e); };

export type Profile = { id: string; name: string; avatar: Partial<Avatar> | null; streak_count: number; streak_last: string | null };
export type Mate = { id: string; name: string; avatar: Partial<Avatar> | null };

// My profile; created if the sign-up trigger didn't (e.g. the account existed before the tables).
export async function loadProfile(uid: string, fallbackName: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) { warn('load profile', error); return null; }
  if (data) return data as Profile;
  const { data: made, error: e2 } = await supabase.from('profiles').insert({ id: uid, name: fallbackName }).select().single();
  warn('create profile', e2);
  return (made as Profile) || null;
}

export async function saveProfile(uid: string, patch: Partial<Pick<Profile, 'name' | 'avatar' | 'streak_count' | 'streak_last'>>) {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').update(patch).eq('id', uid);
  warn('save profile', error);
}

export async function todaysMood(uid: string, day: string): Promise<MoodKey | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('checkins').select('mood').eq('user_id', uid).eq('day', day).maybeSingle();
  warn('load check-in', error);
  return (data?.mood as MoodKey) || null;
}

export async function saveMood(uid: string, day: string, mood: MoodKey) {
  if (!supabase) return;
  const { error } = await supabase.from('checkins').upsert({ user_id: uid, day, mood }, { onConflict: 'user_id,day' });
  warn('save check-in', error);
}

export async function savePhq9(uid: string, answers: number[], score: number) {
  if (!supabase) return;
  const { error } = await supabase.from('phq9').insert({ user_id: uid, answers, score });
  warn('save PHQ-9', error);
}

// Join (or find) my campfire and who else is there.
export async function myCampfire(uid: string): Promise<{ id: string; name: string; mates: Mate[] } | null> {
  if (!supabase) return null;
  const { data: id, error } = await supabase.rpc('join_campfire');
  if (error || !id) { warn('join campfire', error); return null; }
  const [{ data: fire }, { data: members }] = await Promise.all([
    supabase.from('campfires').select('name').eq('id', id).maybeSingle(),
    supabase.from('campfire_members').select('user_id, joined_at').eq('campfire_id', id).order('joined_at'),
  ]);
  const ids = (members || []).map((m: any) => m.user_id).filter((x: string) => x !== uid);
  let mates: Mate[] = [];
  if (ids.length) {
    const { data: profs, error: e3 } = await supabase.from('profiles').select('id, name, avatar').in('id', ids);
    warn('load campfire friends', e3);
    mates = (profs || []) as Mate[];
  }
  return { id: id as string, name: fire?.name || 'Your campfire', mates };
}

// Chat messages go through the send-message Edge Function, which asks Gemini first (supabase/functions).
export type SendResult =
  | { status: 'sent'; strikes: number }
  | { status: 'blocked' | 'banned'; strikes: number; maxStrikes?: number; reason?: string }
  | { status: 'error'; message: string };

export async function sendMessage(campfireId: string, text: string): Promise<SendResult> {
  if (!supabase) return { status: 'sent', strikes: 0 };
  const { data, error } = await supabase.functions.invoke('send-message', { body: { campfireId, text } });
  if (error) {
    warn('send message', error);
    // A non-2xx answer still carries our JSON (e.g. "try again in a moment").
    const body = await (error as any).context?.json?.().catch(() => null);
    return { status: 'error', message: body?.message || 'Couldn’t send. Check your connection and try again.' };
  }
  return data as SendResult;
}

export const MAX_STRIKES = 3; // keep in sync with supabase/functions/send-message

// How many chat strikes I have (MAX_STRIKES = can't post anymore).
export async function myStrikes(uid: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase.from('chat_strikes').select('id', { count: 'exact', head: true }).eq('user_id', uid);
  warn('load strikes', error);
  return count || 0;
}
