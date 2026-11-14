-- Chat moderation. Paste into Supabase: SQL Editor > New query > Run.
-- Runs on top of schema.sql without wiping anything (safe to run again).
--
-- After this, the app can no longer insert chat messages directly: every message goes through
-- the `send-message` Edge Function, which asks Gemini first. A blocked message is a strike;
-- 3 strikes and you can no longer post in the chat.

create table if not exists public.chat_strikes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  campfire_id uuid references public.campfires on delete set null,
  text text not null,                    -- kept for a human to review the decision later
  category text not null,                -- harassment, hate, sexual, threat, spam, ...
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists chat_strikes_user on public.chat_strikes (user_id);

alter table public.chat_strikes enable row level security;

-- You can see how many strikes you have (the app shows it); only the Edge Function can add them.
drop policy if exists "see my strikes" on public.chat_strikes;
create policy "see my strikes" on public.chat_strikes
  for select using (user_id = auth.uid());

-- No more direct inserts from the app: the Edge Function writes with the service role.
drop policy if exists "write in my campfire's chat" on public.messages;
