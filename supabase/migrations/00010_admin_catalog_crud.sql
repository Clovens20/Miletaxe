-- CRUD staff sur tous les catalogues + publication temps réel.

create policy "countries staff delete" on public.countries
  for delete to authenticated using (public.is_staff());
create policy "jurisdictions staff delete" on public.jurisdictions
  for delete to authenticated using (public.is_staff());
create policy "tax years staff delete" on public.tax_years
  for delete to authenticated using (public.is_staff());
create policy "occupations staff delete" on public.occupation_catalog
  for delete to authenticated using (public.is_staff());
create policy "expense categories staff delete" on public.expense_category_catalog
  for delete to authenticated using (public.is_staff());
create policy "income categories staff delete" on public.income_category_catalog
  for delete to authenticated using (public.is_staff());
create policy "integrity rules staff delete" on public.integrity_rule_definitions
  for delete to authenticated using (public.is_staff());

create policy "mileage methods staff select" on public.mileage_rate_methods
  for select to authenticated using (public.is_staff());
create policy "mileage methods staff insert" on public.mileage_rate_methods
  for insert to authenticated with check (public.is_staff());
create policy "mileage methods staff update" on public.mileage_rate_methods
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "mileage methods staff delete" on public.mileage_rate_methods
  for delete to authenticated using (public.is_staff());

create policy "mileage tiers staff select" on public.mileage_rate_tiers
  for select to authenticated using (public.is_staff());
create policy "mileage tiers staff insert" on public.mileage_rate_tiers
  for insert to authenticated with check (public.is_staff());
create policy "mileage tiers staff update" on public.mileage_rate_tiers
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "mileage tiers staff delete" on public.mileage_rate_tiers
  for delete to authenticated using (public.is_staff());

create policy "requirements staff select" on public.record_requirements
  for select to authenticated using (public.is_staff());
create policy "requirements staff insert" on public.record_requirements
  for insert to authenticated with check (public.is_staff());
create policy "requirements staff update" on public.record_requirements
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "requirements staff delete" on public.record_requirements
  for delete to authenticated using (public.is_staff());

create policy "report templates staff select" on public.report_section_templates
  for select to authenticated using (public.is_staff());
create policy "report templates staff insert" on public.report_section_templates
  for insert to authenticated with check (public.is_staff());
create policy "report templates staff update" on public.report_section_templates
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "report templates staff delete" on public.report_section_templates
  for delete to authenticated using (public.is_staff());

create policy "assistant checks staff select" on public.assistant_check_definitions
  for select to authenticated using (public.is_staff());
create policy "assistant checks staff insert" on public.assistant_check_definitions
  for insert to authenticated with check (public.is_staff());
create policy "assistant checks staff update" on public.assistant_check_definitions
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "assistant checks staff delete" on public.assistant_check_definitions
  for delete to authenticated using (public.is_staff());

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'countries',
    'jurisdictions',
    'tax_years',
    'occupation_catalog',
    'expense_category_catalog',
    'income_category_catalog',
    'mileage_rate_methods',
    'mileage_rate_tiers',
    'record_requirements',
    'integrity_rule_definitions',
    'report_section_templates',
    'assistant_check_definitions'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;
