alter table public.profiles add column if not exists phone text;

drop function if exists public.admin_list_agents();

create or replace function public.admin_list_agents()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  created_at timestamptz
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
    u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where coalesce(u.raw_app_meta_data->>'role', '') = 'agent'
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_agents() from public;
grant execute on function public.admin_list_agents() to authenticated;
