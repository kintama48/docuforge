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
  const guide = getMcpGuide(locale, "overview");

  return {
    title: `${guide.title} | DocuForge`,
    description: guide.description,
  };
}

export default async function McpOverviewPage() {
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-docuforge-locale"));
  const guide = getMcpGuide(locale, "overview");
  const localePath = (path: string) => withLocale(path, locale);

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-6 pb-20 pt-12 lg:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          MCP
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

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link
            href={localePath("/docs/mcp/cursor")}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--ink)] hover:border-[var(--ink)]"
          >
            Cursor guide
          </Link>
          <Link
            href={localePath("/docs/mcp/claude")}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--ink)] hover:border-[var(--ink)]"
          >
            Claude guide
          </Link>
          <Link
            href={localePath("/docs/mcp/codex")}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--ink)] hover:border-[var(--ink)]"
          >
            Codex guide
          </Link>
        </div>

        <div className="mt-8">
          <a
            href={guide.githubDoc}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
          >
            Open full MCP operations doc on GitHub
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
