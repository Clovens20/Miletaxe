import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import type { Json } from '@/types/domain';
import { colors, radius, space, type } from '@/theme';

import {
  mergeLocalized,
  useAdminCatalog,
  useAdminCatalogDelete,
  useAdminCatalogInsert,
  useAdminCatalogUpdate,
} from './hooks';
import type { CatalogSection } from './types';

function confirmAction(message: string) {
  if (Platform.OS !== 'web') return false;
  return window.confirm(message);
}

export function CatalogEditor() {
  const { t } = useTranslation();
  const [section, setSection] = useState<CatalogSection>('countries');
  const options: { value: CatalogSection; label: string }[] = [
    { value: 'countries', label: t('admin.countries') },
    { value: 'jurisdictions', label: t('admin.jurisdictions') },
    { value: 'taxYears', label: t('admin.taxYears') },
    { value: 'occupations', label: t('admin.occupations') },
    { value: 'expenseCategories', label: t('admin.expenseCategories') },
    { value: 'incomeCategories', label: t('admin.incomeCategories') },
    { value: 'integrityRules', label: t('admin.integrityRules') },
    { value: 'mileageMethods', label: t('admin.mileageMethods') },
    { value: 'mileageTiers', label: t('admin.mileageTiers') },
    { value: 'reportSections', label: t('admin.reportSections') },
    { value: 'assistantChecks', label: t('admin.assistantChecks') },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{t('admin.catalogHint')}</Text>
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
      {section === 'jurisdictions' ? <JurisdictionsPanel /> : null}
      {section === 'taxYears' ? <TaxYearsPanel /> : null}
      {section === 'occupations' ? <OccupationsPanel /> : null}
      {section === 'expenseCategories' ? <ExpenseCategoriesPanel /> : null}
      {section === 'incomeCategories' ? <IncomeCategoriesPanel /> : null}
      {section === 'integrityRules' ? <IntegrityPanel /> : null}
      {section === 'mileageMethods' ? <MileageMethodsPanel /> : null}
      {section === 'mileageTiers' ? <MileageTiersPanel /> : null}
      {section === 'reportSections' ? <ReportSectionsPanel /> : null}
      {section === 'assistantChecks' ? <AssistantChecksPanel /> : null}
    </View>
  );
}

function CountriesPanel() {
  const { t } = useTranslation();
  const list = useAdminCatalog<NamedRow>('countries', 'code');
  const insert = useAdminCatalogInsert('countries');
  const update = useAdminCatalogUpdate('countries', 'code');
  const remove = useAdminCatalogDelete('countries', 'code');
  const [code, setCode] = useState('');
  const [fr, setFr] = useState('');
  const [en, setEn] = useState('');
  const [currency, setCurrency] = useState('CAD');
  const [unit, setUnit] = useState('km');

  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;

  return (
    <View style={styles.list}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('admin.add')}</Text>
        <TextField label={t('admin.code')} autoCapitalize="characters" value={code} onChangeText={setCode} />
        <TextField label={t('admin.labelFr')} value={fr} onChangeText={setFr} />
        <TextField label={t('admin.labelEn')} value={en} onChangeText={setEn} />
        <TextField label={t('admin.currency')} autoCapitalize="characters" value={currency} onChangeText={setCurrency} />
        <TextField label={t('admin.unit')} value={unit} onChangeText={setUnit} />
        <Button
          label={t('admin.add')}
          loading={insert.isPending}
          onPress={() => {
            void insert
              .mutateAsync({
                code: code.trim().toUpperCase(),
                name_i18n: { fr, en },
                default_currency: currency.trim().toUpperCase(),
                default_distance_unit: unit.trim(),
                is_active: true,
              })
              .then(() => {
                setCode('');
                setFr('');
                setEn('');
              });
          }}
        />
      </Card>
      {(list.data ?? []).map((row) => (
        <LocalizedCard
          key={String(row.code)}
          title={String(row.code)}
          names={row.name_i18n}
          active={row.is_active !== false}
          busy={update.isPending || remove.isPending}
          onSave={(patch) =>
            update.mutateAsync({
              id: String(row.code),
              patch: { name_i18n: mergeLocalized(row.name_i18n, patch), is_active: patch.active },
            })
          }
          onDelete={() => remove.mutateAsync(String(row.code))}
        />
      ))}
    </View>
  );
}

