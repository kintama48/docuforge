import type { Metadata } from "next";
import { env } from "@/src/config/env";
import { invariant } from "@/src/lib/assert";
import { locales, type Locale } from "@/src/lib/i18n-config";
import { withLocale } from "@/src/lib/locale-path";

const ogLocaleMap: Record<Locale, string> = {
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
  it: "it_IT",
  es: "es_ES",
  ar: "ar_AR",
  zh: "zh_CN",
};

type BuildPublicMetadataInput = {
  locale: Locale;
  pathname: string;
  title: string;
  description: string;
  ogImage: string;
  ogAlt?: string;
  openGraphType?: "website" | "article";
};

function normalizeImagePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildPublicLanguageAlternates(pathname: string) {
  invariant(
    pathname.startsWith("/"),
    `Expected a route pathname, received "${pathname}"`
  );

  const languages: Record<string, string> = {
    "x-default": pathname,
  };

  locales.forEach((locale) => {
    languages[locale] = withLocale(pathname, locale);
  });

  return languages;
}

export function buildPublicMetadata(
  input: BuildPublicMetadataInput
): Metadata {
  invariant(
    input.pathname.startsWith("/"),
    `Expected a route pathname, received "${input.pathname}"`
  );

  const canonicalPath = withLocale(input.pathname, input.locale);
  const ogImage = normalizeImagePath(input.ogImage);
  const siteUrl = new URL(env.marketingUrl);

  return {
    metadataBase: siteUrl,
    title: { absolute: input.title },
    description: input.description,
    alternates: {
      canonical: canonicalPath,
      languages: buildPublicLanguageAlternates(input.pathname),
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: new URL(canonicalPath, siteUrl).toString(),
      siteName: "DocuForge",
      type: input.openGraphType ?? "website",
      locale: ogLocaleMap[input.locale],
      alternateLocale: locales
        .filter((candidate) => candidate !== input.locale)
        .map((candidate) => ogLocaleMap[candidate]),
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: input.ogAlt ?? input.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [ogImage],
    },
  };
}
