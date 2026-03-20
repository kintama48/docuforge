import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/src/app/components/site-header";
import { SiteFooter } from "@/src/app/components/site-footer";
import PlaygroundClient from "@/src/app/playground/playground-client";
import { buildPublicMetadata } from "@/src/lib/public-seo";
import { getRequestLocale } from "@/src/lib/request-locale";
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
  const locale = await getRequestLocale();

  if (!preset) {
    return {
      title: "Template not found | DocuForge",
      robots: { index: false, follow: false },
    };
  }

  return buildPublicMetadata({
    locale,
    pathname: `/playground/${preset.slug}`,
    title: preset.seoTitle,
    description: preset.seoDescription,
    ogImage: `/og/${locale}`,
    ogAlt: preset.title,
  });
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
