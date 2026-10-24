-- Dépenses récurrentes : assurance mensuelle en plus du forfait internet.

alter table public.recurring_plans
  drop constraint if exists recurring_plans_kind_check;

alter table public.recurring_plans
  add constraint recurring_plans_kind_check
  check (kind in ('internet', 'insurance'));
