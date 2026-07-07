import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ar from './ar.json';

const STORAGE_KEY = 'tombola.locale';

export function currentLocale(): 'en' | 'ar' {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export function applyDir(locale: 'en' | 'ar') {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export function setLocale(locale: 'en' | 'ar') {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore storage failures (private mode, locked-down webviews)
  }
  applyDir(locale);
  void i18n.changeLanguage(locale).catch(() => {});
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: currentLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

applyDir(currentLocale());

export default i18n;
