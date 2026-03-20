import type { Metadata } from "next";
import Link from "next/link";
import { withLocale } from "@/src/lib/locale-path";
import { SiteHeader } from "@/src/app/components/site-header";
import { SiteFooter } from "@/src/app/components/site-footer";
import { getMcpGuide } from "@/src/app/docs/mcp/mcp-guides";
import { buildPublicMetadata } from "@/src/lib/public-seo";
import { publicRoutes } from "@/src/lib/public-route-contract";
import { getRequestLocale } from "@/src/lib/request-locale";
import {
  Container,
  PageIntro,
} from "@/src/components/layout/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const guide = getMcpGuide(locale, "overview");

  return buildPublicMetadata({
    locale,
    pathname: publicRoutes.docsMcp,
    title: `${guide.title} | DocuForge`,
    description: guide.description,
    ogImage: `/og/docs/${locale}`,
    ogAlt: guide.title,
  });
}

export default async function McpOverviewPage() {
  const locale = await getRequestLocale();
  const guide = getMcpGuide(locale, "overview");
  const localePath = (path: string) => withLocale(path, locale);

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <Container as="main" width="article" className="pb-20 pt-12 lg:pt-16">
        <PageIntro
          eyebrow="MCP"
          title={guide.title}
          description={guide.description}
          width="reading"
        />

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
      </Container>
      <SiteFooter />
    </div>
  );
}
