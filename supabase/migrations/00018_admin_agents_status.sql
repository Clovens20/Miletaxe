-- Liste employés : statuts + lever le drapeau mot de passe.
-- Relançable tel quel dans le SQL Editor.

alter table public.profiles add column if not exists phone text;

drop function if exists public.admin_list_agents() cascade;

create function public.admin_list_agents()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  must_change_password boolean
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
  select
    u.id,
    u.email::text,
    p.full_name,
    p.phone,
    u.created_at,
    u.last_sign_in_at,
    u.banned_until,
    coalesce((u.raw_app_meta_data->>'must_change_password') in ('true', 't', '1'), false)
  from auth.users u
  left join public.profiles p on p.id = u.id
  where coalesce(u.raw_app_meta_data->>'role', '') = 'agent'
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_agents() from public;
grant execute on function public.admin_list_agents() to authenticated;

create or replace function public.clear_own_must_change_password()
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"must_change_password": false}'::jsonb
  where id = auth.uid();
end;
$$;

revoke all on function public.clear_own_must_change_password() from public;
grant execute on function public.clear_own_must_change_password() to authenticated;

notify pgrst, 'reload schema';
