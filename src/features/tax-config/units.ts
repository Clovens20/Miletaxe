import type { DistanceUnit } from '@/types/domain';

/** Canada → km, États-Unis → mi. Autres pays : km par défaut. */
export function distanceUnitForCountry(countryCode?: string | null): DistanceUnit {
  if ((countryCode ?? '').toUpperCase() === 'US') return 'mi';
  return 'km';
}

/**
 * Unité affichée / enregistrée : le pays prime toujours.
 * On ne convertit jamais les chiffres — seulement le libellé (km vs mi).
 */
export function resolveDistanceUnit(
  countryCode?: string | null,
  stored?: DistanceUnit | null,
): DistanceUnit {
  if (countryCode) return distanceUnitForCountry(countryCode);
  return stored ?? 'km';
}

export function distanceUnitLabel(unit: DistanceUnit, t: (key: string) => string) {
  return unit === 'mi' ? t('onboarding.mi') : t('onboarding.km');
}
