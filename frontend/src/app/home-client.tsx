"use client";

import Link from "next/link";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { useI18n } from "@/src/lib/i18n";
import { getConsoleLocaleUrl } from "@/src/lib/urls";
import { useLocalePath } from "@/src/lib/use-locale-path";
import type { Locale } from "@/src/lib/i18n-config";

const blogHighlights: Record<
  Locale,
  {
    label: string;
    title: string;
    subtitle: string;
    cta: string;
    cards: Array<{ title: string; href: string; keyword: string }>;
  }
> = {
  en: {
    label: "Growth Content",
    title: "SEO + GEO guides built for conversion",
    subtitle:
      "High-intent technical content targeting developers searching for PDF generation APIs, template automation, and migration paths.",
    cta: "Browse all guides",
    cards: [
      {
        title: "How to Create an Invoice PDF Template",
        href: "/templates/invoice",
        keyword: "invoice generation API",
      },
      {
        title: "How to Create a Shipping Label PDF Template",
        href: "/templates/shipping-label",
        keyword: "shipping label template",
      },
      {
        title: "DocuForge vs Puppeteer for PDF Generation",
        href: "/compare/puppeteer-pdf-generation",
        keyword: "Puppeteer PDF alternative",
      },
    ],
  },
  fr: {
    label: "Contenu Croissance",
    title: "Guides SEO + GEO orientés conversion",
    subtitle:
      "Du contenu technique à forte intention pour les équipes qui recherchent une API de génération PDF et l'automatisation de templates.",
    cta: "Voir tous les guides",
    cards: [
      {
        title: "Comment créer un template PDF facture",
        href: "/templates/invoice",
        keyword: "invoice generation API",
      },
      {
        title: "Comment créer un template PDF étiquette d'expédition",
        href: "/templates/shipping-label",
        keyword: "shipping label template",
      },
      {
        title: "DocuForge vs Puppeteer pour la génération PDF",
        href: "/compare/puppeteer-pdf-generation",
        keyword: "Puppeteer PDF alternative",
      },
    ],
  },
  de: {
    label: "Wachstums-Content",
    title: "SEO + GEO Guides für mehr Conversion",
    subtitle:
      "Technische Inhalte mit hoher Kaufintention für Teams, die eine PDF-API und Template-Automatisierung suchen.",
    cta: "Alle Guides öffnen",
    cards: [
      {
        title: "So erstellst du ein Rechnung-PDF-Template",
        href: "/templates/invoice",
        keyword: "invoice generation API",
      },
      {
        title: "So erstellst du ein Versandetikett-PDF-Template",
        href: "/templates/shipping-label",
        keyword: "shipping label template",
      },
      {
        title: "DocuForge vs Puppeteer für PDF-Generierung",
        href: "/compare/puppeteer-pdf-generation",
        keyword: "Puppeteer PDF alternative",
      },
    ],
  },
  it: {
    label: "Contenuti Growth",
    title: "Guide SEO + GEO pensate per convertire",
    subtitle:
      "Contenuti tecnici ad alta intenzione per team che cercano API PDF e automazione dei template.",
    cta: "Sfoglia tutte le guide",
    cards: [
      {
        title: "Come creare un template PDF fattura",
        href: "/templates/invoice",
        keyword: "invoice generation API",
      },
      {
        title: "Come creare un template PDF etichetta di spedizione",
        href: "/templates/shipping-label",
        keyword: "shipping label template",
      },
      {
        title: "DocuForge vs Puppeteer per la generazione PDF",
        href: "/compare/puppeteer-pdf-generation",
        keyword: "Puppeteer PDF alternative",
      },
    ],
  },
  es: {
    label: "Contenido de Growth",
    title: "Guías SEO + GEO con foco en conversión",
    subtitle:
      "Contenido técnico de alta intención para equipos que buscan APIs de generación PDF y automatización de plantillas.",
    cta: "Ver todas las guías",
    cards: [
      {
        title: "Cómo crear una plantilla PDF de factura",
        href: "/templates/invoice",
        keyword: "invoice generation API",
      },
      {
        title: "Cómo crear una plantilla PDF de etiqueta de envío",
        href: "/templates/shipping-label",
        keyword: "shipping label template",
      },
      {
        title: "DocuForge vs Puppeteer para generación PDF",
        href: "/compare/puppeteer-pdf-generation",
        keyword: "Puppeteer PDF alternative",
      },
    ],
  },
  ar: {
    label: "محتوى النمو",
    title: "أدلة SEO و GEO تركّز على التحويل",
    subtitle:
      "محتوى تقني عالي النية للفرق التي تبحث عن واجهات API لتوليد PDF وأتمتة القوالب.",
    cta: "تصفح جميع الأدلة",
    cards: [
      {
        title: "كيفية إنشاء قالب PDF للفواتير",
        href: "/templates/invoice",
        keyword: "invoice generation API",
      },
      {
        title: "كيفية إنشاء قالب PDF لملصق الشحن",
        href: "/templates/shipping-label",
        keyword: "shipping label template",
      },
      {
        title: "DocuForge مقابل Puppeteer لتوليد PDF",
        href: "/compare/puppeteer-pdf-generation",
        keyword: "Puppeteer PDF alternative",
      },
    ],
  },
  zh: {
    label: "增长内容",
    title: "面向转化的 SEO + GEO 指南",
    subtitle:
      "面向高意向开发者的技术内容，覆盖 PDF 生成 API、模板自动化与迁移方案。",
    cta: "查看全部指南",
    cards: [
      {
        title: "如何创建发票 PDF 模板",
        href: "/templates/invoice",
        keyword: "invoice generation API",
      },
      {
        title: "如何创建物流面单 PDF 模板",
        href: "/templates/shipping-label",
        keyword: "shipping label template",
      },
      {
        title: "DocuForge 与 Puppeteer 的 PDF 生成对比",
        href: "/compare/puppeteer-pdf-generation",
        keyword: "Puppeteer PDF alternative",
      },
    ],
  },
};

