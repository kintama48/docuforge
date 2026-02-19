import type { ContentDocument } from "@/src/lib/content-hub";

type BuildArticleJsonLdInput = {
  siteUrl: string;
  urlPath: string;
  locale: string;
  document: ContentDocument;
};

export function buildArticleJsonLd(input: BuildArticleJsonLdInput) {
  const canonical = new URL(input.urlPath, input.siteUrl).toString();

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    inLanguage: input.locale,
    headline: input.document.title,
    description: input.document.metaDescription,
    dateModified: input.document.updatedAt,
    datePublished: input.document.updatedAt,
    mainEntityOfPage: canonical,
    author: {
      "@type": "Organization",
      name: "DocuForge",
    },
    publisher: {
      "@type": "Organization",
      name: "DocuForge",
    },
    keywords: input.document.keywords,
  };

  const faq =
    input.document.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: input.document.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  return faq ? [article, faq] : [article];
}
