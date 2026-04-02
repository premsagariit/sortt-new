export type SupportedLanguage = 'en' | 'te' | 'hi';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const normalizeLanguage = (value?: string | null): SupportedLanguage => {
  if (!value) return DEFAULT_LANGUAGE;

  const token = value
    .split(',')[0]
    ?.split(';')[0]
    ?.trim()
    .toLowerCase()
    .replace('_', '-')
    .split('-')[0];

  if (token === 'te') return 'te';
  if (token === 'hi') return 'hi';
  return DEFAULT_LANGUAGE;
};

export const resolveRequestLanguage = (params: {
  explicit?: string | null;
  header?: string | null;
  userPreferred?: string | null;
}): SupportedLanguage => {
  if (params.explicit) return normalizeLanguage(params.explicit);
  if (params.header) return normalizeLanguage(params.header);
  if (params.userPreferred) return normalizeLanguage(params.userPreferred);
  return DEFAULT_LANGUAGE;
};
