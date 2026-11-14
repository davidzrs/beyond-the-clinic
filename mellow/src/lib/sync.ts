// Reads and writes for a signed-in user. Every call is fire-and-forget safe: errors are logged,
// never thrown, so the app keeps working offline or if a table is missing.
import { supabase } from './supabase';
import type { Avatar } from '../pixel/sprites';
import type { MoodKey } from '../data';

const warn = (what: string, e: unknown) => { if (e) console.warn('[supabase] ' + what, (e as any)?.message || e); };

export type Profile = { id: string; name: string; avatar: Partial<Avatar> | null; streak_count: number; streak_last: string | null; crisis_consent?: boolean | null };
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
  // POST /rpc/submit_phq9 also records it for the care team; fall back to the table if the API isn't installed.
  const { error } = await supabase.rpc('submit_phq9', { p_answers: answers });
  if (!error) return;
  const r = await supabase.from('phq9').insert({ user_id: uid, answers, score });
  warn('save PHQ-9', r.error);
}

// POST /rpc/submit_checkin: the daily mood, today's summary for the care team and the streak, in one call.
export async function submitCheckin(uid: string, day: string, mood: MoodKey, streak: { count: number; last: string }) {
  if (!supabase) return;
  const { error } = await supabase.rpc('submit_checkin', { p_mood: mood, p_day: day });
  if (!error) return;
  warn('submit check-in (falling back)', error);
  await saveMood(uid, day, mood);
  await saveProfile(uid, { streak_count: streak.count, streak_last: streak.last });
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
  | { status: 'sent'; strikes: number; id?: number }
  | { status: 'blocked' | 'banned'; strikes: number; maxStrikes?: number; reason?: string }
  | { status: 'crisis'; strikes: number; alerted: boolean }
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

// The campfire's real chat: the last 60 messages, oldest first.
export type ChatRow = { id: number; user_id: string | null; text: string; created_at: string; kind?: 'text' | 'spark'; poll?: { a: string; b: string } | null };
export async function loadMessages(campfireId: string): Promise<ChatRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('messages').select('id, user_id, text, created_at, kind, poll').eq('campfire_id', campfireId).order('created_at', { ascending: false }).limit(60);
  warn('load chat', error);
  return ((data || []) as ChatRow[]).reverse();
}
// Live: call onNew for every message posted at this campfire (by anyone, me included).
export function onMessages(campfireId: string, onNew: (row: ChatRow) => void) {
  if (!supabase) return () => {};
  const ch = supabase.channel('chat-' + campfireId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'campfire_id=eq.' + campfireId }, (p: any) => onNew(p.new as ChatRow))
    .subscribe();
  return () => { supabase?.removeChannel(ch); };
}
// Names and marshmallows of everyone who wrote in the chat (friends who left the seats included).
export async function peopleById(ids: string[]): Promise<Mate[]> {
  if (!supabase || !ids.length) return [];
  const { data, error } = await supabase.from('profiles').select('id, name, avatar').in('id', ids);
  warn('load chat people', error);
  return (data || []) as Mate[];
}

export const MAX_STRIKES = 3; // keep in sync with supabase/functions/send-message

// How many chat strikes I have (MAX_STRIKES = can't post anymore).
export async function myStrikes(uid: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase.from('chat_strikes').select('id', { count: 'exact', head: true }).eq('user_id', uid);
  warn('load strikes', error);
  return count || 0;
}

// ---------- crisis consent ----------

// "If you write something that sounds like a crisis, may we tell your care team?" (asked after sign-up)
export async function saveCrisisConsent(uid: string, yes: boolean) {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').update({ crisis_consent: yes }).eq('id', uid);
  warn('save crisis consent', error);
}

// ---------- Ember's sparks (polls when the fire has been quiet) ----------

// Ask for a spark. The function only adds one if the campfire really has been quiet for 2 days;
// the new poll then arrives through onMessages like any other message.
export async function requestSpark(campfireId: string) {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke('campfire-spark', { body: { campfireId } });
  warn('spark', error);
}

export type Vote = { message_id: number; user_id: string; choice: 'a' | 'b' };
export async function loadVotes(messageIds: number[]): Promise<Vote[]> {
  if (!supabase || !messageIds.length) return [];
  const { data, error } = await supabase.from('spark_votes').select('message_id, user_id, choice').in('message_id', messageIds);
  warn('load votes', error);
  return (data || []) as Vote[];
}
export async function vote(messageId: number, choice: 'a' | 'b') {
  if (!supabase) return;
  const { error } = await supabase.from('spark_votes').upsert({ message_id: messageId, choice }, { onConflict: 'message_id,user_id' });
  warn('vote', error);
}
// Live votes (RLS only lets through votes from my campfire).
export function onVotes(onVote: (v: Vote) => void) {
  if (!supabase) return () => {};
  const ch = supabase.channel('spark-votes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'spark_votes' }, (p: any) => { if (p.new?.message_id) onVote(p.new as Vote); })
    .subscribe();
  return () => { supabase?.removeChannel(ch); };
}
