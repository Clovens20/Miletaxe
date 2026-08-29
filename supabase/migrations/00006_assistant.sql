-- Rappels de dossier. Ça ne crée pas de dépenses, reçus, revenus ni relevés.
-- Les décisions confirmées sont journalisées.

create table public.assistant_check_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  entity_type text not null,
  default_confidence text not null check (default_confidence in ('high', 'medium', 'needs_review')),
  title_i18n jsonb not null,
  description_i18n jsonb not null,
  is_active boolean not null default true,
  config jsonb
);

create table public.assistant_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'deterministic',
  status text not null default 'complete' check (status in ('running', 'complete', 'failed')),
  signal_count integer not null default 0,
  notes_i18n jsonb,
  created_at timestamptz not null default now()
);

create table public.assistant_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  run_id uuid references public.assistant_runs (id) on delete set null,
  check_id uuid references public.assistant_check_definitions (id),
  check_code text not null,
  fingerprint text not null,
  entity_type text not null,
  entity_id uuid,
  related_entity_id uuid,
  confidence text not null check (confidence in ('high', 'medium', 'needs_review')),
  source text not null check (source in ('deterministic', 'ai')),
  status text not null default 'open' check (status in ('open', 'dismissed', 'confirmed', 'applied', 'obsolete')),
  title_i18n jsonb not null,
  body_i18n jsonb not null,
  evidence jsonb not null default '{}'::jsonb,
  proposed_patch jsonb,
  requires_review boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create table public.assistant_review_events (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.assistant_recommendations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (action in ('opened', 'dismissed', 'confirmed', 'applied', 'obsolete')),
  note text,
  patch_applied jsonb,
  created_at timestamptz not null default now()
);

create index assistant_runs_user_idx on public.assistant_runs (user_id, created_at desc);
create index assistant_recommendations_user_open_idx
  on public.assistant_recommendations (user_id, status, confidence);
create index assistant_review_events_rec_idx
  on public.assistant_review_events (recommendation_id, created_at desc);

alter table public.assistant_check_definitions enable row level security;
alter table public.assistant_runs enable row level security;
alter table public.assistant_recommendations enable row level security;
alter table public.assistant_review_events enable row level security;

create policy "assistant checks readable"
  on public.assistant_check_definitions for select to authenticated using (is_active = true);

create policy "assistant runs own select"
  on public.assistant_runs for select using (user_id = auth.uid());
create policy "assistant runs own insert"
  on public.assistant_runs for insert with check (user_id = auth.uid());

create policy "assistant recommendations own select"
  on public.assistant_recommendations for select using (user_id = auth.uid());
create policy "assistant recommendations own insert"
  on public.assistant_recommendations for insert with check (
    user_id = auth.uid() and requires_review = true
  );
create policy "assistant recommendations own update"
  on public.assistant_recommendations for update using (user_id = auth.uid());

create policy "assistant review events own select"
  on public.assistant_review_events for select using (user_id = auth.uid());
create policy "assistant review events own insert"
  on public.assistant_review_events for insert with check (user_id = auth.uid());

create trigger assistant_recommendations_updated_at
before update on public.assistant_recommendations
for each row execute function public.set_updated_at();

-- Une reco ne passe pas à « applied » sans un événement de revue.
create or replace function public.protect_assistant_recommendation()
returns trigger
language plpgsql
as $$
begin
  if new.requires_review is distinct from true then
    raise exception 'assistant recommendations must remain reviewable';
  end if;
  if tg_op = 'UPDATE' and new.status = 'applied' and old.status is distinct from 'applied' then
    if not exists (
      select 1 from public.assistant_review_events e
      where e.recommendation_id = new.id
        and e.user_id = new.user_id
        and e.action = 'applied'
    ) then
      raise exception 'applied recommendations require a logged review event';
    end if;
  end if;
  return new;
end;
$$;

create trigger assistant_recommendations_protect
before insert or update on public.assistant_recommendations
for each row execute function public.protect_assistant_recommendation();

alter table public.expense_revisions drop constraint if exists expense_revisions_source_check;
alter table public.expense_revisions
  add constraint expense_revisions_source_check
  check (source in ('user', 'ocr_confirm', 'system', 'assistant_confirm'));

