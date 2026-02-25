import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { withLocale } from "@/src/lib/locale-path";
import { SiteHeader } from "@/src/app/components/site-header";
import { SiteFooter } from "@/src/app/components/site-footer";
import PlaygroundClient from "@/src/app/playground/playground-client";
import {
  getPlaygroundPresetBySlug,
  listPlaygroundPresetSlugs,
} from "@/src/app/playground/playground-presets";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return listPlaygroundPresetSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const preset = getPlaygroundPresetBySlug(slug);
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-docuforge-locale"));

  if (!preset) {
    return {
      title: "Template not found | DocuForge",
      robots: { index: false, follow: false },
    };
  }

  const canonical = withLocale(`/playground/${preset.slug}`, locale);

  return {
    title: preset.seoTitle,
    description: preset.seoDescription,
    alternates: {
      canonical,
    },
    openGraph: {
      title: preset.seoTitle,
      description: preset.seoDescription,
      images: [`/og/${locale}`],
    },
    twitter: {
      title: preset.seoTitle,
      description: preset.seoDescription,
      images: [`/og/${locale}`],
    },
  };
}

export default async function PlaygroundTemplatePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const preset = getPlaygroundPresetBySlug(slug);

  if (!preset) {
    notFound();
  }

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <main>
        <PlaygroundClient initialPresetSlug={preset.slug} />
      </main>
      <SiteFooter />
    </div>
  );
}