function JurisdictionsPanel() {
  const { t } = useTranslation();
  const list = useAdminCatalog<NamedRow>('jurisdictions', 'code');
  const insert = useAdminCatalogInsert('jurisdictions');
  const update = useAdminCatalogUpdate('jurisdictions', 'id');
  const remove = useAdminCatalogDelete('jurisdictions', 'id');
  const [country, setCountry] = useState('CA');
  const [code, setCode] = useState('');
  const [kind, setKind] = useState('province');
  const [fr, setFr] = useState('');
  const [en, setEn] = useState('');

  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;

  return (
    <View style={styles.list}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('admin.add')}</Text>
        <TextField label={t('admin.countryCode')} autoCapitalize="characters" value={country} onChangeText={setCountry} />
        <TextField label={t('admin.code')} autoCapitalize="characters" value={code} onChangeText={setCode} />
        <TextField label={t('admin.kind')} value={kind} onChangeText={setKind} />
        <TextField label={t('admin.labelFr')} value={fr} onChangeText={setFr} />
        <TextField label={t('admin.labelEn')} value={en} onChangeText={setEn} />
        <Button
          label={t('admin.add')}
          loading={insert.isPending}
          onPress={() => {
            void insert
              .mutateAsync({
                country_code: country.trim().toUpperCase(),
                code: code.trim().toUpperCase(),
                kind: kind.trim(),
                name_i18n: { fr, en },
                is_active: true,
              })
              .then(() => {
                setCode('');
                setFr('');
                setEn('');
              });
          }}
        />
      </Card>
      {(list.data ?? []).map((row) => (
        <LocalizedCard
          key={String(row.id)}
          title={`${row.country_code} · ${row.code}`}
          names={row.name_i18n}
          active={row.is_active !== false}
          extra={row.kind}
          busy={update.isPending || remove.isPending}
          onSave={(patch) =>
            update.mutateAsync({
              id: String(row.id),
              patch: { name_i18n: mergeLocalized(row.name_i18n, patch), is_active: patch.active },
            })
          }
          onDelete={() => remove.mutateAsync(String(row.id))}
        />
      ))}
    </View>
  );
}

function TaxYearsPanel() {
  const { t } = useTranslation();
  const list = useAdminCatalog<TaxYearRow>('tax_years', 'year');
  const insert = useAdminCatalogInsert('tax_years');
  const update = useAdminCatalogUpdate('tax_years', 'id');
  const remove = useAdminCatalogDelete('tax_years', 'id');
  const [country, setCountry] = useState('CA');
  const [year, setYear] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;

  return (
    <View style={styles.list}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('admin.add')}</Text>
        <TextField label={t('admin.countryCode')} autoCapitalize="characters" value={country} onChangeText={setCountry} />
        <TextField label={t('admin.year')} keyboardType="number-pad" value={year} onChangeText={setYear} />
        <TextField label={t('admin.startsOn')} placeholder="YYYY-MM-DD" value={start} onChangeText={setStart} />
        <TextField label={t('admin.endsOn')} placeholder="YYYY-MM-DD" value={end} onChangeText={setEnd} />
        <Button
          label={t('admin.add')}
          loading={insert.isPending}
          onPress={() => {
            void insert
              .mutateAsync({
                country_code: country.trim().toUpperCase(),
                year: Number(year),
                starts_on: start.trim(),
                ends_on: end.trim(),
                is_current: false,
              })
              .then(() => {
                setYear('');
                setStart('');
                setEnd('');
              });
          }}
        />
      </Card>
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
          <DeleteButton onDelete={() => remove.mutateAsync(row.id)} busy={remove.isPending} />
        </Card>
      ))}
    </View>
  );
}

