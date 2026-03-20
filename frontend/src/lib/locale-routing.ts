import { normalizeLocale, type Locale } from "@/src/lib/i18n-config";
import { withLocale } from "@/src/lib/locale-path";
import { isConsolePath } from "@/src/lib/public-route-contract";

type ResolveRouteLocaleInput = {
  basePath: string;
  pathLocale: Locale | null;
  requestedLocale: string | null | undefined;
  cookieLocale: string | null | undefined;
  acceptLanguage: string | null | undefined;
  consoleRequest: boolean;
};

type LocaleRedirectDecision = {
  kind: "redirect";
  locale: Locale;
  redirectPath: string;
  status: 307 | 308;
  persistLocale: Locale;
  varyOnCookie: boolean;
  varyOnAcceptLanguage: boolean;
};

type LocaleServeDecision = {
  kind: "serve";
  locale: Locale;
  persistLocale: Locale | null;
  rewriteToBasePath: boolean;
  varyOnCookie: boolean;
  varyOnAcceptLanguage: boolean;
};

export type RouteLocaleDecision = LocaleRedirectDecision | LocaleServeDecision;

export function resolvePreferredLocale(input: {
  requestedLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}) {
  return normalizeLocale(
    input.requestedLocale || input.cookieLocale || input.acceptLanguage
  );
}

export function resolveRouteLocale(
  input: ResolveRouteLocaleInput
): RouteLocaleDecision {
  const preferredLocale = resolvePreferredLocale({
    requestedLocale: input.requestedLocale,
    cookieLocale: input.cookieLocale,
    acceptLanguage: input.acceptLanguage,
  });

  if (input.requestedLocale) {
    return {
      kind: "redirect",
      locale: preferredLocale,
      redirectPath: withLocale(input.basePath, preferredLocale),
      status: 308,
      persistLocale: preferredLocale,
      varyOnCookie: false,
      varyOnAcceptLanguage: false,
    };
  }

  if (input.pathLocale === "en") {
    return {
      kind: "redirect",
      locale: "en",
      redirectPath: input.basePath,
      status: 308,
      persistLocale: "en",
      varyOnCookie: false,
      varyOnAcceptLanguage: false,
    };
  }

  if (input.pathLocale) {
    return {
      kind: "serve",
      locale: input.pathLocale,
      persistLocale: input.pathLocale,
      rewriteToBasePath: true,
      varyOnCookie: false,
      varyOnAcceptLanguage: false,
    };
  }

  if (input.consoleRequest) {
    return {
      kind: "serve",
      locale: preferredLocale,
      persistLocale: null,
      rewriteToBasePath: false,
      varyOnCookie: true,
      varyOnAcceptLanguage: true,
    };
  }

  if (input.basePath === "/" && preferredLocale !== "en") {
    return {
      kind: "redirect",
      locale: preferredLocale,
      redirectPath: withLocale(input.basePath, preferredLocale),
      status: 307,
      persistLocale: preferredLocale,
      varyOnCookie: true,
      varyOnAcceptLanguage: true,
    };
  }

  return {
    kind: "serve",
    locale: "en",
    persistLocale: null,
    rewriteToBasePath: false,
    varyOnCookie: false,
    varyOnAcceptLanguage: false,
  };
}

export function shouldUseClientLocalePreference(basePath: string) {
  return basePath === "/" || isConsolePath(basePath);
}
