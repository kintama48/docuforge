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

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://docuforge.com";

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

  return {
    metadataBase: new URL(appUrl),
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
      url: new URL(canonical, appUrl).toString(),
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
