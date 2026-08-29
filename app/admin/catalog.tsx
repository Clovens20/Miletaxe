import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { mergeLocalized, useAdminCatalog, useAdminCatalogUpdate } from '@/features/admin/hooks';
import type { CatalogSection } from '@/features/admin/types';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Json } from '@/types/domain';
import { colors, radius, space, type } from '@/theme';

export default function AdminCatalogScreen() {
  const { t } = useTranslation();
  const { isStaff } = useAuth();
  const [section, setSection] = useState<CatalogSection>('countries');

  if (!isStaff) {
    return (
      <Screen title={t('admin.catalog')} scroll home={false} back={false}>
        <Text style={styles.muted}>{t('admin.notStaff')}</Text>
      </Screen>
    );
  }

  const options: { value: CatalogSection; label: string }[] = [
    { value: 'countries', label: t('admin.countries') },
    { value: 'jurisdictions', label: t('admin.jurisdictions') },
    { value: 'taxYears', label: t('admin.taxYears') },
    { value: 'occupations', label: t('admin.occupations') },
    { value: 'expenseCategories', label: t('admin.expenseCategories') },
    { value: 'incomeCategories', label: t('admin.incomeCategories') },
    { value: 'integrityRules', label: t('admin.integrityRules') },
  ];

  return (
    <Screen title={t('admin.catalog')} scroll home={false} back={false}>
      <View style={styles.chips}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setSection(option.value)}
            style={[styles.chip, section === option.value && styles.chipOn]}
          >
            <Text style={[styles.chipText, section === option.value && styles.chipTextOn]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      {section === 'countries' ? <CountriesPanel /> : null}
      {section === 'jurisdictions' ? <NamedPanel table="jurisdictions" idColumn="id" order="code" /> : null}
      {section === 'taxYears' ? <TaxYearsPanel /> : null}
      {section === 'occupations' ? <NamedPanel table="occupation_catalog" idColumn="id" order="sort_order" /> : null}
      {section === 'expenseCategories' ? (
        <NamedPanel table="expense_category_catalog" idColumn="id" order="sort_order" />
      ) : null}
      {section === 'incomeCategories' ? (
        <NamedPanel table="income_category_catalog" idColumn="id" order="sort_order" />
      ) : null}
      {section === 'integrityRules' ? <IntegrityPanel /> : null}
    </Screen>
  );
}

type NamedRow = {
  id?: string;
  code?: string;
  name_i18n?: Json;
  title_i18n?: Json;
  is_active?: boolean;
  country_code?: string;
};

function NamedPanel({ table, idColumn, order }: { table: string; idColumn: string; order: string }) {
  const { t } = useTranslation();
  const list = useAdminCatalog<NamedRow>(table, order);
  const update = useAdminCatalogUpdate(table, idColumn);

  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;

  return (
    <View style={styles.list}>
      {(list.data ?? []).map((row) => {
        const id = String(idColumn === 'code' ? row.code : row.id);
        return (
          <LocalizedCard
            key={id}
            id={id}
            title={row.code ?? id}
            names={row.name_i18n ?? row.title_i18n}
            active={row.is_active !== false}
            extra={row.country_code}
            busy={update.isPending}
            onSave={(patch) =>
              update.mutateAsync({
                id,
                patch: {
                  name_i18n: mergeLocalized(row.name_i18n ?? row.title_i18n, patch),
                  is_active: patch.active,
                },
              })
            }
          />
        );
      })}
    </View>
  );
}

function CountriesPanel() {
  const { t } = useTranslation();
  const list = useAdminCatalog<NamedRow>('countries', 'code');
  const update = useAdminCatalogUpdate('countries', 'code');
  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;
  return (
    <View style={styles.list}>
      {(list.data ?? []).map((row) => {
        const id = String(row.code);
        return (
          <LocalizedCard
            key={id}
            id={id}
            title={id}
            names={row.name_i18n}
            active={row.is_active !== false}
            busy={update.isPending}
            onSave={(patch) =>
              update.mutateAsync({
                id,
                patch: {
                  name_i18n: mergeLocalized(row.name_i18n, patch),
                  is_active: patch.active,
                },
              })
            }
          />
        );
      })}
    </View>
  );
}

