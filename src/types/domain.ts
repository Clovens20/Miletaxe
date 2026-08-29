export type DistanceUnit = 'km' | 'mi';
export type CurrencyCode = 'CAD' | 'USD';
export type SupportedLocale = 'fr' | 'en';
export type CountryCode = 'CA' | 'US';

export type LocalizedString = {
  fr: string;
  en?: string;
} & Record<string, string | undefined>;

export type OccupancyCode =
  | 'driver'
  | 'delivery'
  | 'taxi'
  | 'rideshare'
  | 'contractor'
  | 'freelancer'
  | 'other';

export type OdometerReadingKind = 'start_of_day' | 'end_of_day' | 'manual';
export type ReadingValidationStatus = 'valid' | 'invalid' | 'needs_confirmation';
export type OdometerSource = 'typed' | 'ocr';
export type RevisionSource = 'user' | 'ocr_confirm' | 'system' | 'assistant_confirm';
export type ExpenseStatus = 'draft' | 'needs_review' | 'complete';
export type IncomeSourceKind = 'platform' | 'invoice' | 'cash' | 'other';
export type ReportStatus = 'draft' | 'generated' | 'shared';
export type ReportingCadence = 'annual' | 'semiannual';
export type ReportPeriodKind = 'annual' | 'semiannual' | 'monthly';
export type IntegritySeverity = 'info' | 'warning' | 'blocking';
export type AssistantConfidence = 'high' | 'medium' | 'needs_review';
export type AssistantRecommendationStatus = 'open' | 'dismissed' | 'confirmed' | 'applied' | 'obsolete';
export type AssistantSignalSource = 'deterministic' | 'ai';
export type OcrStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'skipped';
export type OwnershipType = 'owned' | 'leased' | 'rented' | 'other';
export type FuelType =
  | 'gasoline'
  | 'diesel'
  | 'hybrid'
  | 'electric'
  | 'plugin_hybrid'
  | 'other';

export type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;
