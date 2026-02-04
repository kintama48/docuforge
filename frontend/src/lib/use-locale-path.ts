"use client";

import { useI18n } from "@/src/lib/i18n";
import { withLocale } from "@/src/lib/locale-path";

export function useLocalePath() {
  const { locale } = useI18n();
  return (path: string) => withLocale(path, locale);
}
