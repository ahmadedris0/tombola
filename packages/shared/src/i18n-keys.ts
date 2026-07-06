/**
 * Canonical i18n message keys shared across apps. Each app ships en.json / ar.json
 * resource files whose keys must match these. Kept flat and minimal for M0.
 */
export const messageKeys = [
  'app.title',
  'app.tagline',
  'lang.switchToArabic',
  'lang.switchToEnglish',
] as const;

export type MessageKey = (typeof messageKeys)[number];
