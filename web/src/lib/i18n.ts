// lib/i18n.ts - i18next configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../../public/locales/en.json';
import es from '../../public/locales/es.json';
import fr from '../../public/locales/fr.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    detection: {
      order: ['cookie', 'navigator', 'htmlTag'],
      lookupCookie: 'i18next',
      caches: ['cookie'],
      cookieMinutes: 60 * 24 * 365,
    },
    // Initial language from cookie if available (helps with hydration match)
    lng: typeof window !== 'undefined'
      ? (document.cookie.match(/(?:^|;)\s*i18next\s*=\s*(en|es|fr)(?:;|$)/)?.[1] || 'en')
      : 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr'],
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: false, // Fixes hydration issues in Astro
    },
  });

export default i18n;