function OccupationsPanel() {
  return (
    <SimpleNamedPanel
      table="occupation_catalog"
      extraFields
      buildInsert={(fields) => ({
        country_code: fields.country || null,
        code: fields.code,
        name_i18n: { fr: fields.fr, en: fields.en },
        sort_order: Number(fields.sort || 0),
        is_active: true,
      })}
    />
  );
}

function ExpenseCategoriesPanel() {
  return (
    <SimpleNamedPanel
      table="expense_category_catalog"
      extraFields
      flags
      buildInsert={(fields) => ({
        country_code: fields.country,
        code: fields.code,
        name_i18n: { fr: fields.fr, en: fields.en },
        sort_order: Number(fields.sort || 0),
        requires_receipt: fields.requiresReceipt,
        requires_vehicle: fields.requiresVehicle,
        is_active: true,
      })}
    />
  );
}

function IncomeCategoriesPanel() {
  return (
    <SimpleNamedPanel
      table="income_category_catalog"
      extraFields
      buildInsert={(fields) => ({
        country_code: fields.country,
        code: fields.code,
        name_i18n: { fr: fields.fr, en: fields.en },
        sort_order: Number(fields.sort || 0),
        is_active: true,
      })}
    />
  );
}

function IntegrityPanel() {
  const { t } = useTranslation();
  const list = useAdminCatalog<IntegrityRow>('integrity_rule_definitions', 'code');
  const insert = useAdminCatalogInsert('integrity_rule_definitions');
  const update = useAdminCatalogUpdate('integrity_rule_definitions', 'id');
  const remove = useAdminCatalogDelete('integrity_rule_definitions', 'id');
  const [code, setCode] = useState('');
  const [entity, setEntity] = useState('record');
  const [severity, setSeverity] = useState('warning');
  const [fr, setFr] = useState('');
  const [en, setEn] = useState('');

  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;

  return (
    <View style={styles.list}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('admin.add')}</Text>
        <TextField label={t('admin.code')} value={code} onChangeText={setCode} />
        <TextField label={t('admin.entityType')} value={entity} onChangeText={setEntity} />
        <TextField label={t('admin.severity')} value={severity} onChangeText={setSeverity} />
        <TextField label={t('admin.labelFr')} value={fr} onChangeText={setFr} />
        <TextField label={t('admin.labelEn')} value={en} onChangeText={setEn} />
        <Button
          label={t('admin.add')}
          loading={insert.isPending}
          onPress={() => {
            void insert
              .mutateAsync({
                code: code.trim(),
                entity_type: entity.trim(),
                severity: severity.trim(),
                title_i18n: { fr, en },
                description_i18n: { fr, en },
                is_active: true,
              })
              .then(() => {
                setCode('');
                setFr('');
                setEn('');
              });
          }}
        />
      </Card>
      {(list.data ?? []).map((row) => (
        <LocalizedCard
          key={row.id}
          title={row.code}
          names={row.title_i18n}
          active={row.is_active}
          extra={row.severity}
          busy={update.isPending || remove.isPending}
          onSave={(patch) =>
            update.mutateAsync({
              id: row.id,
              patch: { title_i18n: mergeLocalized(row.title_i18n, patch), is_active: patch.active },
            })
          }
          onDelete={() => remove.mutateAsync(row.id)}
        />
      ))}
    </View>
  );
}

