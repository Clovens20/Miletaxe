-- Config de départ. Pas de calcul d'impôt ici.
-- Les méthodes de km servent de référence dans le dossier comptable.

insert into public.countries (code, name_i18n, default_currency, default_distance_unit)
values
  ('CA', '{"fr":"Canada","en":"Canada"}'::jsonb, 'CAD', 'km'),
  ('US', '{"fr":"États-Unis","en":"United States"}'::jsonb, 'USD', 'mi');

insert into public.jurisdictions (country_code, code, kind, name_i18n)
values
  ('CA', 'AB', 'province', '{"fr":"Alberta","en":"Alberta"}'),
  ('CA', 'BC', 'province', '{"fr":"Colombie-Britannique","en":"British Columbia"}'),
  ('CA', 'MB', 'province', '{"fr":"Manitoba","en":"Manitoba"}'),
  ('CA', 'NB', 'province', '{"fr":"Nouveau-Brunswick","en":"New Brunswick"}'),
  ('CA', 'NL', 'province', '{"fr":"Terre-Neuve-et-Labrador","en":"Newfoundland and Labrador"}'),
  ('CA', 'NS', 'province', '{"fr":"Nouvelle-Écosse","en":"Nova Scotia"}'),
  ('CA', 'NT', 'territory', '{"fr":"Territoires du Nord-Ouest","en":"Northwest Territories"}'),
  ('CA', 'NU', 'territory', '{"fr":"Nunavut","en":"Nunavut"}'),
  ('CA', 'ON', 'province', '{"fr":"Ontario","en":"Ontario"}'),
  ('CA', 'PE', 'province', '{"fr":"Île-du-Prince-Édouard","en":"Prince Edward Island"}'),
  ('CA', 'QC', 'province', '{"fr":"Québec","en":"Quebec"}'),
  ('CA', 'SK', 'province', '{"fr":"Saskatchewan","en":"Saskatchewan"}'),
  ('CA', 'YT', 'territory', '{"fr":"Yukon","en":"Yukon"}');

