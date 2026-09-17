import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  shiftSpendingAnchor,
  spendingWindow,
  type SpendingPeriodKind,
} from '@/features/expenses/engine';
import { currentTaxYear, useTaxYears } from '@/features/tax-config/hooks';
import {
  addDays,
  formatDate,
  formatWeekRange,
  formatYearMonth,
  startOfWeekIso,
  todayIso,
} from '@/lib/format';
import type { SupportedLocale } from '@/types/domain';

export const RECORD_PERIODS: SpendingPeriodKind[] = ['today', 'week', 'month', 'year'];

export function useRecordPeriod(defaultKind: SpendingPeriodKind = 'month') {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const today = todayIso();
  const years = useTaxYears(profile?.country_code);
  const taxYear = currentTaxYear(years.data, profile?.country_code);
  const [kind, setKindState] = useState<SpendingPeriodKind>(defaultKind);
  const [anchor, setAnchor] = useState(today);
  const minDate = taxYear.starts_on ?? addDays(today, -730);

  const setKind = (next: SpendingPeriodKind) => {
    setKindState(next);
    setAnchor(today);
  };

  const range = useMemo(
    () =>
      spendingWindow(kind, anchor, today, {
        start: taxYear.starts_on,
        end: taxYear.ends_on,
      }),
    [anchor, kind, taxYear.ends_on, taxYear.starts_on, today],
  );

  const canGoNext = kind !== 'year' && shiftSpendingAnchor(kind, anchor, 1, today, minDate) !== anchor;
  const canGoPrev = kind !== 'year' && shiftSpendingAnchor(kind, anchor, -1, today, minDate) !== anchor;

  const periodLabel = (() => {
    if (kind === 'today') return formatDate(anchor, locale, profile?.country_code);
    if (kind === 'week') {
      const start = startOfWeekIso(anchor);
      return formatWeekRange(start, addDays(start, 6), locale, profile?.country_code);
    }
    if (kind === 'month') return formatYearMonth(anchor.slice(0, 7), locale, profile?.country_code);
    return t('home.taxYear', { year: taxYear.year });
  })();

  return {
    kind,
    setKind,
    range,
    periodLabel,
    canGoNext,
    canGoPrev,
    goPrev: () => setAnchor(shiftSpendingAnchor(kind, anchor, -1, today, minDate)),
    goNext: () => setAnchor(shiftSpendingAnchor(kind, anchor, 1, today, minDate)),
    locale,
    countryCode: profile?.country_code,
    taxYear,
  };
}