export default function Home() {
  const { messages, locale } = useI18n();
  const localePath = useLocalePath();
  const consoleUrl = getConsoleLocaleUrl("/dashboard", locale);
  const blogCopy = blogHighlights[locale];
  return (
    <div className="min-h-screen page-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-[var(--accent-soft)] blur-3xl pulse-soft" />
            <div className="pointer-events-none absolute right-12 top-10 h-48 w-48 rounded-full bg-[var(--surface-2)] blur-2xl float-slower" />
          </div>

          <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-16 lg:pb-24 lg:pt-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] fade-up">
                  {messages.hero.badge}
                </div>
                <h1
                  className="mt-6 text-balance font-display text-4xl leading-tight text-[var(--ink)] sm:text-5xl lg:text-6xl fade-up"
                  style={{ animationDelay: "120ms" }}
                >
                  {messages.hero.title}
                </h1>
                <p
                  className="mt-5 max-w-xl text-pretty text-lg text-[var(--muted)] fade-up"
                  style={{ animationDelay: "220ms" }}
                >
                  {messages.hero.subtitle}
                </p>
                <div
                  className="mt-6 max-w-xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)] fade-up"
                  style={{ animationDelay: "280ms" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                    {messages.hero.engineLabel}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink)]">
                    {messages.hero.engineBody}
                  </p>
                </div>
                <div
                  className="mt-8 flex flex-wrap items-center gap-3 fade-up"
                  style={{ animationDelay: "360ms" }}
                >
                  <Link
                    href={localePath("/docs")}
                    className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                  >
                    {messages.hero.ctaDocs}
                  </Link>
                  <Link
                    href={consoleUrl}
                    className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
                  >
                    {messages.hero.ctaConsole}
                  </Link>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  {messages.hero.stats.map((item, index) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)] fade-up"
                      style={{ animationDelay: `${460 + index * 80}ms` }}
                    >
                      <p className="text-xs uppercase tracking-[0.2em]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-semibold text-[var(--ink)]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(15,17,21,0.25)] fade-up" style={{ animationDelay: "260ms" }}>
                  <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                    <span className="font-semibold uppercase tracking-[0.2em]">
                      Editor
                    </span>
                    <span>main.typ</span>
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                      <div className="h-2 w-24 rounded-full bg-[var(--line)]" />
                      <div className="mt-4 space-y-3">
                        <div className="h-2 w-full rounded-full bg-[var(--line)]" />
                        <div className="h-2 w-5/6 rounded-full bg-[var(--line)]" />
                        <div className="h-2 w-4/6 rounded-full bg-[var(--line)]" />
                        <div className="h-2 w-5/6 rounded-full bg-[var(--line)]" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                      <div className="h-3 w-20 rounded-full bg-[var(--accent-soft)]" />
                      <div className="mt-4 space-y-3">
                        <div className="h-20 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]" />
                        <div className="h-12 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-6 -right-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs font-semibold text-[var(--ink)] shadow-[var(--shadow)] float-slow">
                  Rendered in 42ms
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section-pad scroll-mt-24">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {messages.features.label}
                </p>
                <h2 className="mt-3 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                  {messages.features.title}
                </h2>
              </div>
              <p className="max-w-xl text-pretty text-base text-[var(--muted)]">
                {messages.features.subtitle}
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {messages.features.items.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)] fade-up"
                  style={{ animationDelay: `${120 + index * 80}ms` }}
                >
                  <h3 className="text-lg font-semibold text-[var(--ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="section-pad scroll-mt-24 border-y border-[var(--line)] bg-[var(--surface)]"
        >
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {messages.workflow.label}
                </p>
                <h2 className="mt-3 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                  {messages.workflow.title}
                </h2>
              </div>
              <p className="max-w-xl text-pretty text-base text-[var(--muted)]">
                {messages.workflow.subtitle}
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {messages.workflow.steps.map((item, index) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)] fade-up"
                  style={{ animationDelay: `${140 + index * 90}ms` }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Step {item.step}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-[var(--ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="templates" className="section-pad scroll-mt-24">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {messages.templates.label}
                </p>
                <h2 className="mt-3 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                  {messages.templates.title}
                </h2>
                <p className="mt-4 text-pretty text-base text-[var(--muted)]">
                  {messages.templates.subtitle}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {messages.templates.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]"
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {item}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {messages.templates.itemLabel}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="api"
          className="section-pad scroll-mt-24 bg-[var(--inverse-bg)] text-[var(--inverse-ink)]"
        >
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--inverse-muted)]">
                  {messages.api.label}
                </p>
                <h2 className="mt-3 font-display text-3xl text-[var(--inverse-ink)] sm:text-4xl">
                  {messages.api.title}
                </h2>
                <p className="mt-4 text-pretty text-base text-[var(--inverse-muted)]">
                  {messages.api.subtitle}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={localePath("/docs")}
                    className="inline-flex items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-[var(--ink-strong)] transition hover:bg-white/90"
                  >
                    {messages.api.ctaDocs}
                  </Link>
                  <Link
                    href={consoleUrl}
                    className="inline-flex items-center justify-center rounded-md border border-[var(--inverse-line)] bg-[var(--inverse-surface)] px-5 py-3 text-sm font-semibold text-[var(--inverse-ink)] transition hover:border-[var(--inverse-ink)]"
                  >
                    {messages.api.ctaConsole}
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--inverse-line)] bg-[var(--inverse-surface)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--inverse-muted)]">
                  {messages.api.quickStartLabel}
                </p>
                <pre className="mt-4 overflow-x-auto rounded-xl bg-[var(--inverse-code-bg)] p-4 text-xs text-[var(--inverse-ink)]">
                  <code>{`curl -X POST "$DOCUFORGE_API_URL/v1/render/preview" \\
  -H "Authorization: Bearer $DOCUFORGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "source": "...", "data": { "invoice_id": "1234" } }' \\
  --output preview.pdf`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section id="principles" className="section-pad scroll-mt-24">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {messages.principles.label}
                </p>
                <h2 className="mt-3 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                  {messages.principles.title}
                </h2>
                <p className="mt-4 text-pretty text-base text-[var(--muted)]">
                  {messages.principles.subtitle}
                </p>
              </div>
              <div className="grid gap-4">
                {messages.principles.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="system"
          className="section-pad scroll-mt-24 border-t border-[var(--line)] bg-[var(--surface)]"
        >
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {messages.system.label}
                </p>
                <h2 className="mt-3 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                  {messages.system.title}
                </h2>
                <p className="mt-4 text-pretty text-base text-[var(--muted)]">
                  {messages.system.subtitle}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {messages.system.items.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]"
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {item.title}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="blogs" className="section-pad scroll-mt-24 border-t border-[var(--line)]">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {blogCopy.label}
                </p>
                <h2 className="mt-3 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                  {blogCopy.title}
                </h2>
                <p className="mt-4 max-w-2xl text-pretty text-base text-[var(--muted)]">
                  {blogCopy.subtitle}
                </p>
              </div>
              <Link
                href={localePath("/blog")}
                className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
              >
                {blogCopy.cta}
              </Link>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {blogCopy.cards.map((item) => (
                <Link
                  key={item.href}
                  href={localePath(item.href)}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    {item.keyword}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                    {item.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-10 text-center">
              <h2 className="font-display text-3xl text-[var(--ink)] sm:text-4xl">
                {messages.cta.title}
              </h2>
              <p className="mt-4 text-pretty text-base text-[var(--muted)]">
                {messages.cta.subtitle}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href={localePath("/docs")}
                  className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                >
                  {messages.cta.ctaDocs}
                </Link>
                <Link
                  href={consoleUrl}
                  className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
                >
                  {messages.cta.ctaConsole}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