insert into public.jurisdictions (country_code, code, kind, name_i18n)
values
  ('US', 'AL', 'state', '{"fr":"Alabama","en":"Alabama"}'),
  ('US', 'AK', 'state', '{"fr":"Alaska","en":"Alaska"}'),
  ('US', 'AZ', 'state', '{"fr":"Arizona","en":"Arizona"}'),
  ('US', 'AR', 'state', '{"fr":"Arkansas","en":"Arkansas"}'),
  ('US', 'CA', 'state', '{"fr":"Californie","en":"California"}'),
  ('US', 'CO', 'state', '{"fr":"Colorado","en":"Colorado"}'),
  ('US', 'CT', 'state', '{"fr":"Connecticut","en":"Connecticut"}'),
  ('US', 'DE', 'state', '{"fr":"Delaware","en":"Delaware"}'),
  ('US', 'DC', 'district', '{"fr":"District de Columbia","en":"District of Columbia"}'),
  ('US', 'FL', 'state', '{"fr":"Floride","en":"Florida"}'),
  ('US', 'GA', 'state', '{"fr":"Géorgie","en":"Georgia"}'),
  ('US', 'HI', 'state', '{"fr":"Hawaï","en":"Hawaii"}'),
  ('US', 'ID', 'state', '{"fr":"Idaho","en":"Idaho"}'),
  ('US', 'IL', 'state', '{"fr":"Illinois","en":"Illinois"}'),
  ('US', 'IN', 'state', '{"fr":"Indiana","en":"Indiana"}'),
  ('US', 'IA', 'state', '{"fr":"Iowa","en":"Iowa"}'),
  ('US', 'KS', 'state', '{"fr":"Kansas","en":"Kansas"}'),
  ('US', 'KY', 'state', '{"fr":"Kentucky","en":"Kentucky"}'),
  ('US', 'LA', 'state', '{"fr":"Louisiane","en":"Louisiana"}'),
  ('US', 'ME', 'state', '{"fr":"Maine","en":"Maine"}'),
  ('US', 'MD', 'state', '{"fr":"Maryland","en":"Maryland"}'),
  ('US', 'MA', 'state', '{"fr":"Massachusetts","en":"Massachusetts"}'),
  ('US', 'MI', 'state', '{"fr":"Michigan","en":"Michigan"}'),
  ('US', 'MN', 'state', '{"fr":"Minnesota","en":"Minnesota"}'),
  ('US', 'MS', 'state', '{"fr":"Mississippi","en":"Mississippi"}'),
  ('US', 'MO', 'state', '{"fr":"Missouri","en":"Missouri"}'),
  ('US', 'MT', 'state', '{"fr":"Montana","en":"Montana"}'),
  ('US', 'NE', 'state', '{"fr":"Nebraska","en":"Nebraska"}'),
  ('US', 'NV', 'state', '{"fr":"Nevada","en":"Nevada"}'),
  ('US', 'NH', 'state', '{"fr":"New Hampshire","en":"New Hampshire"}'),
  ('US', 'NJ', 'state', '{"fr":"New Jersey","en":"New Jersey"}'),
  ('US', 'NM', 'state', '{"fr":"Nouveau-Mexique","en":"New Mexico"}'),
  ('US', 'NY', 'state', '{"fr":"New York","en":"New York"}'),
  ('US', 'NC', 'state', '{"fr":"Caroline du Nord","en":"North Carolina"}'),
  ('US', 'ND', 'state', '{"fr":"Dakota du Nord","en":"North Dakota"}'),
  ('US', 'OH', 'state', '{"fr":"Ohio","en":"Ohio"}'),
  ('US', 'OK', 'state', '{"fr":"Oklahoma","en":"Oklahoma"}'),
  ('US', 'OR', 'state', '{"fr":"Oregon","en":"Oregon"}'),
  ('US', 'PA', 'state', '{"fr":"Pennsylvanie","en":"Pennsylvania"}'),
  ('US', 'RI', 'state', '{"fr":"Rhode Island","en":"Rhode Island"}'),
  ('US', 'SC', 'state', '{"fr":"Caroline du Sud","en":"South Carolina"}'),
  ('US', 'SD', 'state', '{"fr":"Dakota du Sud","en":"South Dakota"}'),
  ('US', 'TN', 'state', '{"fr":"Tennessee","en":"Tennessee"}'),
  ('US', 'TX', 'state', '{"fr":"Texas","en":"Texas"}'),
  ('US', 'UT', 'state', '{"fr":"Utah","en":"Utah"}'),
  ('US', 'VT', 'state', '{"fr":"Vermont","en":"Vermont"}'),
  ('US', 'VA', 'state', '{"fr":"Virginie","en":"Virginia"}'),
  ('US', 'WA', 'state', '{"fr":"Washington","en":"Washington"}'),
  ('US', 'WV', 'state', '{"fr":"Virginie-Occidentale","en":"West Virginia"}'),
  ('US', 'WI', 'state', '{"fr":"Wisconsin","en":"Wisconsin"}'),
  ('US', 'WY', 'state', '{"fr":"Wyoming","en":"Wyoming"}');

insert into public.tax_years (country_code, year, starts_on, ends_on, is_current)
values
  ('CA', 2025, '2025-01-01', '2025-12-31', false),
  ('CA', 2026, '2026-01-01', '2026-12-31', true),
  ('US', 2025, '2025-01-01', '2025-12-31', false),
  ('US', 2026, '2026-01-01', '2026-12-31', true);

insert into public.occupation_catalog (country_code, code, name_i18n, sort_order)
values
  (null, 'rideshare', '{"fr":"Chauffeur covoiturage (Uber, Lyft…)","en":"Rideshare driver (Uber, Lyft…)"}', 10),
  (null, 'delivery', '{"fr":"Livreur","en":"Delivery worker"}', 20),
  (null, 'taxi', '{"fr":"Taxi","en":"Taxi driver"}', 30),
  (null, 'driver', '{"fr":"Chauffeur","en":"Driver"}', 40),
  (null, 'contractor', '{"fr":"Travailleur autonome / contractuel","en":"Contractor"}', 50),
  (null, 'freelancer', '{"fr":"Pigiste","en":"Freelancer"}', 60),
  (null, 'other', '{"fr":"Autre","en":"Other"}', 90);

