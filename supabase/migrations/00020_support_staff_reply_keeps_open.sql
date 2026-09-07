-- Une réponse agent/admin rouvre un dossier résolu pour que l’utilisateur puisse continuer.

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
      when new.author_role in ('agent', 'admin') and status = 'resolved' then 'claimed'
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
