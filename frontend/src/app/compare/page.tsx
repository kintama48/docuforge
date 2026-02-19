import type { Metadata } from "next";
import { headers } from "next/headers";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { ContentCollectionPage } from "@/src/app/components/content-hub-page";
import {
  getCollectionMeta,
  getContentHubCopy,
  listContent,
} from "@/src/lib/content-hub";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-docuforge-locale"));
  const meta = getCollectionMeta("compare", locale);

  return {
    title: `${meta.title} | DocuForge`,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: [`/og/${locale}`],
    },
    twitter: {
      title: meta.title,
      description: meta.description,
      images: [`/og/${locale}`],
    },
  };
}

export default async function CompareIndexPage() {
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-docuforge-locale"));
  const docs = listContent("compare", locale);
  const meta = getCollectionMeta("compare", locale);
  const copy = getContentHubCopy(locale);

  return (
    <ContentCollectionPage
      locale={locale}
      collection="compare"
      title={meta.title}
      label={meta.label}
      description={meta.description}
      docs={docs}
      readMoreLabel={copy.readMore}
    />
  );
}
