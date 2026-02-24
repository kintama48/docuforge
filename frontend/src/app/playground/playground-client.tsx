"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileCode,
  FilePdf,
  Funnel,
  MagnifyingGlass,
  Receipt,
  SealCheck,
  Truck,
} from "@phosphor-icons/react";
import { env } from "@/src/config/env";
import { useI18n } from "@/src/lib/i18n";
import { useLocalePath } from "@/src/lib/use-locale-path";
import type { LowCodeSpec } from "@/src/lib/low-code";

type PlaygroundPreset = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  icon: "freight" | "invoice" | "certificate";
  hints: string[];
  source: string;
  lowCodeSpec: LowCodeSpec;
  data: string;
};

type HeaderBlock = Extract<LowCodeSpec["blocks"][number], { type: "header" }>;
type ParagraphBlock = Extract<LowCodeSpec["blocks"][number], { type: "paragraph" }>;
type LineItemsBlock = Extract<LowCodeSpec["blocks"][number], { type: "line_items_table" }>;

type PublicPreviewSessionResponse = {
  session_id: string;
  expires_at: string;
  remaining_renders: number;
  watermark: string;
};

const presets: PlaygroundPreset[] = [
  {
    id: "freight-invoice",
    title: "Freight Invoice",
    description: "LTL/FTL shipment billing with lane and surcharge lines.",
    tags: ["invoice", "freight", "logistics", "shipping"],
    icon: "freight",
    hints: [
      "Use lane names and surcharges users recognize.",
      "Keep the line item labels short for mobile PDF viewers.",
      "Preview before sending to carriers or clients.",
    ],
    source: `#set page(paper: "a4", margin: 14pt)
#set text(font: "Inter", size: 10pt)

= Freight Invoice #sys.inputs.invoice_id

Client: #sys.inputs.customer_name
Route: #sys.inputs.origin -> #sys.inputs.destination

#table(
  columns: (3fr, 1fr, 1fr),
  [Item], [Qty], [Amount],
  ..sys.inputs.lines.map((line) => (
    [#line.label], [#line.qty], [$ #line.amount]
  )),
)

#align(right)[
  *Subtotal:* $ #sys.inputs.subtotal \\
  *Fuel surcharge:* $ #sys.inputs.fuel_surcharge \\
  *Total due:* $ #sys.inputs.total_due
]`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "18pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{invoice.title}}",
            subtitle: "{{invoice.route}}",
            align: "left",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{invoice.customer}}",
          },
        },
        { type: "divider" },
        {
          type: "line_items_table",
          props: {
            title: "Freight line items",
            items_path: "lines",
            columns: ["description", "qty", "price", "total"],
          },
        },
      ],
    },
    data: `{
  "invoice": {
    "title": "Freight Invoice FRT-2026-0042",
    "route": "Dallas, TX -> Memphis, TN",
    "customer": "Northbound Distribution"
  },
  "lines": [
    { "description": "Linehaul (LTL)", "qty": 1, "price": 780.0, "total": 780.0 },
    { "description": "Liftgate", "qty": 1, "price": 45.0, "total": 45.0 },
    { "description": "Detention", "qty": 2, "price": 60.0, "total": 120.0 }
  ]
}`,
  },
  {
    id: "saas-invoice",
    title: "SaaS Invoice",
    description: "Recurring billing invoice with usage and totals.",
    tags: ["invoice", "subscription", "billing"],
    icon: "invoice",
    hints: [
      "Use stable field names so your API payloads stay compatible.",
      "Keep one source of truth for totals in your backend.",
      "Start with preview, then ship via production render API.",
    ],
    source: `#set page(paper: "a4", margin: 12pt)
#set text(font: "Inter", size: 10pt)

= Invoice #sys.inputs.invoice_id
Customer: #sys.inputs.customer

#for item in sys.inputs.items {
  - #item.name (#item.qty) ..... $ #item.total
}

#align(right)[*Grand total:* $ #sys.inputs.grand_total]`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "20pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{invoice.title}}",
            subtitle: "{{invoice.customer}}",
            align: "left",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{invoice.period}}",
          },
        },
        { type: "divider" },
        {
          type: "line_items_table",
          props: {
            title: "Subscription items",
            items_path: "items",
            columns: ["name", "qty", "price", "total"],
          },
        },
      ],
    },
    data: `{
  "invoice": {
    "title": "Invoice INV-2026-001",
    "customer": "Acme Labs",
    "period": "Billing period: Feb 2026"
  },
  "items": [
    { "name": "Starter Plan", "qty": 1, "price": 49.0, "total": 49.0 },
    { "name": "Priority Support", "qty": 1, "price": 19.0, "total": 19.0 }
  ]
}`,
  },
  {
    id: "certificate",
    title: "Completion Certificate",
    description: "Simple certificate layout for teams and schools.",
    tags: ["certificate", "education", "hr"],
    icon: "certificate",
    hints: [
      "Use one clear completion statement.",
      "Keep recipient and issuer names as explicit fields.",
      "Use preview watermark to share draft copies safely.",
    ],
    source: `#set page(paper: "a4", margin: 20pt)
#set text(font: "Inter", size: 12pt)

#align(center)[
  = Certificate of Completion

  This certifies that
  *#sys.inputs.recipient*

  has successfully completed
  #sys.inputs.course

  Issued on #sys.inputs.issued_on
]`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "24pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{certificate.title}}",
            subtitle: "{{certificate.subtitle}}",
            align: "center",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{certificate.body}}",
          },
        },
      ],
    },
    data: `{
  "certificate": {
    "title": "Certificate of Completion",
    "subtitle": "Issued to Jordan Rivera",
    "body": "Jordan Rivera has successfully completed Warehouse Safety Operations on 2026-02-20."
  }
}`,
  },
];

