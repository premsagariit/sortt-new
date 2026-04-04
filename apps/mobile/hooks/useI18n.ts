import { useCallback } from 'react';

import {
  getLanguageDisplayName,
  getLocaleTag,
  translate,
  type SupportedLanguage,
} from '../lib/i18n';
import { useLanguageStore } from '../store/languageStore';

export function useI18n() {
  const language = useLanguageStore((state) => state.language);

  const t = useCallback(
    (text: string, params?: Record<string, string | number>) => {
      return translate(text, { language, params });
    },
    [language]
  );

  const getLanguageName = useCallback(
    (targetLanguage: SupportedLanguage) => {
      return getLanguageDisplayName(targetLanguage, language);
    },
    [language]
  );

  return {
    language,
    locale: getLocaleTag(language),
    t,
    getLanguageName,
  };
}
