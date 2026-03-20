import { NextResponse, type NextRequest } from "next/server";
import { stripLocalePath } from "./lib/locale-path";
import { resolveRouteLocale } from "./lib/locale-routing";
import {
  isConsolePath,
  isMarketingPath,
} from "./lib/public-route-contract";

const marketingUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.docuforge.app";

const consoleUrl =
  process.env.NEXT_PUBLIC_CONSOLE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.docuforge.app";

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

const marketingOrigin = safeOrigin(marketingUrl, "https://www.docuforge.app");
const consoleOrigin = safeOrigin(consoleUrl, "https://console.docuforge.app");
const marketingHost = safeHost(marketingOrigin, "https://www.docuforge.app");
const consoleHost = safeHost(consoleOrigin, "https://console.docuforge.app");

function buildRedirect(baseUrl: string, requestUrl: URL, status = 308) {
  return NextResponse.redirect(
    new URL(`${requestUrl.pathname}${requestUrl.search}`, baseUrl),
    status
  );
}

function appendVary(
  response: NextResponse,
  values: Array<"Accept-Language" | "Cookie">
) {
  if (values.length === 0) return;
  const existing = response.headers.get("Vary");
  const parts = new Set(
    (existing ? existing.split(",") : [])
      .map((value) => value.trim())
      .filter(Boolean)
  );
  values.forEach((value) => parts.add(value));
  response.headers.set("Vary", Array.from(parts).join(", "));
}

function applyLocaleCookie(
  response: NextResponse,
  locale: string,
  hostname: string
) {
  const cookieDomain = hostname.endsWith(".docuforge.app")
    ? ".docuforge.app"
    : undefined;

  response.cookies.set("docuforge-locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    domain: cookieDomain,
  });
}

export function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const hostHeader =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostname = hostHeader.split(":")[0];
  const sameHostDeployment = marketingHost === consoleHost;
  const isMarketingHost = hostname === marketingHost;
  const isConsoleHost = hostname === consoleHost;

  const { locale: pathLocale, basePath } = stripLocalePath(nextUrl.pathname);
  const consoleRequest = sameHostDeployment
    ? isConsolePath(basePath)
    : isConsoleHost;

  if (basePath === "/robots.txt") {
    const body = !sameHostDeployment && consoleRequest
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *\nAllow: /\nSitemap: ${new URL(
          "/sitemap.xml",
          marketingOrigin
        ).toString()}\n`;
    const response = new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
    if (!sameHostDeployment && consoleRequest) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  }

  if (!sameHostDeployment && isMarketingHost && isConsolePath(basePath)) {
    return buildRedirect(consoleOrigin, nextUrl);
  }

  if (!sameHostDeployment && isConsoleHost && isMarketingPath(basePath)) {
    return buildRedirect(marketingOrigin, nextUrl);
  }

  const requestedLocale = nextUrl.searchParams.get("lang");
  const cookieLocale = request.cookies.get("docuforge-locale")?.value;
  const acceptLanguage = request.headers.get("accept-language");
  const decision = resolveRouteLocale({
    basePath,
    pathLocale,
    requestedLocale,
    cookieLocale,
    acceptLanguage,
    consoleRequest,
  });

  if (decision.kind === "redirect") {
    const target = new URL(decision.redirectPath, nextUrl.origin);
    const params = new URLSearchParams(nextUrl.searchParams);
    params.delete("lang");
    const query = params.toString();
    if (query) target.search = query;

    const response = NextResponse.redirect(target, decision.status);
    applyLocaleCookie(response, decision.persistLocale, hostname);
    appendVary(
      response,
      [
        decision.varyOnCookie ? "Cookie" : null,
        decision.varyOnAcceptLanguage ? "Accept-Language" : null,
      ].filter((value): value is "Accept-Language" | "Cookie" => value !== null)
    );

    if (decision.status === 307) {
      response.headers.set("Cache-Control", "private, no-store");
    }

    if (consoleRequest) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }

    return response;
  }

  const finalLocale = decision.locale;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-docuforge-locale", finalLocale);
  requestHeaders.set("x-docuforge-path", basePath);
  requestHeaders.set("x-docuforge-host", hostname);

  const response = decision.rewriteToBasePath
    ? (() => {
        const rewriteUrl = nextUrl.clone();
        rewriteUrl.pathname = basePath;
        return NextResponse.rewrite(rewriteUrl, {
          request: {
            headers: requestHeaders,
          },
        });
      })()
    : NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

  if (decision.persistLocale) {
    applyLocaleCookie(response, decision.persistLocale, hostname);
  }

  appendVary(
    response,
    [
      decision.varyOnCookie ? "Cookie" : null,
      decision.varyOnAcceptLanguage ? "Accept-Language" : null,
    ].filter((value): value is "Accept-Language" | "Cookie" => value !== null)
  );
  response.headers.set("Content-Language", finalLocale);

  if (consoleRequest) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
