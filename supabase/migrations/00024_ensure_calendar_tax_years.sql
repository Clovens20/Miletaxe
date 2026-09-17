-- Crée toute seule l'année d'imposition civile (N-1, N, N+1) et marque l'année courante selon la date.

create or replace function public.ensure_calendar_tax_years(
  p_country text default null,
  p_today date default (timezone('America/Toronto', now()))::date
)
returns setof public.tax_years
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer := extract(year from p_today)::integer;
  country text;
  yr integer;
begin
  if p_country is not null and not exists (select 1 from public.countries where code = p_country) then
    return;
  end if;

  for country in
    select code from public.countries
    where p_country is null or code = p_country
  loop
    foreach yr in array array[y - 1, y, y + 1]
    loop
      insert into public.tax_years (country_code, year, starts_on, ends_on, is_current)
      values (country, yr, make_date(yr, 1, 1), make_date(yr, 12, 31), false)
      on conflict (country_code, year) do nothing;
    end loop;

    update public.tax_years
    set is_current = (starts_on <= p_today and p_today <= ends_on)
    where country_code = country;
  end loop;

  return query
    select *
    from public.tax_years
    where p_country is null or country_code = p_country
    order by year desc, country_code;
end;
$$;

revoke all on function public.ensure_calendar_tax_years(text, date) from public;
grant execute on function public.ensure_calendar_tax_years(text, date) to authenticated;
