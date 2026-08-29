import type { LocalizedString } from '@/types/domain';

export type CountryRecord = {
  code: string;
  name_i18n: LocalizedString;
  default_currency: 'CAD' | 'USD';
  default_distance_unit: 'km' | 'mi';
};

export type JurisdictionRecord = {
  id: string;
  country_code: string;
  code: string;
  kind: string;
  name_i18n: LocalizedString;
};

export type TaxYearRecord = {
  id: string;
  country_code: string;
  year: number;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
};

export type OccupationRecord = {
  id: string;
  country_code: string | null;
  code: string;
  name_i18n: LocalizedString;
  sort_order: number;
};

export type ExpenseCategoryRecord = {
  id: string;
  country_code: string;
  code: string;
  name_i18n: LocalizedString;
  accountant_label_i18n: LocalizedString | null;
  sort_order: number;
  requires_receipt: boolean;
  requires_vehicle: boolean;
};

export type IncomeCategoryRecord = {
  id: string;
  country_code: string;
  code: string;
  name_i18n: LocalizedString;
  sort_order: number;
};

export type MileageMethodRecord = {
  id: string;
  country_code: string;
  tax_year_id: string | null;
  method_code: string;
  title_i18n: LocalizedString;
  description_i18n: LocalizedString | null;
  source_name: string | null;
  source_url: string | null;
};

export type ReportSectionRecord = {
  id: string;
  country_code: string;
  code: string;
  title_i18n: LocalizedString;
  sort_order: number;
  include_entities: string[];
  notes_i18n: LocalizedString | null;
};

export type IntegrityRuleRecord = {
  id: string;
  code: string;
  entity_type: string;
  severity: 'info' | 'warning' | 'blocking';
  title_i18n: LocalizedString;
  description_i18n: LocalizedString;
  config: Record<string, unknown> | null;
};

export type AssistantCheckRecord = {
  id: string;
  code: string;
  entity_type: string;
  default_confidence: 'high' | 'medium' | 'needs_review';
  title_i18n: LocalizedString;
  description_i18n: LocalizedString;
  config: Record<string, unknown> | null;
};
