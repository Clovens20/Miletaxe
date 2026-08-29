-- Administration : rôle staff dans le JWT (app_metadata.role = admin).
-- Pas de colonne is_admin sur profiles : un user pourrait se la donner via self-update.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- Catalogues : le staff voit les lignes inactives et peut les modifier (pas de delete).
create policy "countries staff select" on public.countries
  for select to authenticated using (public.is_staff());
create policy "countries staff insert" on public.countries
  for insert to authenticated with check (public.is_staff());
create policy "countries staff update" on public.countries
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "jurisdictions staff select" on public.jurisdictions
  for select to authenticated using (public.is_staff());
create policy "jurisdictions staff insert" on public.jurisdictions
  for insert to authenticated with check (public.is_staff());
create policy "jurisdictions staff update" on public.jurisdictions
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "tax years staff select" on public.tax_years
  for select to authenticated using (public.is_staff());
create policy "tax years staff insert" on public.tax_years
  for insert to authenticated with check (public.is_staff());
create policy "tax years staff update" on public.tax_years
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "occupations staff select" on public.occupation_catalog
  for select to authenticated using (public.is_staff());
create policy "occupations staff insert" on public.occupation_catalog
  for insert to authenticated with check (public.is_staff());
create policy "occupations staff update" on public.occupation_catalog
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "expense categories staff select" on public.expense_category_catalog
  for select to authenticated using (public.is_staff());
create policy "expense categories staff insert" on public.expense_category_catalog
  for insert to authenticated with check (public.is_staff());
create policy "expense categories staff update" on public.expense_category_catalog
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "income categories staff select" on public.income_category_catalog
  for select to authenticated using (public.is_staff());
create policy "income categories staff insert" on public.income_category_catalog
  for insert to authenticated with check (public.is_staff());
create policy "income categories staff update" on public.income_category_catalog
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "integrity rules staff select" on public.integrity_rule_definitions
  for select to authenticated using (public.is_staff());
create policy "integrity rules staff insert" on public.integrity_rule_definitions
  for insert to authenticated with check (public.is_staff());
create policy "integrity rules staff update" on public.integrity_rule_definitions
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "profiles staff select" on public.profiles
  for select to authenticated using (public.is_staff());

create or replace function public.admin_project_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'not_staff' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*)::int from public.profiles),
    'vehicles', (select count(*)::int from public.vehicles),
    'receipts', (select count(*)::int from public.receipts),
    'expenses', (select count(*)::int from public.expenses),
    'income', (select count(*)::int from public.income_entries)
  );
end;
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  country_code text,
  created_at timestamptz,
  onboarding_completed_at timestamptz
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
    p.id,
    u.email::text,
    p.full_name,
    p.country_code,
    p.created_at,
    p.onboarding_completed_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc
  limit 500;
end;
$$;

revoke all on function public.admin_project_stats() from public;
revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_project_stats() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
