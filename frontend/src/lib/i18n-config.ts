export const locales = ["en", "fr", "de", "it", "es", "ar", "zh"] as const;
export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  es: "Español",
  ar: "العربية",
  zh: "中文",
};

export function normalizeLocale(input: string | null | undefined): Locale {
  if (!input) return "en";
  const lowered = input.toLowerCase();
  if (lowered.startsWith("fr")) return "fr";
  if (lowered.startsWith("de")) return "de";
  if (lowered.startsWith("it")) return "it";
  if (lowered.startsWith("es")) return "es";
  if (lowered.startsWith("ar")) return "ar";
  if (lowered.startsWith("zh")) return "zh";
  return "en";
}

export function isRtl(locale: Locale) {
  return locale === "ar";
}