alter table public.odometer_reading_revisions drop constraint if exists odometer_reading_revisions_source_check;
alter table public.odometer_reading_revisions
  add constraint odometer_reading_revisions_source_check
  check (source in ('user', 'ocr_confirm', 'system', 'assistant_confirm'));

insert into public.assistant_check_definitions (
  code, entity_type, default_confidence, title_i18n, description_i18n, config
)
values
  (
    'missing_odometer_reading',
    'odometer',
    'high',
    '{"fr":"Relevé d''odomètre manquant","en":"Missing odometer reading"}',
    '{"fr":"Un relevé de début, de fin ou d''ouverture semble absent.","en":"A start, end or opening odometer reading appears to be missing."}',
    '{"lookback_days":7}'::jsonb
  ),
  (
    'inconsistent_odometer',
    'odometer',
    'high',
    '{"fr":"Relevé d''odomètre incohérent","en":"Inconsistent odometer reading"}',
    '{"fr":"Un chiffre enregistré est inférieur au précédent.","en":"A recorded reading is lower than the previous one."}',
    '{}'::jsonb
  ),
  (
    'duplicate_receipt',
    'expense',
    'high',
    '{"fr":"Reçus possiblement en double","en":"Possible duplicate receipts"}',
    '{"fr":"Deux reçus se ressemblent (marchand, date et montant).","en":"Two receipts look similar (merchant, date and amount)."}',
    '{}'::jsonb
  ),
  (
    'missing_receipt_total',
    'expense',
    'high',
    '{"fr":"Total manquant sur un reçu","en":"Receipt with a missing total"}',
    '{"fr":"Le montant total n''est pas renseigné, ou n''a pas été lu sur le document.","en":"The total amount is missing, or was not read from the document."}',
    '{}'::jsonb
  ),
  (
    'expense_without_document',
    'expense',
    'high',
    '{"fr":"Dépense sans pièce justificative","en":"Expense without supporting documents"}',
    '{"fr":"Cette dépense potentiellement liée à l''activité n''a pas de reçu conservé. À revoir avec votre comptable.","en":"This potentially business-related expense has no receipt on file. Review with your accountant."}',
    '{}'::jsonb
  ),
  (
    'unusual_expense_amount',
    'expense',
    'medium',
    '{"fr":"Montant inhabituel","en":"Unusually large expense amount"}',
    '{"fr":"Ce montant sort de vos autres écritures dans la même catégorie. Ce n''est pas un jugement fiscal.","en":"This amount stands out from your other entries in the same category. This is not a tax judgement."}',
    '{"medium_multiplier":3,"high_multiplier":5,"min_sample":3}'::jsonb
  ),
  (
    'missing_date',
    'record',
    'high',
    '{"fr":"Date manquante","en":"Missing date"}',
    '{"fr":"Une écriture n''a pas de date utilisable.","en":"A record does not have a usable date."}',
    '{}'::jsonb
  ),
  (
    'duplicate_transaction',
    'record',
    'medium',
    '{"fr":"Transactions possiblement en double","en":"Possible duplicate transactions"}',
    '{"fr":"Deux écritures se ressemblent. Vérifiez qu''il ne s''agit pas du même mouvement.","en":"Two entries look similar. Check that they are not the same movement."}',
    '{}'::jsonb
  ),
  (
    'mileage_gap',
    'odometer',
    'medium',
    '{"fr":"Trou dans les relevés de kilométrage","en":"Gap in mileage records"}',
    '{"fr":"Plusieurs jours séparent deux relevés valides. Un trou n''est pas forcément une erreur.","en":"Several days separate two valid readings. A gap is not necessarily an error."}',
    '{"gap_days":31,"high_gap_days":90}'::jsonb
  ),
  (
    'classification_conflict',
    'expense',
    'needs_review',
    '{"fr":"Classement personnel / activité à revoir","en":"Potential personal/business classification conflict"}',
    '{"fr":"Le classement de cette écriture pourrait mélanger usage personnel et activité. À revoir avec votre comptable. Ce n''est pas une conclusion fiscale.","en":"This entry''s classification might mix personal and business use. Review with your accountant. This is not a tax conclusion."}',
    '{"mixed_use_codes":["other"]}'::jsonb
  )
on conflict (code) do nothing;
