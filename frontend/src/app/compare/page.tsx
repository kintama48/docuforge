import type { Metadata } from "next";
import { headers } from "next/headers";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { SiteFooter } from "@/src/app/components/site-footer";
import { SiteHeader } from "@/src/app/components/site-header";
import {
  getCollectionMeta,
  listContent,
} from "@/src/lib/content-hub";
import { CompareShowcase } from "@/src/app/compare/compare-showcase";

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

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <CompareShowcase locale={locale} docs={docs} />
      <SiteFooter />
    </div>
  );
}
