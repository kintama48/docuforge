import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { getContentItemsBySection, getLocalizedContentItem } from "@/src/lib/content-hub";
import { buildItemMetadata } from "@/src/lib/content-hub-seo";
import { ContentHubArticlePage } from "@/src/app/components/content-hub-page";

export function generateStaticParams() {
  return getContentItemsBySection("templates").map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [{ slug }, headersList] = await Promise.all([params, headers()]);
  const locale = normalizeLocale(headersList.get("x-docuforge-locale"));
  const item = getLocalizedContentItem("templates", slug, locale);
  if (!item) return {};
  return buildItemMetadata(item, locale);
}

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, headersList] = await Promise.all([params, headers()]);
  const locale = normalizeLocale(headersList.get("x-docuforge-locale"));
  const item = getLocalizedContentItem("templates", slug, locale);

  if (!item) {
    notFound();
  }

  return <ContentHubArticlePage locale={locale} page={item} />;
}
