import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import fr from './locales/fr.json';
import en from './locales/en.json';
import type { SupportedLocale } from '@/types/domain';

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'fr';
const initialLocale: SupportedLocale = deviceLanguage === 'en' ? 'en' : 'fr';

void i18n.use(initReactI18next).init({
  lng: initialLocale,
  fallbackLng: 'fr',
  supportedLngs: ['fr', 'en'],
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
  returnObjects: true,
});

export function setAppLocale(locale: SupportedLocale) {
  void i18n.changeLanguage(locale);
}

export { i18n };
