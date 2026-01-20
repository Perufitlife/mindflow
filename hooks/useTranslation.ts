// hooks/useTranslation.ts
import { useCallback, useEffect, useState } from 'react';
import { Language, translations, TranslationKeys } from '../i18n/translations';
import { getPreferences } from '../services/user';

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string ? K | `${K}.${NestedKeyOf<T[K]>}` : never }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<TranslationKeys>;

// Get nested value from object using dot notation
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
}

// Global language state (simple approach without context)
let currentLanguage: Language = 'en';
let listeners: Set<() => void> = new Set();

export function setGlobalLanguage(lang: Language) {
  currentLanguage = lang;
  listeners.forEach((listener) => listener());
}

export function getGlobalLanguage(): Language {
  return currentLanguage;
}

export function useTranslation() {
  const [language, setLanguage] = useState<Language>(currentLanguage);

  useEffect(() => {
    // Load saved language on mount
    loadSavedLanguage();

    // Subscribe to language changes
    const listener = () => setLanguage(currentLanguage);
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  async function loadSavedLanguage() {
    try {
      const prefs = await getPreferences();
      if (prefs.language && prefs.language !== currentLanguage) {
        currentLanguage = prefs.language as Language;
        setLanguage(currentLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  }

  const t = useCallback(
    (key: string): string => {
      const langTranslations = translations[language] || translations.en;
      return getNestedValue(langTranslations, key);
    },
    [language]
  );

  return {
    t,
    language,
    setLanguage: (lang: Language) => {
      setGlobalLanguage(lang);
    },
  };
}

// Hook specifically for getting Whisper language code
export function useWhisperLanguage(): string {
  const { language } = useTranslation();
  
  // Whisper uses same codes for these languages
  const whisperCodes: Record<Language, string> = {
    en: 'en',
    es: 'es',
    pt: 'pt',
    fr: 'fr',
    de: 'de',
  };
  
  return whisperCodes[language] || 'en';
}
