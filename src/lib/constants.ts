export const PRODUCT = {
  name: 'MileTax',
  positioning:
    'MileTax organizes business records for self-employed workers and prepares a package for their accountant. It does not file taxes or replace a professional accountant.',
  disclaimerVersion: '2026.1',
  legalUpdatedOn: '2026-08-29',
  supportEmail: 'support@miletax.app',
} as const;

export const STORAGE_BUCKETS = {
  receipts: 'receipts',
  odometer: 'odometer-photos',
  reports: 'report-packages',
} as const;

export const CURRENT_TAX_YEAR = 2026;
