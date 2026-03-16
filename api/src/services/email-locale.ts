export const emailLocales = ['en', 'fr', 'de', 'it', 'es', 'ar', 'zh'] as const;

export type EmailLocale = (typeof emailLocales)[number];

const emailLocaleSet = new Set<EmailLocale>(emailLocales);

export interface ResolveEmailLocaleInput {
  headerLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}

function normalizeLocaleToken(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-');
}

export function normalizeEmailLocale(value: string | null | undefined): EmailLocale | null {
  if (!value) return null;
  const token = normalizeLocaleToken(value);
  if (!token) return null;

  const primary = token.split('-')[0];
  if (!primary) return null;

  if (!emailLocaleSet.has(primary as EmailLocale)) {
    return null;
  }

  return primary as EmailLocale;
}

export function resolveEmailLocaleFromAcceptLanguage(value: string | null | undefined): EmailLocale | null {
  if (!value) return null;
  const entries = value.split(',');

  for (const entry of entries) {
    const language = entry.split(';')[0];
    if (!language) continue;
    const locale = normalizeEmailLocale(language);
    if (locale) return locale;
  }

  return null;
}

export function resolveEmailLocale(input: ResolveEmailLocaleInput): EmailLocale {
  const fromHeader = normalizeEmailLocale(input.headerLocale);
  if (fromHeader) return fromHeader;

  const fromCookie = normalizeEmailLocale(input.cookieLocale);
  if (fromCookie) return fromCookie;

  const fromAcceptLanguage = resolveEmailLocaleFromAcceptLanguage(input.acceptLanguage);
  if (fromAcceptLanguage) return fromAcceptLanguage;

  return 'en';
}
