import type {
  AssistantConfidence,
  AssistantRecommendationStatus,
  AssistantSignalSource,
  LocalizedString,
} from '@/types/domain';

export type AssistantCheckCode =
  | 'missing_odometer_reading'
  | 'inconsistent_odometer'
  | 'duplicate_receipt'
  | 'missing_receipt_total'
  | 'expense_without_document'
  | 'unusual_expense_amount'
  | 'missing_date'
  | 'duplicate_transaction'
  | 'mileage_gap'
  | 'classification_conflict';

export type ProposedPatch = {
  table: 'expenses';
  id: string;
  fields: {
    amount?: number;
  };
};

export type AssistantSignal = {
  check_code: AssistantCheckCode | string;
  fingerprint: string;
  entity_type: string;
  entity_id: string | null;
  related_entity_id: string | null;
  confidence: AssistantConfidence;
  source: AssistantSignalSource;
  title_i18n: LocalizedString;
  body_i18n: LocalizedString;
  evidence: Record<string, unknown>;
  proposed_patch: ProposedPatch | null;
  requires_review: true;
};

export type AssistantRecommendation = {
  id: string;
  user_id: string;
  run_id: string | null;
  check_id: string | null;
  check_code: string;
  fingerprint: string;
  entity_type: string;
  entity_id: string | null;
  related_entity_id: string | null;
  confidence: AssistantConfidence;
  source: AssistantSignalSource;
  status: AssistantRecommendationStatus;
  title_i18n: LocalizedString;
  body_i18n: LocalizedString;
  evidence: Record<string, unknown>;
  proposed_patch: ProposedPatch | null;
  requires_review: true;
  created_at: string;
  updated_at: string;
};

export type AssistantRun = {
  id: string;
  user_id: string;
  provider: string;
  status: 'running' | 'complete' | 'failed';
  signal_count: number;
  created_at: string;
};

export type AssistantReviewEvent = {
  id: string;
  recommendation_id: string;
  user_id: string;
  action: 'opened' | 'dismissed' | 'confirmed' | 'applied' | 'obsolete';
  note: string | null;
  patch_applied: Record<string, unknown> | null;
  created_at: string;
};

export type AssistantAnalyzeInput = {
  today: string;
  vehicles: Array<{ id: string; nickname: string }>;
  readings: Array<{
    id: string;
    vehicle_id: string;
    reading: number;
    unit: 'km' | 'mi';
    kind: string;
    recorded_on: string;
    is_valid: boolean;
    validation_status: string;
  }>;
  expenses: Array<{
    id: string;
    category_id: string | null;
    vendor_name: string | null;
    amount: number;
    incurred_on: string;
    receipt_id: string | null;
    reference_number: string | null;
    status: string;
    notes: string | null;
    extracted_payload: { total?: number; incurred_on?: string } | null;
  }>;
  receipts: Array<{
    id: string;
    review_status: string;
    captured_at: string;
  }>;
  income: Array<{
    id: string;
    source_name: string;
    amount: number;
    received_on: string;
    reference_number: string | null;
  }>;
  categories: Array<{
    id: string;
    code: string;
    requires_receipt: boolean;
  }>;
  checks: Array<{
    id: string;
    code: string;
    default_confidence: AssistantConfidence;
    title_i18n: LocalizedString;
    description_i18n: LocalizedString;
    config: Record<string, unknown> | null;
  }>;
};
