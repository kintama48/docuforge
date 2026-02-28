"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileCode,
  FilePdf,
  MagnifyingGlass,
  Receipt,
  SealCheck,
  Truck,
} from "@phosphor-icons/react";
import { env } from "@/src/config/env";
import { LowCodeBlocksEditor } from "@/src/components/editor/LowCodeBlocksEditor";
import { useDebounce } from "@/src/hooks/use-debounce";
import { useI18n } from "@/src/lib/i18n";
import type { LowCodeSpec } from "@/src/lib/low-code";
import { useLocalePath } from "@/src/lib/use-locale-path";
import {
  cloneSpec,
  getPlaygroundPresetBySlug,
  playgroundPresetCategories,
  playgroundPresets,
  type PlaygroundPreset,
  type PlaygroundPresetCategory,
} from "@/src/app/playground/playground-presets";

type PlaygroundClientProps = {
  initialPresetSlug?: string;
};

type PublicPreviewSessionResponse = {
  session_id: string;
  expires_at: string;
  remaining_renders: number;
};

type PreviewInputs = {
  mode: "low-code" | "typst";
  source: string;
  lowCodeSpec: LowCodeSpec;
  dataJson: string;
};

function PresetIcon({ kind }: { kind: PlaygroundPreset["icon"] }) {
  if (kind === "freight") {
    return <Truck className="h-4 w-4 phosphor-icon" aria-hidden="true" />;
  }
  if (kind === "certificate") {
    return <SealCheck className="h-4 w-4 phosphor-icon" aria-hidden="true" />;
  }
  return <Receipt className="h-4 w-4 phosphor-icon" aria-hidden="true" />;
}

