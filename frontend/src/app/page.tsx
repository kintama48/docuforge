import type { Metadata } from "next";
import HomeClient from "./home-client";
import { getMarketingMeta } from "@/src/lib/marketing-metadata";
import { buildPublicMetadata } from "@/src/lib/public-seo";
import { publicRoutes } from "@/src/lib/public-route-contract";
import { getRequestLocale } from "@/src/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const meta = getMarketingMeta(locale).landing;
  return buildPublicMetadata({
    locale,
    pathname: publicRoutes.home,
    title: meta.title,
    description: meta.description,
    ogImage: `/og/${locale}`,
    ogAlt: meta.ogAlt,
  });
}

export default function HomePage() {
  return <HomeClient />;
}
