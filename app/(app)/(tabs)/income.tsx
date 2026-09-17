import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { MetricCard } from '@/components/ui/MetricCard';
import { PeriodSwitcher } from '@/components/ui/PeriodSwitcher';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIncome } from '@/features/income/hooks';
import { useRecordPeriod } from '@/features/records/useRecordPeriod';
import { formatDate, formatMoney } from '@/lib/format';
import type { CurrencyCode } from '@/types/domain';

export default function IncomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const income = useIncome();
  const period = useRecordPeriod('month');
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const rows = useMemo(
    () =>
      (income.data ?? []).filter(
        (row) => row.received_on >= period.range.start && row.received_on <= period.range.end,
      ),
    [income.data, period.range.end, period.range.start],
  );
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const hasAny = Boolean(income.data?.length);

  return (
    <Screen title={t('income.title')} subtitle={t('income.subtitle')} scroll back={false}>
      <PeriodSwitcher
        kind={period.kind}
        onKindChange={period.setKind}
        periodLabel={period.periodLabel}
        canGoPrev={period.canGoPrev}
        canGoNext={period.canGoNext}
        onPrev={period.goPrev}
        onNext={period.goNext}
      />
      <MetricCard
        label={t('income.total')}
        value={formatMoney(total, currency, period.locale, profile?.country_code)}
        hint={t('income.totalCount', { count: rows.length })}
      />
      {!hasAny ? (
        <EmptyState icon="cash-outline" title={t('income.empty')} />
      ) : !rows.length ? (
        <EmptyState icon="cash-outline" title={t('income.emptyPeriod')} />
      ) : (
        rows.map((row) => (
          <ListRow
            key={row.id}
            icon="cash-outline"
            title={row.source_name}
            subtitle={formatDate(row.received_on, period.locale, profile?.country_code)}
            right={formatMoney(Number(row.amount), row.currency || currency, period.locale, profile?.country_code)}
          />
        ))
      )}
      <Button label={t('income.add')} onPress={() => router.push('/(app)/income/new')} />
    </Screen>
  );
}
