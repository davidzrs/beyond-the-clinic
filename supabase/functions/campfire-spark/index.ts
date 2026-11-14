// campfire-spark: when a campfire has been quiet for QUIET_DAYS, Ember (the AI) drops a
// "this or that" poll to get people talking. The app calls this when someone opens the campfire;
// the function itself checks the fire really is quiet, so calling it often is harmless.
//
// Secrets: GEMINI_API_KEY (same as send-message), optional GEMINI_MODEL.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { DEFAULT_MODEL } from '../_shared/gemini.ts';
import { makeSpark } from './spark.ts';

const QUIET_DAYS = 2;
const MODEL = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL;
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') || '';

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
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return reply({ error: 'Not signed in' }, 401);

  const { campfireId } = await req.json().catch(() => ({}));
  if (!campfireId) return reply({ error: 'Missing campfireId' }, 400);
  const { data: member } = await admin.from('campfire_members')
    .select('user_id').eq('campfire_id', campfireId).eq('user_id', user.id).maybeSingle();
  if (!member) return reply({ error: 'Not in this campfire' }, 403);

  // Quiet = no message (sparks included) since QUIET_DAYS ago. A new campfire counts from its creation.
  const [{ data: last }, { data: fire }] = await Promise.all([
    admin.from('messages').select('created_at').eq('campfire_id', campfireId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('campfires').select('created_at').eq('id', campfireId).maybeSingle(),
  ]);
  const since = Date.parse(last?.created_at || fire?.created_at || new Date().toISOString());
  if (Date.now() - since < QUIET_DAYS * 86400000) return reply({ status: 'not_quiet' });

  const { data: old } = await admin.from('messages').select('text')
    .eq('campfire_id', campfireId).eq('kind', 'spark').order('created_at', { ascending: false }).limit(10);
  const spark = await makeSpark((old || []).map((m: { text: string }) => m.text), GEMINI_KEY, MODEL);

  // At most one spark per campfire per day (unique index), so two friends opening the app at once
  // can't both trigger one.
  const { data: msg, error } = await admin.from('messages')
    .insert({ campfire_id: campfireId, user_id: null, kind: 'spark', text: spark.question, poll: { a: spark.a, b: spark.b } })
    .select('id').single();
  if (error) {
    if (error.code === '23505') return reply({ status: 'not_quiet' });
    console.error(error);
    return reply({ error: 'Couldn’t add the spark' }, 500);
  }
  return reply({ status: 'sparked', id: msg.id });
});
