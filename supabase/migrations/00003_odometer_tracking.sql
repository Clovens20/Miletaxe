-- Unité du véhicule, relevés du jour, photo odomètre, historique des corrections.
-- Les segments de distance se reconstruisent à partir des relevés valides seulement.

alter table public.vehicles
  add column if not exists distance_unit text,
  add column if not exists current_odometer numeric;

update public.vehicles
set distance_unit = coalesce(distance_unit, 'km')
where distance_unit is null;

alter table public.vehicles
  alter column distance_unit set default 'km',
  alter column distance_unit set not null;

alter table public.vehicles
  drop constraint if exists vehicles_distance_unit_check;
alter table public.vehicles
  add constraint vehicles_distance_unit_check check (distance_unit in ('km', 'mi'));

alter table public.vehicles
  drop constraint if exists vehicles_current_odometer_check;
alter table public.vehicles
  add constraint vehicles_current_odometer_check
  check (current_odometer is null or current_odometer >= 0);

alter table public.odometer_readings
  add column if not exists recorded_at timestamptz,
  add column if not exists is_valid boolean,
  add column if not exists validation_status text,
  add column if not exists extracted_reading numeric,
  add column if not exists ocr_status text,
  add column if not exists ocr_payload jsonb,
  add column if not exists ocr_provider text,
  add column if not exists ocr_confirmed_at timestamptz,
  add column if not exists source text,
  add column if not exists updated_at timestamptz;

update public.odometer_readings
set
  recorded_at = coalesce(recorded_at, recorded_on::timestamptz),
  is_valid = coalesce(is_valid, true),
  validation_status = coalesce(validation_status, 'valid'),
  source = coalesce(source, 'typed'),
  updated_at = coalesce(updated_at, created_at);

alter table public.odometer_readings
  alter column recorded_at set default now(),
  alter column recorded_at set not null,
  alter column is_valid set default true,
  alter column is_valid set not null,
  alter column validation_status set default 'valid',
  alter column validation_status set not null,
  alter column source set default 'typed',
  alter column source set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.odometer_readings drop constraint if exists odometer_readings_kind_check;

update public.odometer_readings
set kind = case kind
  when 'opening' then 'start_of_day'
  when 'closing' then 'end_of_day'
  when 'periodic' then 'manual'
  else kind
end;

alter table public.odometer_readings
  add constraint odometer_readings_kind_check
  check (kind in ('start_of_day', 'end_of_day', 'manual'));

alter table public.odometer_readings drop constraint if exists odometer_readings_validation_status_check;
alter table public.odometer_readings
  add constraint odometer_readings_validation_status_check
  check (validation_status in ('valid', 'invalid', 'needs_confirmation'));

alter table public.odometer_readings drop constraint if exists odometer_readings_source_check;
alter table public.odometer_readings
  add constraint odometer_readings_source_check
  check (source in ('typed', 'ocr'));

alter table public.odometer_readings drop constraint if exists odometer_readings_ocr_status_check;
alter table public.odometer_readings
  add constraint odometer_readings_ocr_status_check
  check (ocr_status is null or ocr_status in ('pending', 'processing', 'complete', 'failed', 'skipped'));

drop trigger if exists odometer_readings_updated_at on public.odometer_readings;
create trigger odometer_readings_updated_at before update on public.odometer_readings
for each row execute function public.set_updated_at();

create index if not exists odometer_readings_vehicle_recorded_at_idx
  on public.odometer_readings (vehicle_id, recorded_at);

create table if not exists public.odometer_reading_revisions (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.odometer_readings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  reason text not null,
  source text not null check (source in ('user', 'ocr_confirm', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists odometer_reading_revisions_reading_idx
  on public.odometer_reading_revisions (reading_id, created_at desc);

alter table public.odometer_reading_revisions enable row level security;

create policy "revisions own select"
  on public.odometer_reading_revisions for select using (user_id = auth.uid());
create policy "revisions own insert"
  on public.odometer_reading_revisions for insert with check (user_id = auth.uid());

create or replace function public.refresh_vehicle_current_odometer(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  latest record;
  v_unit text;
begin
  select distance_unit into v_unit from public.vehicles where id = p_vehicle_id;
  select reading, unit
    into latest
  from public.odometer_readings
  where vehicle_id = p_vehicle_id
    and is_valid = true
    and validation_status = 'valid'
  order by recorded_at desc, created_at desc
  limit 1;

  if latest is null then
    update public.vehicles set current_odometer = null where id = p_vehicle_id;
  else
    update public.vehicles
    set current_odometer = public.distance_from_km(
      public.distance_to_km(latest.reading, latest.unit),
      coalesce(v_unit, latest.unit)
    )
    where id = p_vehicle_id;
  end if;
end;
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
  dist numeric;
  v_unit text;
begin
  delete from public.distance_segments where vehicle_id = p_vehicle_id;
  select distance_unit into v_unit from public.vehicles where id = p_vehicle_id;

  for rec in
    select id, user_id, reading, unit, recorded_on, recorded_at, created_at
    from public.odometer_readings
    where vehicle_id = p_vehicle_id
      and is_valid = true
      and validation_status = 'valid'
    order by recorded_at, created_at, reading
  loop
    if prev_id is not null then
      dist := public.distance_from_km(
        public.distance_to_km(rec.reading, rec.unit) - public.distance_to_km(prev_reading, prev_unit),
        coalesce(v_unit, rec.unit)
      );
      if dist >= 0 then
        insert into public.distance_segments (
          user_id, vehicle_id, start_reading_id, end_reading_id,
          distance, unit, started_on, ended_on, purpose
        ) values (
          rec.user_id, p_vehicle_id, prev_id, rec.id,
          dist, coalesce(v_unit, rec.unit), prev_on, rec.recorded_on, 'unspecified'
        );
      end if;
    end if;
    prev_id := rec.id;
    prev_reading := rec.reading;
    prev_unit := rec.unit;
    prev_on := rec.recorded_on;
  end loop;

  perform public.refresh_vehicle_current_odometer(p_vehicle_id);
end;
$$;

insert into public.integrity_rule_definitions (code, entity_type, severity, title_i18n, description_i18n, config)
values
  ('invalid_odometer_reading', 'odometer', 'blocking',
    '{"fr":"Relevé incohérent","en":"Inconsistent reading"}',
    '{"fr":"Un relevé est inférieur au précédent et n''entre pas dans le kilométrage calculé.","en":"A reading is lower than the previous one and is excluded from calculated mileage."}',
    '{}'::jsonb),
  ('missing_end_of_day', 'odometer', 'info',
    '{"fr":"Fin de journée manquante","en":"Missing end of day"}',
    '{"fr":"Un début de journée n''a pas encore de relevé de fin.","en":"A start-of-day reading does not yet have an end-of-day reading."}',
    '{}'::jsonb)
on conflict (code) do nothing;
