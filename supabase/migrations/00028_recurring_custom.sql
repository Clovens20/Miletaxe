-- Autres services mensuels (téléphone, logiciel, etc.), en plus d’internet et de l’assurance.

alter table public.recurring_plans
  drop constraint if exists recurring_plans_kind_check;

alter table public.recurring_plans
  add constraint recurring_plans_kind_check
  check (kind in ('internet', 'insurance', 'custom'));
