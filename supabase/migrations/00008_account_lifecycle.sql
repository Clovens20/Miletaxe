-- Trace de suppression de compte (hash seulement, pas de nom ni courriel).
-- Écriture côté serveur. Les clients n'ont pas de policy de lecture.

create table if not exists public.account_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event in ('deleted')),
  user_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.account_lifecycle_events enable row level security;
