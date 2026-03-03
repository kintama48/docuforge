import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { SiteHeader } from "@/src/app/components/site-header";
import { SiteFooter } from "@/src/app/components/site-footer";
import { type Locale, normalizeLocale } from "@/src/lib/i18n-config";
import { withLocale } from "@/src/lib/locale-path";
import {
  type ContentCollection,
  type ContentDocument,
  getCollectionMeta,
  getContentHubCopy,
  listContent,
} from "@/src/lib/content-hub";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-docuforge-locale"));
  const meta = getCollectionMeta("blog", locale);

  return {
    title: `${meta.title} | DocuForge`,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: [`/og/${locale}`],
    },
    twitter: {
      title: meta.title,
      description: meta.description,
      images: [`/og/${locale}`],
    },
  };
}

function Section({
  locale,
  title,
  description,
  docs,
  collection,
  readMoreLabel,
}: {
  locale: Locale;
  title: string;
  description: string;
  docs: ContentDocument[];
  collection: ContentCollection;
  readMoreLabel: string;
}) {
  return (
    <section className="mt-14">
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="font-display text-3xl text-[var(--ink)] sm:text-4xl">{title}</h2>
        <p className="text-sm text-[var(--muted)]">{description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {docs.map((doc) => (
          <Link
            key={`${doc.collection}:${doc.slug}`}
            href={withLocale(`/${collection}/${doc.slug}`, locale)}
            className="group block rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--line-hover)] hover:shadow-[var(--shadow)]"
          >
            <article className="flex h-full flex-col">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{doc.category}</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--ink)]">{doc.title}</h3>
              <p className="mt-3 text-sm text-[var(--muted)]">{doc.excerpt}</p>
              <div className="mt-auto flex items-center justify-between pt-4 text-xs text-[var(--muted)]">
                <span>{doc.updatedAt}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--ink)]">
                  {readMoreLabel}
                  <span className="transition group-hover:translate-x-0.5" aria-hidden="true">
                    →
                  </span>
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function BlogIndexPage() {
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-docuforge-locale"));

  const blogMeta = getCollectionMeta("blog", locale);
  const templateMeta = getCollectionMeta("templates", locale);
  const compareMeta = getCollectionMeta("compare", locale);
  const industryMeta = getCollectionMeta("industries", locale);
  const copy = getContentHubCopy(locale);

  const blogDocs = listContent("blog", locale);
  const templateDocs = listContent("templates", locale);
  const compareDocs = listContent("compare", locale);
  const industryDocs = listContent("industries", locale);

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 lg:pt-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            {blogMeta.label}
          </p>
          <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">{blogMeta.title}</h1>
          <p className="mt-4 text-base text-[var(--muted)]">{blogMeta.description}</p>
        </div>

        <Section
          locale={locale}
          title={blogMeta.title}
          description={blogMeta.description}
          docs={blogDocs}
          collection="blog"
          readMoreLabel={copy.readMore}
        />

        <Section
          locale={locale}
          title={templateMeta.title}
          description={templateMeta.description}
          docs={templateDocs}
          collection="templates"
          readMoreLabel={copy.readMore}
        />

        <Section
          locale={locale}
          title={compareMeta.title}
          description={compareMeta.description}
          docs={compareDocs}
          collection="compare"
          readMoreLabel={copy.readMore}
        />

        <Section
          locale={locale}
          title={industryMeta.title}
          description={industryMeta.description}
          docs={industryDocs}
          collection="industries"
          readMoreLabel={copy.readMore}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
