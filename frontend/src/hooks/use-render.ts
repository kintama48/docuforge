"use client";

import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { api } from "@/src/lib/api";
import type { ApiError } from "@/src/lib/api-types";
import type { LowCodeSpec } from "@/src/lib/low-code";
import { useEditorStore } from "@/src/stores/editor";

type RenderPayload = {
  source?: string;
  low_code_spec?: LowCodeSpec;
  files?: Record<string, string>;
  data: Record<string, unknown>;
};

type RenderImagePayload = RenderPayload & {
  format?: "png" | "jpeg";
  dpi?: number;
  quality?: number;
  page_numbers?: number[];
};

export function usePreviewRender() {
  const controllerRef = useRef<AbortController | null>(null);

  return useMutation({
    mutationFn: async (payload: RenderPayload) => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      controllerRef.current = new AbortController();
      const response = await api.postRaw(
        "/v1/render/preview",
        payload,
        controllerRef.current.signal
      );
      const durationHeader = response.headers.get("X-Render-Duration");
      const duration = durationHeader ? Number(durationHeader) : 0;
      const blob = await response.blob();
      return { blob, duration };
    },
    onMutate: () => {
      useEditorStore.setState({ renderStatus: "rendering", renderError: null });
    },
    onSuccess: ({ blob, duration }) => {
      useEditorStore.getState().setPdfResult(blob, duration);
    },
    onError: (error: unknown) => {
      const apiError = error as ApiError | undefined;
      if (apiError?.error === "rate_limited") {
        const retryAfter = Number(
          (apiError.details as { retryAfter?: number } | undefined)?.retryAfter ??
            5
        );
        useEditorStore.getState().setRenderError(null);
        useEditorStore
          .getState()
          .setRateLimitUntil(Date.now() + retryAfter * 1000);
        return;
      }
      const details = apiError?.details as
        | { file?: string; line?: number; column?: number }
        | undefined;
      if (apiError?.error === "compile_error" && details) {
        useEditorStore.getState().setRenderError({
          message: apiError.message || "Compilation error",
          file: details.file || "main.typ",
          line: details.line || 1,
          column: details.column || 1,
        });
      } else if ((error as { name?: string } | undefined)?.name !== "AbortError") {
        useEditorStore.getState().setRenderError({
          message: "Render failed",
          file: "main.typ",
          line: 1,
          column: 1,
        });
      }
    },
  });
}

function getFilenameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const match = disposition.match(/filename="([^"]+)"/i);
  return match?.[1] ?? fallback;
}

export function usePreviewImageRender() {
  const controllerRef = useRef<AbortController | null>(null);

  return useMutation({
    mutationFn: async (payload: RenderImagePayload) => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      controllerRef.current = new AbortController();
      const response = await api.postRaw(
        "/v1/render/preview/image",
        payload,
        controllerRef.current.signal
      );
      const blob = await response.blob();
      const filename = getFilenameFromDisposition(
        response.headers.get("Content-Disposition"),
        payload.page_numbers && payload.page_numbers.length > 1
          ? "document-images.zip"
          : payload.format === "jpeg"
            ? "document-page-0001.jpg"
            : "document-page-0001.png"
      );
      return {
        blob,
        filename,
        contentType: response.headers.get("Content-Type") || "application/octet-stream",
      };
    },
  });
}
