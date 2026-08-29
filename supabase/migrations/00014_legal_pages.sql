-- Pages légales publiques, éditables par l’admin.

create table if not exists public.legal_pages (
  locale text not null check (locale in ('fr', 'en')),
  kind text not null check (kind in ('privacy', 'terms')),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  primary key (locale, kind)
);

alter table public.legal_pages enable row level security;

create policy "legal public read"
  on public.legal_pages
  for select
  to anon, authenticated
  using (true);

create policy "legal staff insert"
  on public.legal_pages
  for insert
  to authenticated
  with check (public.is_staff());

create policy "legal staff update"
  on public.legal_pages
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

revoke all on table public.legal_pages from public;
grant select on table public.legal_pages to anon, authenticated;
grant insert, update on table public.legal_pages to authenticated;
