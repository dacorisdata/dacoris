// ─── Supported locales ──────────────────────────────────────────────────────
// Add a new entry here (and a matching translations/<code>.js file) to
// support another language across the app.

export const LOCALES = {
  en: { code: 'en', label: 'English',  nativeLabel: 'English',  dir: 'ltr' },
  sw: { code: 'sw', label: 'Swahili',  nativeLabel: 'Kiswahili', dir: 'ltr' },
  fr: { code: 'fr', label: 'French',   nativeLabel: 'Français', dir: 'ltr' },
  ar: { code: 'ar', label: 'Arabic',   nativeLabel: 'العربية',  dir: 'rtl' },
};

export const LOCALE_LIST = Object.values(LOCALES);

export const DEFAULT_LOCALE = 'en';