insert into public.expense_category_catalog (
  country_code, code, name_i18n, accountant_label_i18n, sort_order, requires_receipt, requires_vehicle
)
values
  ('CA', 'fuel', '{"fr":"Carburant","en":"Fuel"}', '{"fr":"Carburant / énergie du véhicule","en":"Vehicle fuel / energy"}', 10, true, true),
  ('CA', 'maintenance', '{"fr":"Entretien et réparations","en":"Maintenance and repairs"}', '{"fr":"Entretien du véhicule","en":"Vehicle maintenance"}', 20, true, true),
  ('CA', 'insurance', '{"fr":"Assurance","en":"Insurance"}', '{"fr":"Assurance véhicule ou responsabilité","en":"Vehicle or liability insurance"}', 30, true, false),
  ('CA', 'parking', '{"fr":"Stationnement","en":"Parking"}', '{"fr":"Stationnement","en":"Parking"}', 40, true, true),
  ('CA', 'tolls', '{"fr":"Péages","en":"Tolls"}', '{"fr":"Péages","en":"Tolls"}', 50, true, true),
  ('CA', 'car_wash', '{"fr":"Lavage","en":"Car wash"}', '{"fr":"Lavage du véhicule","en":"Car wash"}', 60, true, true),
  ('CA', 'phone', '{"fr":"Téléphone et données","en":"Phone and data"}', '{"fr":"Frais de communication","en":"Communication expenses"}', 70, true, false),
  ('CA', 'supplies', '{"fr":"Fournitures","en":"Supplies"}', '{"fr":"Fournitures d''entreprise","en":"Business supplies"}', 80, true, false),
  ('CA', 'professional_fees', '{"fr":"Honoraires professionnels","en":"Professional fees"}', '{"fr":"Honoraires (comptable, juridique)","en":"Professional fees"}', 90, true, false),
  ('CA', 'other_vehicle', '{"fr":"Autre frais de véhicule","en":"Other vehicle expense"}', '{"fr":"Autres frais de véhicule","en":"Other vehicle expenses"}', 100, true, true),
  ('CA', 'other_business', '{"fr":"Autre dépense d''entreprise","en":"Other business expense"}', '{"fr":"Autres dépenses d''entreprise","en":"Other business expenses"}', 110, true, false),
  ('US', 'fuel', '{"fr":"Carburant","en":"Fuel"}', '{"fr":"Vehicle fuel / energy","en":"Vehicle fuel / energy"}', 10, true, true),
  ('US', 'maintenance', '{"fr":"Entretien et réparations","en":"Maintenance and repairs"}', '{"fr":"Vehicle maintenance","en":"Vehicle maintenance"}', 20, true, true),
  ('US', 'insurance', '{"fr":"Assurance","en":"Insurance"}', '{"fr":"Insurance","en":"Insurance"}', 30, true, false),
  ('US', 'parking', '{"fr":"Stationnement","en":"Parking"}', '{"fr":"Parking","en":"Parking"}', 40, true, true),
  ('US', 'tolls', '{"fr":"Péages","en":"Tolls"}', '{"fr":"Tolls","en":"Tolls"}', 50, true, true),
  ('US', 'car_wash', '{"fr":"Lavage","en":"Car wash"}', '{"fr":"Car wash","en":"Car wash"}', 60, true, true),
  ('US', 'phone', '{"fr":"Téléphone et données","en":"Phone and data"}', '{"fr":"Phone and data","en":"Phone and data"}', 70, true, false),
  ('US', 'supplies', '{"fr":"Fournitures","en":"Supplies"}', '{"fr":"Supplies","en":"Supplies"}', 80, true, false),
  ('US', 'professional_fees', '{"fr":"Honoraires professionnels","en":"Professional fees"}', '{"fr":"Professional fees","en":"Professional fees"}', 90, true, false),
  ('US', 'other_vehicle', '{"fr":"Autre frais de véhicule","en":"Other vehicle expense"}', '{"fr":"Other vehicle expenses","en":"Other vehicle expenses"}', 100, true, true),
  ('US', 'other_business', '{"fr":"Autre dépense d''entreprise","en":"Other business expense"}', '{"fr":"Other business expenses","en":"Other business expenses"}', 110, true, false);

