-- Inscription : ne jamais bloquer auth.users si le profil existe déjà
-- ou si une contrainte secondaire échoue. L’utilisateur peut aussi
-- créer son propre profil (backup si le trigger a manqué).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, preferred_locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'preferred_locale', ''), 'fr')
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    raise warning 'handle_new_user failed: %', sqlerrm;
    return new;
end;
$$;

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());
