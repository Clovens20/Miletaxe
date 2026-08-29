import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { evaluateProposedReading, previousValidReading } from '@/features/mileage/engine';
import { useOdometerReading, useOdometerReadings, useOdometerRevisions, useUpdateOdometerReading } from '@/features/mileage/hooks';
import { readingKindLabel } from '@/features/mileage/labels';
import { getOdometerPhotoUrl } from '@/features/mileage/storage';
import { formatDateTime, formatDistance, parseDecimal } from '@/lib/format';
import type { SupportedLocale } from '@/types/domain';
import { colors, radius, space, type } from '@/theme';

export default function OdometerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const reading = useOdometerReading(id);
  const all = useOdometerReadings(reading.data?.vehicle_id);
  const revisions = useOdometerRevisions(id);
  const update = useUpdateOdometerReading();
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [forceInvalid, setForceInvalid] = useState(false);
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;

  useEffect(() => {
    if (!reading.data) return;
    setValue(String(reading.data.reading));
    setNotes(reading.data.notes ?? '');
    if (reading.data.photo_path) {
      void getOdometerPhotoUrl(reading.data.photo_path).then(setPhotoUrl);
    }
  }, [reading.data]);

  const parsed = parseDecimal(value);
  const evaluation = useMemo(() => {
    if (!reading.data || parsed == null) return undefined;
    const others = (all.data ?? []).filter((row) => row.id !== reading.data?.id);
    return evaluateProposedReading(previousValidReading(others, reading.data.recorded_at), {
      reading: parsed,
      unit: reading.data.unit,
      recorded_on: reading.data.recorded_on,
      recorded_at: reading.data.recorded_at,
    });
  }, [all.data, parsed, reading.data]);

  if (!reading.data) {
    return (
      <Screen title={t('mileage.detailTitle')}>
        <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const row = reading.data;

  return (
    <Screen title={t('mileage.detailTitle')} scroll>
      {!row.is_valid ? (
        <WarningBanner tone="danger" title={t('mileage.excluded')} body={t('mileage.monotonicTitle')} />
      ) : null}
      {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} /> : null}
      {row.photo_path ? <Text style={styles.hint}>{t('mileage.photoStored')}</Text> : null}
      <Card>
        <Text style={styles.meta}>
          {readingKindLabel(row.kind, t)} · {formatDateTime(row.recorded_at, locale, profile?.country_code)}
        </Text>
        <Badge label={row.source === 'ocr' ? t('mileage.extracted') : t('mileage.kindManual')} />
      </Card>
      <TextField
        label={`${t('mileage.reading')} (${row.unit})`}
        keyboardType="decimal-pad"
        value={value}
        onChangeText={(next) => {
          setForceInvalid(false);
          setValue(next);
        }}
      />
      {evaluation && !evaluation.is_valid ? (
        <WarningBanner
          tone="danger"
          title={t('mileage.monotonicTitle')}
          body={t('mileage.monotonicWarning', {
            previous: evaluation.previous
              ? formatDistance(evaluation.previous.reading, evaluation.previous.unit, locale, profile?.country_code)
              : '',
          })}
        />
      ) : null}
      <TextField label={t('mileage.notes')} value={notes} onChangeText={setNotes} />
      <Button
        label={forceInvalid && evaluation && !evaluation.is_valid ? t('mileage.monotonicSave') : t('common.save')}
        loading={update.isPending}
        onPress={async () => {
          const next = parseDecimal(value);
          if (next == null) return;
          if (evaluation && !evaluation.is_valid && !forceInvalid) {
            setForceInvalid(true);
            return;
          }
          await update.mutateAsync({
            id: row.id,
            reading: next,
            notes,
            saveDespiteInvalid: Boolean(evaluation && !evaluation.is_valid),
          });
          router.back();
        }}
      />
      <Text style={styles.section}>{t('mileage.auditTitle')}</Text>
      {!revisions.data?.length ? (
        <Text style={styles.hint}>{t('mileage.auditEmpty')}</Text>
      ) : (
        revisions.data.map((item) => (
          <ListRow
            key={item.id}
            title={`${item.field_name}: ${item.old_value ?? '—'} → ${item.new_value ?? '—'}`}
            subtitle={`${item.reason} · ${formatDateTime(item.created_at, locale, profile?.country_code)}`}
          />
        ))
      )}
      {row.extracted_reading != null && row.extracted_reading !== row.reading ? (
        <Text style={styles.hint}>
          {t('mileage.extracted')}: {formatDistance(row.extracted_reading, row.unit, locale, profile?.country_code)}
        </Text>
      ) : null}
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
  },
  meta: {
    ...type.bodyMedium,
    color: colors.text,
    marginBottom: space.xs,
  },
  section: {
    ...type.section,
    color: colors.text,
  },
});
