import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ar from './ar.json';

const STORAGE_KEY = 'tombola.locale';

export function currentLocale(): 'en' | 'ar' {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'ar' ? 'ar' : 'en';
}

export function applyDir(locale: 'en' | 'ar') {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export function setLocale(locale: 'en' | 'ar') {
  localStorage.setItem(STORAGE_KEY, locale);
  applyDir(locale);
  void i18n.changeLanguage(locale);
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: currentLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

applyDir(currentLocale());

export default i18n;