function MileageMethodsPanel() {
  const { t } = useTranslation();
  const list = useAdminCatalog<MileageMethodRow>('mileage_rate_methods', 'method_code');
  const insert = useAdminCatalogInsert('mileage_rate_methods');
  const update = useAdminCatalogUpdate('mileage_rate_methods', 'id');
  const remove = useAdminCatalogDelete('mileage_rate_methods', 'id');
  const [country, setCountry] = useState('CA');
  const [code, setCode] = useState('');
  const [fr, setFr] = useState('');
  const [en, setEn] = useState('');

  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;

  return (
    <View style={styles.list}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('admin.add')}</Text>
        <TextField label={t('admin.countryCode')} autoCapitalize="characters" value={country} onChangeText={setCountry} />
        <TextField label={t('admin.methodCode')} value={code} onChangeText={setCode} />
        <TextField label={t('admin.labelFr')} value={fr} onChangeText={setFr} />
        <TextField label={t('admin.labelEn')} value={en} onChangeText={setEn} />
        <Button
          label={t('admin.add')}
          loading={insert.isPending}
          onPress={() => {
            void insert
              .mutateAsync({
                country_code: country.trim().toUpperCase(),
                method_code: code.trim(),
                title_i18n: { fr, en },
                is_available: true,
              })
              .then(() => {
                setCode('');
                setFr('');
                setEn('');
              });
          }}
        />
      </Card>
      {(list.data ?? []).map((row) => (
        <LocalizedCard
          key={row.id}
          title={`${row.country_code} · ${row.method_code}`}
          names={row.title_i18n}
          active={row.is_available !== false}
          extra={row.id}
          busy={update.isPending || remove.isPending}
          onSave={(patch) =>
            update.mutateAsync({
              id: row.id,
              patch: { title_i18n: mergeLocalized(row.title_i18n, patch), is_available: patch.active },
            })
          }
          onDelete={() => remove.mutateAsync(row.id)}
        />
      ))}
    </View>
  );
}

function MileageTiersPanel() {
  const { t } = useTranslation();
  const list = useAdminCatalog<MileageTierRow>('mileage_rate_tiers', 'id');
  const insert = useAdminCatalogInsert('mileage_rate_tiers');
  const update = useAdminCatalogUpdate('mileage_rate_tiers', 'id');
  const remove = useAdminCatalogDelete('mileage_rate_tiers', 'id');
  const [methodId, setMethodId] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [rate, setRate] = useState('');
  const [unit, setUnit] = useState('km');

  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;

  return (
    <View style={styles.list}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('admin.add')}</Text>
        <TextField label={t('admin.methodId')} value={methodId} onChangeText={setMethodId} />
        <TextField label={t('admin.minDistance')} keyboardType="decimal-pad" value={min} onChangeText={setMin} />
        <TextField label={t('admin.maxDistance')} keyboardType="decimal-pad" value={max} onChangeText={setMax} />
        <TextField label={t('admin.rate')} keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
        <TextField label={t('admin.unit')} value={unit} onChangeText={setUnit} />
        <Button
          label={t('admin.add')}
          loading={insert.isPending}
          onPress={() => {
            void insert
              .mutateAsync({
                method_id: methodId.trim(),
                min_distance: min ? Number(min) : null,
                max_distance: max ? Number(max) : null,
                rate_per_unit: rate ? Number(rate) : null,
                distance_unit: unit.trim(),
              })
              .then(() => {
                setMin('');
                setMax('');
                setRate('');
              });
          }}
        />
      </Card>
      {(list.data ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={styles.title}>{row.method_id}</Text>
          <Text style={styles.meta}>
            {row.min_distance ?? '—'}–{row.max_distance ?? '—'} {row.distance_unit} · {row.rate_per_unit ?? '—'}
          </Text>
          <DeleteButton onDelete={() => remove.mutateAsync(row.id)} busy={remove.isPending} />
        </Card>
      ))}
    </View>
  );
}

function ReportSectionsPanel() {
  return (
    <SimpleNamedPanel
      table="report_section_templates"
      extraFields
      hasActive={false}
      nameKey="title_i18n"
      buildInsert={(fields) => ({
        country_code: fields.country,
        code: fields.code,
        title_i18n: { fr: fields.fr, en: fields.en },
        sort_order: Number(fields.sort || 0),
        include_entities: [],
      })}
    />
  );
}

