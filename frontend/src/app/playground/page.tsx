import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { SiteFooter } from "@/src/app/components/site-footer";
import { SiteHeader } from "@/src/app/components/site-header";
import { PlaygroundClient } from "@/src/app/playground/playground-client";
import { withLocale } from "@/src/lib/locale-path";
import { getConsoleLocaleUrl } from "@/src/lib/urls";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const locale = normalizeLocale(headersList.get("x-docuforge-locale"));
  const title = "Typst PDF Playground | DocuForge";
  const description =
    "Test Typst template ideas live, validate JSON data bindings, and export production-ready API requests for DocuForge PDF generation.";

  return {
    title,
    description,
    keywords: [
      "Typst playground",
      "Typst PDF generation",
      "PDF generation API",
      "dynamic PDF templates",
      "programmatic PDF generation",
    ],
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/og/${locale}`,
          width: 1200,
          height: 630,
          alt: "DocuForge Typst Playground",
        },
      ],
    },
    twitter: {
      title,
      description,
      images: [`/og/${locale}`],
    },
  };
}

export default async function PlaygroundPage() {
  const headersList = await headers();
  const locale = normalizeLocale(headersList.get("x-docuforge-locale"));

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 lg:pt-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Playground</p>
          <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
            Test Typst PDF templates live
          </h1>
          <p className="mt-4 text-pretty text-base text-[var(--muted)]">
            Use this sandbox to draft template code, verify JSON field mappings, and ship API-ready document payloads faster.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={getConsoleLocaleUrl("/register", locale)}
              className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              Start free and render real PDFs
            </Link>
            <Link
              href={withLocale("/docs", locale)}
              className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
            >
              Read API docs
            </Link>
          </div>
        </div>

        <PlaygroundClient />
      </main>

      <SiteFooter />
    </div>
  );
}
