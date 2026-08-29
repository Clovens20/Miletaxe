import { Text } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ChoiceList } from '@/components/ui/ChoiceList';
import { TextField } from '@/components/ui/TextField';
import { labelOf } from '@/features/tax-config/hooks';
import type { ExpenseCategoryRecord } from '@/features/tax-config/types';
import type { ReceiptReviewValues } from '@/lib/validation/schemas';
import type { SupportedLocale } from '@/types/domain';
import type { Vehicle } from '@/features/vehicles/hooks';
import { colors, type } from '@/theme';
import { paymentMethodOptions } from './labels';

export function ReceiptFormFields({
  control,
  categories,
  vehicles,
  locale,
  compact,
}: {
  control: Control<ReceiptReviewValues>;
  categories: ExpenseCategoryRecord[];
  vehicles: Vehicle[];
  locale: SupportedLocale;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
      <Controller
        control={control}
        name="vendor_name"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('expenses.merchant')}
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="incurred_on"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('expenses.date')}
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.date') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="incurred_time"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={`${t('expenses.time')} (${t('common.optional')})`}
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="HH:MM"
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.time') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="amount"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('expenses.total')}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.positive') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="category_id"
        render={({ field: { value, onChange }, fieldState }) => (
          <>
            <Text style={{ ...type.section, color: colors.text }}>{t('expenses.pickCategory')}</Text>
            <Text style={{ ...type.caption, color: colors.textSecondary }}>{t('expenses.pickCategoryHint')}</Text>
            <ChoiceList
              value={value}
              onChange={onChange}
              options={categories.map((row) => ({ value: row.id, label: labelOf(row, locale) }))}
            />
            {fieldState.error ? (
              <Text style={{ ...type.caption, color: colors.danger }}>
                {t(fieldState.error.message ?? 'validation.required')}
              </Text>
            ) : null}
          </>
        )}
      />
      {compact ? null : (
        <>
          <Controller
            control={control}
            name="subtotal"
            render={({ field: { onChange, value } }) => (
              <TextField
                label={`${t('expenses.subtotal')} (${t('common.optional')})`}
                keyboardType="decimal-pad"
                value={value ?? ''}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="tax_amount"
            render={({ field: { onChange, value } }) => (
              <TextField
                label={t('expenses.taxAmount')}
                hint={t('expenses.taxAmountHint')}
                keyboardType="decimal-pad"
                value={value ?? ''}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="currency"
            render={({ field: { value, onChange } }) => (
              <>
                <Text style={{ ...type.label, color: colors.text }}>{t('expenses.currency')}</Text>
                <ChoiceList
                  value={value}
                  onChange={onChange}
                  options={[
                    { value: 'CAD', label: 'CAD' },
                    { value: 'USD', label: 'USD' },
                  ]}
                />
              </>
            )}
          />
          {vehicles.length ? (
            <Controller
              control={control}
              name="vehicle_id"
              render={({ field: { value, onChange } }) => (
                <>
                  <Text style={{ ...type.label, color: colors.text }}>
                    {t('expenses.vehicle')} ({t('common.optional')})
                  </Text>
                  <ChoiceList
                    value={value ?? ''}
                    onChange={onChange}
                    options={[
                      { value: '', label: t('common.all') },
                      ...vehicles.map((row) => ({ value: row.id, label: row.nickname })),
                    ]}
                  />
                </>
              )}
            />
          ) : null}
          <Controller
            control={control}
            name="fuel_quantity"
            render={({ field: { onChange, value } }) => (
              <TextField
                label={`${t('expenses.fuelQuantity')} (${t('common.optional')})`}
                keyboardType="decimal-pad"
                value={value ?? ''}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="price_per_unit"
            render={({ field: { onChange, value } }) => (
              <TextField
                label={`${t('expenses.pricePerUnit')} (${t('common.optional')})`}
                keyboardType="decimal-pad"
                value={value ?? ''}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="payment_method"
            render={({ field: { value, onChange } }) => (
              <>
                <Text style={{ ...type.label, color: colors.text }}>
                  {t('expenses.paymentMethod')} ({t('common.optional')})
                </Text>
                <ChoiceList
                  value={value ?? ''}
                  onChange={onChange}
                  options={[{ value: '', label: '—' }, ...paymentMethodOptions(t)]}
                />
              </>
            )}
          />
          <Controller
            control={control}
            name="reference_number"
            render={({ field: { onChange, value } }) => (
              <TextField
                label={`${t('expenses.reference')} (${t('common.optional')})`}
                value={value ?? ''}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextField
                label={`${t('expenses.notes')} (${t('common.optional')})`}
                value={value ?? ''}
                onChangeText={onChange}
              />
            )}
          />
        </>
      )}
    </>
  );
}
