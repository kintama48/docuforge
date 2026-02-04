"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { localeLabels, locales, useI18n, type Locale } from "@/src/lib/i18n";
import { stripLocalePath, withLocale } from "@/src/lib/locale-path";

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value as Locale;
          setLocale(nextLocale);
          const params = new URLSearchParams(searchParams?.toString());
          params.delete("lang");
          const { basePath } = stripLocalePath(pathname || "/");
          const target = withLocale(basePath, nextLocale);
          const query = params.toString();
          router.replace(query ? `${target}?${query}` : target);
        }}
        className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--ink)]"
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
