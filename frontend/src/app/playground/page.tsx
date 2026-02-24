import type { Metadata } from "next";
import { headers } from "next/headers";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { SiteHeader } from "@/src/app/components/site-header";
import { SiteFooter } from "@/src/app/components/site-footer";
import PlaygroundClient from "@/src/app/playground/playground-client";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-docuforge-locale"));

  return {
    title: "Typst Playground | DocuForge",
    description:
      "Browse starter templates for invoices and logistics docs, then edit Typst + JSON and run live previews.",
    openGraph: {
      title: "DocuForge Playground",
      description:
        "Searchable template starters with live Typst editing and preview.",
      images: [`/og/${locale}`],
    },
    twitter: {
      title: "DocuForge Playground",
      description:
        "Searchable template starters with live Typst editing and preview.",
      images: [`/og/${locale}`],
    },
  };
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
