-- Location de véhicule de travail : suivi journalier sans odomètre.

alter table public.vehicles
  add column if not exists tracking_mode text not null default 'odometer'
    check (tracking_mode in ('odometer', 'rental_daily'));

alter table public.vehicles
  add column if not exists daily_rental_rate numeric
    check (daily_rental_rate is null or daily_rental_rate >= 0);

alter table public.vehicles
  add column if not exists rental_vendor text;

create table if not exists public.vehicle_rental_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  work_date date not null,
  rental_amount numeric not null check (rental_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, work_date)
);

create index if not exists vehicle_rental_days_user_date_idx
  on public.vehicle_rental_days (user_id, work_date desc);

create trigger vehicle_rental_days_updated
before update on public.vehicle_rental_days
for each row execute function public.set_updated_at();

alter table public.vehicle_rental_days enable row level security;

create policy "rental days own select"
  on public.vehicle_rental_days for select using (user_id = auth.uid());
create policy "rental days own insert"
  on public.vehicle_rental_days for insert with check (user_id = auth.uid());
create policy "rental days own update"
  on public.vehicle_rental_days for update using (user_id = auth.uid());
create policy "rental days own delete"
  on public.vehicle_rental_days for delete using (user_id = auth.uid());

insert into public.expense_category_catalog (
  country_code, code, name_i18n, accountant_label_i18n, sort_order, requires_receipt, requires_vehicle
)
select * from (values
  (
    'CA',
    'vehicle_rental',
    '{"fr":"Location de véhicule","en":"Vehicle rental"}'::jsonb,
    '{"fr":"Location de véhicule de travail","en":"Work vehicle rental"}'::jsonb,
    55,
    false,
    false
  ),
  (
    'US',
    'vehicle_rental',
    '{"fr":"Location de véhicule","en":"Vehicle rental"}'::jsonb,
    '{"fr":"Work vehicle rental","en":"Work vehicle rental"}'::jsonb,
    55,
    false,
    false
  )
) as v(country_code, code, name_i18n, accountant_label_i18n, sort_order, requires_receipt, requires_vehicle)
where not exists (
  select 1 from public.expense_category_catalog c
  where c.country_code = v.country_code and c.code = v.code
);

update public.integrity_rule_definitions
set description_i18n = '{"fr":"Ajoutez un véhicule ou enregistrez une location de véhicule de travail.","en":"Add a vehicle or log a work vehicle rental."}'::jsonb
where code = 'missing_vehicle';