type TaxYearRow = {
  id: string;
  country_code: string;
  year: number;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
};

function TaxYearsPanel() {
  const { t } = useTranslation();
  const list = useAdminCatalog<TaxYearRow>('tax_years', 'year');
  const update = useAdminCatalogUpdate('tax_years', 'id');
  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;
  return (
    <View style={styles.list}>
      {(list.data ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={styles.title}>
            {row.country_code} · {row.year}
          </Text>
          <Text style={styles.meta}>
            {row.starts_on} → {row.ends_on}
          </Text>
          <View style={styles.switchRow}>
            <Text style={styles.meta}>{t('admin.current')}</Text>
            <Switch
              value={row.is_current}
              onValueChange={(value) => void update.mutateAsync({ id: row.id, patch: { is_current: value } })}
            />
          </View>
        </Card>
      ))}
    </View>
  );
}

type IntegrityRow = {
  id: string;
  code: string;
  title_i18n: Json;
  description_i18n: Json;
  is_active: boolean;
};

function IntegrityPanel() {
  const { t } = useTranslation();
  const list = useAdminCatalog<IntegrityRow>('integrity_rule_definitions', 'code');
  const update = useAdminCatalogUpdate('integrity_rule_definitions', 'id');
  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;
  return (
    <View style={styles.list}>
      {(list.data ?? []).map((row) => (
        <LocalizedCard
          key={row.id}
          id={row.id}
          title={row.code}
          names={row.title_i18n}
          active={row.is_active}
          busy={update.isPending}
          onSave={(patch) =>
            update.mutateAsync({
              id: row.id,
              patch: {
                title_i18n: mergeLocalized(row.title_i18n, patch),
                is_active: patch.active,
              },
            })
          }
        />
      ))}
    </View>
  );
}

function LocalizedCard({
  id,
  title,
  names,
  active,
  extra,
  busy,
  onSave,
}: {
  id: string;
  title: string;
  names: Json | null | undefined;
  active: boolean;
  extra?: string;
  busy: boolean;
  onSave: (patch: { fr: string; en: string; active: boolean }) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const current = mergeLocalized(names, {});
  const [fr, setFr] = useState(current.fr);
  const [en, setEn] = useState(current.en);
  const [isActive, setIsActive] = useState(active);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Card key={id} style={styles.card}>
      <Text style={styles.title}>
        {title}
        {extra ? ` · ${extra}` : ''}
      </Text>
      <TextField label={t('admin.labelFr')} value={fr} onChangeText={setFr} />
      <TextField label={t('admin.labelEn')} value={en} onChangeText={setEn} />
      <View style={styles.switchRow}>
        <Text style={styles.meta}>{t('admin.active')}</Text>
        <Switch value={isActive} onValueChange={setIsActive} />
      </View>
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <Button
        label={t('admin.save')}
        loading={busy}
        onPress={() => {
          setMessage(null);
          void onSave({ fr, en, active: isActive })
            .then(() => setMessage(t('admin.saved')))
            .catch(() => setMessage(t('admin.saveFailed')));
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  muted: {
    ...type.body,
    color: colors.textSecondary,
  },
  error: {
    ...type.caption,
    color: colors.danger,
  },
  ok: {
    ...type.caption,
    color: colors.success,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  chipTextOn: {
    color: colors.primary,
  },
  list: {
    gap: space.sm,
  },
  card: {
    gap: space.sm,
  },
  title: {
    ...type.bodyMedium,
    color: colors.text,
  },
  meta: {
    ...type.caption,
    color: colors.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
