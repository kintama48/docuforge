"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileCode, FilePdf } from "@phosphor-icons/react";
import { env } from "@/src/config/env";
import {
  TemplateSwitcher,
  type TemplateSwitcherTemplate,
} from "@/src/components/TemplateSwitcher";
import { LowCodeBlocksEditor } from "@/src/components/editor/LowCodeBlocksEditor";
import { useDebounce } from "@/src/hooks/use-debounce";
import { useI18n } from "@/src/lib/i18n";
import type { LowCodeSpec } from "@/src/lib/low-code";
import { useLocalePath } from "@/src/lib/use-locale-path";
import {
  cloneSpec,
  getPlaygroundPresetBySlug,
  playgroundPresets,
  type PlaygroundPreset,
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

type MobileTab = "editor" | "preview";

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  return isMobile;
}

export default function PlaygroundClient({ initialPresetSlug }: PlaygroundClientProps) {
  const { messages } = useI18n();
  const localePath = useLocalePath();
  const isMobile = useIsMobileViewport();
  const initialPreset = getPlaygroundPresetBySlug(initialPresetSlug ?? "") ?? playgroundPresets[0];

  const [mode, setMode] = useState<"low-code" | "typst">("low-code");
  const [mobileTab, setMobileTab] = useState<MobileTab>("preview");
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

  const switcherTemplates = useMemo<TemplateSwitcherTemplate[]>(
    () =>
      playgroundPresets.map((preset) => ({
        id: preset.id,
        name: preset.title,
        description: preset.description,
        slug: preset.slug,
      })),
    []
  );

  const hasUnsavedChanges = useMemo(() => {
    return (
      source !== activePreset.source ||
      dataJson !== activePreset.data ||
      JSON.stringify(lowCodeSpec) !== JSON.stringify(activePreset.lowCodeSpec)
    );
  }, [activePreset, dataJson, lowCodeSpec, source]);

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

  const applyPreset = useCallback((preset: PlaygroundPreset) => {
    setActivePresetId(preset.id);
    setSource(preset.source);
    setLowCodeSpec(cloneSpec(preset.lowCodeSpec));
    setDataJson(preset.data);
    setError(null);
    setPdfUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }, []);

  const findPresetForTemplate = useCallback((template: TemplateSwitcherTemplate) => {
    return (
      getPlaygroundPresetBySlug(template.slug ?? "") ??
      getPlaygroundPresetBySlug(template.id) ??
      playgroundPresets.find((preset) => preset.title === template.name)
    );
  }, []);

  const handleSwitcherSelect = useCallback(
    (template: TemplateSwitcherTemplate) => {
      const preset = findPresetForTemplate(template);
      if (!preset) return;
      applyPreset(preset);
    },
    [applyPreset, findPresetForTemplate]
  );

  const requestPresetSwitch = useCallback(
    (preset: PlaygroundPreset) => {
      if (preset.id === activePresetId) return;
      if (
        hasUnsavedChanges &&
        !window.confirm("You have unsaved changes. Switch template anyway?")
      ) {
        return;
      }
      applyPreset(preset);
    },
    [activePresetId, applyPreset, hasUnsavedChanges]
  );

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

  const renderPreviewNow = () =>
    runPreview({
      mode,
      source,
      lowCodeSpec,
      dataJson,
    });

  const editorPanel = (
    <section
      className={`min-w-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 ${
        isMobile ? "" : "max-h-[calc(100vh-150px)] overflow-y-auto"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Editor
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--ink)]">
            {activePreset.title}
          </h2>
        </div>
        <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-1">
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
      </div>

      {mode === "low-code" ? (
        <LowCodeBlocksEditor
          lowCodeSpec={lowCodeSpec}
          onChange={setLowCodeSpec}
          className="mt-4 bg-[var(--surface-2)]"
          title="Template blocks"
        />
      ) : null}

      {mode === "typst" ? (
        <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-4">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-[var(--muted)] phosphor-icon" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Typst source
            </p>
          </div>
          <textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="mt-3 h-56 w-full resize-y rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 font-mono text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </div>
      ) : null}

      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        JSON data
      </label>
      <textarea
        value={dataJson}
        onChange={(event) => setDataJson(event.target.value)}
        className="mt-2 h-44 w-full resize-y rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
      />

      <details className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-4">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Request payload
        </summary>
        <pre className="mt-3 max-h-64 overflow-auto text-xs text-[var(--ink)]">
          <code>{payloadPreview}</code>
        </pre>
      </details>
    </section>
  );

  const previewPanel = (
    <section
      className={`relative min-w-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 ${
        isMobile ? "" : "max-h-[calc(100vh-150px)] overflow-hidden"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          <FilePdf className="h-4 w-4 phosphor-icon" aria-hidden="true" />
          {activePreset.title} preview
        </p>
        <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
          Remaining previews: {sessionRemaining ?? "--"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={renderPreviewNow}
          disabled={isRunning}
          className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isRunning ? "Rendering preview..." : "Render now"}
        </button>
        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileTab("editor")}
            className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--line-hover)] hover:bg-[var(--surface-2)]"
          >
            Editor
          </button>
        ) : null}
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
          className={`mt-4 overflow-hidden rounded-lg border border-[var(--line)] bg-white isolate [contain:paint] ${
            isMobile ? "h-[520px]" : "h-[calc(100vh-340px)] min-h-[430px]"
          }`}
        >
          <iframe
            src={pdfUrl}
            title="DocuForge playground preview"
            className="block h-full w-full border-0"
          />
        </div>
      ) : (
        <div
          className={`mt-4 flex items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-6 text-center text-sm text-[var(--muted)] ${
            isMobile ? "h-[520px]" : "h-[calc(100vh-340px)] min-h-[430px]"
          }`}
        >
          {isRunning ? "Rendering preview..." : "Preview renders automatically as you edit."}
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-6 md:px-6 md:pb-16 md:pt-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Playground
          </p>
          <h1 className="mt-2 font-display text-3xl text-[var(--ink)] sm:text-4xl">
            Find a PDF template and preview instantly.
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1">
            {activePreset.title}
          </span>
          {hasUnsavedChanges ? (
            <span className="rounded-full border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-1 text-[var(--ink)]">
              Unsaved changes
            </span>
          ) : null}
        </div>
      </div>

      {isMobile ? (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Template
            </span>
            <select
              value={activePresetId}
              onChange={(event) => {
                const preset = getPlaygroundPresetBySlug(event.target.value);
                if (preset) requestPresetSwitch(preset);
              }}
              className="h-11 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            >
              {playgroundPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.title}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1">
            {(["preview", "editor"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  mobileTab === tab
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)]"
                }`}
              >
                {tab === "preview" ? "Preview" : "Editor"}
              </button>
            ))}
          </div>

          {mobileTab === "preview" ? previewPanel : editorPanel}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-[auto_minmax(0,55fr)_minmax(0,45fr)] items-start gap-4">
          <TemplateSwitcher
            activeTemplateId={activePresetId}
            templates={switcherTemplates}
            hasUnsavedChanges={hasUnsavedChanges}
            onSelectTemplate={handleSwitcherSelect}
            className="sticky top-6 h-[calc(100vh-150px)] min-h-[620px]"
          />
          {editorPanel}
          {previewPanel}
        </div>
      )}

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
