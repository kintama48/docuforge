import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { withLocale } from "@/src/lib/locale-path";
import { env } from "@/src/config/env";
import { ContentDocumentPage } from "@/src/app/components/content-hub-page";
import { buildArticleJsonLd } from "@/src/lib/content-hub-seo";
import { getContentBySlug } from "@/src/lib/content-hub";
import { buildPublicMetadata } from "@/src/lib/public-seo";
import { getRequestLocale } from "@/src/lib/request-locale";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const doc = getContentBySlug("industries", slug, locale);

  if (!doc) {
    return {
      title: "Not found | DocuForge",
      robots: { index: false, follow: false },
    };
  }

  return buildPublicMetadata({
    locale,
    pathname: `/industries/${doc.slug}`,
    title: doc.metaTitle,
    description: doc.metaDescription,
    ogImage: `/og/${locale}`,
    ogAlt: doc.title,
    openGraphType: "article",
  });
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const doc = getContentBySlug("industries", slug, locale);

  if (!doc) {
    notFound();
  }

  const path = withLocale(`/industries/${doc.slug}`, locale);
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