function cloneSpec(spec: LowCodeSpec): LowCodeSpec {
  return JSON.parse(JSON.stringify(spec)) as LowCodeSpec;
}

function getHeaderBlock(spec: LowCodeSpec): HeaderBlock | undefined {
  return spec.blocks.find((block): block is HeaderBlock => block.type === "header");
}

function getParagraphBlock(spec: LowCodeSpec): ParagraphBlock | undefined {
  return spec.blocks.find((block): block is ParagraphBlock => block.type === "paragraph");
}

function getLineItemsBlock(spec: LowCodeSpec): LineItemsBlock | undefined {
  return spec.blocks.find((block): block is LineItemsBlock => block.type === "line_items_table");
}

function PresetIcon({ kind }: { kind: PlaygroundPreset["icon"] }) {
  if (kind === "freight") {
    return <Truck className="h-4 w-4 phosphor-icon" aria-hidden="true" />;
  }
  if (kind === "certificate") {
    return <SealCheck className="h-4 w-4 phosphor-icon" aria-hidden="true" />;
  }
  return <Receipt className="h-4 w-4 phosphor-icon" aria-hidden="true" />;
}

export default function PlaygroundClient() {
  const { messages } = useI18n();
  const localePath = useLocalePath();

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"low-code" | "typst">("low-code");
  const [activePresetId, setActivePresetId] = useState(presets[0].id);
  const [source, setSource] = useState(presets[0].source);
  const [lowCodeSpec, setLowCodeSpec] = useState<LowCodeSpec>(cloneSpec(presets[0].lowCodeSpec));
  const [dataJson, setDataJson] = useState(presets[0].data);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [sessionRemaining, setSessionRemaining] = useState<number | null>(null);
  const [watermarkLabel, setWatermarkLabel] = useState("Public preview watermark enabled");

  const activePreset = useMemo(() => {
    return presets.find((preset) => preset.id === activePresetId) ?? presets[0];
  }, [activePresetId]);

  const filteredPresets = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return presets;

    return presets.filter((preset) =>
      [preset.title, preset.description, ...preset.tags]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [query]);

  const headerBlock = useMemo(() => getHeaderBlock(lowCodeSpec), [lowCodeSpec]);
  const paragraphBlock = useMemo(() => getParagraphBlock(lowCodeSpec), [lowCodeSpec]);
  const tableBlock = useMemo(() => getLineItemsBlock(lowCodeSpec), [lowCodeSpec]);

  const payloadPreview = useMemo(() => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(dataJson);
    } catch {
      parsed = { error: "Invalid JSON payload" };
    }

    if (mode === "low-code") {
      return JSON.stringify(
        {
          low_code_spec: lowCodeSpec,
          data: parsed,
        },
        null,
        2
      );
    }

    return JSON.stringify(
      {
        source: source.slice(0, 180) + (source.length > 180 ? "..." : ""),
        data: parsed,
      },
      null,
      2
    );
  }, [dataJson, lowCodeSpec, mode, source]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const startPublicPreviewSession = async (): Promise<string> => {
    const response = await fetch(`${env.apiUrl}/v1/render/public/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Unable to start preview session (${response.status}): ${text.slice(0, 180)}`);
    }

    const payload = (await response.json()) as PublicPreviewSessionResponse;
    setSessionId(payload.session_id);
    setSessionExpiresAt(payload.expires_at);
    setSessionRemaining(payload.remaining_renders);
    setWatermarkLabel(payload.watermark || "Public preview watermark enabled");
    return payload.session_id;
  };

  useEffect(() => {
    startPublicPreviewSession().catch((sessionErr) => {
      setError(sessionErr instanceof Error ? sessionErr.message : "Unable to create preview session");
    });
    // Create one preview session on page load.
  }, []);

  const ensurePublicSession = async (): Promise<string> => {
    if (sessionId && sessionExpiresAt) {
      const expiresAtMs = Date.parse(sessionExpiresAt);
      if (Number.isFinite(expiresAtMs) && Date.now() < expiresAtMs - 5000) {
        return sessionId;
      }
    }

    return startPublicPreviewSession();
  };

  const applyPreset = (preset: PlaygroundPreset) => {
    setActivePresetId(preset.id);
    setSource(preset.source);
    setLowCodeSpec(cloneSpec(preset.lowCodeSpec));
    setDataJson(preset.data);
    setError(null);
    setPdfUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  };

  const updateHeader = (patch: Partial<HeaderBlock["props"]>) => {
    setLowCodeSpec((previous) => {
      const next = cloneSpec(previous);
      const block = getHeaderBlock(next);
      if (!block) return previous;
      block.props = { ...block.props, ...patch };
      return next;
    });
  };

  const updateParagraph = (text: string) => {
    setLowCodeSpec((previous) => {
      const next = cloneSpec(previous);
      const block = getParagraphBlock(next);
      if (!block) return previous;
      block.props.text = text;
      return next;
    });
  };

  const updateTableTitle = (title: string) => {
    setLowCodeSpec((previous) => {
      const next = cloneSpec(previous);
      const block = getLineItemsBlock(next);
      if (!block) return previous;
      block.props.title = title;
      return next;
    });
  };

  const runPreview = async () => {
    setError(null);
    setIsRunning(true);

    try {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(dataJson) as Record<string, unknown>;
      } catch {
        throw new Error("JSON data is invalid. Fix the payload and try again.");
      }

      const requestBody =
        mode === "low-code"
          ? {
              low_code_spec: lowCodeSpec,
              data: parsed,
            }
          : {
              source,
              files: {},
              data: parsed,
            };

      const executePreview = async (activeSessionId: string) => {
        return fetch(`${env.apiUrl}/v1/render/public/preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Preview-Session": activeSessionId,
          },
          body: JSON.stringify(requestBody),
        });
      };

      let activeSessionId = await ensurePublicSession();
      let response = await executePreview(activeSessionId);

      if (response.status === 401 || response.status === 403) {
        activeSessionId = await startPublicPreviewSession();
        response = await executePreview(activeSessionId);
      }

      if (!response.ok) {
        let reason = `Preview failed (${response.status})`;
        try {
          const payload = (await response.json()) as { message?: string };
          if (payload.message) reason = payload.message;
        } catch {
          // Ignore JSON parse errors and keep generic message.
        }
        throw new Error(reason);
      }

      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);
      setPdfUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return nextUrl;
      });

      const remainingHeader = response.headers.get("X-Preview-Session-Remaining-Renders");
      const remaining = remainingHeader ? Number(remainingHeader) : null;
      if (remaining !== null && Number.isFinite(remaining)) {
        setSessionRemaining(remaining);
      }

      const nextExpiry = response.headers.get("X-Preview-Session-Expires-At");
      if (nextExpiry) setSessionExpiresAt(nextExpiry);

      const watermark = response.headers.get("X-Preview-Watermark-Label");
      if (watermark) setWatermarkLabel(watermark);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1380px] px-6 pb-20 pt-12 lg:pt-16">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Playground
        </p>
        <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
          Pick a template, tweak fields, preview the PDF.
        </h1>
        <p className="font-script mt-4 max-w-3xl text-base leading-relaxed text-[var(--muted)]">
          Built for non-experts: start with low-code edits, keep Typst as advanced mode, and share watermarked preview drafts safely.
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Template library
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Search a use case, load it, then run a secure public preview.
            </p>
          </div>
          <label className="relative block w-full lg:w-[380px]">
            <MagnifyingGlass
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)] phosphor-icon"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates (freight invoice, certificate...)"
              className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`rounded-xl border p-4 text-left transition ${
                activePresetId === preset.id
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--line-hover)]"
              }`}
            >
              <div className="flex items-center gap-2 text-[var(--ink)]">
                <PresetIcon kind={preset.icon} />
                <p className="text-sm font-semibold">{preset.title}</p>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">{preset.description}</p>
              <p className="mt-2 text-[11px] text-[var(--muted-dim)]">{preset.tags.join(" · ")}</p>
            </button>
          ))}
          {filteredPresets.length === 0 ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
              No templates matched. Try invoice, freight, or certificate.
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(420px,0.95fr)_minmax(0,1.05fr)]">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Funnel className="h-4 w-4 text-[var(--muted)] phosphor-icon" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                1. Low-code tools first
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-1">
              <button
                type="button"
                onClick={() => setMode("low-code")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  mode === "low-code" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                }`}
              >
                Low-code
              </button>
              <button
                type="button"
                onClick={() => setMode("typst")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  mode === "typst" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                }`}
              >
                Typst (advanced)
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Hints for {activePreset.title}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
              {activePreset.hints.map((hint) => (
                <li key={hint}>- {hint}</li>
              ))}
            </ul>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Header title
              <input
                value={headerBlock?.props.title ?? ""}
                onChange={(event) => updateHeader({ title: event.target.value })}
                className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Header subtitle
              <input
                value={headerBlock?.props.subtitle ?? ""}
                onChange={(event) => updateHeader({ subtitle: event.target.value })}
                className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Supporting paragraph
              <textarea
                value={paragraphBlock?.props.text ?? ""}
                onChange={(event) => updateParagraph(event.target.value)}
                className="mt-2 h-24 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            {tableBlock ? (
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Table title
                <input
                  value={tableBlock.props.title ?? ""}
                  onChange={(event) => updateTableTitle(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
              </label>
            ) : null}
          </div>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            2. JSON data
          </label>
          <textarea
            value={dataJson}
            onChange={(event) => setDataJson(event.target.value)}
            className="mt-2 h-44 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />

          {mode === "typst" ? (
            <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-[var(--muted)] phosphor-icon" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  3. Advanced Typst source
                </p>
              </div>
              <textarea
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="mt-3 h-48 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 font-mono text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={runPreview}
              disabled={isRunning}
              className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRunning ? "Rendering preview..." : "Render public preview"}
            </button>
            <Link
              href={localePath("/register")}
              className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--line-hover)] hover:bg-[var(--surface-2)]"
            >
              Try DocuForge free
            </Link>
            <Link
              href={localePath("/docs")}
              className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--line-hover)] hover:bg-[var(--surface-2)]"
            >
              {messages.nav.readDocs}
            </Link>
          </div>

          <p className="mt-3 text-xs text-[var(--muted)]">
            Public preview is session-based and watermarked automatically. No login required.
          </p>

          {error ? (
            <p className="mt-4 rounded-md border border-[color-mix(in_oklab,var(--bad),white_45%)] bg-[color-mix(in_oklab,var(--bad),transparent_90%)] px-3 py-2 text-sm text-[var(--bad)]">
              {error}
            </p>
          ) : null}

          <div className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
            Session: {sessionId ? `${sessionId.slice(0, 14)}...` : "starting"} · Remaining previews: {sessionRemaining ?? "-"}
            {sessionExpiresAt ? ` · Expires ${new Date(sessionExpiresAt).toLocaleTimeString()}` : ""}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              <FilePdf className="h-4 w-4 phosphor-icon" aria-hidden="true" />
              Watermarked PDF preview
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">{watermarkLabel}</p>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="DocuForge playground preview"
                className="mt-3 h-[650px] w-full rounded-xl border border-[var(--line)] bg-white"
              />
            ) : (
              <div className="mt-3 flex h-[650px] items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-6 text-center text-sm text-[var(--muted)]">
                Render preview to generate a live PDF draft.
              </div>
            )}
          </div>

          <details className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Advanced payload (for developers)
            </summary>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-xs text-[var(--ink)]">
              <code>{payloadPreview}</code>
            </pre>
          </details>
        </section>
      </div>
    </div>
  );
}
