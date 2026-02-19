import type { Locale } from "@/src/lib/i18n-config";

const labels: Record<Locale, { blog: string; playground: string }> = {
  en: { blog: "Blog", playground: "Playground" },
  fr: { blog: "Blog", playground: "Playground" },
  de: { blog: "Blog", playground: "Playground" },
  it: { blog: "Blog", playground: "Playground" },
  es: { blog: "Blog", playground: "Playground" },
  ar: { blog: "المدونة", playground: "ساحة التجربة" },
  zh: { blog: "博客", playground: "演练场" },
};

export function getLocalizedNavLabels(locale: Locale) {
  return labels[locale] ?? labels.en;
}
