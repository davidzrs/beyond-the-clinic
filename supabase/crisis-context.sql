-- Crisis alerts with context (run after chat-care.sql).
-- The care team can read the message that raised the alert and the chat just before it.
-- Only the patient is named: everyone else at the campfire shows as Member A, Member B, …
-- (names are replaced here, in the database, so the portal never receives them).

alter table public.crisis_alerts add column if not exists text text;
alter table public.crisis_alerts add column if not exists campfire_id uuid references public.campfires on delete set null;

create or replace function public.crisis_context(alert_id bigint, n int default 12)
returns table (at timestamptz, author text, is_patient boolean, flagged boolean, body text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  a public.crisis_alerts;
  who text;
  fire uuid;
begin
  if not public.is_clinician() then raise exception 'Only the care team can read this'; end if;
  select * into a from public.crisis_alerts where id = alert_id;
  if not found then return; end if;
  select coalesce(p.name, 'Patient') into who from public.profiles p where p.id = a.patient_id;
  -- Alerts from before this file have no campfire: use the one the patient last wrote in, else the newest one.
  fire := a.campfire_id;
  if fire is null then
    select m.campfire_id into fire from public.messages m
    where m.user_id = a.patient_id and m.created_at <= a.created_at order by m.created_at desc limit 1;
  end if;
  if fire is null then
    select cm.campfire_id into fire from public.campfire_members cm where cm.user_id = a.patient_id order by cm.joined_at desc limit 1;
  end if;

  return query
  with prev as (
    select m.created_at, m.user_id, m.text from public.messages m
    where fire is not null and m.campfire_id = fire and m.created_at <= a.created_at
    order by m.created_at desc limit n
  ), others as (
    select x.user_id, row_number() over (order by min(x.created_at)) as k from prev x
    where x.user_id is not null and x.user_id <> a.patient_id group by x.user_id
  )
  select q.at, q.author, q.is_patient, q.flagged, q.body from (
    select p.created_at as at,
      case when p.user_id is null then 'Ember (AI)'
           when p.user_id = a.patient_id then who
           else 'Member ' || chr(64 + (select o.k from others o where o.user_id = p.user_id)::int) end as author,
      coalesce(p.user_id = a.patient_id, false) as is_patient, false as flagged, p.text as body
    from prev p
    union all
    select a.created_at, who, true, true, a.text where a.text is not null
  ) q
  order by q.at, q.flagged;
end $$;

revoke all on function public.crisis_context(bigint, int) from public;
grant execute on function public.crisis_context(bigint, int) to authenticated;
