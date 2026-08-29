import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ChoiceList } from '@/components/ui/ChoiceList';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCreateIncome } from '@/features/income/hooks';
import { labelOf, useIncomeCategories } from '@/features/tax-config/hooks';
import { parseDecimal, todayIso } from '@/lib/format';
import type { IncomeSourceKind, SupportedLocale } from '@/types/domain';
import { colors, type } from '@/theme';

export default function NewIncomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const categories = useIncomeCategories(profile?.country_code);
  const create = useCreateIncome();
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [kind, setKind] = useState<IncomeSourceKind>('platform');
  const [categoryId, setCategoryId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const parsed = parseDecimal(amount);

  const save = async () => {
    if (parsed == null) return;
    await create.mutateAsync({
      source_name: source,
      amount: parsed,
      received_on: date,
      source_kind: kind,
      category_id: categoryId || undefined,
      reference_number: reference,
      notes,
    });
    router.back();
  };

  return (
    <Screen title={t('income.add')} scroll>
      <TextField label={t('income.source')} hint={t('income.sourceHint')} value={source} onChangeText={setSource} />
      <TextField label={t('income.amount')} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      <TextField label={t('income.date')} value={date} onChangeText={setDate} />
      <SegmentedControl
        value={kind}
        onChange={(value) => setKind(value as IncomeSourceKind)}
        options={[
          { value: 'platform', label: t('income.kindPlatform') },
          { value: 'invoice', label: t('income.kindInvoice') },
          { value: 'cash', label: t('income.kindCash') },
          { value: 'other', label: t('income.kindOther') },
        ]}
      />
      <Text style={styles.label}>{t('expenses.category')}</Text>
      <ChoiceList
        value={categoryId}
        onChange={setCategoryId}
        options={(categories.data ?? []).map((row) => ({ value: row.id, label: labelOf(row, locale) }))}
      />
      <TextField label={t('income.reference')} value={reference} onChangeText={setReference} />
      <TextField label={t('income.notes')} value={notes} onChangeText={setNotes} />
      <Button
        label={t('common.save')}
        loading={create.isPending}
        disabled={!source.trim() || parsed == null}
        onPress={() => void save()}
      />
      <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.label,
    color: colors.text,
  },
});