insert into public.income_category_catalog (country_code, code, name_i18n, sort_order)
values
  ('CA', 'rideshare', '{"fr":"Covoiturage / transport de personnes","en":"Rideshare"}', 10),
  ('CA', 'delivery', '{"fr":"Livraison","en":"Delivery"}', 20),
  ('CA', 'invoiced', '{"fr":"Facturation client","en":"Client invoices"}', 30),
  ('CA', 'tips', '{"fr":"Pourboires","en":"Tips"}', 40),
  ('CA', 'other', '{"fr":"Autre revenu","en":"Other income"}', 90),
  ('US', 'rideshare', '{"fr":"Rideshare","en":"Rideshare"}', 10),
  ('US', 'delivery', '{"fr":"Delivery","en":"Delivery"}', 20),
  ('US', 'invoiced', '{"fr":"Client invoices","en":"Client invoices"}', 30),
  ('US', 'tips', '{"fr":"Tips","en":"Tips"}', 40),
  ('US', 'other', '{"fr":"Other income","en":"Other income"}', 90);

insert into public.mileage_rate_methods (
  country_code, tax_year_id, method_code, title_i18n, description_i18n, source_name, source_url
)
select
  'CA',
  ty.id,
  'cra_per_km',
  '{"fr":"Taux de l''ARC au kilomètre (référence)","en":"CRA per-kilometre rate (reference)"}'::jsonb,
  '{"fr":"Méthode simplifiée publiée par l''Agence du revenu du Canada. À valider avec votre comptable. MileTax n''applique pas ce taux à vos kilomètres.","en":"Simplified method published by the Canada Revenue Agency. Confirm with your accountant. MileTax does not apply this rate to your kilometres."}'::jsonb,
  'Agence du revenu du Canada',
  'https://www.canada.ca/fr/agence-revenu.html'
from public.tax_years ty where ty.country_code = 'CA';

insert into public.mileage_rate_methods (
  country_code, tax_year_id, method_code, title_i18n, description_i18n, source_name, source_url
)
select
  'US',
  ty.id,
  'irs_standard_mileage',
  '{"fr":"Taux standard IRS (référence)","en":"IRS standard mileage rate (reference)"}'::jsonb,
  '{"fr":"Taux publié par l''IRS. À valider avec votre comptable. MileTax n''applique pas ce taux à vos miles.","en":"Rate published by the IRS. Confirm with your accountant. MileTax does not apply this rate to your miles."}'::jsonb,
  'Internal Revenue Service',
  'https://www.irs.gov'
from public.tax_years ty where ty.country_code = 'US';

insert into public.mileage_rate_tiers (method_id, vehicle_class, min_distance, distance_unit, notes_i18n)
select id, 'automobile', 0, 'km', '{"fr":"Taux officiel non chargé. Consultez la publication de l''année avec votre comptable.","en":"Official rate not loaded. Review the year''s publication with your accountant."}'::jsonb
from public.mileage_rate_methods where method_code = 'cra_per_km';

insert into public.mileage_rate_tiers (method_id, vehicle_class, min_distance, distance_unit, notes_i18n)
select id, 'automobile', 0, 'mi', '{"fr":"Taux officiel non chargé. Consultez la publication de l''année avec votre comptable.","en":"Official rate not loaded. Review the year''s publication with your accountant."}'::jsonb
from public.mileage_rate_methods where method_code = 'irs_standard_mileage';

insert into public.record_requirements (country_code, entity_type, field_name, is_required, message_i18n)
values
  (null, 'vehicle', 'nickname', true, '{"fr":"Chaque véhicule doit avoir un nom.","en":"Each vehicle needs a name."}'),
  (null, 'odometer', 'opening', true, '{"fr":"Un relevé de début de période est recommandé.","en":"A period-start reading is recommended."}'),
  (null, 'expense', 'receipt', true, '{"fr":"Un reçu est demandé pour cette catégorie.","en":"A receipt is required for this category."}'),
  (null, 'expense', 'category_id', true, '{"fr":"Classez la dépense dans une catégorie.","en":"Categorize the expense."}'),
  (null, 'income', 'source_name', true, '{"fr":"Indiquez la source du revenu.","en":"Enter the income source."}');

