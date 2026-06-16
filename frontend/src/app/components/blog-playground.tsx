"use client";

import { FilePdf, Play, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { env } from "@/src/config/env";
import type { ContentPlayground } from "@/src/lib/content-hub";
import { ContentCodeGroup } from "./code-group";

type PreviewSession = {
  session_id: string;
  expires_at: string;
};

export function BlogPlaygroundBlock({
  title,
  playground,
}: {
  title: string;
  playground: ContentPlayground;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PreviewSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const snippets = useMemo(
    () => [
      {
        label: "Typst",
        language: "typst",
        code: playground.templateCode,
      },
      {
        label: "JSON",
        language: "json",
        code: playground.dataJson,
      },
    ],
    [playground.dataJson, playground.templateCode]
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const ensureSession = async () => {
    if (session) {
      const expiresAt = Date.parse(session.expires_at);
      if (Number.isFinite(expiresAt) && Date.now() < expiresAt - 5000) {
        return session.session_id;
      }
    }

    const response = await fetch(`${env.apiUrl}/v1/render/public/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Preview session failed (${response.status})`);
    }

    const nextSession = (await response.json()) as PreviewSession;
    setSession(nextSession);
    return nextSession.session_id;
  };

  const renderPreview = async () => {
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;
    setIsRendering(true);
    setError(null);

    try {
      const sessionId = await ensureSession();
      const response = await fetch(`${env.apiUrl}/v1/render/public/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Preview-Session": sessionId,
        },
        body: JSON.stringify({
          source: playground.templateCode,
          files: {},
          data: JSON.parse(playground.dataJson) as Record<string, unknown>,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Preview render failed (${response.status})`);
      }

      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);
      setPdfUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return nextUrl;
      });
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Preview render failed");
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsRendering(false);
      }
    }
  };

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-2xl text-[var(--ink)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{playground.problem}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.78fr)]">
        <ContentCodeGroup
          title={playground.templateTitle}
          description={playground.dataTitle}
          snippets={snippets}
        />

        <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">
                {playground.previewTitle}
              </p>
              <p className="text-xs text-[var(--muted)]">{playground.previewStatus}</p>
            </div>
            <button
              type="button"
              onClick={renderPreview}
              disabled={isRendering}
              className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-70"
            >
              <Play className="phosphor-icon h-3.5 w-3.5" aria-hidden="true" />
              {isRendering ? "Rendering" : "Render preview"}
            </button>
          </div>

          <div className="relative flex flex-1 items-stretch justify-center bg-[var(--surface-2)] p-4">
            {pdfUrl ? (
              <iframe
                title={`${playground.previewTitle} PDF preview`}
                src={pdfUrl}
                className="h-full min-h-[23rem] w-full rounded-lg border border-[var(--line)] bg-white"
              />
            ) : (
              <div className="flex h-full min-h-[23rem] w-full flex-col rounded-lg border border-[var(--line)] bg-white p-5 text-slate-900 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-lg font-bold">{playground.previewTitle}</p>
                    <p className="text-xs text-slate-500">{playground.previewStatus}</p>
                  </div>
                  <FilePdf className="phosphor-icon h-7 w-7 text-[var(--accent)]" aria-hidden="true" />
                </div>
                <div className="mt-5 space-y-3">
                  {playground.previewRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-500">{row.label}</span>
                      <span className="font-semibold text-slate-900">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                  POST /v1/render
                </div>
              </div>
            )}

            {error ? (
              <div className="absolute inset-x-4 bottom-4 flex items-center gap-2 rounded-md border border-[var(--bad)]/30 bg-[var(--surface)] px-3 py-2 text-xs text-[var(--bad)] shadow-sm">
                <WarningCircle className="phosphor-icon h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