function AssistantChecksPanel() {
  const { t } = useTranslation();
  const list = useAdminCatalog<AssistantRow>('assistant_check_definitions', 'code');
  const insert = useAdminCatalogInsert('assistant_check_definitions');
  const update = useAdminCatalogUpdate('assistant_check_definitions', 'id');
  const remove = useAdminCatalogDelete('assistant_check_definitions', 'id');
  const [code, setCode] = useState('');
  const [entity, setEntity] = useState('record');
  const [confidence, setConfidence] = useState('needs_review');
  const [fr, setFr] = useState('');
  const [en, setEn] = useState('');

  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;

  return (
    <View style={styles.list}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('admin.add')}</Text>
        <TextField label={t('admin.code')} value={code} onChangeText={setCode} />
        <TextField label={t('admin.entityType')} value={entity} onChangeText={setEntity} />
        <TextField label={t('admin.confidence')} value={confidence} onChangeText={setConfidence} />
        <TextField label={t('admin.labelFr')} value={fr} onChangeText={setFr} />
        <TextField label={t('admin.labelEn')} value={en} onChangeText={setEn} />
        <Button
          label={t('admin.add')}
          loading={insert.isPending}
          onPress={() => {
            void insert
              .mutateAsync({
                code: code.trim(),
                entity_type: entity.trim(),
                default_confidence: confidence.trim(),
                title_i18n: { fr, en },
                description_i18n: { fr, en },
                is_active: true,
              })
              .then(() => {
                setCode('');
                setFr('');
                setEn('');
              });
          }}
        />
      </Card>
      {(list.data ?? []).map((row) => (
        <LocalizedCard
          key={row.id}
          title={row.code}
          names={row.title_i18n}
          active={row.is_active}
          busy={update.isPending || remove.isPending}
          onSave={(patch) =>
            update.mutateAsync({
              id: row.id,
              patch: { title_i18n: mergeLocalized(row.title_i18n, patch), is_active: patch.active },
            })
          }
          onDelete={() => remove.mutateAsync(row.id)}
        />
      ))}
    </View>
  );
}

type InsertFields = {
  country: string;
  code: string;
  fr: string;
  en: string;
  sort: string;
  requiresReceipt: boolean;
  requiresVehicle: boolean;
};

function SimpleNamedPanel({
  table,
  extraFields,
  flags,
  hasActive = true,
  nameKey = 'name_i18n',
  buildInsert,
}: {
  table: string;
  extraFields?: boolean;
  flags?: boolean;
  hasActive?: boolean;
  nameKey?: 'name_i18n' | 'title_i18n';
  buildInsert: (fields: InsertFields) => Record<string, unknown>;
}) {
  const { t } = useTranslation();
  const list = useAdminCatalog<NamedRow>(table, extraFields ? 'sort_order' : 'code');
  const insert = useAdminCatalogInsert(table);
  const update = useAdminCatalogUpdate(table, 'id');
  const remove = useAdminCatalogDelete(table, 'id');
  const [country, setCountry] = useState('CA');
  const [code, setCode] = useState('');
  const [fr, setFr] = useState('');
  const [en, setEn] = useState('');
  const [sort, setSort] = useState('0');
  const [requiresReceipt, setRequiresReceipt] = useState(true);
  const [requiresVehicle, setRequiresVehicle] = useState(false);

  if (list.isError) return <Text style={styles.error}>{t('admin.loadFailed')}</Text>;

  return (
    <View style={styles.list}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('admin.add')}</Text>
        {extraFields ? (
          <TextField label={t('admin.countryCode')} autoCapitalize="characters" value={country} onChangeText={setCountry} />
        ) : null}
        <TextField label={t('admin.code')} value={code} onChangeText={setCode} />
        <TextField label={t('admin.labelFr')} value={fr} onChangeText={setFr} />
        <TextField label={t('admin.labelEn')} value={en} onChangeText={setEn} />
        {extraFields ? (
          <TextField label={t('admin.sortOrder')} keyboardType="number-pad" value={sort} onChangeText={setSort} />
        ) : null}
        {flags ? (
          <>
            <View style={styles.switchRow}>
              <Text style={styles.meta}>{t('admin.requiresReceipt')}</Text>
              <Switch value={requiresReceipt} onValueChange={setRequiresReceipt} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.meta}>{t('admin.requiresVehicle')}</Text>
              <Switch value={requiresVehicle} onValueChange={setRequiresVehicle} />
            </View>
          </>
        ) : null}
        <Button
          label={t('admin.add')}
          loading={insert.isPending}
          onPress={() => {
            void insert
              .mutateAsync(
                buildInsert({
                  country: country.trim().toUpperCase(),
                  code: code.trim(),
                  fr,
                  en,
                  sort,
                  requiresReceipt,
                  requiresVehicle,
                }),
              )
              .then(() => {
                setCode('');
                setFr('');
                setEn('');
              });
          }}
        />
      </Card>
      {(list.data ?? []).map((row) => (
        <LocalizedCard
          key={String(row.id)}
          title={`${row.country_code ?? ''} · ${row.code}`.replace(/^ · /, '')}
          names={nameKey === 'title_i18n' ? row.title_i18n : row.name_i18n}
          active={row.is_active !== false}
          hideActive={!hasActive}
          busy={update.isPending || remove.isPending}
          onSave={(patch) =>
            update.mutateAsync({
              id: String(row.id),
              patch: {
                [nameKey]: mergeLocalized(nameKey === 'title_i18n' ? row.title_i18n : row.name_i18n, patch),
                ...(hasActive ? { is_active: patch.active } : {}),
              },
            })
          }
          onDelete={() => remove.mutateAsync(String(row.id))}
        />
      ))}
    </View>
  );
}

