import type { Metadata } from "next";
import { SiteHeader } from "@/src/app/components/site-header";
import { SiteFooter } from "@/src/app/components/site-footer";
import PlaygroundClient from "@/src/app/playground/playground-client";
import { buildPublicMetadata } from "@/src/lib/public-seo";
import { publicRoutes } from "@/src/lib/public-route-contract";
import { getRequestLocale } from "@/src/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();

  return buildPublicMetadata({
    locale,
    pathname: publicRoutes.playground,
    title: "PDF Template Gallery | DocuForge Playground",
    description:
      "Search invoice, freight, certificate, and operations PDF templates. Edit fields and preview instantly in your browser.",
    ogImage: `/og/${locale}`,
    ogAlt: "DocuForge PDF Template Gallery",
  });
}

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <main>
        <PlaygroundClient />
      </main>
      <SiteFooter />
    </div>
  );
}
