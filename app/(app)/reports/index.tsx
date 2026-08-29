import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ChoiceList } from '@/components/ui/ChoiceList';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeroButton } from '@/components/ui/HeroButton';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  reportSummary,
  useGenerateReport,
  usePreferredReportPeriod,
  useReports,
} from '@/features/reports/hooks';
import { monthsInTaxYear, profileReportingCadence } from '@/features/reports/period';
import { currentTaxYear, useTaxYears } from '@/features/tax-config/hooks';
import { localize } from '@/lib/i18n/localize';
import { formatDate, formatYearMonth, yearMonthNow } from '@/lib/format';
import type { SupportedLocale } from '@/types/domain';
import { colors, type } from '@/theme';

const statusLabel = (status: string, t: (key: string) => string) => {
  if (status === 'generated') return t('reports.statusGenerated');
  if (status === 'shared') return t('reports.statusShared');
  return t('reports.statusDraft');
};

export default function ReportsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const reports = useReports();
  const generate = useGenerateReport();
  const preferred = usePreferredReportPeriod();
  const years = useTaxYears(profile?.country_code);
  const taxYear = currentTaxYear(years.data);
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const cadence = profileReportingCadence(profile?.reporting_cadence);
  const [half, setHalf] = useState<'1' | '2'>(preferred?.half === 2 ? '2' : '1');
  const [month, setMonth] = useState(yearMonthNow());

  const monthOptions = useMemo(() => {
    const months = taxYear ? monthsInTaxYear(taxYear) : [yearMonthNow()];
    return months.map((value) => ({ value, label: formatYearMonth(value, locale, profile?.country_code) }));
  }, [locale, profile?.country_code, taxYear]);

  const createPreferred = async () => {
    const report = await generate.mutateAsync(
      cadence === 'semiannual' ? { kind: 'semiannual', half: preferred?.half } : { kind: 'annual' },
    );
    router.push(`/(app)/reports/${report.id}`);
  };

  const createSemester = async () => {
    const report = await generate.mutateAsync({ kind: 'semiannual', half: half === '2' ? 2 : 1 });
    router.push(`/(app)/reports/${report.id}`);
  };

  const createYear = async () => {
    const report = await generate.mutateAsync({ kind: 'annual' });
    router.push(`/(app)/reports/${report.id}`);
  };

  const createMonth = async () => {
    const report = await generate.mutateAsync({ kind: 'monthly', month });
    router.push(`/(app)/reports/${report.id}`);
  };

  return (
    <Screen title={t('reports.title')} subtitle={t('reports.subtitle')} scroll>
      <DisclaimerBanner text={t('disclaimer.report')} />
      {preferred ? (
        <HeroButton
          label={t('reports.generatePreferred')}
          subtitle={localize(preferred.label_i18n, locale)}
          loading={generate.isPending}
          onPress={() => void createPreferred()}
        />
      ) : null}

      {cadence === 'annual' ? (
        <>
          <Text style={styles.section}>{t('reports.semiannualOption')}</Text>
          <SegmentedControl
            value={half}
            onChange={(value) => setHalf(value as '1' | '2')}
            options={[
              { value: '1', label: t('reports.half1') },
              { value: '2', label: t('reports.half2') },
            ]}
          />
          <Button
            label={t('reports.generateSemester')}
            variant="secondary"
            loading={generate.isPending}
            onPress={() => void createSemester()}
          />
        </>
      ) : (
        <Button
          label={t('reports.generateYear')}
          variant="secondary"
          loading={generate.isPending}
          onPress={() => void createYear()}
        />
      )}

      <Text style={styles.section}>{t('reports.monthlyTitle')}</Text>
      <Text style={styles.hint}>{t('reports.monthlyHint')}</Text>
      <ChoiceList value={month} onChange={setMonth} options={monthOptions} />
      <Button
        label={t('reports.generateMonth')}
        variant="secondary"
        loading={generate.isPending}
        onPress={() => void createMonth()}
      />

      <Text style={styles.section}>{t('reports.history')}</Text>
      {!reports.data?.length ? <EmptyState icon="document-text-outline" title={t('reports.empty')} /> : null}
      {(reports.data ?? []).map((row) => {
        const summary = reportSummary(row);
        const period = summary?.period ? localize(summary.period.label_i18n, locale) : statusLabel(row.status, t);
        return (
          <ListRow
            key={row.id}
            icon="document-text-outline"
            title={period}
            subtitle={row.generated_at ? formatDate(row.generated_at.slice(0, 10), locale) : row.created_at.slice(0, 10)}
            onPress={() => router.push(`/(app)/reports/${row.id}`)}
          />
        );
      })}
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    ...type.section,
    color: colors.text,
    marginTop: 8,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
  },
});
