import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ChoiceList } from '@/components/ui/ChoiceList';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  labelOf,
  useCountries,
  useJurisdictions,
  useOccupations,
} from '@/features/tax-config/hooks';
import type { SupportedLocale } from '@/types/domain';
import { colors, type } from '@/theme';

export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const { updateProfile } = useAuth();
  const countries = useCountries();
  const occupations = useOccupations();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [occupancy, setOccupancy] = useState('');
  const [countryCode, setCountryCode] = useState('CA');
  const [jurisdictionId, setJurisdictionId] = useState('');
  const [unit, setUnit] = useState<'km' | 'mi'>('km');
  const [cadence, setCadence] = useState<'annual' | 'semiannual'>('annual');
  const [saving, setSaving] = useState(false);

  const jurisdictions = useJurisdictions(countryCode);
  const selectedCountry = countries.data?.find((row) => row.code === countryCode);

  const countryOptions = useMemo(
    () => (countries.data ?? []).map((row) => ({ value: row.code, label: labelOf(row, locale) })),
    [countries.data, locale],
  );
  const occupationOptions = useMemo(
    () => (occupations.data ?? []).map((row) => ({ value: row.code, label: labelOf(row, locale) })),
    [occupations.data, locale],
  );
  const jurisdictionOptions = useMemo(
    () => (jurisdictions.data ?? []).map((row) => ({ value: row.id, label: labelOf(row, locale) })),
    [jurisdictions.data, locale],
  );

  const finish = async () => {
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        occupancy,
        country_code: countryCode,
        jurisdiction_id: jurisdictionId,
        default_distance_unit: unit,
        default_currency: selectedCountry?.default_currency ?? 'CAD',
        reporting_cadence: cadence,
        onboarding_completed_at: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.step}>{t('onboarding.stepLabel', { current: step + 1, total: 4 })}</Text>
      {step === 0 ? (
        <>
          <Text style={styles.title}>{t('onboarding.helloTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.helloSubtitle')}</Text>
          <TextField label={t('onboarding.fullName')} value={fullName} onChangeText={setFullName} />
          <Text style={styles.label}>{t('onboarding.occupation')}</Text>
          <ChoiceList options={occupationOptions} value={occupancy} onChange={setOccupancy} />
          <Button
            label={t('common.continue')}
            disabled={!fullName.trim() || !occupancy}
            onPress={() => setStep(1)}
          />
        </>
      ) : null}
      {step === 1 ? (
        <>
          <Text style={styles.title}>{t('onboarding.placeTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.placeSubtitle')}</Text>
          <Text style={styles.label}>{t('onboarding.country')}</Text>
          <ChoiceList
            options={countryOptions}
            value={countryCode}
            onChange={(value) => {
              setCountryCode(value);
              setJurisdictionId('');
              const next = countries.data?.find((row) => row.code === value);
              if (next) setUnit(next.default_distance_unit);
            }}
          />
          <Text style={styles.label}>{t('onboarding.jurisdiction')}</Text>
          <ChoiceList options={jurisdictionOptions} value={jurisdictionId} onChange={setJurisdictionId} />
          <Button label={t('common.back')} variant="ghost" onPress={() => setStep(0)} />
          <Button label={t('common.continue')} disabled={!jurisdictionId} onPress={() => setStep(2)} />
        </>
      ) : null}
      {step === 2 ? (
        <>
          <Text style={styles.title}>{t('onboarding.unitsTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.unitsSubtitle')}</Text>
          <Text style={styles.label}>{t('onboarding.distanceUnit')}</Text>
          <SegmentedControl
            value={unit}
            onChange={(value) => setUnit(value as 'km' | 'mi')}
            options={[
              { value: 'km', label: t('onboarding.km') },
              { value: 'mi', label: t('onboarding.mi') },
            ]}
          />
          <Text style={styles.currency}>
            {t('onboarding.currency')}: {selectedCountry?.default_currency}
          </Text>
          <DisclaimerBanner />
          <Button label={t('common.back')} variant="ghost" onPress={() => setStep(1)} />
          <Button label={t('common.continue')} onPress={() => setStep(3)} />
        </>
      ) : null}
      {step === 3 ? (
        <>
          <Text style={styles.title}>{t('onboarding.cadenceTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.cadenceSubtitle')}</Text>
          <ChoiceList
            value={cadence}
            onChange={(value) => setCadence(value as 'annual' | 'semiannual')}
            options={[
              { value: 'annual', label: t('onboarding.cadenceAnnual') },
              { value: 'semiannual', label: t('onboarding.cadenceSemiannual') },
            ]}
          />
          <Text style={styles.currency}>{t('onboarding.cadenceMonthlyHint')}</Text>
          <DisclaimerBanner />
          <Button label={t('common.back')} variant="ghost" onPress={() => setStep(2)} />
          <Button label={t('onboarding.finish')} loading={saving} onPress={() => void finish()} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: {
    ...type.captionMedium,
    color: colors.accent,
  },
  title: {
    ...type.title,
    color: colors.text,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
  },
  label: {
    ...type.label,
    color: colors.text,
  },
  currency: {
    ...type.bodyMedium,
    color: colors.text,
  },
});
