-- Schéma de départ.
-- Catégories, provinces et contrôles de dossier sont en tables.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Catalog / configuration
-- ---------------------------------------------------------------------------

create table public.countries (
  code text primary key,
  name_i18n jsonb not null,
  default_currency text not null,
  default_distance_unit text not null check (default_distance_unit in ('km', 'mi')),
  is_active boolean not null default true
);

create table public.jurisdictions (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries (code),
  parent_id uuid references public.jurisdictions (id),
  code text not null,
  kind text not null check (kind in ('federal', 'province', 'state', 'territory', 'district')),
  name_i18n jsonb not null,
  is_active boolean not null default true,
  unique (country_code, code)
);

create table public.tax_years (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries (code),
  year integer not null,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  unique (country_code, year)
);

create table public.occupation_catalog (
  id uuid primary key default gen_random_uuid(),
  country_code text references public.countries (code),
  code text not null,
  name_i18n jsonb not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.expense_category_catalog (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries (code),
  jurisdiction_id uuid references public.jurisdictions (id),
  tax_year_id uuid references public.tax_years (id),
  code text not null,
  name_i18n jsonb not null,
  description_i18n jsonb,
  accountant_label_i18n jsonb,
  sort_order integer not null default 0,
  requires_receipt boolean not null default true,
  requires_vehicle boolean not null default false,
  is_active boolean not null default true
);

create table public.income_category_catalog (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries (code),
  jurisdiction_id uuid references public.jurisdictions (id),
  tax_year_id uuid references public.tax_years (id),
  code text not null,
  name_i18n jsonb not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- Méthodes de km pour le dossier comptable.
-- rate_per_unit peut rester vide tant qu'on n'a pas les chiffres officiels.
create table public.mileage_rate_methods (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries (code),
  jurisdiction_id uuid references public.jurisdictions (id),
  tax_year_id uuid references public.tax_years (id),
  method_code text not null,
  title_i18n jsonb not null,
  description_i18n jsonb,
  source_name text,
  source_url text,
  is_available boolean not null default true
);

create table public.mileage_rate_tiers (
  id uuid primary key default gen_random_uuid(),
  method_id uuid not null references public.mileage_rate_methods (id) on delete cascade,
  vehicle_class text,
  min_distance numeric,
  max_distance numeric,
  rate_per_unit numeric,
  distance_unit text not null check (distance_unit in ('km', 'mi')),
  notes_i18n jsonb
);

create table public.record_requirements (
  id uuid primary key default gen_random_uuid(),
  country_code text references public.countries (code),
  jurisdiction_id uuid references public.jurisdictions (id),
  tax_year_id uuid references public.tax_years (id),
  entity_type text not null,
  field_name text not null,
  is_required boolean not null default true,
  condition jsonb,
  message_i18n jsonb not null
);

create table public.integrity_rule_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  country_code text references public.countries (code),
  jurisdiction_id uuid references public.jurisdictions (id),
  tax_year_id uuid references public.tax_years (id),
  entity_type text not null,
  severity text not null check (severity in ('info', 'warning', 'blocking')),
  title_i18n jsonb not null,
  description_i18n jsonb not null,
  is_active boolean not null default true,
  config jsonb
);

create table public.report_section_templates (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries (code),
  jurisdiction_id uuid references public.jurisdictions (id),
  tax_year_id uuid references public.tax_years (id),
  code text not null,
  title_i18n jsonb not null,
  sort_order integer not null default 0,
  include_entities text[] not null default '{}',
  notes_i18n jsonb
);

-- ---------------------------------------------------------------------------
-- User data
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  preferred_locale text not null default 'fr',
  country_code text references public.countries (code),
  jurisdiction_id uuid references public.jurisdictions (id),
  occupancy text,
  default_distance_unit text check (default_distance_unit in ('km', 'mi')),
  default_currency text,
  accountant_name text,
  accountant_email text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  nickname text not null,
  make text,
  model text,
  year integer,
  plate text,
  vin text,
  fuel_type text,
  ownership_type text,
  business_use_percent numeric check (business_use_percent is null or (business_use_percent >= 0 and business_use_percent <= 100)),
  is_active boolean not null default true,
  acquired_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.odometer_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  reading numeric not null check (reading >= 0),
  unit text not null check (unit in ('km', 'mi')),
  kind text not null check (kind in ('opening', 'periodic', 'closing')),
  recorded_on date not null,
  photo_path text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.distance_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  start_reading_id uuid not null references public.odometer_readings (id) on delete cascade,
  end_reading_id uuid not null references public.odometer_readings (id) on delete cascade,
  distance numeric not null,
  unit text not null check (unit in ('km', 'mi')),
  started_on date not null,
  ended_on date not null,
  purpose text not null default 'unspecified',
  business_distance numeric,
  unique (start_reading_id, end_reading_id)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  captured_at timestamptz not null default now(),
  ocr_status text not null default 'pending' check (ocr_status in ('pending', 'processing', 'complete', 'failed', 'skipped')),
  ocr_payload jsonb,
  ocr_provider text
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  receipt_id uuid references public.receipts (id) on delete set null,
  category_id uuid references public.expense_category_catalog (id),
  vendor_name text,
  amount numeric not null check (amount >= 0),
  tax_amount numeric check (tax_amount is null or tax_amount >= 0),
  currency text not null default 'CAD',
  incurred_on date not null,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'needs_review', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid references public.income_category_catalog (id),
  source_name text not null,
  source_kind text not null default 'other' check (source_kind in ('platform', 'invoice', 'cash', 'other')),
  amount numeric not null check (amount >= 0),
  currency text not null default 'CAD',
  received_on date not null,
  reference_number text,
  notes text,
  document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tax_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tax_year_id uuid not null references public.tax_years (id),
  jurisdiction_id uuid references public.jurisdictions (id),
  status text not null default 'draft' check (status in ('draft', 'generated', 'shared')),
  generated_at timestamptz,
  package_path text,
  summary jsonb,
  disclaimer_version text not null default '2026.1',
  created_at timestamptz not null default now()
);

