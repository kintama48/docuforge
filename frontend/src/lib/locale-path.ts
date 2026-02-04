import { locales, type Locale } from "./i18n-config";

function normalizePath(pathname: string) {
  if (!pathname.startsWith("/")) return `/${pathname}`;
  return pathname;
}

export function stripLocalePath(pathname: string): {
  locale: Locale | null;
  basePath: string;
} {
  const normalized = normalizePath(pathname);
  const segments = normalized.split("/");
  const maybeLocale = segments[1];
  if (locales.includes(maybeLocale as Locale)) {
    const rest = segments.slice(2).join("/");
    const basePath = rest ? `/${rest}` : "/";
    return { locale: maybeLocale as Locale, basePath };
  }
  return { locale: null, basePath: normalized || "/" };
}

export function withLocale(path: string, locale: Locale) {
  const [base, hash] = path.split("#");
  const [pathname, search] = base.split("?");
  const { basePath } = stripLocalePath(pathname);
  const localizedBase =
    locale === "en"
      ? basePath
      : `/${locale}${basePath === "/" ? "" : basePath}`;
  const withSearch = search ? `${localizedBase}?${search}` : localizedBase;
  return hash ? `${withSearch}#${hash}` : withSearch;
}

export function createLocalePath(locale: Locale) {
  return (path: string) => withLocale(path, locale);
}
