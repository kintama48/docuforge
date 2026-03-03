"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";

export function PdfPreview() {
  const { messages } = useI18n();
  const pdfUrl = useEditorStore((state) => state.pdfUrl);
  const renderStatus = useEditorStore((state) => state.renderStatus);
  const renderError = useEditorStore((state) => state.renderError);
  const pdfScrollTop = useEditorStore((state) => state.pdfScrollTop);
  const setPdfScrollTop = useEditorStore((state) => state.setPdfScrollTop);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const scrollListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      if (!iframe.contentWindow) return;
      iframe.contentWindow.scrollTo(0, pdfScrollTop);
      const onScroll = () => {
        setPdfScrollTop(iframe.contentWindow?.scrollY || 0);
      };
      iframe.contentWindow.addEventListener("scroll", onScroll);
      scrollListenerRef.current = () => {
        iframe.contentWindow?.removeEventListener("scroll", onScroll);
      };
    };

    iframe.addEventListener("load", handleLoad);
    return () => {
      iframe.removeEventListener("load", handleLoad);
      scrollListenerRef.current?.();
    };
  }, [pdfUrl, pdfScrollTop, setPdfScrollTop]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
        <span>{messages.editor.previewTitle}</span>
        <span>
          {renderStatus === "rendering"
            ? messages.editor.previewRendering
            : messages.editor.previewReady}
        </span>
      </div>
      <div className="relative flex-1">
        {pdfUrl ? (
          <iframe
            ref={iframeRef}
            title={messages.editor.previewIframeTitle}
            src={pdfUrl}
            className="relative z-0 h-full w-full"
          />
        ) : renderError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-xs text-[var(--muted)]">
            <p className="font-semibold text-[var(--bad)]">
              {renderError.file}:{renderError.line}:{renderError.column}
            </p>
            <p>{renderError.message}</p>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--muted-dim)]">
            {messages.editor.previewPlaceholder}
          </div>
        )}
        {renderStatus === "rendering" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 text-xs text-[var(--ink)]">
            {messages.editor.previewRendering}
          </div>
        )}
      </div>
    </div>
  );
}