export default function PlaygroundClient({ initialPresetSlug }: PlaygroundClientProps) {
  const { messages } = useI18n();
  const localePath = useLocalePath();
  const initialPreset = getPlaygroundPresetBySlug(initialPresetSlug ?? "") ?? playgroundPresets[0];

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | PlaygroundPresetCategory>("all");
  const [mode, setMode] = useState<"low-code" | "typst">("low-code");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState(initialPreset.id);
  const [source, setSource] = useState(initialPreset.source);
  const [lowCodeSpec, setLowCodeSpec] = useState<LowCodeSpec>(cloneSpec(initialPreset.lowCodeSpec));
  const [dataJson, setDataJson] = useState(initialPreset.data);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [sessionRemaining, setSessionRemaining] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(true);
  const requestSequenceRef = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);
  const runPreviewRef = useRef<(input: PreviewInputs) => void>(() => {});
  const debouncedSource = useDebounce(source, 350);
  const debouncedLowCodeSpec = useDebounce(lowCodeSpec, 350);
  const debouncedDataJson = useDebounce(dataJson, 350);

  const activePreset = useMemo(() => {
    return playgroundPresets.find((preset) => preset.id === activePresetId) ?? playgroundPresets[0];
  }, [activePresetId]);

  const filteredPresets = useMemo(() => {
    const search = query.trim().toLowerCase();
    return playgroundPresets.filter((preset) => {
      const categoryMatch = category === "all" || preset.category === category;
      if (!categoryMatch) return false;
      if (!search) return true;
      return [preset.title, preset.description, ...preset.tags].join(" ").toLowerCase().includes(search);
    });
  }, [category, query]);

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

  useEffect(() => {
    return () => {
      activeAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    setShowHint(true);
    const timeout = window.setTimeout(() => setShowHint(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [activePresetId]);

  const startPublicPreviewSession = useCallback(async (): Promise<string> => {
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
    return payload.session_id;
  }, []);

  useEffect(() => {
    startPublicPreviewSession().catch((sessionErr) => {
      setError(sessionErr instanceof Error ? sessionErr.message : "Unable to create preview session");
    });
  }, [startPublicPreviewSession]);

  const ensurePublicSession = useCallback(async (): Promise<string> => {
    if (sessionId && sessionExpiresAt) {
      const expiresAtMs = Date.parse(sessionExpiresAt);
      if (Number.isFinite(expiresAtMs) && Date.now() < expiresAtMs - 5000) {
        return sessionId;
      }
    }

    return startPublicPreviewSession();
  }, [sessionExpiresAt, sessionId, startPublicPreviewSession]);

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

  const runPreview = useCallback(async ({ mode, source, lowCodeSpec, dataJson }: PreviewInputs) => {
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    activeAbortRef.current?.abort();
    const abortController = new AbortController();
    activeAbortRef.current = abortController;

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

      const executePreview = async (activeSessionId: string, signal: AbortSignal) => {
        return fetch(`${env.apiUrl}/v1/render/public/preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Preview-Session": activeSessionId,
          },
          body: JSON.stringify(requestBody),
          signal,
        });
      };

      let activeSessionId = await ensurePublicSession();
      let response = await executePreview(activeSessionId, abortController.signal);

      if (response.status === 401 || response.status === 403) {
        activeSessionId = await startPublicPreviewSession();
        response = await executePreview(activeSessionId, abortController.signal);
      }

      if (abortController.signal.aborted || requestId !== requestSequenceRef.current) {
        return;
      }

      if (!response.ok) {
        let reason = `Preview failed (${response.status})`;
        try {
          const payload = (await response.json()) as { message?: string };
          if (payload.message) reason = payload.message;
        } catch {
          // keep generic message
        }
        throw new Error(reason);
      }

      const blob = await response.blob();
      if (abortController.signal.aborted || requestId !== requestSequenceRef.current) {
        return;
      }

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
    } catch (err) {
      if (abortController.signal.aborted || requestId !== requestSequenceRef.current) {
        return;
      }
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      if (requestId === requestSequenceRef.current) {
        setIsRunning(false);
      }
    }
  }, [ensurePublicSession, startPublicPreviewSession]);

  useEffect(() => {
    runPreviewRef.current = runPreview;
  }, [runPreview]);

  useEffect(() => {
    runPreviewRef.current({
      mode,
      source: debouncedSource,
      lowCodeSpec: debouncedLowCodeSpec,
      dataJson: debouncedDataJson,
    });
  }, [debouncedDataJson, debouncedLowCodeSpec, debouncedSource, mode]);

  return (
    <div className="mx-auto w-full max-w-[1460px] px-6 pb-20 pt-10 lg:pt-14">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Template gallery</p>
        <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">Find a PDF template and preview instantly.</h1>
      </div>

      <section className="mt-7 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <label className="relative block w-full xl:max-w-[420px]">
            <MagnifyingGlass
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)] phosphor-icon"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates (freight invoice, shopify invoice...)"
              className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {playgroundPresetCategories.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                  category === option.value
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredPresets.map((preset) => (
            <article
              key={preset.id}
              className={`rounded-xl border p-4 ${
                activePresetId === preset.id
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line)] bg-[var(--surface-2)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[var(--ink)]">
                  <PresetIcon kind={preset.icon} />
                  <p className="text-sm font-semibold">{preset.title}</p>
                </div>
                <Link
                  href={localePath(`/playground/${preset.slug}`)}
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  Open page
                </Link>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">{preset.description}</p>
              <p className="mt-2 text-[11px] text-[var(--muted-dim)]">{preset.tags.join(" · ")}</p>
              <button
                type="button"
                onClick={() => applyPreset(preset)}
                className="mt-3 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--line-hover)]"
              >
                Use this template
              </button>
            </article>
          ))}
          {filteredPresets.length === 0 ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
              No templates matched your search.
            </div>
          ) : null}
        </div>
      </section>

      <div className={`mt-6 grid gap-6 ${isEditorOpen ? "xl:grid-cols-[390px_minmax(0,1fr)]" : "grid-cols-1"}`}>
        {isEditorOpen ? (
          <aside className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Edit menu</p>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]"
              >
                Hide
              </button>
            </div>

            <div className="mt-3 inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-1">
              <button
                type="button"
                onClick={() => setMode("low-code")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  mode === "low-code" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                }`}
              >
                Quick edits
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

            {mode === "low-code" ? (
              <LowCodeBlocksEditor
                lowCodeSpec={lowCodeSpec}
                onChange={setLowCodeSpec}
                className="mt-4 bg-[var(--surface-2)]"
                title="Template blocks"
              />
            ) : null}

            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">JSON data</label>
            <textarea
              value={dataJson}
              onChange={(event) => setDataJson(event.target.value)}
              className="mt-2 h-40 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />

            {mode === "typst" ? (
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-[var(--muted)] phosphor-icon" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Typst source</p>
                </div>
                <textarea
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  className="mt-3 h-52 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 font-mono text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
              </div>
            ) : null}
          </aside>
        ) : null}

        <section className="relative rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              <FilePdf className="h-4 w-4 phosphor-icon" aria-hidden="true" />
              {activePreset.title} preview
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                Remaining previews: {sessionRemaining ?? "--"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode("typst");
                  setIsEditorOpen(true);
                }}
                className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--ink)]"
              >
                Typst (advanced)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("low-code");
                  setIsEditorOpen((previous) => !previous);
                }}
                className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--ink)]"
              >
                {isEditorOpen ? "Hide editor" : "Edit template"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                runPreview({
                  mode,
                  source,
                  lowCodeSpec,
                  dataJson,
                })
              }
              disabled={isRunning}
              className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRunning ? "Rendering preview..." : "Render now"}
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

          {error ? (
            <p className="mt-4 rounded-md border border-[color-mix(in_oklab,var(--bad),white_45%)] bg-[color-mix(in_oklab,var(--bad),transparent_90%)] px-3 py-2 text-sm text-[var(--bad)]">
              {error}
            </p>
          ) : null}

          {pdfUrl ? (
            <div
              data-testid="playground-preview-frame"
              className="mt-4 h-[780px] overflow-hidden rounded-xl border border-[var(--line)] bg-white isolate [contain:paint]"
            >
              <iframe
                src={pdfUrl}
                title="DocuForge playground preview"
                className="block h-full w-full border-0"
              />
            </div>
          ) : (
            <div className="mt-4 flex h-[780px] items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-6 text-center text-sm text-[var(--muted)]">
              {isRunning ? "Rendering preview..." : "Preview renders automatically as you edit."}
            </div>
          )}

          <details className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Request payload
            </summary>
            <pre className="mt-3 overflow-x-auto text-xs text-[var(--ink)]">
              <code>{payloadPreview}</code>
            </pre>
          </details>
        </section>
      </div>

      <div
        className={`pointer-events-none fixed bottom-6 right-6 z-20 max-w-[320px] rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-500 ${
          showHint ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
        role="status"
        aria-live="polite"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Hint</p>
        <p className="mt-1 leading-relaxed">{activePreset.hints[0] ?? "Edit fields, then render again."}</p>
      </div>
    </div>
  );
}
