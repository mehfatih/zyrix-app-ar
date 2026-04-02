/**
 * Zyrix App (AR Edition) — Translation Hook
 * Supports: AR (default), EN
 * Arabic = RTL, English = LTR
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { I18nManager } from 'react-native';
import type { AppLanguage } from '../types';

import ar from '../i18n/ar.json';
import en from '../i18n/en.json';

type TranslationMap = Record<string, any>;

const TRANSLATIONS: Record<AppLanguage, TranslationMap> = { ar, en, tr: en };

const RTL_LANGUAGES: AppLanguage[] = ['ar'];

function getNestedValue(obj: TranslationMap, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) return acc[key];
    return undefined;
  }, obj) as unknown as string | undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (str, [key, value]) => str.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value)),
    template,
  );
}

let _currentLanguage: AppLanguage = 'ar';
const _listeners: Set<(lang: AppLanguage) => void> = new Set();

export function setAppLanguage(lang: AppLanguage) {
  _currentLanguage = lang;
  const isRTL = RTL_LANGUAGES.includes(lang);
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
    I18nManager.allowRTL(isRTL);
  }
  _listeners.forEach((cb) => cb(lang));
}

export function getAppLanguage(): AppLanguage {
  return _currentLanguage;
}

export function useTranslation() {
  const [language, setLanguage] = useState<AppLanguage>(_currentLanguage);

  useEffect(() => {
    const handler = (lang: AppLanguage) => setLanguage(lang);
    _listeners.add(handler);
    return () => { _listeners.delete(handler); };
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const value = getNestedValue((TRANSLATIONS as any)[language], key);
      if (value === undefined) {
        const fallback = getNestedValue(TRANSLATIONS.en, key);
        if (fallback !== undefined) return interpolate(fallback, params);
        return key;
      }
      return interpolate(value, params);
    },
    [language],
  );

  const isRTL = useMemo(() => RTL_LANGUAGES.includes(language), [language]);

  const changeLanguage = useCallback((lang: AppLanguage) => {
    setAppLanguage(lang);
  }, []);

  const direction = useMemo(
    () => ({
      flexDirection: isRTL ? ('row-reverse' as const) : ('row' as const),
      textAlign: isRTL ? ('right' as const) : ('left' as const),
      writingDirection: isRTL ? ('rtl' as const) : ('ltr' as const),
    }),
    [isRTL],
  );

  return { t, language, isRTL, changeLanguage, direction };
}

export default useTranslation;
