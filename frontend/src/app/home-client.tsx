"use client";

import Link from "next/link";
import {
  ArrowRight,
  BracketsCurly,
  CheckCircle,
  Code,
  Database,
  FilePdf,
  Gauge,
  Key,
  LockKey,
  RocketLaunch,
  ShieldCheck,
  Sparkle,
  Stack,
  TerminalWindow,
} from "@phosphor-icons/react";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { useI18n } from "@/src/lib/i18n";
import { getConsoleLocaleUrl } from "@/src/lib/urls";
import { useLocalePath } from "@/src/lib/use-locale-path";
import { listContent } from "@/src/lib/content-hub";
import {
  getMcpTools,
  getSecurityCapabilities,
} from "@/src/lib/security-mcp-content";
import { BrandLogo } from "@/src/components/brand/BrandLogo";
import { getHomeBenchmarkModel } from "@/src/lib/benchmark-report";

const featureIcons = [BracketsCurly, TerminalWindow, Stack, Gauge, Database, RocketLaunch] as const;
const featureTags = [
  "Typst + Monaco",
  "Hot preview",
  "Assets once",
  "Usage clarity",
  "Versioned by default",
  "Rust throughput",
] as const;
const workflowIcons = [Code, FilePdf, RocketLaunch] as const;
const securityIcons = [Key, LockKey, ShieldCheck] as const;
const switchPainPoints = [
  {
    title: "Latency spikes",
    problem: "Browser startup and page rendering inflate tail latency.",
    solution: "Typst-native rendering keeps queue times more stable.",
  },
  {
    title: "Memory pressure",
    problem: "Chrome workers consume large memory slices at scale.",
    solution: "Lower runtime footprint improves throughput per instance.",
  },
  {
    title: "Template drift",
    problem: "HTML print hacks increase maintenance and regressions.",
    solution: "Versioned Typst templates keep structure explicit.",
  },
] as const;
const ctaHighlights = [
  {
    icon: Gauge,
    title: "Fast render path",
    body: "Built for predictable latency under load.",
  },
  {
    icon: ShieldCheck,
    title: "Security built in",
    body: "TLS in transit plus hardened auth defaults.",
  },
  {
    icon: Stack,
    title: "Versioned templates",
    body: "Ship safely with stable template releases.",
  },
] as const;

function compactCopy(text: string, maxSentences = 1) {
  const chunks = text
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!chunks.length) return text;
  return chunks.slice(0, maxSentences).join(" ");
}

