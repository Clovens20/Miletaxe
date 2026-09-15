-- L’utilisateur marque une conversation d’aide comme lue en l’ouvrant.

alter table public.support_threads
  add column if not exists user_last_read_at timestamptz;

create or replace function public.mark_support_thread_read(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  update public.support_threads
  set user_last_read_at = greatest(now(), last_message_at)
  where id = p_thread_id
    and user_id = auth.uid();
end;
$$;

revoke all on function public.mark_support_thread_read(uuid) from public;
grant execute on function public.mark_support_thread_read(uuid) to authenticated;
