import { env } from "@/src/config/env";
import type { Locale } from "@/src/lib/i18n-config";
import { withLocale } from "@/src/lib/locale-path";

function normalizeBase(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function normalizePath(path: string) {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

export function joinUrl(base: string, path: string) {
  const cleanBase = normalizeBase(base);
  const cleanPath = normalizePath(path);
  return `${cleanBase}${cleanPath}`;
}

export function getMarketingUrl(path = "/") {
  return joinUrl(env.marketingUrl, path);
}

export function getConsoleUrl(path = "/") {
  return joinUrl(env.consoleUrl, path);
}

export function getMarketingLocaleUrl(path: string, locale: Locale) {
  return getMarketingUrl(withLocale(path, locale));
}

export function getConsoleLocaleUrl(path: string, locale: Locale) {
  return getConsoleUrl(withLocale(path, locale));
}
