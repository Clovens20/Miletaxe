-- L’employé peut lever le drapeau lui-même après avoir choisi un mot de passe.

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