insert into public.integrity_rule_definitions (code, entity_type, severity, title_i18n, description_i18n, config)
values
  ('missing_vehicle', 'vehicle', 'blocking',
    '{"fr":"Aucun véhicule","en":"No vehicle"}',
    '{"fr":"Ajoutez au moins un véhicule pour enregistrer le kilométrage.","en":"Add at least one vehicle to record mileage."}',
    '{}'::jsonb),
  ('missing_opening_odometer', 'odometer', 'warning',
    '{"fr":"Relevé de début manquant","en":"Missing opening reading"}',
    '{"fr":"Aucun relevé de début de période pour ce véhicule cette année.","en":"No period-start reading for this vehicle this year."}',
    '{"kind":"opening"}'::jsonb),
  ('odometer_gap', 'odometer', 'info',
    '{"fr":"Trou dans les relevés","en":"Gap in readings"}',
    '{"fr":"Plus de 31 jours séparent deux relevés.","en":"More than 31 days separate two readings."}',
    '{"max_gap_days":31}'::jsonb),
  ('odometer_not_monotonic', 'odometer', 'blocking',
    '{"fr":"Odomètre en baisse","en":"Odometer went down"}',
    '{"fr":"Un relevé est inférieur au précédent. Vérifiez les chiffres.","en":"A reading is lower than the previous one. Please check the numbers."}',
    '{}'::jsonb),
  ('expense_missing_receipt', 'expense', 'warning',
    '{"fr":"Reçu manquant","en":"Missing receipt"}',
    '{"fr":"Cette dépense appartient à une catégorie qui demande un reçu.","en":"This expense is in a category that requires a receipt."}',
    '{}'::jsonb),
  ('expense_missing_category', 'expense', 'warning',
    '{"fr":"Catégorie manquante","en":"Missing category"}',
    '{"fr":"Classez la dépense pour que votre comptable s''y retrouve.","en":"Categorize the expense so your accountant can follow it."}',
    '{}'::jsonb),
  ('expense_needs_review', 'expense', 'info',
    '{"fr":"Dépense à vérifier","en":"Expense needs review"}',
    '{"fr":"Des informations extraites du reçu doivent être confirmées.","en":"Details extracted from the receipt still need confirmation."}',
    '{}'::jsonb),
  ('income_missing_source', 'income', 'warning',
    '{"fr":"Source de revenu manquante","en":"Missing income source"}',
    '{"fr":"Indiquez la plateforme ou le client.","en":"Enter the platform or client."}',
    '{}'::jsonb);

insert into public.report_section_templates (country_code, code, title_i18n, sort_order, include_entities, notes_i18n)
values
  ('CA', 'identity', '{"fr":"Profil et territoire","en":"Profile and jurisdiction"}', 10, '{profile}', '{"fr":"Pays, province et activité déclarés par l''utilisateur.","en":"Country, province and occupation declared by the user."}'),
  ('CA', 'vehicles', '{"fr":"Véhicules","en":"Vehicles"}', 20, '{vehicles}', null),
  ('CA', 'mileage', '{"fr":"Kilométrage","en":"Mileage"}', 30, '{odometer,distance_segments}', '{"fr":"Distances calculées entre relevés d''odomètre. Aucun taux n''est appliqué.","en":"Distances calculated between odometer readings. No rate is applied."}'),
  ('CA', 'expenses', '{"fr":"Dépenses et reçus","en":"Expenses and receipts"}', 40, '{expenses,receipts}', null),
  ('CA', 'income', '{"fr":"Revenus d''entreprise","en":"Business income"}', 50, '{income}', null),
  ('CA', 'completeness', '{"fr":"Points à vérifier","en":"Items to review"}', 60, '{integrity}', '{"fr":"Liste d''écarts de dossier, pas un avis fiscal.","en":"Record gaps only, not tax advice."}'),
  ('US', 'identity', '{"fr":"Profil et territoire","en":"Profile and jurisdiction"}', 10, '{profile}', null),
  ('US', 'vehicles', '{"fr":"Véhicules","en":"Vehicles"}', 20, '{vehicles}', null),
  ('US', 'mileage', '{"fr":"Mileage","en":"Mileage"}', 30, '{odometer,distance_segments}', '{"fr":"Distances calculated between odometer readings. No rate is applied.","en":"Distances calculated between odometer readings. No rate is applied."}'),
  ('US', 'expenses', '{"fr":"Expenses and receipts","en":"Expenses and receipts"}', 40, '{expenses,receipts}', null),
  ('US', 'income', '{"fr":"Business income","en":"Business income"}', 50, '{income}', null),
  ('US', 'completeness', '{"fr":"Items to review","en":"Items to review"}', 60, '{integrity}', null);
