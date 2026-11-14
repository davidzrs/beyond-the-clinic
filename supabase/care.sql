-- Mellow care team: run AFTER schema.sql (SQL Editor > New query > Run). Safe to run again.
--
-- Adds clinicians, the daily wearable/phone summary the early-warning score uses,
-- questionnaires (PHQ-9 + WHO-5), and the care team's notes and planned calls.
-- Clinicians can read every patient's trends; patients only ever see their own.
-- Demo rule: accounts with an @pinehollow.fi email are clinicians.

alter table public.profiles add column if not exists role text not null default 'patient';
alter table public.profiles add column if not exists weeks_since_tms int;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('patient', 'clinician'));

-- People can edit their name, look and streak, but never their own role.
revoke update on public.profiles from authenticated, anon;
grant update (name, avatar, streak_count, streak_last, weeks_since_tms) on public.profiles to authenticated;

create or replace function public.is_clinician() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'clinician');
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, role) values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Friend'),
    case when new.email ilike '%@pinehollow.fi' then 'clinician' else 'patient' end
  );
  return new;
end;
$$;
-- Clinicians who already signed up before this ran.
update public.profiles p set role = 'clinician' from auth.users u where u.id = p.id and u.email ilike '%@pinehollow.fi';

drop table if exists public.care_calls cascade;
drop table if exists public.care_notes cascade;
drop table if exists public.questionnaires cascade;
drop table if exists public.daily_metrics cascade;

-- One row per person per day: what the watch and phone summarised, plus the early-warning score.
create table public.daily_metrics (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  day date not null,
  sleep_hours real, resting_hr real, hrv_rmssd real,
  steps int, morning_steps int,
  screen_minutes int, late_night_screen_minutes int, messages_sent int,
  mood real,                 -- 1 Heavy .. 5 Bright, null when skipped
  risk int,                  -- 0..100, null while still learning the person's normal
  reasons jsonb,             -- [{key, label, change, z}]
  primary key (user_id, day)
);

create table public.questionnaires (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  day date not null,
  phq9 int, who5 int,
  primary key (user_id, day)
);

create table public.care_notes (
  id bigint generated always as identity primary key,
  patient_id uuid not null references public.profiles on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  author_name text,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.care_calls (
  id bigint generated always as identity primary key,
  patient_id uuid not null references public.profiles on delete cascade,
  clinician_id uuid not null default auth.uid() references public.profiles on delete cascade,
  when_text text not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.daily_metrics enable row level security;
alter table public.questionnaires enable row level security;
alter table public.care_notes enable row level security;
alter table public.care_calls enable row level security;

create policy "own or care team reads metrics" on public.daily_metrics for select using (user_id = auth.uid() or public.is_clinician());
create policy "write my metrics" on public.daily_metrics for insert with check (user_id = auth.uid());
create policy "update my metrics" on public.daily_metrics for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own or care team reads questionnaires" on public.questionnaires for select using (user_id = auth.uid() or public.is_clinician());
create policy "write my questionnaires" on public.questionnaires for insert with check (user_id = auth.uid());
create policy "update my questionnaires" on public.questionnaires for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "care team reads notes" on public.care_notes for select using (public.is_clinician());
create policy "care team writes notes" on public.care_notes for insert with check (public.is_clinician() and author_id = auth.uid());

create policy "care team reads calls" on public.care_calls for select using (public.is_clinician());
create policy "care team plans calls" on public.care_calls for insert with check (public.is_clinician() and clinician_id = auth.uid());
create policy "care team cancels calls" on public.care_calls for delete using (public.is_clinician());

-- The care team can also see patients' profiles, daily moods and PHQ-9 results from the app.
drop policy if exists "care team reads profiles" on public.profiles;
create policy "care team reads profiles" on public.profiles for select using (public.is_clinician());
drop policy if exists "care team reads check-ins" on public.checkins;
create policy "care team reads check-ins" on public.checkins for select using (public.is_clinician());
drop policy if exists "care team reads PHQ-9" on public.phq9;
create policy "care team reads PHQ-9" on public.phq9 for select using (public.is_clinician());