type NamedRow = {
  id?: string;
  code?: string;
  kind?: string;
  name_i18n?: Json;
  title_i18n?: Json;
  is_active?: boolean;
  country_code?: string | null;
};

type TaxYearRow = {
  id: string;
  country_code: string;
  year: number;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
};

type IntegrityRow = {
  id: string;
  code: string;
  title_i18n: Json;
  is_active: boolean;
  severity: string;
};

type MileageMethodRow = {
  id: string;
  country_code: string;
  method_code: string;
  title_i18n: Json;
  is_available?: boolean;
};

type MileageTierRow = {
  id: string;
  method_id: string;
  min_distance: number | null;
  max_distance: number | null;
  rate_per_unit: number | null;
  distance_unit: string;
};

type AssistantRow = {
  id: string;
  code: string;
  title_i18n: Json;
  is_active: boolean;
};

function LocalizedCard({
  title,
  names,
  active,
  extra,
  hideActive,
  busy,
  onSave,
  onDelete,
}: {
  title: string;
  names: Json | null | undefined;
  active: boolean;
  extra?: string;
  hideActive?: boolean;
  busy: boolean;
  onSave: (patch: { fr: string; en: string; active: boolean }) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const current = mergeLocalized(names, {});
  const [fr, setFr] = useState(current.fr);
  const [en, setEn] = useState(current.en);
  const [isActive, setIsActive] = useState(active);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>
        {title}
        {extra ? ` · ${extra}` : ''}
      </Text>
      <TextField label={t('admin.labelFr')} value={fr} onChangeText={setFr} />
      <TextField label={t('admin.labelEn')} value={en} onChangeText={setEn} />
      {hideActive ? null : (
        <View style={styles.switchRow}>
          <Text style={styles.meta}>{t('admin.active')}</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>
      )}
      {message ? <Text style={message === t('admin.saved') ? styles.ok : styles.error}>{message}</Text> : null}
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
      <DeleteButton
        onDelete={() =>
          onDelete()
            .then(() => setMessage(t('admin.deleted')))
            .catch(() => setMessage(t('admin.deleteBlocked')))
        }
        busy={busy}
      />
    </Card>
  );
}

function DeleteButton({ onDelete, busy }: { onDelete: () => void; busy: boolean }) {
  const { t } = useTranslation();
  return (
    <Button
      label={t('common.delete')}
      variant="danger"
      loading={busy}
      onPress={() => {
        if (!confirmAction(t('admin.deleteRowConfirm'))) return;
        onDelete();
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.md,
  },
  hint: {
    ...type.caption,
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
