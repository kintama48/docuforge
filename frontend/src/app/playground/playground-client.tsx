"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { env } from "@/src/config/env";
import { useI18n } from "@/src/lib/i18n";
import { useLocalePath } from "@/src/lib/use-locale-path";

const defaultSource = `#set page(paper: "a4", margin: 12pt)
#set text(font: "Inter", size: 10pt)

= Invoice #sys.inputs.invoice_id

#for item in sys.inputs.items {
  - #item.name (#item.qty) ..... $ #item.total
}

#align(right)[*Grand total:* $ #sys.inputs.grand_total]`;

const defaultData = `{
  "invoice_id": "INV-2026-001",
  "items": [
    { "name": "Starter Plan", "qty": 1, "total": 49.0 },
    { "name": "Priority Support", "qty": 1, "total": 19.0 }
  ],
  "grand_total": 68.0
}`;

export default function PlaygroundClient() {
  const { messages } = useI18n();
  const localePath = useLocalePath();
  const [token, setToken] = useState("");
  const [source, setSource] = useState(defaultSource);
  const [dataJson, setDataJson] = useState(defaultData);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const payloadPreview = useMemo(
    () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(dataJson);
      } catch {
        parsed = { error: "Invalid JSON payload" };
      }

      return JSON.stringify(
        {
          source: source.slice(0, 120) + (source.length > 120 ? "..." : ""),
          data: parsed,
        },
        null,
        2
      );
    },
    [source, dataJson]
  );

  const runPreview = async () => {
    setError(null);
    setIsRunning(true);

    try {
      if (!token.trim()) {
        throw new Error("Add a JWT token from your DocuForge dashboard to run live preview.");
      }

      const parsed = JSON.parse(dataJson) as Record<string, unknown>;
      const response = await fetch(`${env.apiUrl}/v1/render/preview`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source,
          files: {},
          data: parsed,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Preview failed (${response.status}): ${text.slice(0, 240)}`);
      }

      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);
      setPdfUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return nextUrl;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 lg:pt-16">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Playground
        </p>
        <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
          Test Typst templates live in your browser
        </h1>
        <p className="mt-4 text-base text-[var(--muted)]">
          Paste template code and JSON data, then run a real preview request against the
          DocuForge render API. This is built for rapid onboarding and lead capture with direct
          conversion paths to docs and signup.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            JWT token
          </label>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste your DocuForge bearer token"
            className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />

          <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Typst source
          </label>
          <textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="mt-2 h-56 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />

          <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            JSON data
          </label>
          <textarea
            value={dataJson}
            onChange={(event) => setDataJson(event.target.value)}
            className="mt-2 h-48 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={runPreview}
              disabled={isRunning}
              className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRunning ? "Rendering..." : "Run live preview"}
            </button>
            <Link
              href={localePath("/register")}
              className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
            >
              Try DocuForge free
            </Link>
            <Link
              href={localePath("/docs")}
              className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
            >
              {messages.nav.readDocs}
            </Link>
          </div>

          {error && (
            <p className="mt-4 rounded-md border border-red-400/50 bg-red-400/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Request summary
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-xs text-[var(--ink)]">
              <code>{payloadPreview}</code>
            </pre>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              PDF preview
            </p>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="DocuForge playground preview"
                className="mt-3 h-[520px] w-full rounded-xl border border-[var(--line)] bg-white"
              />
            ) : (
              <div className="mt-3 flex h-[520px] items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] text-sm text-[var(--muted)]">
                Run preview to generate a live PDF.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
