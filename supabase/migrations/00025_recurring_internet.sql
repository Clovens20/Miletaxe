-- Forfait internet mensuel : un contrat, une écriture automatique par mois.

create table if not exists public.recurring_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'internet' check (kind in ('internet')),
  vendor_name text not null,
  amount numeric not null check (amount >= 0),
  currency text not null default 'CAD',
  started_on date not null,
  ended_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_on is null or ended_on >= started_on)
);

create index if not exists recurring_plans_user_idx
  on public.recurring_plans (user_id, started_on desc);

create trigger recurring_plans_updated
before update on public.recurring_plans
for each row execute function public.set_updated_at();

alter table public.recurring_plans enable row level security;

create policy "recurring plans own select"
  on public.recurring_plans for select using (user_id = auth.uid());
create policy "recurring plans own insert"
  on public.recurring_plans for insert with check (user_id = auth.uid());
create policy "recurring plans own update"
  on public.recurring_plans for update using (user_id = auth.uid());
create policy "recurring plans own delete"
  on public.recurring_plans for delete using (user_id = auth.uid());

create unique index if not exists expenses_recurring_ref_uidx
  on public.expenses (user_id, reference_number)
  where reference_number like 'recurring:%';
