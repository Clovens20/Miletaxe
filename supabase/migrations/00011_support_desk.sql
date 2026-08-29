-- Support : agents (employés), conversations, répertoire de problèmes.
-- Rôles JWT : admin | agent. L’admin nommé ci-dessous est promu.

create or replace function public.is_agent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'agent', false);
$$;

create or replace function public.is_support()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() or public.is_agent();
$$;

revoke all on function public.is_agent() from public;
revoke all on function public.is_support() from public;
grant execute on function public.is_agent() to authenticated;
grant execute on function public.is_support() to authenticated;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where id = 'f86fb094-2d42-4b24-a6b5-a2c7ed251b60'
   or lower(email) = 'clodenerc@yahoo.fr';

create table public.support_topics (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  category text not null,
  title_i18n jsonb not null,
  body_i18n jsonb not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'claimed', 'escalated', 'resolved')),
  assigned_agent_id uuid references public.profiles (id) on delete set null,
  escalated_by uuid references public.profiles (id) on delete set null,
  topic_id uuid references public.support_topics (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_role text not null check (author_role in ('user', 'agent', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

create index support_threads_status_idx on public.support_threads (status, last_message_at desc);
create index support_threads_user_idx on public.support_threads (user_id, last_message_at desc);
create index support_messages_thread_idx on public.support_messages (thread_id, created_at);

create trigger support_threads_updated
before update on public.support_threads
for each row execute function public.set_updated_at();

alter table public.support_topics enable row level security;
alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

create policy "support topics readable"
  on public.support_topics for select to authenticated using (is_active = true or public.is_support());
create policy "support topics staff write"
  on public.support_topics for insert to authenticated with check (public.is_staff());
create policy "support topics staff update"
  on public.support_topics for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "support topics staff delete"
  on public.support_topics for delete to authenticated using (public.is_staff());

create policy "support threads own select"
  on public.support_threads for select to authenticated using (user_id = auth.uid() or public.is_support());
create policy "support threads own insert"
  on public.support_threads for insert to authenticated with check (user_id = auth.uid());
create policy "support threads support update"
  on public.support_threads for update to authenticated using (public.is_support()) with check (public.is_support());

create policy "support messages select"
  on public.support_messages for select to authenticated using (
    public.is_support()
    or exists (select 1 from public.support_threads t where t.id = thread_id and t.user_id = auth.uid())
  );
create policy "support messages insert"
  on public.support_messages for insert to authenticated with check (
    author_id = auth.uid()
    and (
      (author_role = 'user' and exists (select 1 from public.support_threads t where t.id = thread_id and t.user_id = auth.uid()))
      or (author_role = 'agent' and public.is_agent())
      or (author_role = 'admin' and public.is_staff())
    )
  );

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
  created_at timestamptz
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
    t.created_at
  from public.support_threads t
  join auth.users u on u.id = t.user_id
  left join public.profiles p on p.id = t.user_id
  order by t.last_message_at desc
  limit 300;
end;
$$;

create or replace function public.admin_list_agents()
returns table (
  id uuid,
  email text,
  full_name text,
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
    u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where coalesce(u.raw_app_meta_data->>'role', '') = 'agent'
  order by u.created_at desc;
end;
$$;

revoke all on function public.support_inbox() from public;
revoke all on function public.admin_list_agents() from public;
grant execute on function public.support_inbox() to authenticated;
grant execute on function public.admin_list_agents() to authenticated;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['support_topics', 'support_threads', 'support_messages']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

insert into public.support_topics (code, category, title_i18n, body_i18n, sort_order) values
(
  'login',
  'compte',
  '{"fr":"Connexion impossible","en":"Cannot sign in"}',
  '{"fr":"Vérifier le courriel, afficher le mot de passe avec l’œil, puis Réessayer. Mot de passe oublié envoie un lien par courriel. Si le compte n’existe pas, proposer Créer un compte.","en":"Check the email, reveal the password with the eye icon, then try again. Forgot password sends an email link. If no account exists, offer Create account."}',
  10
),
(
  'password',
  'compte',
  '{"fr":"Changer le mot de passe","en":"Change password"}',
  '{"fr":"Connecté : Paramètres → Changer le mot de passe (actuel + nouveau, 8 caractères). Déconnecté : Mot de passe oublié.","en":"Signed in: Settings → Change password (current + new, 8 characters). Signed out: Forgot password."}',
  20
),
(
  'scan-receipt',
  'depenses',
  '{"fr":"Le scan de reçu est incorrect","en":"Receipt scan is wrong"}',
  '{"fr":"La lecture OCR est une suggestion. Corriger le marchand, la date, le montant et la catégorie, puis confirmer. Sans photo nette, saisir à la main.","en":"OCR is a suggestion. Correct merchant, date, amount and category, then confirm. If the photo is unclear, type the values."}',
  30
),
(
  'odometer',
  'kilometrage',
  '{"fr":"Relevé d’odomètre refusé","en":"Odometer reading rejected"}',
  '{"fr":"Le nouveau relevé doit être égal ou supérieur au précédent. Vérifier les chiffres, l’unité (km/mi) et le véhicule. Un relevé du matin et du soir le même jour aide le dossier.","en":"The new reading must be equal to or higher than the previous one. Check the digits, unit (km/mi) and vehicle. Morning and evening readings on the same day help the file."}',
  40
),
(
  'vehicle',
  'vehicule',
  '{"fr":"Ajouter ou modifier un véhicule","en":"Add or edit a vehicle"}',
  '{"fr":"Plus → Véhicules → Ajouter. Surnom obligatoire. Sans véhicule, le score d’intégrité reste bas (point bloquant).","en":"More → Vehicles → Add. Nickname is required. Without a vehicle, the completeness score stays low (blocking item)."}',
  50
),
(
  'package',
  'dossier',
  '{"fr":"Préparer le dossier comptable","en":"Prepare the accountant package"}',
  '{"fr":"Accueil → Préparer le dossier pour le comptable. Ce n’est pas une déclaration d’impôt. Corriger les points d’intégrité avant d’envoyer le PDF.","en":"Home → Prepare the accountant package. This is not a tax return. Fix integrity items before sending the PDF."}',
  60
),
(
  'export-delete',
  'compte',
  '{"fr":"Exporter ou supprimer le compte","en":"Export or delete the account"}',
  '{"fr":"Paramètres → Exporter mes données (JSON). Suppression : confirmation obligatoire, irréversible.","en":"Settings → Export my data (JSON). Deletion requires confirmation and cannot be undone."}',
  70
),
(
  'language',
  'app',
  '{"fr":"Changer la langue","en":"Change language"}',
  '{"fr":"Paramètres → Français ou English. Le choix est enregistré sur le profil.","en":"Settings → French or English. The choice is saved on the profile."}',
  80
),
(
  'offline',
  'app',
  '{"fr":"L’app ne charge pas","en":"The app will not load"}',
  '{"fr":"Vérifier le réseau, fermer et rouvrir l’app. Les données déjà enregistrées restent sur le compte. Si ça continue : transférer au technique.","en":"Check the network, close and reopen the app. Already saved records stay on the account. If it continues: transfer to technical."}',
  90
);
