-- Alertes d'accueil. On parle de dossier, pas de déduction garantie.

insert into public.integrity_rule_definitions (code, entity_type, severity, title_i18n, description_i18n, config)
select v.code, v.entity_type, v.severity, v.title_i18n::jsonb, v.description_i18n::jsonb, v.config::jsonb
from (
  values
    (
      'missing_start_of_day',
      'odometer',
      'warning',
      '{"fr":"Odomètre de début manquant","en":"Missing beginning odometer"}',
      '{"fr":"Aucun relevé de début de journée n’est enregistré pour ce véhicule.","en":"No start-of-day odometer reading is recorded for this vehicle."}',
      '{}'
    ),
    (
      'expense_incomplete',
      'expense',
      'warning',
      '{"fr":"Reçu incomplet","en":"Incomplete receipt information"}',
      '{"fr":"Il manque des informations sur cette dépense potentiellement liée à l’activité. À revoir avec votre comptable.","en":"This potentially business-related expense is missing details. Review with your accountant."}',
      '{}'
    ),
    (
      'receipt_pending_review',
      'expense',
      'info',
      '{"fr":"Reçu à confirmer","en":"Receipt to confirm"}',
      '{"fr":"Un reçu a été numérisé mais n’a pas encore été relu. Les valeurs extraites restent des suggestions.","en":"A receipt was scanned but has not been reviewed yet. Extracted values are still suggestions."}',
      '{}'
    ),
    (
      'missing_activity',
      'record',
      'info',
      '{"fr":"Activité manquante","en":"Missing activity records"}',
      '{"fr":"Aucun relevé, reçu ou revenu n’a été ajouté récemment. Compléter le dossier aide votre comptable.","en":"No mileage, receipt or income was added recently. Completing the record helps your accountant."}',
      '{"lookback_days":7}'
    )
) as v(code, entity_type, severity, title_i18n, description_i18n, config)
where not exists (
  select 1 from public.integrity_rule_definitions existing where existing.code = v.code
);

update public.integrity_rule_definitions
set
  title_i18n = '{"fr":"Dépense sans reçu","en":"Expense without a receipt"}'::jsonb,
  description_i18n = '{"fr":"Dépense potentiellement liée à l’activité, sans reçu conservé. À revoir avec votre comptable.","en":"Potentially business-related expense, with no receipt on file. Review with your accountant."}'::jsonb
where code = 'expense_missing_receipt';

update public.integrity_rule_definitions
set
  description_i18n = '{"fr":"Des champs du reçu restent à confirmer. Rien n’est déductible tant que votre comptable n’a pas tranché.","en":"Receipt fields still need confirmation. Nothing is a deduction until your accountant reviews it."}'::jsonb
where code = 'expense_needs_review';

update public.integrity_rule_definitions
set
  description_i18n = '{"fr":"Un relevé d’odomètre est inférieur au précédent et n’entre pas dans le kilométrage calculé.","en":"An odometer reading is lower than the previous one and is excluded from calculated mileage."}'::jsonb
where code = 'invalid_odometer_reading';
