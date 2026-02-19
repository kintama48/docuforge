import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { withLocale } from "@/src/lib/locale-path";
import { env } from "@/src/config/env";
import { ContentDocumentPage } from "@/src/app/components/content-hub-page";
import { buildArticleJsonLd } from "@/src/lib/content-hub-seo";
import { getContentBySlug } from "@/src/lib/content-hub";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-docuforge-locale"));
  const doc = getContentBySlug("compare", slug, locale);

  if (!doc) {
    return {
      title: "Not found | DocuForge",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: doc.metaTitle,
    description: doc.metaDescription,
    alternates: {
      canonical: withLocale(`/compare/${doc.slug}`, locale),
    },
    openGraph: {
      title: doc.metaTitle,
      description: doc.metaDescription,
      images: [`/og/${locale}`],
    },
    twitter: {
      title: doc.metaTitle,
      description: doc.metaDescription,
      images: [`/og/${locale}`],
    },
  };
}

export default async function CompareArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-docuforge-locale"));
  const doc = getContentBySlug("compare", slug, locale);

  if (!doc) {
    notFound();
  }

  const path = withLocale(`/compare/${doc.slug}`, locale);
  const jsonLd = buildArticleJsonLd({
    siteUrl: env.marketingUrl,
    urlPath: path,
    locale,
    document: doc,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ContentDocumentPage locale={locale} document={doc} />
    </>
  );
}
