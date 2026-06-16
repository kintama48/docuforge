import Link from "next/link";
import { SiteHeader } from "@/src/app/components/site-header";
import { SiteFooter } from "@/src/app/components/site-footer";
import {
  type ContentBlock,
  type ContentCollection,
  type ContentDocument,
  type ContentLink,
  type ContentFaq,
  getContentHubCopy,
} from "@/src/lib/content-hub";
import { withLocale } from "@/src/lib/locale-path";
import type { Locale } from "@/src/lib/i18n-config";
import { BlogPlaygroundBlock } from "./blog-playground";
import { ContentCodeGroup } from "./code-group";

function localizeHref(href: string, locale: Locale) {
  if (/^https?:\/\//.test(href)) return href;
  return withLocale(href, locale);
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-xs text-[var(--ink)]">
      <code className={`language-${language}`}>{code}</code>
    </pre>
  );
}

function LinksBlock({
  links,
  locale,
}: {
  links: ContentLink[];
  locale: Locale;
}) {
  return (
    <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
      {links.map((item) => (
        <li key={`${item.href}:${item.title}`}>
          <Link href={localizeHref(item.href, locale)} className="hover:text-[var(--ink)]">
            {item.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RenderBlock({ block, locale }: { block: ContentBlock; locale: Locale }) {
  if (block.kind === "paragraph") {
    return (
      <section>
        <h2 className="font-display text-2xl text-[var(--ink)]">{block.title}</h2>
        <div className="mt-3 space-y-3 text-base text-[var(--muted)]">
          {block.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
    );
  }

  if (block.kind === "list") {
    return (
      <section>
        <h2 className="font-display text-2xl text-[var(--ink)]">{block.title}</h2>
        <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
          {block.items.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (block.kind === "code") {
    return (
      <section>
        <h2 className="font-display text-2xl text-[var(--ink)]">{block.title}</h2>
        <CodeBlock language={block.language} code={block.code} />
      </section>
    );
  }

  if (block.kind === "codeGroup") {
    return (
      <ContentCodeGroup
        title={block.title}
        description={block.description}
        snippets={block.snippets}
      />
    );
  }

  if (block.kind === "playground") {
    return <BlogPlaygroundBlock title={block.title} playground={block.playground} />;
  }

  return (
    <section>
      <h2 className="font-display text-2xl text-[var(--ink)]">{block.title}</h2>
      <LinksBlock links={block.links} locale={locale} />
    </section>
  );
}

function FaqSection({ faq, title }: { faq: ContentFaq[]; title: string }) {
  if (faq.length === 0) return null;
  return (
    <section>
      <h2 className="font-display text-2xl text-[var(--ink)]">{title}</h2>
      <div className="mt-4 space-y-4">
        {faq.map((item) => (
          <div
            key={item.question}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
          >
            <p className="text-sm font-semibold text-[var(--ink)]">{item.question}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaSection({
  locale,
  document,
}: {
  locale: Locale;
  document: ContentDocument;
}) {
  return (
    <section>
      <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8">
        <h2 className="font-display text-2xl text-[var(--ink)]">{document.ctaTitle}</h2>
        <p className="mt-3 text-base text-[var(--muted)]">{document.ctaBody}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={localizeHref(document.ctaPrimaryHref, locale)}
            className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          >
            {document.ctaPrimaryLabel}
          </Link>
          <Link
            href={localizeHref(document.ctaSecondaryHref, locale)}
            className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
          >
            {document.ctaSecondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ContentDocumentPage({
  locale,
  document,
}: {
  locale: Locale;
  document: ContentDocument;
}) {
  const copy = getContentHubCopy(locale);

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 lg:pt-16">
        <article className="mx-auto max-w-3xl space-y-12">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              {document.collection}
            </p>
            <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
              {document.title}
            </h1>
            <p className="mt-4 text-base text-[var(--muted)]">{document.intro}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Updated {document.updatedAt}
            </p>
          </header>

          {document.blocks.map((block) => (
            <RenderBlock key={`${block.kind}:${block.title}`} block={block} locale={locale} />
          ))}

          <FaqSection faq={document.faq} title={copy.faqTitle} />

          {document.related.length > 0 && (
            <section>
              <h2 className="font-display text-2xl text-[var(--ink)]">{copy.relatedTitle}</h2>
              <LinksBlock links={document.related} locale={locale} />
            </section>
          )}

          <CtaSection locale={locale} document={document} />
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

export function ContentCollectionPage({
  locale,
  collection,
  title,
  label,
  description,
  docs,
  readMoreLabel,
}: {
  locale: Locale;
  collection: ContentCollection;
  title: string;
  label: string;
  description: string;
  docs: ContentDocument[];
  readMoreLabel: string;
}) {
  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 lg:pt-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            {label}
          </p>
          <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">{title}</h1>
          <p className="mt-4 text-base text-[var(--muted)]">{description}</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {docs.map((doc) => (
            <Link
              key={`${doc.collection}:${doc.slug}`}
              href={withLocale(`/${collection}/${doc.slug}`, locale)}
              className="group block rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--line-hover)] hover:shadow-[var(--shadow)]"
            >
              <article className="flex h-full flex-col">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {doc.category}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">{doc.title}</h2>
                <p className="mt-3 text-sm text-[var(--muted)]">{doc.excerpt}</p>
                <div className="mt-auto flex items-center justify-between pt-4 text-xs text-[var(--muted)]">
                  <span>{doc.updatedAt}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--ink)]">
                    {readMoreLabel}
                    <span className="transition group-hover:translate-x-0.5" aria-hidden="true">→</span>
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
