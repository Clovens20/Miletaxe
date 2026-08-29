-- Contenu public de miletaxe.com, éditable uniquement par l’admin.

create table if not exists public.landing_pages (
  locale text primary key check (locale in ('fr', 'en')),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.landing_pages enable row level security;

create policy "landing public read"
  on public.landing_pages
  for select
  to anon, authenticated
  using (true);

create policy "landing staff insert"
  on public.landing_pages
  for insert
  to authenticated
  with check (public.is_staff());

create policy "landing staff update"
  on public.landing_pages
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

revoke all on table public.landing_pages from public;
grant select on table public.landing_pages to anon, authenticated;
grant insert, update on table public.landing_pages to authenticated;
