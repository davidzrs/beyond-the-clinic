// send-message: the only way a chat message reaches the campfire.
//
// 1. Who is sending? (the user's login token, sent automatically by supabase.functions.invoke)
// 2. Already banned (3 strikes)? Refuse.
// 3. Ask Gemini whether the text breaks the campfire rules.
// 4. OK -> insert into messages. Not OK -> record a strike and tell the app.
//
// Secrets (set once with `npx supabase secrets set GEMINI_API_KEY=...`):
//   GEMINI_API_KEY   required
//   GEMINI_MODEL     optional, defaults to MODEL below
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { moderate, type Verdict } from './moderate.ts';

const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const MAX_STRIKES = 3;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'POST only' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 1. Who is this?
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return reply({ error: 'Not signed in' }, 401);

  const { campfireId, text: raw } = await req.json().catch(() => ({}));
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!campfireId || !text || text.length > 500) return reply({ error: 'Bad message' }, 400);

  // Only members of that campfire can post there.
  const { data: member } = await admin.from('campfire_members')
    .select('user_id').eq('campfire_id', campfireId).eq('user_id', user.id).maybeSingle();
  if (!member) return reply({ error: 'Not in this campfire' }, 403);

  // 2. Banned already?
  const { count } = await admin.from('chat_strikes').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  const strikes = count || 0;
  if (strikes >= MAX_STRIKES) return reply({ status: 'banned', strikes });

  // 3. Ask Gemini. If Gemini is down we don't post unchecked text, and we don't punish the user either.
  let verdict: Verdict;
  try {
    verdict = await moderate(text, GEMINI_KEY, MODEL);
  } catch (e) {
    console.error(e);
    return reply({ status: 'error', message: 'Couldn’t check your message right now. Try again in a moment.' }, 503);
  }

  // 4a. Blocked: record a strike.
  if (!verdict.allowed) {
    await admin.from('chat_strikes').insert({
      user_id: user.id, campfire_id: campfireId, text, category: verdict.category, reason: verdict.reason,
    });
    const now = strikes + 1;
    return reply({ status: now >= MAX_STRIKES ? 'banned' : 'blocked', strikes: now, maxStrikes: MAX_STRIKES, reason: verdict.reason, category: verdict.category });
  }

  // 4b. Allowed: post it.
  const { data: msg, error } = await admin.from('messages')
    .insert({ campfire_id: campfireId, user_id: user.id, text }).select('id, created_at').single();
  if (error) { console.error(error); return reply({ status: 'error', message: 'Couldn’t send. Try again.' }, 500); }
  return reply({ status: 'sent', id: msg.id, createdAt: msg.created_at, strikes });
});
