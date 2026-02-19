import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { withLocale } from "@/src/lib/locale-path";
import { SiteHeader } from "@/src/app/components/site-header";
import { SiteFooter } from "@/src/app/components/site-footer";
import { getMcpGuide } from "@/src/app/docs/mcp/mcp-guides";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-docuforge-locale"));
  const guide = getMcpGuide(locale, "claude");

  return {
    title: `${guide.title} | DocuForge`,
    description: guide.description,
  };
}

export default async function McpClaudePage() {
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-docuforge-locale"));
  const guide = getMcpGuide(locale, "claude");

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-6 pb-20 pt-12 lg:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          MCP / Claude
        </p>
        <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
          {guide.title}
        </h1>
        <p className="mt-4 text-base text-[var(--muted)]">{guide.description}</p>

        <ol className="mt-8 space-y-3 text-sm text-[var(--muted)]">
          {guide.steps.map((step) => (
            <li
              key={step}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
            >
              {step}
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={withLocale("/docs/mcp", locale)}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--ink)] hover:border-[var(--ink)]"
          >
            Back to MCP overview
          </Link>
          <a
            href={guide.githubDoc}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--ink)] hover:border-[var(--ink)]"
          >
            Open full guide on GitHub
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
