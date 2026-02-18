import Link from "next/link";
import { SiteFooter } from "@/src/app/components/site-footer";
import { SiteHeader } from "@/src/app/components/site-header";
import { getConsoleLocaleUrl } from "@/src/lib/urls";
import type { ContentSection, LocalizedContentItem } from "@/src/lib/content-hub";
import { getSectionCopy } from "@/src/lib/content-hub";
import { withLocale } from "@/src/lib/locale-path";
import type { Locale } from "@/src/lib/i18n-config";

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-xs leading-relaxed text-[var(--ink)]">
      <code>{code}</code>
    </pre>
  );
}

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}

function sectionLabel(section: ContentSection) {
  if (section === "templates") return "Templates";
  if (section === "compare") return "Compare";
  if (section === "industries") return "Industries";
  return "Blog";
}

export function ContentHubIndexPage({
  locale,
  section,
  title,
  description,
  items,
}: {
  locale: Locale;
  section: ContentSection;
  title: string;
  description: string;
  items: LocalizedContentItem[];
}) {
  const copy = getSectionCopy(locale);

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 lg:pt-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            {sectionLabel(section)}
          </p>
          <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-pretty text-base text-[var(--muted)]">
            {description}
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.slug}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                {item.primaryKeyword}
              </p>
              <h2 className="mt-3 text-lg font-semibold text-[var(--ink)]">{item.title}</h2>
              <p className="mt-3 text-sm text-[var(--muted)]">{item.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.keywords.slice(0, 3).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
              <Link
                href={withLocale(`/${item.section}/${item.slug}`, locale)}
                className="mt-5 inline-flex text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
              >
                {copy.ctaDefault}
              </Link>
            </article>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function ContentHubArticlePage({
  locale,
  page,
}: {
  locale: Locale;
  page: LocalizedContentItem;
}) {
  const copy = getSectionCopy(locale);
  const consoleUrl = getConsoleLocaleUrl("/register", locale);
  const canonicalPath = withLocale(`/${page.section}/${page.slug}`, locale);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description,
    datePublished: page.publishedAt,
    dateModified: page.updatedAt,
    inLanguage: locale,
    keywords: page.keywords.join(", "),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalPath,
    },
    author: {
      "@type": "Organization",
      name: "DocuForge",
    },
    publisher: {
      "@type": "Organization",
      name: "DocuForge",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: withLocale("/", locale),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: sectionLabel(page.section),
        item: withLocale(`/${page.section}`, locale),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: page.title,
        item: canonicalPath,
      },
    ],
  };

  return (
    <div className="min-h-screen page-background">
      <JsonLd data={articleSchema} />
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />

      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 lg:pt-16">
        <article className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            {page.primaryKeyword}
          </p>
          <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">{page.title}</h1>
          <p className="mt-4 text-pretty text-base text-[var(--muted)]">{page.description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {page.keywords.slice(0, 5).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--muted)]"
              >
                {keyword}
              </span>
            ))}
          </div>

          <section className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              {copy.quickAnswerTitle}
            </p>
            <p className="mt-3 text-sm text-[var(--ink)]">{page.summaryAnswer}</p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl text-[var(--ink)]">{copy.whatYouBuildTitle}</h2>
            <p className="mt-3 text-base text-[var(--muted)]">{page.intro}</p>
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
              <p className="text-sm font-semibold text-[var(--ink)]">{page.problem}</p>
              <p className="mt-3 text-sm text-[var(--muted)]">{page.solution}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                {page.whatYouBuild.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl text-[var(--ink)]">Preview of the finished PDF</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              HTML mock preview for this guide. Use the playground for live template testing.
            </p>
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <p className="text-sm font-semibold text-[var(--ink)]">{page.title}</p>
                <p className="text-xs text-[var(--muted)]">docuforge-preview.pdf</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {page.dataFields.slice(0, 6).map((field) => (
                  <div key={field} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
                    <p className="font-mono text-xs text-[var(--ink)]">{field}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Bound from API payload at render time.</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl text-[var(--ink)]">{copy.typstTitle}</h2>
            <CodeBlock code={page.codeSamples.typst} />
            <p className="mt-3 text-xs text-[var(--muted)]">{copy.copyHint}</p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl text-[var(--ink)]">{copy.dataTitle}</h2>
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                {page.dataFields.map((field) => (
                  <li key={field}>
                    <span className="font-mono text-[var(--ink)]">{field}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl text-[var(--ink)]">{copy.apiExamplesTitle}</h2>
            <CodeBlock code={page.codeSamples.curl} />
            <CodeBlock code={page.codeSamples.javascript} />
            <CodeBlock code={page.codeSamples.python} />
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl text-[var(--ink)]">{copy.benchmarkTitle}</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                    <th className="px-4 py-3 font-semibold">Metric</th>
                    <th className="px-4 py-3 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {page.benchmarks.map((row) => (
                    <tr key={row.metric} className="border-t border-[var(--line)] bg-[var(--surface)]">
                      <td className="px-4 py-3 text-[var(--ink)]">{row.metric}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl text-[var(--ink)]">{copy.tipsTitle}</h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              {page.customizationTips.map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
          </section>

          <section className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <h2 className="font-display text-2xl text-[var(--ink)]">{copy.tryLiveTitle}</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">{copy.tryLiveBody}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={withLocale("/playground", locale)}
                className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
              >
                {copy.tryLiveCta}
              </Link>
              <Link
                href={consoleUrl}
                className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
              >
                {page.ctaLabel}
              </Link>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl text-[var(--ink)]">{copy.faqTitle}</h2>
            <div className="mt-4 space-y-4">
              {page.faq.map((item) => (
                <details
                  key={item.question}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm text-[var(--muted)]">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl text-[var(--ink)]">{copy.relatedTitle}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {page.related.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <h2 className="font-display text-2xl text-[var(--ink)]">{page.ctaLabel}</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">{copy.ctaBody}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={page.ctaHref}
                className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
              >
                {page.ctaLabel}
              </Link>
              <Link
                href={withLocale("/docs", locale)}
                className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
              >
                Read API docs
              </Link>
            </div>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
