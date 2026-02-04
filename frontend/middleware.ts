import { NextResponse, type NextRequest } from "next/server";
import { normalizeLocale } from "./src/lib/i18n-config";
import { stripLocalePath, withLocale } from "./src/lib/locale-path";

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const { locale: pathLocale, basePath } = stripLocalePath(nextUrl.pathname);
  const requestedLocale = nextUrl.searchParams.get("lang");
  const cookieLocale = request.cookies.get("docuforge-locale")?.value;
  const acceptLanguage = request.headers.get("accept-language")?.split(",")[0];
  const resolvedLocale = normalizeLocale(
    pathLocale || requestedLocale || cookieLocale || acceptLanguage
  );

  if (requestedLocale) {
    const target = new URL(
      withLocale(basePath, resolvedLocale),
      nextUrl.origin
    );
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
    const target = new URL(
      withLocale(basePath, resolvedLocale),
      nextUrl.origin
    );
    target.search = nextUrl.search;
    return NextResponse.redirect(target, 308);
  }

  const finalLocale = pathLocale || resolvedLocale;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-docuforge-locale", finalLocale);
  requestHeaders.set("x-docuforge-path", basePath);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.set("docuforge-locale", finalLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
