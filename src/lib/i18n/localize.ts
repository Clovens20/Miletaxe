import type { LocalizedString, SupportedLocale } from '@/types/domain';

export function localize(
  value: LocalizedString | null | undefined,
  locale: SupportedLocale,
  fallback = '',
): string {
  if (!value) return fallback;
  return value[locale] || value.fr || value.en || fallback;
}

export function intlLocale(language: SupportedLocale, countryCode?: string | null): string {
  if (language === 'fr') {
    return countryCode === 'US' ? 'fr-US' : 'fr-CA';
  }
  return countryCode === 'CA' ? 'en-CA' : 'en-US';
}
