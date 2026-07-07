'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations } from '../lib/i18n/translations';
import { LOCALES, LOCALE_LIST, DEFAULT_LOCALE } from '../lib/i18n/locales';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'dacoris-language';

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => (params[key] !== undefined ? params[key] : `{${key}}`));
}

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  // Restore the saved language preference on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LOCALES[saved]) {
        setLocaleState(saved);
      }
    } catch {}
  }, []);

  // Keep <html lang> / <html dir> in sync so the browser, assistive tech,
  // and CSS `:dir()` selectors all reflect the active language.
  useEffect(() => {
    const meta = LOCALES[locale] || LOCALES[DEFAULT_LOCALE];
    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
  }, [locale]);

  const setLocale = useCallback((code) => {
    if (!LOCALES[code]) return;
    setLocaleState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  }, []);

  const t = useCallback((key, params) => {
    const dict = translations[locale] || translations[DEFAULT_LOCALE];
    const fallbackDict = translations[DEFAULT_LOCALE];
    const value = getNested(dict, key) ?? getNested(fallbackDict, key) ?? key;
    return typeof value === 'string' ? interpolate(value, params) : value;
  }, [locale]);

  const dir = (LOCALES[locale] || LOCALES[DEFAULT_LOCALE]).dir;

  const value = useMemo(() => ({
    locale,
    setLocale,
    t,
    dir,
    locales: LOCALE_LIST,
  }), [locale, setLocale, t, dir]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
