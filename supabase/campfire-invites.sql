-- Invite codes: every campfire gets its own code (like PINE-7K2Q), and a friend can use it to sit
-- at that fire. Run AFTER schema.sql (SQL Editor > New query > Run). Safe to run again.
--
-- Each person sits at one campfire. Joining with a code moves you: you leave your current fire
-- (the app asks first) and take a seat at the new one, if it has fewer than 4 people.

alter table public.campfires add column if not exists invite_code text;

-- A readable code: up to 4 letters of the fire's name, a dash, 4 characters that can't be confused
-- (no 0/O, 1/I/L). Tries again in the rare case the code is already taken.
create or replace function public.new_invite_code(fire_name text) returns text
language plpgsql volatile set search_path = public as $$
declare
  abc text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  prefix text := coalesce(nullif(upper(left(regexp_replace(fire_name, '[^A-Za-z]', '', 'g'), 4)), ''), 'FIRE');
  code text;
begin
  loop
    code := prefix || '-';
    for i in 1..4 loop
      code := code || substr(abc, 1 + floor(random() * length(abc))::int, 1);
    end loop;
    exit when not exists (select 1 from campfires where invite_code = code);
  end loop;
  return code;
end;
$$;

-- Codes for fires that existed before this, then make them required and unique.
update public.campfires set invite_code = public.new_invite_code(name) where invite_code is null;
alter table public.campfires alter column invite_code set not null;
create unique index if not exists campfires_invite_code on public.campfires (invite_code);

-- New fires get a code automatically.
create or replace function public.campfire_code() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.invite_code is null then new.invite_code := public.new_invite_code(new.name); end if;
  return new;
end;
$$;
drop trigger if exists campfire_code on public.campfires;
create trigger campfire_code before insert on public.campfires
  for each row execute function public.campfire_code();

-- Codes are compared without spaces, dashes or case: "pine 7k2q" finds PINE-7K2Q.
create or replace function public.clean_code(c text) returns text
language sql immutable as $$ select regexp_replace(upper(coalesce(c, '')), '[^A-Z0-9]', '', 'g') $$;

-- Look before you leap: which fire is this code, how many seats are taken, is it mine?
-- Returns {status: 'found' | 'not_found', name, members, mine}. Shows no names of people.
create or replace function public.peek_campfire(code text) returns json
language plpgsql stable security definer set search_path = public as $$
declare f campfires;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into f from campfires where clean_code(invite_code) = clean_code(code);
  if f.id is null then return json_build_object('status', 'not_found'); end if;
  return json_build_object(
    'status', 'found', 'name', f.name,
    'members', (select count(*) from campfire_members where campfire_id = f.id),
    'mine', exists (select 1 from campfire_members where campfire_id = f.id and user_id = auth.uid()));
end;
$$;

-- Sit at the fire with this code, leaving the one you're at now.
-- Returns {status: 'joined' | 'already' | 'full' | 'not_found', id, name}.
create or replace function public.join_campfire_by_code(code text) returns json
language plpgsql security definer set search_path = public as $$
declare f campfires;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into f from campfires where clean_code(invite_code) = clean_code(code) for update;
  if f.id is null then return json_build_object('status', 'not_found'); end if;
  if exists (select 1 from campfire_members where campfire_id = f.id and user_id = auth.uid()) then
    return json_build_object('status', 'already', 'id', f.id, 'name', f.name);
  end if;
  if (select count(*) from campfire_members where campfire_id = f.id) >= 4 then
    return json_build_object('status', 'full', 'name', f.name);
  end if;
  delete from campfire_members where user_id = auth.uid();
  insert into campfire_members (campfire_id, user_id) values (f.id, auth.uid());
  return json_build_object('status', 'joined', 'id', f.id, 'name', f.name);
end;
$$;

revoke execute on function public.peek_campfire(text) from anon;
revoke execute on function public.join_campfire_by_code(text) from anon;
