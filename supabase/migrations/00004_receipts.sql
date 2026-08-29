-- Photos de reçus inchangées. La lecture auto va dans ocr_payload ;
-- les montants confirmés sont sur expenses, les diffs dans expense_revisions.

alter table public.receipts
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists review_status text,
  add column if not exists reviewed_at timestamptz;

update public.receipts
set review_status = coalesce(review_status, case
  when ocr_status in ('complete', 'skipped', 'failed') then 'pending'
  else 'pending'
end);

alter table public.receipts
  alter column review_status set default 'pending',
  alter column review_status set not null;

alter table public.receipts drop constraint if exists receipts_review_status_check;
alter table public.receipts
  add constraint receipts_review_status_check
  check (review_status in ('pending', 'reviewed', 'discarded'));

create or replace function public.protect_receipt_original()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.storage_path is distinct from old.storage_path then
      raise exception 'original receipt file cannot be replaced';
    end if;
    if new.user_id is distinct from old.user_id then
      raise exception 'receipt owner cannot be changed';
    end if;
  end if;
  if position(new.user_id::text || '/' in new.storage_path) <> 1 then
    raise exception 'receipt path must belong to the owner';
  end if;
  return new;
end;
$$;

drop trigger if exists receipts_protect_original on public.receipts;
create trigger receipts_protect_original
before insert or update on public.receipts
for each row execute function public.protect_receipt_original();

alter table public.expenses
  add column if not exists subtotal numeric,
  add column if not exists incurred_time text,
  add column if not exists fuel_quantity numeric,
  add column if not exists price_per_unit numeric,
  add column if not exists payment_method text,
  add column if not exists reference_number text,
  add column if not exists finalized_at timestamptz,
  add column if not exists extracted_payload jsonb;

alter table public.expenses drop constraint if exists expenses_subtotal_check;
alter table public.expenses
  add constraint expenses_subtotal_check check (subtotal is null or subtotal >= 0);
alter table public.expenses drop constraint if exists expenses_fuel_quantity_check;
alter table public.expenses
  add constraint expenses_fuel_quantity_check check (fuel_quantity is null or fuel_quantity >= 0);
alter table public.expenses drop constraint if exists expenses_price_per_unit_check;
alter table public.expenses
  add constraint expenses_price_per_unit_check check (price_per_unit is null or price_per_unit >= 0);

create table if not exists public.expense_revisions (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  reason text not null,
  source text not null check (source in ('user', 'ocr_confirm', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists expense_revisions_expense_idx
  on public.expense_revisions (expense_id, created_at desc);
create index if not exists expenses_user_category_idx on public.expenses (user_id, category_id);
create index if not exists receipts_user_review_idx on public.receipts (user_id, review_status);

alter table public.expense_revisions enable row level security;
drop policy if exists "expense revisions own select" on public.expense_revisions;
drop policy if exists "expense revisions own insert" on public.expense_revisions;
create policy "expense revisions own select"
  on public.expense_revisions for select using (user_id = auth.uid());
create policy "expense revisions own insert"
  on public.expense_revisions for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.expenses e
      where e.id = expense_id and e.user_id = auth.uid()
    )
  );

create unique index if not exists expense_category_country_code_uidx
  on public.expense_category_catalog (country_code, code)
  where jurisdiction_id is null and tax_year_id is null;

insert into public.expense_category_catalog (
  country_code, code, name_i18n, accountant_label_i18n, sort_order, requires_receipt, requires_vehicle
)
select v.country_code, v.code, v.name_i18n::jsonb, v.accountant_label_i18n::jsonb, v.sort_order, v.requires_receipt, v.requires_vehicle
from (
  values
    ('CA', 'repairs', '{"fr":"Réparations","en":"Repairs"}', '{"fr":"Réparations du véhicule","en":"Vehicle repairs"}', 30, true, true),
    ('CA', 'office', '{"fr":"Frais de bureau","en":"Office expenses"}', '{"fr":"Frais de bureau","en":"Office expenses"}', 80, true, false),
    ('CA', 'vehicle', '{"fr":"Frais de véhicule","en":"Vehicle expenses"}', '{"fr":"Autres frais de véhicule","en":"Other vehicle expenses"}', 70, true, true),
    ('CA', 'other', '{"fr":"Autre","en":"Other"}', '{"fr":"Autre dépense","en":"Other expense"}', 100, true, false),
    ('US', 'repairs', '{"fr":"Réparations","en":"Repairs"}', '{"fr":"Vehicle repairs","en":"Vehicle repairs"}', 30, true, true),
    ('US', 'office', '{"fr":"Office expenses","en":"Office expenses"}', '{"fr":"Office expenses","en":"Office expenses"}', 80, true, false),
    ('US', 'vehicle', '{"fr":"Vehicle expenses","en":"Vehicle expenses"}', '{"fr":"Vehicle expenses","en":"Vehicle expenses"}', 70, true, true),
    ('US', 'other', '{"fr":"Other","en":"Other"}', '{"fr":"Other expense","en":"Other expense"}', 100, true, false)
) as v(country_code, code, name_i18n, accountant_label_i18n, sort_order, requires_receipt, requires_vehicle)
where not exists (
  select 1 from public.expense_category_catalog existing
  where existing.country_code = v.country_code and existing.code = v.code
);

update public.expense_category_catalog
set
  name_i18n = '{"fr":"Entretien","en":"Maintenance"}'::jsonb,
  accountant_label_i18n = '{"fr":"Entretien du véhicule","en":"Vehicle maintenance"}'::jsonb
where code = 'maintenance';

update public.expense_category_catalog set sort_order = 10 where code = 'fuel';
update public.expense_category_catalog set sort_order = 20 where code = 'maintenance';
update public.expense_category_catalog set sort_order = 30 where code = 'repairs';
update public.expense_category_catalog set sort_order = 40 where code = 'parking';
update public.expense_category_catalog set sort_order = 50 where code = 'tolls';
update public.expense_category_catalog set sort_order = 60 where code = 'insurance';
update public.expense_category_catalog set sort_order = 70 where code = 'vehicle';
update public.expense_category_catalog set sort_order = 80 where code = 'office';
update public.expense_category_catalog set sort_order = 90 where code = 'phone';
update public.expense_category_catalog set sort_order = 100 where code = 'other';
