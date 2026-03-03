"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock,
  FileCode,
  Gauge,
  Lightning,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { withLocale } from "@/src/lib/locale-path";
import type { Locale } from "@/src/lib/i18n-config";
import {
  getCompareBenchmarkModel,
  type BenchmarkToolId,
} from "@/src/lib/benchmark-report";

type CompareDocSummary = {
  slug: string;
  title: string;
  excerpt: string;
  updatedAt: string;
};

type BenchmarkKey = "speed" | "memory" | "coldStart";

const TOOL_META: Record<BenchmarkToolId, { name: string; tone: string }> = {
  docuforge: { name: "DocuForge", tone: "bg-[var(--accent)]" },
  puppeteer: { name: "Puppeteer", tone: "bg-emerald-500" },
  wkhtmltopdf: { name: "wkhtmltopdf", tone: "bg-violet-500" },
  weasyprint: { name: "WeasyPrint", tone: "bg-amber-500" },
};

const FEATURE_ROWS: Array<
  { feature: string } & Record<BenchmarkToolId, string | boolean>
> = [
  {
    feature: "Template language",
    docuforge: "Typst",
    puppeteer: "HTML/CSS",
    wkhtmltopdf: "HTML/CSS",
    weasyprint: "HTML/CSS",
  },
  {
    feature: "Browser dependency",
    docuforge: false,
    puppeteer: true,
    wkhtmltopdf: true,
    weasyprint: false,
  },
  {
    feature: "Native PDF engine",
    docuforge: true,
    puppeteer: false,
    wkhtmltopdf: false,
    weasyprint: true,
  },
  {
    feature: "Managed API",
    docuforge: true,
    puppeteer: false,
    wkhtmltopdf: false,
    weasyprint: false,
  },
  {
    feature: "Template versioning",
    docuforge: true,
    puppeteer: false,
    wkhtmltopdf: false,
    weasyprint: false,
  },
  {
    feature: "Serverless readiness",
    docuforge: true,
    puppeteer: false,
    wkhtmltopdf: false,
    weasyprint: "Partial",
  },
  {
    feature: "PDF password protection",
    docuforge: true,
    puppeteer: "Manual",
    wkhtmltopdf: "Limited",
    weasyprint: "Manual",
  },
  {
    feature: "Typical ops memory",
    docuforge: "~18MB",
    puppeteer: "~280MB",
    wkhtmltopdf: "~65MB",
    weasyprint: "~95MB",
  },
];

const PAIN_POINTS = [
  {
    icon: Clock,
    title: "Slow browser render loops",
    problem: "Headless Chrome adds startup and render latency for every document.",
    solution: "DocuForge renders natively in Rust and keeps response time predictable.",
  },
  {
    icon: FileCode,
    title: "HTML print edge cases",
    problem: "Page breaks, long tables, and running headers require repeated CSS workarounds.",
    solution: "Typst keeps document layout rules explicit and versionable.",
  },
  {
    icon: Lightning,
    title: "Expensive throughput",
    problem: "Chrome-heavy workers consume memory quickly and cost more under load.",
    solution: "Lower engine overhead means smaller instances and better queue density.",
  },
  {
    icon: Gauge,
    title: "Hard to keep quality stable",
    problem: "Template drift and hidden state make production incidents difficult to debug.",
    solution: "DocuForge pairs strict API contracts with template versions and diagnostics.",
  },
] as const;

const HONESTY_ITEMS = [
  {
    title: "Complex CSS-only layouts",
    body: "If you depend on browser-specific CSS behavior, Puppeteer may be the safer short-term choice.",
  },
  {
    title: "Large existing HTML template estate",
    body: "Migrating legacy templates to Typst takes planning. Keep Puppeteer for legacy output during transition.",
  },
  {
    title: "Live webpage to PDF",
    body: "If you need screenshot-like page capture from URLs, browser tooling is still the right fit.",
  },
  {
    title: "Mature ecosystem depth",
    body: "Puppeteer has more historical community volume. DocuForge optimizes for focused PDF workflows.",
  },
] as const;

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check className="phosphor-icon h-4 w-4 text-[var(--good)]" weight="bold" aria-hidden="true" />;
  }
  if (value === false) {
    return <X className="phosphor-icon h-4 w-4 text-[var(--bad)]" weight="bold" aria-hidden="true" />;
  }
  return <span className="font-mono text-xs text-[var(--muted)]">{value}</span>;
}

