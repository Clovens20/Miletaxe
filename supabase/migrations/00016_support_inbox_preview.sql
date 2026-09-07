-- Aperçu du dernier message + réouverture si l’utilisateur écrit après résolution.

create or replace function public.support_touch_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_threads
  set
    last_message_at = now(),
    status = case
      when new.author_role = 'user' and status = 'resolved' then 'open'
      else status
    end,
    assigned_agent_id = case
      when new.author_role = 'user' and status = 'resolved' then null
      else assigned_agent_id
    end
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists support_messages_touch_thread on public.support_messages;
create trigger support_messages_touch_thread
after insert on public.support_messages
for each row execute function public.support_touch_thread_on_message();

drop function if exists public.support_inbox();

create or replace function public.support_inbox()
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  user_name text,
  status text,
  assigned_agent_id uuid,
  topic_id uuid,
  last_message_at timestamptz,
  created_at timestamptz,
  last_message text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_support() then
    raise exception 'not_support' using errcode = '42501';
  end if;
  return query
  select
    t.id,
    t.user_id,
    u.email::text,
    p.full_name,
    t.status,
    t.assigned_agent_id,
    t.topic_id,
    t.last_message_at,
    t.created_at,
    (
      select m.body
      from public.support_messages m
      where m.thread_id = t.id
      order by m.created_at desc
      limit 1
    ) as last_message
  from public.support_threads t
  join auth.users u on u.id = t.user_id
  left join public.profiles p on p.id = t.user_id
  order by t.last_message_at desc
  limit 300;
end;
$$;

revoke all on function public.support_inbox() from public;
grant execute on function public.support_inbox() to authenticated;