create table public.integrity_findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rule_id uuid references public.integrity_rule_definitions (id),
  rule_code text not null,
  tax_year_id uuid references public.tax_years (id),
  entity_type text not null,
  entity_id uuid,
  severity text not null check (severity in ('info', 'warning', 'blocking')),
  title_i18n jsonb not null,
  description_i18n jsonb not null,
  is_resolved boolean not null default false,
  details jsonb,
  detected_at timestamptz not null default now()
);

create index vehicles_user_id_idx on public.vehicles (user_id);
create index odometer_readings_vehicle_idx on public.odometer_readings (vehicle_id, recorded_on);
create index distance_segments_vehicle_idx on public.distance_segments (vehicle_id, started_on);
create index expenses_user_date_idx on public.expenses (user_id, incurred_on desc);
create index income_user_date_idx on public.income_entries (user_id, received_on desc);
create index findings_user_open_idx on public.integrity_findings (user_id, is_resolved);
create index expense_categories_country_idx on public.expense_category_catalog (country_code, is_active);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger vehicles_updated_at before update on public.vehicles
for each row execute function public.set_updated_at();
create trigger expenses_updated_at before update on public.expenses
for each row execute function public.set_updated_at();
create trigger income_updated_at before update on public.income_entries
for each row execute function public.set_updated_at();

create or replace function public.distance_to_km(value numeric, unit text)
returns numeric
language sql
immutable
as $$
  select case when unit = 'mi' then value * 1.609344 else value end;
$$;

create or replace function public.distance_from_km(value_km numeric, unit text)
returns numeric
language sql
immutable
as $$
  select case when unit = 'mi' then value_km / 1.609344 else value_km end;
$$;

