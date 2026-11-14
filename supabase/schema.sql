-- Mellow database. Paste into Supabase: SQL Editor > New query > Run.
-- Safe to run again: it drops and recreates the app's own tables (not your users).
--
-- Privacy, enforced by Row Level Security:
--   * your profile, check-ins and PHQ-9 answers: only you can write them
--   * campfire friends can see each other's name, marshmallow, streak and daily mood
--   * PHQ-9 answers are visible to you only (the clinic view comes later, via a care-team role)
--   * chat messages: only members of that campfire

drop table if exists public.messages cascade;
drop table if exists public.phq9 cascade;
drop table if exists public.checkins cascade;
drop table if exists public.campfire_members cascade;
drop table if exists public.campfires cascade;
drop table if exists public.profiles cascade;

-- ---------- tables ----------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'Friend',
  avatar jsonb,                          -- the marshmallow: color, face, hat, glasses, acc, item
  streak_count int not null default 0,
  streak_last date,                      -- last day the daily check-in was answered
  created_at timestamptz not null default now()
);

create table public.campfires (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.campfire_members (
  campfire_id uuid not null references public.campfires on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (campfire_id, user_id)
);

create table public.checkins (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  day date not null default current_date,
  mood text not null check (mood in ('heavy', 'low', 'okay', 'good', 'bright')),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create table public.phq9 (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  answers int[] not null,
  score int not null,
  created_at timestamptz not null default now()
);

create table public.messages (
  id bigint generated always as identity primary key,
  campfire_id uuid not null references public.campfires on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

-- ---------- helpers ----------

-- Is this campfire mine? (security definer so policies can use it without recursion)
create or replace function public.in_campfire(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from campfire_members where campfire_id = c and user_id = auth.uid());
$$;

-- Do I share a campfire with this person?
create or replace function public.is_mate(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from campfire_members a join campfire_members b on a.campfire_id = b.campfire_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- A profile is created automatically on sign-up, using the name given at sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name) values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Friend'));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Put me in a campfire with room (fewer than 4), or start a new one. Returns the campfire id.
create or replace function public.join_campfire() returns uuid
language plpgsql security definer set search_path = public as $$
declare c uuid;
  names text[] := array['Pinehollow', 'Emberwood', 'Mossbrook', 'Starfall', 'Willowmere', 'Cedar Hollow'];
begin
  select campfire_id into c from campfire_members where user_id = auth.uid() limit 1;
  if c is not null then return c; end if;
  select f.id into c from campfires f
    where (select count(*) from campfire_members m where m.campfire_id = f.id) < 4
    order by f.created_at limit 1;
  if c is null then
    insert into campfires (name) values (names[1 + floor(random() * array_length(names, 1))::int]) returning id into c;
  end if;
  insert into campfire_members (campfire_id, user_id) values (c, auth.uid());
  return c;
end;
$$;

-- ---------- row level security ----------

alter table public.profiles enable row level security;
alter table public.campfires enable row level security;
alter table public.campfire_members enable row level security;
alter table public.checkins enable row level security;
alter table public.phq9 enable row level security;
alter table public.messages enable row level security;

create policy "see my profile and my campfire friends" on public.profiles
  for select using (id = auth.uid() or public.is_mate(id));
create policy "create my profile" on public.profiles
  for insert with check (id = auth.uid());
create policy "edit my profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "see my campfires" on public.campfires
  for select using (public.in_campfire(id));

create policy "see who is at my campfires" on public.campfire_members
  for select using (public.in_campfire(campfire_id));

create policy "see my and my friends' daily moods" on public.checkins
  for select using (user_id = auth.uid() or public.is_mate(user_id));
create policy "add my check-in" on public.checkins
  for insert with check (user_id = auth.uid());
create policy "change my check-in" on public.checkins
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "see my PHQ-9" on public.phq9
  for select using (user_id = auth.uid());
create policy "add my PHQ-9" on public.phq9
  for insert with check (user_id = auth.uid());

create policy "read my campfire's chat" on public.messages
  for select using (public.in_campfire(campfire_id));
create policy "write in my campfire's chat" on public.messages
  for insert with check (user_id = auth.uid() and public.in_campfire(campfire_id));

-- Live updates for the campfire chat and moods.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.checkins;
