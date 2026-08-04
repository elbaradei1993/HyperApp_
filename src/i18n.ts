import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './locales/en.json';
import commonEnTranslations from './locales/common.json';

const resources = {
  en: {
    translation: {
      ...commonEnTranslations,
      ...enTranslations,
    },
  },
};

const applyEnglishDocumentSettings = () => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
  document.documentElement.classList.remove('rtl');
  document.documentElement.classList.add('ltr');
  document.body?.classList.remove('rtl');
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en'],
    debug: false,
    interpolation: { escapeValue: false },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
    saveMissing: false,
  });

applyEnglishDocumentSettings();
i18n.on('languageChanged', applyEnglishDocumentSettings);

export const rtlLanguages: readonly string[] = [];
export const isRTL = (): boolean => false;

export default i18n;
