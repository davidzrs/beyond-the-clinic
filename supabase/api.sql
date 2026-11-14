-- Mellow API: run AFTER schema.sql and care.sql (SQL Editor > New query > Run). Safe to run again.
--
-- Postgres functions become HTTP endpoints in Supabase:
--   POST /rest/v1/rpc/submit_checkin   body {"p_mood":"heavy","p_day":"2026-11-14"}   (patient, logged in)
--   POST /rest/v1/rpc/submit_phq9      body {"p_answers":[0,1,2,...]}                  (patient, logged in)
--   GET  /rest/v1/rpc/care_overview                                                    (clinician, logged in)
-- Headers: apikey: <publishable key>, Authorization: Bearer <the user's access token>.
-- See supabase/API.md for the full list.

-- Patient: answer "How are you feeling today?". Saves the check-in, puts the mood into today's daily
-- summary (what the care team's charts read), updates the streak, and returns the new streak.
create or replace function public.submit_checkin(p_mood text, p_day date default current_date)
returns json language plpgsql security invoker set search_path = public as $$
declare
  me uuid := auth.uid();
  score real := case p_mood when 'heavy' then 1 when 'low' then 2 when 'okay' then 3 when 'good' then 4 when 'bright' then 5 end;
  prev record;
  n int;
begin
  if me is null then raise exception 'Sign in first'; end if;
  if score is null then raise exception 'Mood must be heavy, low, okay, good or bright'; end if;

  insert into checkins (user_id, day, mood) values (me, p_day, p_mood)
    on conflict (user_id, day) do update set mood = excluded.mood, created_at = now();
  insert into daily_metrics (user_id, day, mood) values (me, p_day, score)
    on conflict (user_id, day) do update set mood = excluded.mood;

  select streak_count, streak_last into prev from profiles where id = me;
  n := case
    when prev.streak_last = p_day then prev.streak_count
    when prev.streak_last = p_day - 1 then coalesce(prev.streak_count, 0) + 1
    else 1 end;
  update profiles set streak_count = n, streak_last = p_day where id = me;
  return json_build_object('day', p_day, 'mood', p_mood, 'streak', n);
end;
$$;

-- Patient: submit the 9 PHQ-9 answers (0..3 each). Returns the total score.
create or replace function public.submit_phq9(p_answers int[], p_day date default current_date)
returns json language plpgsql security invoker set search_path = public as $$
declare me uuid := auth.uid(); total int;
begin
  if me is null then raise exception 'Sign in first'; end if;
  if array_length(p_answers, 1) <> 9 then raise exception 'PHQ-9 needs 9 answers'; end if;
  select sum(a) into total from unnest(p_answers) a;
  insert into phq9 (user_id, answers, score) values (me, p_answers, total);
  insert into questionnaires (user_id, day, phq9) values (me, p_day, total)
    on conflict (user_id, day) do update set phq9 = excluded.phq9;
  return json_build_object('day', p_day, 'score', total);
end;
$$;

-- Clinician: one row per patient with today's score, mood, last check-in and streak.
create or replace function public.care_overview()
returns table (patient_id uuid, name text, weeks_since_tms int, last_checkin date, last_mood text, streak int, score int, reasons jsonb)
language sql stable security invoker set search_path = public as $$
  select p.id, p.name, p.weeks_since_tms,
    c.day, c.mood, p.streak_count,
    m.risk, m.reasons
  from profiles p
  left join lateral (select day, mood from checkins where user_id = p.id order by day desc limit 1) c on true
  left join lateral (select risk, reasons from daily_metrics where user_id = p.id and risk is not null order by day desc limit 1) m on true
  where p.role = 'patient' and public.is_clinician()
  order by m.risk desc nulls last;
$$;

grant execute on function public.submit_checkin(text, date) to authenticated;
grant execute on function public.submit_phq9(int[], date) to authenticated;
grant execute on function public.care_overview() to authenticated;

-- Live updates for the care portal (it re-reads when any of these change).
do $$ begin
  begin alter publication supabase_realtime add table public.daily_metrics; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.questionnaires; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.phq9; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.care_notes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.care_calls; exception when duplicate_object then null; end;
end $$;
