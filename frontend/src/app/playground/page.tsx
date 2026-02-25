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
    title: "PDF Template Gallery | DocuForge Playground",
    description:
      "Search invoice, freight, certificate, and operations PDF templates. Edit fields and preview instantly in your browser.",
    openGraph: {
      title: "DocuForge PDF Template Gallery",
      description:
        "Search invoice, freight, certificate, and operations PDF templates. Edit fields and preview instantly.",
      images: [`/og/${locale}`],
    },
    twitter: {
      title: "DocuForge PDF Template Gallery",
      description:
        "Search invoice, freight, certificate, and operations PDF templates. Edit fields and preview instantly.",
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
