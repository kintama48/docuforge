import type { Metadata } from "next";
import { SiteFooter } from "@/src/app/components/site-footer";
import { SiteHeader } from "@/src/app/components/site-header";
import {
  getCollectionMeta,
  listContent,
} from "@/src/lib/content-hub";
import { CompareShowcase } from "@/src/app/compare/compare-showcase";
import { buildPublicMetadata } from "@/src/lib/public-seo";
import { publicRoutes } from "@/src/lib/public-route-contract";
import { getRequestLocale } from "@/src/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const meta = getCollectionMeta("compare", locale);

  return buildPublicMetadata({
    locale,
    pathname: publicRoutes.compare,
    title: `${meta.title} | DocuForge`,
    description: meta.description,
    ogImage: `/og/${locale}`,
    ogAlt: meta.title,
  });
}

export default async function CompareIndexPage() {
  const locale = await getRequestLocale();
  const docs = listContent("compare", locale);

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <CompareShowcase locale={locale} docs={docs} />
      <SiteFooter />
    </div>
  );
}
