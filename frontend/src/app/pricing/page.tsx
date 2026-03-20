import type { Metadata } from "next";
import PricingPage from "@/src/views/pricing/PricingPage";
import { getMarketingMeta } from "@/src/lib/marketing-metadata";
import { buildPublicMetadata } from "@/src/lib/public-seo";
import { publicRoutes } from "@/src/lib/public-route-contract";
import { getRequestLocale } from "@/src/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const meta = getMarketingMeta(locale).pricing;
  return buildPublicMetadata({
    locale,
    pathname: publicRoutes.pricing,
    title: meta.title,
    description: meta.description,
    ogImage: `/og/pricing/${locale}`,
    ogAlt: meta.ogAlt,
  });
}

export default function PricingPageRoute() {
  return <PricingPage />;
}
