export type AdminStats = {
  users: number;
  vehicles: number;
  receipts: number;
  expenses: number;
  income: number;
};

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  country_code: string | null;
  created_at: string;
  onboarding_completed_at: string | null;
};

export type CatalogSection =
  | 'countries'
  | 'jurisdictions'
  | 'taxYears'
  | 'occupations'
  | 'expenseCategories'
  | 'incomeCategories'
  | 'integrityRules';
