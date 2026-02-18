import type { Metadata } from "next";
import { headers } from "next/headers";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { getSectionIndex } from "@/src/lib/content-hub";
import { buildSectionMetadata } from "@/src/lib/content-hub-seo";
import { ContentHubIndexPage } from "@/src/app/components/content-hub-page";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const locale = normalizeLocale(headersList.get("x-docuforge-locale"));
  return buildSectionMetadata("compare", locale);
}

export default async function CompareIndexPage() {
  const headersList = await headers();
  const locale = normalizeLocale(headersList.get("x-docuforge-locale"));
  const index = getSectionIndex("compare", locale);

  return (
    <ContentHubIndexPage
      locale={locale}
      section="compare"
      title={index.title}
      description={index.description}
      items={index.items}
    />
  );
}
