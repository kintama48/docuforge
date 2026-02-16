import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { withLocale } from "@/src/lib/locale-path";
import { getDocsContent } from "./docs-content";
import { getMarketingMeta } from "@/src/lib/marketing-metadata";
import { getConsoleLocaleUrl } from "@/src/lib/urls";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-xs text-[var(--ink)]">
      <code>{children}</code>
    </pre>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const locale = normalizeLocale(headersList.get("x-docuforge-locale"));
  const content = getDocsContent(locale);
  const marketing = getMarketingMeta(locale).docs;
  return {
    title: marketing.title,
    description: marketing.description,
    openGraph: {
      title: marketing.title,
      description: marketing.description,
      images: [
        {
          url: `/og/docs/${locale}`,
          width: 1200,
          height: 630,
          alt: marketing.ogAlt,
        },
      ],
    },
    twitter: {
      title: marketing.title,
      description: marketing.description,
      images: [`/og/docs/${locale}`],
    },
  };
}

export default async function DocsPage() {
  const headersList = await headers();
  const locale = normalizeLocale(headersList.get("x-docuforge-locale"));
  const content = getDocsContent(locale);
  const localePath = (path: string) => withLocale(path, locale);
  const consoleUrl = getConsoleLocaleUrl("/dashboard", locale);

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 lg:pt-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            {content.label}
          </p>
          <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-4 text-pretty text-base text-[var(--muted)]">
            {content.subtitle}
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-10 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                {content.navLabel}
              </p>
              <nav className="mt-4 flex flex-col gap-3 text-[var(--muted)]">
                {content.nav.map((item) => (
                  <Link
                    key={item.id}
                    href={`#${item.id}`}
                    className="hover:text-[var(--ink)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-xs text-[var(--muted)]">
                <p className="font-semibold text-[var(--ink)]">
                  {content.baseUrlsTitle}
                </p>
                <p className="mt-2">{content.baseUrlsDev}</p>
                <p className="mt-1">{content.baseUrlsProd}</p>
              </div>
            </div>
          </aside>

          <div className="space-y-16">
            <section id="overview">
              <h2 className="font-display text-2xl text-[var(--ink)]">
                {content.overview.title}
              </h2>
              <p className="mt-3 text-pretty text-base text-[var(--muted)]">
                {content.overview.body}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {content.overview.cards.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]"
                  >
                    <p className="font-semibold text-[var(--ink)]">
                      {item.title}
                    </p>
                    <p className="mt-2">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="auth">
              <h2 className="font-display text-2xl text-[var(--ink)]">
                {content.auth.title}
              </h2>
              <p className="mt-3 text-pretty text-base text-[var(--muted)]">
                {content.auth.body}
              </p>
              <CodeBlock>{`POST /v1/auth/login
POST /v1/auth/register

Authorization: Bearer <token>`}</CodeBlock>
              <p className="mt-4 text-sm text-[var(--muted)]">
                {content.auth.noteToken}
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {content.auth.noteKeys}
              </p>
            </section>

            <section id="quick-start">
              <h2 className="font-display text-2xl text-[var(--ink)]">
                {content.quickStart.title}
              </h2>
              <p className="mt-3 text-pretty text-base text-[var(--muted)]">
                {content.quickStart.body}
              </p>
              <CodeBlock>{`curl -X POST "$DOCUFORGE_API_URL/v1/render/preview" \\
  -H "Authorization: Bearer $DOCUFORGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "source": "...", "files": {}, "data": { "invoice_id": "1234" } }' \\
  --output preview.pdf`}</CodeBlock>
            </section>

            <section id="render">
              <h2 className="font-display text-2xl text-[var(--ink)]">
                {content.render.title}
              </h2>
              <p className="mt-3 text-pretty text-base text-[var(--muted)]">
                {content.render.body}
              </p>
              <div className="mt-6 grid gap-4">
                {content.render.endpoints.map((item) => (
                  <div
                    key={item.endpoint}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {item.endpoint}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section id="templates">
              <h2 className="font-display text-2xl text-[var(--ink)]">
                {content.templates.title}
              </h2>
              <p className="mt-3 text-pretty text-base text-[var(--muted)]">
                {content.templates.body}
              </p>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {content.templates.endpoints.map((item) => (
                  <div
                    key={item.endpoint}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]"
                  >
                    <p className="font-semibold text-[var(--ink)]">
                      {item.endpoint}
                    </p>
                    <p className="mt-2">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="assets">
              <h2 className="font-display text-2xl text-[var(--ink)]">
                {content.assets.title}
              </h2>
              <p className="mt-3 text-pretty text-base text-[var(--muted)]">
                {content.assets.body}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {content.assets.endpoints.map((item) => (
                  <div
                    key={item.endpoint}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]"
                  >
                    <p className="font-semibold text-[var(--ink)]">
                      {item.endpoint}
                    </p>
                    <p className="mt-2">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="ai">
              <h2 className="font-display text-2xl text-[var(--ink)]">
                {content.ai.title}
              </h2>
              <p className="mt-3 text-pretty text-base text-[var(--muted)]">
                {content.ai.body}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {content.ai.endpoints.map((item) => (
                  <div
                    key={item.endpoint}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]"
                  >
                    <p className="font-semibold text-[var(--ink)]">
                      {item.endpoint}
                    </p>
                    <p className="mt-2">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="usage">
              <h2 className="font-display text-2xl text-[var(--ink)]">
                {content.usage.title}
              </h2>
              <p className="mt-3 text-pretty text-base text-[var(--muted)]">
                {content.usage.body}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {content.usage.endpoints.map((item) => (
                  <div
                    key={item.endpoint}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]"
                  >
                    <p className="font-semibold text-[var(--ink)]">
                      {item.endpoint}
                    </p>
                    <p className="mt-2">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="errors">
              <h2 className="font-display text-2xl text-[var(--ink)]">
                {content.errors.title}
              </h2>
              <p className="mt-3 text-pretty text-base text-[var(--muted)]">
                {content.errors.body}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {content.errors.codes.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm"
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {item.title}
                    </p>
                    <p className="mt-2 text-[var(--muted)]">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8">
                <h2 className="font-display text-2xl text-[var(--ink)]">
                  {content.cta.title}
                </h2>
                <p className="mt-3 text-pretty text-base text-[var(--muted)]">
                  {content.cta.body}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={consoleUrl}
                    className="inline-flex items-center justify-center rounded-md bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                  >
                    {content.cta.primary}
                  </Link>
                  <Link
                    href={localePath("/")}
                    className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
                  >
                    {content.cta.secondary}
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