create or replace function public.rebuild_distance_segments(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  prev_id uuid;
  prev_reading numeric;
  prev_unit text;
  prev_on date;
  prev_user uuid;
  dist numeric;
begin
  delete from public.distance_segments where vehicle_id = p_vehicle_id;

  for rec in
    select id, user_id, reading, unit, recorded_on
    from public.odometer_readings
    where vehicle_id = p_vehicle_id
    order by recorded_on, created_at, reading
  loop
    if prev_id is not null then
      dist := public.distance_from_km(
        public.distance_to_km(rec.reading, rec.unit) - public.distance_to_km(prev_reading, prev_unit),
        rec.unit
      );
      insert into public.distance_segments (
        user_id, vehicle_id, start_reading_id, end_reading_id,
        distance, unit, started_on, ended_on, purpose
      ) values (
        rec.user_id, p_vehicle_id, prev_id, rec.id,
        dist, rec.unit, prev_on, rec.recorded_on, 'unspecified'
      );
    end if;
    prev_id := rec.id;
    prev_reading := rec.reading;
    prev_unit := rec.unit;
    prev_on := rec.recorded_on;
    prev_user := rec.user_id;
  end loop;
end;
$$;

create or replace function public.odometer_readings_rebuild()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vid uuid;
begin
  vid := coalesce(new.vehicle_id, old.vehicle_id);
  perform public.rebuild_distance_segments(vid);
  return coalesce(new, old);
end;
$$;

create trigger odometer_readings_rebuild
after insert or update or delete on public.odometer_readings
for each row execute function public.odometer_readings_rebuild();

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
    coalesce(new.raw_user_meta_data->>'preferred_locale', 'fr')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.countries enable row level security;
alter table public.jurisdictions enable row level security;
alter table public.tax_years enable row level security;
alter table public.occupation_catalog enable row level security;
alter table public.expense_category_catalog enable row level security;
alter table public.income_category_catalog enable row level security;
alter table public.mileage_rate_methods enable row level security;
alter table public.mileage_rate_tiers enable row level security;
alter table public.record_requirements enable row level security;
alter table public.integrity_rule_definitions enable row level security;
alter table public.report_section_templates enable row level security;
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.odometer_readings enable row level security;
alter table public.distance_segments enable row level security;
alter table public.receipts enable row level security;
alter table public.expenses enable row level security;
alter table public.income_entries enable row level security;
alter table public.tax_reports enable row level security;
alter table public.integrity_findings enable row level security;

create policy "catalogs readable by authenticated"
on public.countries for select to authenticated using (is_active = true);
create policy "jurisdictions readable"
on public.jurisdictions for select to authenticated using (is_active = true);
create policy "tax years readable"
on public.tax_years for select to authenticated using (true);
create policy "occupations readable"
on public.occupation_catalog for select to authenticated using (is_active = true);
create policy "expense categories readable"
on public.expense_category_catalog for select to authenticated using (is_active = true);
create policy "income categories readable"
on public.income_category_catalog for select to authenticated using (is_active = true);
create policy "mileage methods readable"
on public.mileage_rate_methods for select to authenticated using (is_available = true);
create policy "mileage tiers readable"
on public.mileage_rate_tiers for select to authenticated using (true);
create policy "requirements readable"
on public.record_requirements for select to authenticated using (true);
create policy "integrity rules readable"
on public.integrity_rule_definitions for select to authenticated using (is_active = true);
create policy "report templates readable"
on public.report_section_templates for select to authenticated using (true);

create policy "profiles self select" on public.profiles for select using (id = auth.uid());
create policy "profiles self update" on public.profiles for update using (id = auth.uid());

create policy "vehicles own select" on public.vehicles for select using (user_id = auth.uid());
create policy "vehicles own insert" on public.vehicles for insert with check (user_id = auth.uid());
create policy "vehicles own update" on public.vehicles for update using (user_id = auth.uid());
create policy "vehicles own delete" on public.vehicles for delete using (user_id = auth.uid());

create policy "odometer own select" on public.odometer_readings for select using (user_id = auth.uid());
create policy "odometer own insert" on public.odometer_readings for insert with check (user_id = auth.uid());
create policy "odometer own update" on public.odometer_readings for update using (user_id = auth.uid());
create policy "odometer own delete" on public.odometer_readings for delete using (user_id = auth.uid());

create policy "segments own select" on public.distance_segments for select using (user_id = auth.uid());
create policy "segments own update" on public.distance_segments for update using (user_id = auth.uid());

create policy "receipts own select" on public.receipts for select using (user_id = auth.uid());
create policy "receipts own insert" on public.receipts for insert with check (user_id = auth.uid());
create policy "receipts own update" on public.receipts for update using (user_id = auth.uid());
create policy "receipts own delete" on public.receipts for delete using (user_id = auth.uid());

create policy "expenses own select" on public.expenses for select using (user_id = auth.uid());
create policy "expenses own insert" on public.expenses for insert with check (user_id = auth.uid());
create policy "expenses own update" on public.expenses for update using (user_id = auth.uid());
create policy "expenses own delete" on public.expenses for delete using (user_id = auth.uid());

create policy "income own select" on public.income_entries for select using (user_id = auth.uid());
create policy "income own insert" on public.income_entries for insert with check (user_id = auth.uid());
create policy "income own update" on public.income_entries for update using (user_id = auth.uid());
create policy "income own delete" on public.income_entries for delete using (user_id = auth.uid());

create policy "reports own select" on public.tax_reports for select using (user_id = auth.uid());
create policy "reports own insert" on public.tax_reports for insert with check (user_id = auth.uid());
create policy "reports own update" on public.tax_reports for update using (user_id = auth.uid());
create policy "reports own delete" on public.tax_reports for delete using (user_id = auth.uid());

create policy "findings own select" on public.integrity_findings for select using (user_id = auth.uid());
create policy "findings own insert" on public.integrity_findings for insert with check (user_id = auth.uid());
create policy "findings own update" on public.integrity_findings for update using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('receipts', 'receipts', false),
  ('odometer-photos', 'odometer-photos', false),
  ('report-packages', 'report-packages', false)
on conflict (id) do nothing;

create policy "receipts own files"
on storage.objects for all to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "odometer own files"
on storage.objects for all to authenticated
using (bucket_id = 'odometer-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'odometer-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "reports own files"
on storage.objects for all to authenticated
using (bucket_id = 'report-packages' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'report-packages' and (storage.foldername(name))[1] = auth.uid()::text);
