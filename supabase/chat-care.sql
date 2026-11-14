-- Campfire care: crisis alerts (with consent) and the "spark" polls when the fire goes quiet.
-- Run AFTER schema.sql, care.sql and chat-moderation.sql (SQL Editor > New query > Run). Safe to run again.

-- ---------- consent ----------

-- Asked once after sign-up: "If you write something that sounds like a crisis, may we tell your care team?"
-- null = not asked yet (the app asks), true / false = the person's answer (changeable in Support).
alter table public.profiles add column if not exists crisis_consent boolean;
grant update (crisis_consent) on public.profiles to authenticated;

-- ---------- crisis alerts ----------

-- Written only by the send-message Edge Function, and only when the person consented.
-- No message text: the care team learns THAT it happened and when, never what was written.
create table if not exists public.crisis_alerts (
  id bigint generated always as identity primary key,
  patient_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  seen_by uuid references public.profiles on delete set null
);
alter table public.crisis_alerts enable row level security;

drop policy if exists "care team reads crisis alerts" on public.crisis_alerts;
create policy "care team reads crisis alerts" on public.crisis_alerts
  for select using (public.is_clinician());
drop policy if exists "care team marks crisis alerts seen" on public.crisis_alerts;
create policy "care team marks crisis alerts seen" on public.crisis_alerts
  for update using (public.is_clinician()) with check (public.is_clinician());

-- ---------- spark polls ----------

-- Messages from Ember, the campfire's AI, have no author (user_id null) and kind = 'spark'.
alter table public.messages alter column user_id drop not null;
alter table public.messages add column if not exists kind text not null default 'text';
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text', 'spark'));
alter table public.messages add column if not exists poll jsonb;   -- spark only: {"a": "Tea", "b": "Coffee"}

-- At most one spark per campfire per day, even if two friends open the app at the same moment.
create unique index if not exists one_spark_a_day on public.messages (campfire_id, ((created_at at time zone 'UTC')::date))
  where kind = 'spark';

create table if not exists public.spark_votes (
  message_id bigint not null references public.messages on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  choice text not null check (choice in ('a', 'b')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.spark_votes enable row level security;

-- Which campfire is this message in? (security definer so the policies below can use it)
create or replace function public.message_campfire(m bigint) returns uuid
language sql stable security definer set search_path = public as $$
  select campfire_id from messages where id = m;
$$;

drop policy if exists "see votes at my campfire" on public.spark_votes;
create policy "see votes at my campfire" on public.spark_votes
  for select using (public.in_campfire(public.message_campfire(message_id)));
drop policy if exists "vote at my campfire" on public.spark_votes;
create policy "vote at my campfire" on public.spark_votes
  for insert with check (user_id = auth.uid() and public.in_campfire(public.message_campfire(message_id)));
drop policy if exists "change my vote" on public.spark_votes;
create policy "change my vote" on public.spark_votes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Live updates: votes in the chat, alerts in the care portal.
do $$ begin
  begin alter publication supabase_realtime add table public.spark_votes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.crisis_alerts; exception when duplicate_object then null; end;
end $$;
