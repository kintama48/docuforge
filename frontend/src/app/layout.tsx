import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { locales, normalizeLocale, type Locale } from "@/src/lib/i18n-config";
import { withLocale } from "@/src/lib/locale-path";
import { getMarketingMeta } from "@/src/lib/marketing-metadata";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const marketingUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.docuforge.app";

const consoleUrl =
  process.env.NEXT_PUBLIC_CONSOLE_URL || "https://console.docuforge.app";

function safeHost(value: string, fallback: string) {
  try {
    return new URL(value).host;
  } catch {
    return new URL(fallback).host;
  }
}

const consoleHost = safeHost(consoleUrl, "https://console.docuforge.app");

const ogLocaleMap: Record<Locale, string> = {
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
  it: "it_IT",
  es: "es_ES",
  ar: "ar_AR",
  zh: "zh_CN",
};

function buildAlternates(pathname: string) {
  const languages: Record<string, string> = {
    "x-default": pathname,
  };
  locales.forEach((locale) => {
    languages[locale] = withLocale(pathname, locale);
  });
  return languages;
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const pathname = headersList.get("x-docuforge-path") || "/";
  const locale = normalizeLocale(headersList.get("x-docuforge-locale"));
  const canonical = withLocale(pathname, locale);
  const marketingMeta = getMarketingMeta(locale).landing;
  const ogImage = `/og/${locale}`;
  const alternates = buildAlternates(pathname);
  const hostHeader =
    headersList.get("x-docuforge-host") ||
    headersList.get("x-forwarded-host") ||
    headersList.get("host") ||
    "";
  const hostname = hostHeader.split(":")[0];
  const isConsoleHost = hostname === consoleHost;
  const siteUrl = isConsoleHost ? consoleUrl : marketingUrl;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "DocuForge",
      template: "%s · DocuForge",
    },
    description: marketingMeta.description,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title: marketingMeta.title,
      description: marketingMeta.description,
      url: new URL(canonical, siteUrl).toString(),
      siteName: "DocuForge",
      type: "website",
      locale: ogLocaleMap[locale],
      alternateLocale: locales
        .filter((item) => item !== locale)
        .map((item) => ogLocaleMap[item]),
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: marketingMeta.ogAlt,
        },
      ],
    },
    robots: isConsoleHost ? { index: false, follow: false } : undefined,
    twitter: {
      card: "summary_large_image",
      title: marketingMeta.title,
      description: marketingMeta.description,
      images: [ogImage],
    },
  };
}

const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem("docuforge-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const initialLocale = normalizeLocale(
    headersList.get("x-docuforge-locale")
  );
  const dir = initialLocale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={initialLocale} dir={dir} suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
