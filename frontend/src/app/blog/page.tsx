import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/src/app/components/site-header";
import { SiteFooter } from "@/src/app/components/site-footer";
import { type Locale } from "@/src/lib/i18n-config";
import { withLocale } from "@/src/lib/locale-path";
import {
  type ContentCollection,
  type ContentDocument,
  getCollectionMeta,
  getContentHubCopy,
  listContent,
} from "@/src/lib/content-hub";
import { buildPublicMetadata } from "@/src/lib/public-seo";
import { publicRoutes } from "@/src/lib/public-route-contract";
import { getRequestLocale } from "@/src/lib/request-locale";
import {
  Container,
  PageIntro,
} from "@/src/components/layout/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const meta = getCollectionMeta("blog", locale);

  return buildPublicMetadata({
    locale,
    pathname: publicRoutes.blog,
    title: `${meta.title} | DocuForge`,
    description: meta.description,
    ogImage: `/og/${locale}`,
    ogAlt: meta.title,
  });
}

function Section({
  locale,
  docs,
  collection,
  readMoreLabel,
}: {
  locale: Locale;
  docs: ContentDocument[];
  collection: ContentCollection;
  readMoreLabel: string;
}) {
  return (
    <section className="mt-14">
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
  const locale = await getRequestLocale();

  const blogMeta = getCollectionMeta("blog", locale);
  const copy = getContentHubCopy(locale);

  const blogDocs = listContent("blog", locale);
  const templateDocs = listContent("templates", locale);
  const compareDocs = listContent("compare", locale);
  const industryDocs = listContent("industries", locale);

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <Container as="main" width="marketing" className="pb-20 pt-12 lg:pt-16">
        <PageIntro
          eyebrow={blogMeta.label}
          title={blogMeta.title}
          description={blogMeta.description}
          width="reading"
        />

        <Section
          locale={locale}
          docs={blogDocs}
          collection="blog"
          readMoreLabel={copy.readMore}
        />

        <Section
          locale={locale}
          docs={templateDocs}
          collection="templates"
          readMoreLabel={copy.readMore}
        />

        <Section
          locale={locale}
          docs={compareDocs}
          collection="compare"
          readMoreLabel={copy.readMore}
        />

        <Section
          locale={locale}
          docs={industryDocs}
          collection="industries"
          readMoreLabel={copy.readMore}
        />
      </Container>
      <SiteFooter />
    </div>
  );
}
