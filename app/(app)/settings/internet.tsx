import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { activeInternetPlan, monthsCoveredByPlan, planIsActive } from '@/features/recurring/engine';
import {
  useEndInternetPlan,
  useEnsureRecurringCharges,
  useRecurringPlans,
  useSaveInternetPlan,
} from '@/features/recurring/hooks';
import { formatMoney, formatYearMonth, parseDecimal, startOfMonthIso, todayIso } from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

export default function InternetPlanScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  useEnsureRecurringCharges();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const today = todayIso();
  const plans = useRecurringPlans();
  const save = useSaveInternetPlan();
  const endPlan = useEndInternetPlan();
  const active = activeInternetPlan(plans.data ?? [], today);
  const past = useMemo(
    () => (plans.data ?? []).filter((row) => !planIsActive(row, today)),
    [plans.data, today],
  );

  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [startedOn, setStartedOn] = useState(startOfMonthIso(today));
  const [endedOn, setEndedOn] = useState(today);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    const value = parseDecimal(amount);
    if (!vendor.trim() || value == null || value < 0) {
      setError(t('validation.required'));
      return;
    }
    if (startedOn > today) {
      setError(t('validation.dateNotFuture'));
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({ vendor_name: vendor.trim(), amount: value, started_on: startedOn });
      setVendor('');
      setAmount('');
    } catch (cause) {
      setError(cause instanceof Error && cause.message === 'active_plan_exists' ? t('internet.activeExists') : t('common.error'));
    }
  };

  const finish = async () => {
    if (!active) return;
    if (endedOn < active.started_on) {
      setError(t('internet.endBeforeStart'));
      return;
    }
    setError(null);
    await endPlan.mutateAsync({ id: active.id, ended_on: endedOn });
  };

  return (
    <Screen title={t('internet.title')} subtitle={t('internet.subtitle')} scroll>
      {error ? <WarningBanner tone="danger" title={error} /> : null}
      {plans.isError ? <WarningBanner tone="warning" title={t('internet.loadFailed')} /> : null}

      {active ? (
        <Card>
          <Text style={styles.kicker}>{t('internet.active')}</Text>
          <Text style={styles.vendor}>{active.vendor_name}</Text>
          <Text style={styles.meta}>
            {formatMoney(Number(active.amount), active.currency || currency, locale, profile?.country_code)}
            {` · ${t('internet.perMonth')}`}
          </Text>
          <Text style={styles.meta}>
            {t('internet.since', { month: formatYearMonth(active.started_on.slice(0, 7), locale, profile?.country_code) })}
            {` · ${t('internet.monthsLogged', { count: monthsCoveredByPlan(active, today).length })}`}
          </Text>
          <TextField
            label={t('internet.endedOn')}
            hint={t('internet.endedOnHint')}
            value={endedOn}
            onChangeText={setEndedOn}
            placeholder={t('expenses.datePlaceholder')}
          />
          <Button
            label={t('internet.endContract')}
            variant="secondary"
            loading={endPlan.isPending}
            onPress={() => void finish()}
          />
        </Card>
      ) : (
        <Card>
          <Text style={styles.kicker}>{t('internet.newPlan')}</Text>
          <Text style={styles.hint}>{t('internet.newHint')}</Text>
          <TextField label={t('internet.vendor')} hint={t('internet.vendorHint')} value={vendor} onChangeText={setVendor} />
          <TextField
            label={t('internet.amount')}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
          <TextField
            label={t('internet.startedOn')}
            hint={t('internet.startedOnHint')}
            value={startedOn}
            onChangeText={setStartedOn}
            placeholder={t('expenses.datePlaceholder')}
          />
          <Button label={t('internet.save')} loading={save.isPending} onPress={() => void create()} />
        </Card>
      )}

      {!active && !past.length && !plans.isLoading ? (
        <EmptyState icon="wifi-outline" title={t('internet.empty')} body={t('internet.emptyBody')} />
      ) : null}

      {past.length ? <Text style={styles.section}>{t('internet.pastTitle')}</Text> : null}
      {past.map((row) => (
        <Card key={row.id}>
          <Text style={styles.vendor}>{row.vendor_name}</Text>
          <Text style={styles.meta}>
            {formatMoney(Number(row.amount), row.currency || currency, locale, profile?.country_code)}
            {` · ${t('internet.perMonth')}`}
          </Text>
          <Text style={styles.meta}>
            {formatYearMonth(row.started_on.slice(0, 7), locale, profile?.country_code)}
            {' → '}
            {row.ended_on
              ? formatYearMonth(row.ended_on.slice(0, 7), locale, profile?.country_code)
              : '—'}
          </Text>
        </Card>
      ))}

      <DisclaimerBanner text={t('internet.disclaimer')} />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    ...type.captionMedium,
    color: colors.accent,
    marginBottom: space.xs,
  },
  vendor: {
    ...type.section,
    color: colors.text,
  },
  meta: {
    ...type.body,
    color: colors.textSecondary,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
    marginBottom: space.sm,
  },
  section: {
    ...type.section,
    color: colors.text,
  },
});