export default function Home() {
  const { messages, locale } = useI18n();
  const localePath = useLocalePath();
  const consoleUrl = getConsoleLocaleUrl("/dashboard", locale);
  const featuredPosts = listContent("blog", locale).slice(0, 3);
  const securityHighlights = getSecurityCapabilities().slice(0, 3);
  const mcpTools = getMcpTools().slice(0, 6);
  const homeBenchmark = getHomeBenchmarkModel();

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[var(--accent-soft)] blur-3xl pulse-soft" />
            <div className="absolute right-6 top-10 h-64 w-64 rounded-full bg-[var(--surface)] blur-3xl float-slower" />
          </div>

          <div className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-14 xl:px-8 lg:pb-20 lg:pt-20">
            <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_580px] xl:gap-14">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)] fade-up">
                  {messages.hero.badge}
                </div>

                <h1
                  className="mt-6 max-w-3xl text-balance font-display text-5xl leading-[1.02] text-[var(--ink)] sm:text-6xl xl:text-7xl fade-up"
                  style={{ animationDelay: "90ms" }}
                >
                  {messages.hero.title}
                </h1>

                <p
                  className="font-script mt-5 max-w-xl text-pretty text-lg leading-relaxed text-[var(--muted)] fade-up"
                  style={{ animationDelay: "180ms" }}
                >
                  {compactCopy(messages.hero.subtitle, 1)}
                </p>

                <div
                  className="mt-8 flex flex-wrap items-center gap-3 fade-up"
                  style={{ animationDelay: "260ms" }}
                >
                  <Link href={localePath("/docs")} className="btn btn-primary">
                    {messages.hero.ctaDocs}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link href={consoleUrl} className="btn btn-secondary">
                    {messages.hero.ctaConsole}
                  </Link>
                </div>

                <div
                  className="mt-8 grid gap-3 sm:grid-cols-3 fade-up"
                  style={{ animationDelay: "340ms" }}
                >
                  {messages.hero.stats.slice(0, 2).map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-semibold text-[var(--ink)]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative fade-up" style={{ animationDelay: "180ms" }}>
                <div className="rounded-[30px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] lg:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <BrandLogo className="h-10 w-10 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-1.5" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                          Workflow canvas
                        </p>
                        <p className="text-sm font-semibold text-[var(--ink)]">Template to PDF in one loop</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
                      42ms
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--ink)]">
                        <Code className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Write</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">main.typ + data.json</p>
                    </div>

                    <div className="hidden items-center justify-center sm:flex">
                      <ArrowRight className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
                    </div>

                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--ink)]">
                        <Sparkle className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Preview</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">Queue + diagnostics</p>
                    </div>

                    <div className="hidden items-center justify-center sm:flex">
                      <ArrowRight className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
                    </div>

                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--ink)]">
                        <FilePdf className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Ship</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">Versioned API render</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {mcpTools.slice(0, 3).map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--ink)]"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-[var(--good)]" aria-hidden="true" />
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="absolute -bottom-5 -left-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--ink)] shadow-[var(--shadow)]">
                  Queue healthy
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-pad border-y border-[var(--line)] bg-[var(--surface)]">
          <div className="mx-auto w-full max-w-[1400px] px-6 xl:px-8">
            <div className="grid gap-8 xl:grid-cols-[1fr_520px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Why teams migrate
                </p>
                <h2 className="mt-3 max-w-2xl text-balance font-display text-4xl text-[var(--ink)] sm:text-5xl">
                  Replace browser PDF bottlenecks with a predictable render pipeline.
                </h2>
                <p className="mt-4 max-w-2xl text-pretty text-base text-[var(--muted)]">
                  Same documents, fewer moving parts. Keep template quality high while reducing render overhead.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {switchPainPoints.map((item) => (
                    <article
                      key={item.title}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5"
                    >
                      <h3 className="text-base font-semibold text-[var(--ink)]">{item.title}</h3>
                      <p className="mt-2 text-sm text-[var(--bad)]">{item.problem}</p>
                      <p className="mt-2 text-sm text-[var(--good)]">{item.solution}</p>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      Benchmark snapshot
                    </p>
                    <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                      {homeBenchmark.title}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                      {new Date(homeBenchmark.generatedAt).toLocaleDateString("en-US")} · {homeBenchmark.source}
                    </p>
                  </div>
                  <Gauge className="h-5 w-5 text-[var(--muted)]" aria-hidden="true" />
                </div>

                <div className="mt-6 space-y-4">
                  {homeBenchmark.rows.map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                        <span>{item.label}</span>
                        <span>DocuForge {item.docuforgeLabel}</span>
                      </div>
                      <div className="h-7 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface-2)]">
                        <div
                          className="h-full bg-[var(--accent)]"
                          style={{ width: `${item.widthPercent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {homeBenchmark.baselineName}: {item.baselineLabel}
                      </p>
                    </div>
                  ))}
                </div>

                <Link href={localePath("/compare")} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--ink)] hover:text-[var(--accent)]">
                  Open full comparison
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </aside>
            </div>
          </div>
        </section>

        <section id="features" className="section-pad scroll-mt-24">
          <div className="mx-auto w-full max-w-[1400px] px-6 xl:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {messages.features.label}
                </p>
                <h2 className="mt-3 max-w-xl text-balance font-display text-4xl text-[var(--ink)] sm:text-5xl">
                  {messages.features.title}
                </h2>
              </div>
              <p className="max-w-xl text-pretty text-base text-[var(--muted)]">
                {compactCopy(messages.features.subtitle, 1)}
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {messages.features.items.slice(0, 4).map((item, index) => {
                const Icon = featureIcons[index % featureIcons.length];
                const tag = featureTags[index % featureTags.length];
                return (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-[var(--ink)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">{compactCopy(item.body, 1)}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      {tag}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="section-pad scroll-mt-24 border-y border-[var(--line)] bg-[var(--surface)]"
        >
          <div className="mx-auto w-full max-w-[1400px] px-6 xl:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {messages.workflow.label}
                </p>
                <h2 className="mt-3 max-w-xl text-balance font-display text-4xl text-[var(--ink)] sm:text-5xl">
                  {messages.workflow.title}
                </h2>
              </div>
              <p className="max-w-xl text-pretty text-base text-[var(--muted)]">
                {compactCopy(messages.workflow.subtitle, 1)}
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {messages.workflow.steps.map((item, index) => {
                const Icon = workflowIcons[index % workflowIcons.length];
                return (
                  <article
                    key={item.step}
                    className="relative rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        Step {item.step}
                      </p>
                      <Icon className="h-5 w-5 text-[var(--muted)]" aria-hidden="true" />
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">{item.title}</h3>
                    <p className="mt-3 text-sm text-[var(--muted)]">{compactCopy(item.body, 1)}</p>
                    {index < messages.workflow.steps.length - 1 ? (
                      <ArrowRight
                        className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-[var(--muted)] lg:block"
                        aria-hidden="true"
                      />
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="api"
          className="section-pad scroll-mt-24 bg-[var(--inverse-bg)] text-[var(--inverse-ink)]"
        >
          <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-6 xl:grid-cols-[1.08fr_0.92fr] xl:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--inverse-muted)]">
                Security, API and MCP
              </p>
              <h2 className="mt-3 max-w-xl text-balance font-display text-4xl text-[var(--inverse-ink)] sm:text-5xl">
                Ship sensitive PDFs without security drag.
              </h2>
              <p className="mt-4 max-w-2xl text-base text-[var(--inverse-muted)]">
                Protect customer documents by default and keep audit conversations short. DocuForge gives teams secure delivery controls without slowing down shipping velocity.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={localePath("/docs")} className="btn btn-inverse">
                  {messages.api.ctaDocs}
                </Link>
                <Link href={consoleUrl} className="btn btn-outline-inverse">
                  {messages.api.ctaConsole}
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {securityHighlights.map((item, index) => {
                  const Icon = securityIcons[index % securityIcons.length];
                  return (
                    <div
                      key={item}
                      className="rounded-xl border border-[var(--inverse-line)] bg-[var(--inverse-surface)] p-4 text-sm text-[var(--inverse-muted)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--inverse-line)] bg-[color-mix(in_oklab,var(--accent),black_72%)] text-[var(--inverse-ink)]">
                          <Icon className="phosphor-icon h-3.5 w-3.5" aria-hidden="true" weight="fill" />
                        </div>
                        <p className="text-sm leading-relaxed text-[var(--inverse-muted)]">
                          {compactCopy(item, 1)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--inverse-line)] bg-[var(--inverse-surface)] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--inverse-muted)]">
                <TerminalWindow className="h-4 w-4" aria-hidden="true" />
                Render quick start
              </div>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-[var(--inverse-code-bg)] p-4 text-xs text-[var(--inverse-ink)]">
                <code>{`curl -X POST "$DOCUFORGE_API_URL/v1/render" \\
  -H "X-API-Key: $DOCUFORGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "template_id": "tpl_123", "data": { "invoice_id": "1234" } }' \\
  --output invoice.pdf`}</code>
              </pre>

              <div className="mt-5 flex flex-wrap gap-2">
                {mcpTools.map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--inverse-line)] bg-[var(--inverse-surface)] px-3 py-1 text-xs text-[var(--inverse-muted)]"
                  >
                    <Sparkle className="h-3.5 w-3.5" aria-hidden="true" />
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="blog" className="section-pad scroll-mt-24">
          <div className="mx-auto w-full max-w-[1400px] px-6 xl:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Blogs
                </p>
                <h2 className="mt-3 text-balance font-display text-4xl text-[var(--ink)] sm:text-5xl">
                  Learn by shipping.
                </h2>
              </div>
              <Link href={localePath("/blog")} className="btn btn-secondary btn-sm w-fit">
                Browse posts
              </Link>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {featuredPosts.map((post) => (
                <article
                  key={post.slug}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    {post.category}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-[var(--ink)]">{post.title}</h3>
                  <Link
                    href={localePath(`/blog/${post.slug}`)}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
                  >
                    Read
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad">
          <div className="mx-auto w-full max-w-[1200px] px-6 xl:px-8">
            <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] sm:p-10 lg:p-12">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -right-14 -top-20 h-52 w-52 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-70" />
                <div className="absolute -left-16 -bottom-20 h-48 w-48 rounded-full bg-[color-mix(in_oklab,var(--accent),transparent_88%)] blur-3xl" />
              </div>

              <div className="relative mx-auto max-w-3xl text-center">
                <p className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Production-ready workflow
                </p>
                <h2 className="mt-5 text-balance font-display text-4xl text-[var(--ink)] sm:text-5xl">
                  {messages.cta.title}
                </h2>
                <p className="font-script mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
                  {compactCopy(messages.cta.subtitle, 1)}
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Link href={localePath("/docs")} className="btn btn-primary">
                    {messages.cta.ctaDocs}
                  </Link>
                  <Link href={consoleUrl} className="btn btn-secondary">
                    {messages.cta.ctaConsole}
                  </Link>
                </div>
              </div>

              <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
                {ctaHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article
                      key={item.title}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-left"
                    >
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]">
                        <Icon className="phosphor-icon h-3.5 w-3.5" aria-hidden="true" weight="duotone" />
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-[var(--ink)]">{item.title}</h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">{item.body}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
