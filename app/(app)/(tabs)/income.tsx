import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIncome } from '@/features/income/hooks';
import { formatDate, formatMoney } from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';

export default function IncomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const income = useIncome();
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;

  return (
    <Screen title={t('income.title')} subtitle={t('income.subtitle')} scroll back={false}>
      {!income.data?.length ? (
        <EmptyState icon="cash-outline" title={t('income.empty')} />
      ) : (
        income.data.map((row) => (
          <ListRow
            key={row.id}
            icon="cash-outline"
            title={row.source_name}
            subtitle={formatDate(row.received_on, locale, profile?.country_code)}
            right={formatMoney(Number(row.amount), row.currency || currency, locale, profile?.country_code)}
          />
        ))
      )}
      <Button label={t('income.add')} onPress={() => router.push('/(app)/income/new')} />
    </Screen>
  );
}
