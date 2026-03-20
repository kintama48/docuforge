import type { Metadata } from "next";
import { ContentCollectionPage } from "@/src/app/components/content-hub-page";
import {
  getCollectionMeta,
  getContentHubCopy,
  listContent,
} from "@/src/lib/content-hub";
import { buildPublicMetadata } from "@/src/lib/public-seo";
import { publicRoutes } from "@/src/lib/public-route-contract";
import { getRequestLocale } from "@/src/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const meta = getCollectionMeta("industries", locale);

  return buildPublicMetadata({
    locale,
    pathname: publicRoutes.industries,
    title: `${meta.title} | DocuForge`,
    description: meta.description,
    ogImage: `/og/${locale}`,
    ogAlt: meta.title,
  });
}

export default async function IndustriesIndexPage() {
  const locale = await getRequestLocale();
  const docs = listContent("industries", locale);
  const meta = getCollectionMeta("industries", locale);
  const copy = getContentHubCopy(locale);

  return (
    <ContentCollectionPage
      locale={locale}
      collection="industries"
      title={meta.title}
      label={meta.label}
      description={meta.description}
      docs={docs}
      readMoreLabel={copy.readMore}
    />
  );
}