function BenchmarkBar({
  value,
  max,
  label,
  tone,
}: {
  value: number;
  max: number;
  label: string;
  tone: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  const width = max === 0 ? 0 : (value / max) * 100;

  return (
    <div className="flex items-center gap-3">
      <div className="h-7 flex-1 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface-2)]">
        <div
          className={`h-full rounded-md ${tone} transition-[width] duration-700 ease-out`}
          style={{ width: `${ready ? width : 0}%` }}
        />
      </div>
      <span className="w-14 text-right font-mono text-xs font-semibold text-[var(--ink)]">{label}</span>
    </div>
  );
}

export function CompareShowcase({
  locale,
  docs,
}: {
  locale: Locale;
  docs: CompareDocSummary[];
}) {
  const benchmarkModel = getCompareBenchmarkModel();
  const [activeBenchmark, setActiveBenchmark] = useState<BenchmarkKey>("speed");
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const active = benchmarkModel.series[activeBenchmark];
  const max = Math.max(...active.data.map((item) => item.value));

  const list = showAllFeatures ? FEATURE_ROWS : FEATURE_ROWS.slice(0, 6);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--inverse-bg)] text-[var(--inverse-ink)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-[color-mix(in_oklab,var(--accent),transparent_78%)] blur-3xl" />
          <div className="absolute -left-28 bottom-0 h-64 w-64 rounded-full bg-[color-mix(in_oklab,var(--accent),black_72%)] blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-[1200px] px-6 pb-16 pt-16 text-center sm:pb-20 sm:pt-20">
          <p className="inline-flex items-center rounded-full border border-[var(--inverse-line)] bg-[var(--inverse-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--inverse-muted)]">
            PDF generation benchmark and comparison
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-display text-4xl sm:text-6xl">
            DocuForge vs browser PDF stacks
          </h1>
          <p className="font-script mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-[var(--inverse-muted)] sm:text-lg">
            A direct, engineering-level comparison focused on throughput, memory, template control, and production reliability.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="#benchmarks" className="btn btn-primary">
              See benchmark snapshot
              <ArrowRight className="phosphor-icon h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href={withLocale("/playground", locale)} className="btn btn-outline-inverse">
              Try playground
            </Link>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Why teams switch
              </p>
              <h2 className="mt-3 max-w-xl text-balance font-display text-4xl text-[var(--ink)] sm:text-5xl">
                Common bottlenecks with browser-driven PDF pipelines
              </h2>
            </div>
            <p className="font-script max-w-xl text-pretty text-base leading-relaxed text-[var(--muted)]">
              Most PDF issues are operational. Latency, memory, and brittle templates create incident load as document volume grows.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {PAIN_POINTS.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)]">
                    <Icon className="phosphor-icon h-5 w-5" aria-hidden="true" weight="duotone" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-[var(--ink)]">{item.title}</h3>
                  <p className="mt-3 text-sm text-[var(--bad)]">{item.problem}</p>
                  <p className="mt-3 text-sm text-[var(--good)]">{item.solution}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="benchmarks" className="section-pad border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Benchmarks
          </p>
          <h2 className="mt-3 text-balance font-display text-4xl text-[var(--ink)] sm:text-5xl">
            Real performance profile
          </h2>
          <p className="font-script mt-4 max-w-2xl text-pretty text-base leading-relaxed text-[var(--muted)]">
            Snapshot metrics are shown below to guide evaluation quickly. A full reproducible benchmark report can be linked when your latest run is published.
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Source: {benchmarkModel.source} · Generated {new Date(benchmarkModel.generatedAt).toLocaleDateString("en-US")}
          </p>

          <div className="mt-7 inline-flex flex-wrap gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2">
            {(Object.keys(benchmarkModel.series) as BenchmarkKey[]).map((key) => {
              const selected = key === activeBenchmark;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveBenchmark(key)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                  }`}
                >
                  {benchmarkModel.series[key].title}
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[var(--ink)]">{active.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{active.subtitle}</p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                {active.lowerBetter ? "Lower is better" : "Higher is better"}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {active.data.map((item) => (
                <div key={`${activeBenchmark}:${item.tool}`} className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--ink)]">{TOOL_META[item.tool].name}</p>
                  <BenchmarkBar
                    value={item.value}
                    max={max}
                    label={item.label}
                    tone={TOOL_META[item.tool].tone}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--muted)]">
              {benchmarkModel.methodologySummary}
              <span className="ml-1">Run: <code>{benchmarkModel.command}</code></span>
            </div>
            {benchmarkModel.unavailableTools.length > 0 ? (
              <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--muted)]">
                Missing tools: {benchmarkModel.unavailableTools.join(" · ")}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Capability matrix
          </p>
          <h2 className="mt-3 text-balance font-display text-4xl text-[var(--ink)] sm:text-5xl">
            Feature-by-feature comparison
          </h2>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-[var(--surface-2)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                    DocuForge
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Puppeteer
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    wkhtmltopdf
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    WeasyPrint
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((row, index) => (
                  <tr key={row.feature} className={index % 2 ? "bg-[var(--surface-2)]/40" : "bg-[var(--surface)]"}>
                    <td className="border-t border-[var(--line)] px-4 py-3 text-[var(--ink)]">{row.feature}</td>
                    <td className="border-t border-[var(--line)] px-4 py-3 text-center"><FeatureValue value={row.docuforge} /></td>
                    <td className="border-t border-[var(--line)] px-4 py-3 text-center"><FeatureValue value={row.puppeteer} /></td>
                    <td className="border-t border-[var(--line)] px-4 py-3 text-center"><FeatureValue value={row.wkhtmltopdf} /></td>
                    <td className="border-t border-[var(--line)] px-4 py-3 text-center"><FeatureValue value={row.weasyprint} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!showAllFeatures ? (
            <button
              type="button"
              onClick={() => setShowAllFeatures(true)}
              className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:border-[var(--line-hover)]"
            >
              Show full matrix
            </button>
          ) : null}
        </div>
      </section>

      <section className="section-pad border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--warn)]">
              Full transparency
            </p>
            <h2 className="mt-3 text-balance font-display text-3xl text-[var(--ink)] sm:text-4xl">
              When browser stacks can still be the better fit
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {HONESTY_ITEMS.map((item) => (
                <article key={item.title} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                  <h3 className="text-lg font-semibold text-[var(--ink)]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Developer experience
          </p>
          <h2 className="mt-3 text-balance font-display text-4xl text-[var(--ink)] sm:text-5xl">
            Invoice render flow in practice
          </h2>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--inverse-bg)] text-[var(--inverse-ink)]">
              <header className="flex items-center gap-2 border-b border-[var(--inverse-line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--inverse-muted)]">
                <Check className="phosphor-icon h-3.5 w-3.5 text-[var(--good)]" aria-hidden="true" />
                DocuForge API
              </header>
              <pre className="overflow-x-auto p-4 text-xs text-[var(--inverse-ink)]">
                <code>{`POST /v1/render
X-API-Key: docu_live_***
Content-Type: application/json

{
  "template_id": "invoice_v4",
  "data": {
    "invoice_id": "INV-2026-001",
    "items": [...],
    "total": 1250
  }
}

# PDF bytes returned`}</code>
              </pre>
            </article>

            <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--inverse-bg)] text-[var(--inverse-ink)]">
              <header className="flex items-center gap-2 border-b border-[var(--inverse-line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--inverse-muted)]">
                <WarningCircle className="phosphor-icon h-3.5 w-3.5 text-[var(--warn)]" aria-hidden="true" />
                Browser stack example
              </header>
              <pre className="overflow-x-auto p-4 text-xs text-[var(--inverse-ink)]">
                <code>{`const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setContent(renderHtml(data));
const pdf = await page.pdf({ format: "A4" });
await browser.close();

# Runtime and memory vary by load`}</code>
              </pre>
            </article>
          </div>
        </div>
      </section>

      <section className="section-pad border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Deep dives
              </p>
              <h2 className="mt-3 text-balance font-display text-3xl text-[var(--ink)] sm:text-4xl">
                Tool-by-tool breakdowns
              </h2>
            </div>
            <Link href={withLocale("/docs", locale)} className="btn btn-secondary btn-sm w-fit">
              API reference
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {docs.map((doc) => (
              <Link
                key={doc.slug}
                href={withLocale(`/compare/${doc.slug}`, locale)}
                className="group rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--line-hover)] hover:shadow-[var(--shadow)]"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Updated {doc.updatedAt}</p>
                <h3 className="mt-3 text-xl font-semibold text-[var(--ink)]">{doc.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{doc.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--ink)]">
                  Open analysis
                  <ArrowRight className="phosphor-icon h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="mx-auto w-full max-w-[980px] px-6">
          <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow)] sm:p-10">
            <h2 className="text-balance font-display text-4xl text-[var(--ink)] sm:text-5xl">
              Validate your PDF pipeline quickly
            </h2>
            <p className="font-script mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
              Open the playground with real template starters, then move the same payload into production API calls.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href={withLocale("/playground", locale)} className="btn btn-primary">
                Open playground
              </Link>
              <Link href={withLocale("/pricing", locale)} className="btn btn-secondary">
                See plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
