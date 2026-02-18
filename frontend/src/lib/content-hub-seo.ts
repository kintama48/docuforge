import type { Metadata } from "next";
import { getSectionCopy, type ContentSection, type LocalizedContentItem } from "@/src/lib/content-hub";
import type { Locale } from "@/src/lib/i18n-config";

export function buildSectionMetadata(section: ContentSection, locale: Locale): Metadata {
  const copy = getSectionCopy(locale);
  const title = copy.indexTitle[section];
  const description = copy.indexDescription[section];
  const ogImage = `/og/${locale}`;

  return {
    title,
    description,
    keywords: [section, "DocuForge", "PDF generation API", "Typst PDF generation"],
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      title,
      description,
      images: [ogImage],
    },
  };
}

export function buildItemMetadata(item: LocalizedContentItem, locale: Locale): Metadata {
  const ogImage = `/og/${locale}`;

  return {
    title: `${item.title} | DocuForge`,
    description: item.description,
    keywords: item.keywords,
    openGraph: {
      title: item.title,
      description: item.description,
      type: "article",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: item.title,
        },
      ],
    },
    twitter: {
      title: item.title,
      description: item.description,
      images: [ogImage],
    },
  };
}
