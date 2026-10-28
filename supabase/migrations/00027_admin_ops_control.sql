-- Contrôle ops admin : stats enrichies, utilisateurs actifs, mouvements récents.
-- Agrégats + activité récente (courriel/nom) — pas de montants ni détail de dossier.

create or replace function public.admin_project_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since_7d timestamptz := timezone('utc', now()) - interval '7 days';
  since_1d timestamptz := timezone('utc', now()) - interval '1 day';
begin
  if not public.is_staff() then
    raise exception 'not_staff' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'users', (select count(*)::int from public.profiles),
    'users_onboarded', (
      select count(*)::int from public.profiles where onboarding_completed_at is not null
    ),
    'signups_7d', (
      select count(*)::int from public.profiles where created_at >= since_7d
    ),
    'active_users_7d', (
      select count(*)::int
      from auth.users u
      where coalesce(u.last_sign_in_at, u.created_at) >= since_7d
        and exists (select 1 from public.profiles p where p.id = u.id)
    ),
    'users_sending_data_7d', (
      select count(distinct uid)::int
      from (
        select user_id as uid from public.odometer_readings where created_at >= since_7d
        union
        select user_id from public.expenses where coalesce(updated_at, created_at) >= since_7d
        union
        select user_id from public.income_entries where coalesce(updated_at, created_at) >= since_7d
        union
        select user_id from public.receipts where captured_at >= since_7d
        union
        select user_id from public.vehicle_rental_days where coalesce(updated_at, created_at) >= since_7d
      ) activity
    ),
    'vehicles', (select count(*)::int from public.vehicles),
    'receipts', (select count(*)::int from public.receipts),
    'expenses', (select count(*)::int from public.expenses),
    'income', (select count(*)::int from public.income_entries),
    'readings', (select count(*)::int from public.odometer_readings),
    'support_open', (
      select count(*)::int from public.support_threads where status = 'open'
    ),
    'support_claimed', (
      select count(*)::int from public.support_threads where status = 'claimed'
    ),
    'support_escalated', (
      select count(*)::int from public.support_threads where status = 'escalated'
    ),
    'readings_24h', (
      select count(*)::int from public.odometer_readings where created_at >= since_1d
    ),
    'expenses_24h', (
      select count(*)::int from public.expenses where coalesce(updated_at, created_at) >= since_1d
    ),
    'income_24h', (
      select count(*)::int from public.income_entries where coalesce(updated_at, created_at) >= since_1d
    ),
    'receipts_24h', (
      select count(*)::int from public.receipts where captured_at >= since_1d
    ),
    'support_24h', (
      select count(*)::int from public.support_messages where created_at >= since_1d
    )
  );
end;
$$;

drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  country_code text,
  created_at timestamptz,
  onboarding_completed_at timestamptz,
  last_sign_in_at timestamptz,
  last_activity_at timestamptz,
  data_events_7d int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since_7d timestamptz := timezone('utc', now()) - interval '7 days';
begin
  if not public.is_staff() then
    raise exception 'not_staff' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.full_name,
    p.country_code,
    p.created_at,
    p.onboarding_completed_at,
    u.last_sign_in_at,
    greatest(
      u.last_sign_in_at,
      (select max(r.created_at) from public.odometer_readings r where r.user_id = p.id),
      (select max(coalesce(e.updated_at, e.created_at)) from public.expenses e where e.user_id = p.id),
      (select max(coalesce(i.updated_at, i.created_at)) from public.income_entries i where i.user_id = p.id),
      (select max(rc.captured_at) from public.receipts rc where rc.user_id = p.id)
    ) as last_activity_at,
    (
      select count(*)::int from (
        select 1 from public.odometer_readings r where r.user_id = p.id and r.created_at >= since_7d
        union all
        select 1 from public.expenses e where e.user_id = p.id and coalesce(e.updated_at, e.created_at) >= since_7d
        union all
        select 1 from public.income_entries i where i.user_id = p.id and coalesce(i.updated_at, i.created_at) >= since_7d
        union all
        select 1 from public.receipts rc where rc.user_id = p.id and rc.captured_at >= since_7d
      ) ev
    ) as data_events_7d
  from public.profiles p
  join auth.users u on u.id = p.id
  order by coalesce(
    greatest(
      u.last_sign_in_at,
      (select max(r.created_at) from public.odometer_readings r where r.user_id = p.id)
    ),
    p.created_at
  ) desc
  limit 500;
end;
$$;

create or replace function public.admin_recent_movements(limit_count int default 60)
returns table (
  occurred_at timestamptz,
  kind text,
  user_email text,
  user_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'not_staff' using errcode = '42501';
  end if;

  return query
  select m.occurred_at, m.kind, m.user_email, m.user_name
  from (
    select
      p.created_at as occurred_at,
      'signup'::text as kind,
      u.email::text as user_email,
      p.full_name as user_name
    from public.profiles p
    join auth.users u on u.id = p.id

    union all

    select
      r.created_at,
      'reading'::text,
      u.email::text,
      p.full_name
    from public.odometer_readings r
    join auth.users u on u.id = r.user_id
    left join public.profiles p on p.id = r.user_id

    union all

    select
      coalesce(e.updated_at, e.created_at),
      'expense'::text,
      u.email::text,
      p.full_name
    from public.expenses e
    join auth.users u on u.id = e.user_id
    left join public.profiles p on p.id = e.user_id

    union all

    select
      coalesce(i.updated_at, i.created_at),
      'income'::text,
      u.email::text,
      p.full_name
    from public.income_entries i
    join auth.users u on u.id = i.user_id
    left join public.profiles p on p.id = i.user_id

    union all

    select
      rc.captured_at,
      'receipt'::text,
      u.email::text,
      p.full_name
    from public.receipts rc
    join auth.users u on u.id = rc.user_id
    left join public.profiles p on p.id = rc.user_id

    union all

    select
      sm.created_at,
      'support'::text,
      u.email::text,
      p.full_name
    from public.support_messages sm
    join public.support_threads st on st.id = sm.thread_id
    join auth.users u on u.id = st.user_id
    left join public.profiles p on p.id = st.user_id
    where sm.author_role = 'user'
  ) m
  order by m.occurred_at desc
  limit greatest(1, least(coalesce(limit_count, 60), 200));
end;
$$;

revoke all on function public.admin_project_stats() from public;
revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_recent_movements(int) from public;
grant execute on function public.admin_project_stats() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_recent_movements(int) to authenticated;
