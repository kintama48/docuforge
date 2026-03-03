import type { Metadata } from "next";
import { headers } from "next/headers";
import PricingPage from "@/src/views/pricing/PricingPage";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { getMarketingMeta } from "@/src/lib/marketing-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const locale = normalizeLocale(headersList.get("x-docuforge-locale"));
  const meta = getMarketingMeta(locale).pricing;
  const ogImage = `/og/pricing/${locale}`;

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: meta.ogAlt,
        },
      ],
    },
    twitter: {
      title: meta.title,
      description: meta.description,
      images: [ogImage],
    },
  };
}

export default function PricingPageRoute() {
  return <PricingPage />;
}
