import { NextResponse, type NextRequest } from "next/server";
import { normalizeLocale } from "./src/lib/i18n-config";
import { stripLocalePath, withLocale } from "./src/lib/locale-path";

const marketingUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://docuforge.app";

const consoleUrl =
  process.env.NEXT_PUBLIC_CONSOLE_URL || "https://console.docuforge.app";

function safeOrigin(value: string, fallback: string) {
  try {
    return new URL(value).origin;
  } catch {
    return new URL(fallback).origin;
  }
}

function safeHost(value: string, fallback: string) {
  try {
    return new URL(value).host;
  } catch {
    return new URL(fallback).host;
  }
}

const marketingOrigin = safeOrigin(marketingUrl, "https://docuforge.app");
const consoleOrigin = safeOrigin(consoleUrl, "https://console.docuforge.app");
const marketingHost = safeHost(marketingOrigin, "https://docuforge.app");
const consoleHost = safeHost(consoleOrigin, "https://console.docuforge.app");

const marketingExact = new Set([
  "/pricing",
  "/plans",
  "/terms",
  "/privacy",
  "/content-policy",
  "/blog",
  "/templates",
  "/compare",
  "/industries",
  "/playground",
]);
const marketingPrefixes = [
  "/docs",
  "/og",
  "/blog",
  "/templates",
  "/compare",
  "/industries",
  "/playground",
];
const consolePrefixes = [
  "/dashboard",
  "/editor",
  "/settings",
  "/onboarding",
  "/login",
  "/register",
  "/oauth",
];

function isMarketingPath(basePath: string) {
  if (basePath === "/") return true;
  if (marketingExact.has(basePath)) return true;
  return marketingPrefixes.some(
    (prefix) => basePath === prefix || basePath.startsWith(`${prefix}/`)
  );
}

function isConsolePath(basePath: string) {
  return consolePrefixes.some(
    (prefix) => basePath === prefix || basePath.startsWith(`${prefix}/`)
  );
}

function buildRedirect(baseUrl: string, requestUrl: URL) {
  return NextResponse.redirect(
    new URL(`${requestUrl.pathname}${requestUrl.search}`, baseUrl),
    308
  );
}

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const hostHeader =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostname = hostHeader.split(":")[0];
  const isMarketingHost = hostname === marketingHost;
  const isConsoleHost = hostname === consoleHost;

  const { locale: pathLocale, basePath } = stripLocalePath(nextUrl.pathname);

  if (basePath === "/robots.txt") {
    const body = isConsoleHost
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *\nAllow: /\nSitemap: ${nextUrl.origin}/sitemap.xml\n`;
    const response = new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
    if (isConsoleHost) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  }

  if (isMarketingHost && isConsolePath(basePath)) {
    return buildRedirect(consoleOrigin, nextUrl);
  }

  if (isConsoleHost && isMarketingPath(basePath)) {
    return buildRedirect(marketingOrigin, nextUrl);
  }

  const requestedLocale = nextUrl.searchParams.get("lang");
  const cookieLocale = request.cookies.get("docuforge-locale")?.value;
  const acceptLanguage = request.headers.get("accept-language")?.split(",")[0];
  const resolvedLocale = normalizeLocale(
    pathLocale || requestedLocale || cookieLocale || acceptLanguage
  );

  if (requestedLocale) {
    const target = new URL(withLocale(basePath, resolvedLocale), nextUrl.origin);
    const params = new URLSearchParams(nextUrl.searchParams);
    params.delete("lang");
    const query = params.toString();
    if (query) target.search = query;
    return NextResponse.redirect(target, 308);
  }

  if (pathLocale === "en") {
    const target = new URL(basePath, nextUrl.origin);
    target.search = nextUrl.search;
    return NextResponse.redirect(target, 308);
  }

  if (!pathLocale && resolvedLocale !== "en") {
    const target = new URL(withLocale(basePath, resolvedLocale), nextUrl.origin);
    target.search = nextUrl.search;
    return NextResponse.redirect(target, 308);
  }

  const finalLocale = pathLocale || resolvedLocale;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-docuforge-locale", finalLocale);
  requestHeaders.set("x-docuforge-path", basePath);
  requestHeaders.set("x-docuforge-host", hostname);

  const rewriteTarget = pathLocale
    ? new URL(`${basePath}${nextUrl.search}`, nextUrl.origin)
    : null;

  const response = rewriteTarget
    ? NextResponse.rewrite(rewriteTarget, {
        request: {
          headers: requestHeaders,
        },
      })
    : NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

  const cookieDomain = hostname.endsWith(".docuforge.app")
    ? ".docuforge.app"
    : undefined;

  response.cookies.set("docuforge-locale", finalLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    domain: cookieDomain,
  });

  if (isConsoleHost) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
