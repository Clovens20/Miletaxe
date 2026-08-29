-- Cadence du dossier comptable (annuel / semestriel). On peut toujours en générer un à la demande.
alter table public.profiles
  add column if not exists reporting_cadence text;

alter table public.profiles
  drop constraint if exists profiles_reporting_cadence_check;

alter table public.profiles
  add constraint profiles_reporting_cadence_check
  check (reporting_cadence is null or reporting_cadence in ('annual', 'semiannual'));
