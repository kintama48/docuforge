"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";

export function PdfPreview() {
  const { messages } = useI18n();
  const pdfUrl = useEditorStore((state) => state.pdfUrl);
  const renderStatus = useEditorStore((state) => state.renderStatus);
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
    <div className="flex h-full flex-col rounded-lg border border-[#27272a] bg-[#111113]">
      <div className="flex items-center justify-between border-b border-[#27272a] px-3 py-2 text-xs text-[#a1a1aa]">
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
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#71717a]">
            {messages.editor.previewPlaceholder}
          </div>
        )}
        {renderStatus === "rendering" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs text-white">
            {messages.editor.previewRendering}
          </div>
        )}
      </div>
    </div>
  );
}
