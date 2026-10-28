export type AdminStats = {
  users: number;
  users_onboarded: number;
  signups_7d: number;
  active_users_7d: number;
  users_sending_data_7d: number;
  vehicles: number;
  receipts: number;
  expenses: number;
  income: number;
  readings: number;
  support_open: number;
  support_claimed: number;
  support_escalated: number;
  readings_24h: number;
  expenses_24h: number;
  income_24h: number;
  receipts_24h: number;
  support_24h: number;
};

export type AdminMovementKind = 'signup' | 'reading' | 'expense' | 'income' | 'receipt' | 'support';

export type AdminMovementRow = {
  occurred_at: string;
  kind: AdminMovementKind | string;
  user_email: string | null;
  user_name: string | null;
};

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  country_code: string | null;
  created_at: string;
  onboarding_completed_at: string | null;
  last_sign_in_at?: string | null;
  last_activity_at?: string | null;
  data_events_7d?: number | null;
};

export type CatalogSection =
  | 'countries'
  | 'jurisdictions'
  | 'taxYears'
  | 'occupations'
  | 'expenseCategories'
  | 'incomeCategories'
  | 'integrityRules'
  | 'mileageMethods'
  | 'mileageTiers'
  | 'reportSections'
  | 'assistantChecks';
