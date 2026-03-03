"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useAiEdit, useAiGenerate, type AiCredits } from "@/src/hooks/use-ai";
import { useAssets } from "@/src/hooks/use-assets";
import { useEditorStore } from "@/src/stores/editor";
import { useAuthStore } from "@/src/stores/auth";
import { planLimits } from "@/src/lib/constants";
import type { ApiError } from "@/src/lib/api-types";
import { AiCreditsIndicator } from "@/src/components/ai/AiCreditsIndicator";
import { AiPromptInput } from "@/src/components/ai/AiPromptInput";
import { AiImageUpload } from "@/src/components/ai/AiImageUpload";
import { AiResponseView } from "@/src/components/ai/AiResponseView";
import { useI18n } from "@/src/lib/i18n";

type AiHistoryItem = {
  prompt: string;
  response: string;
};

type AiDrawerProps = {
  open: boolean;
  onClose: () => void;
};

function getRetryAfterSeconds(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const apiError = error as ApiError;
  const retryAfter = (apiError.details as { retryAfter?: number } | undefined)
    ?.retryAfter;
  return typeof retryAfter === "number" && Number.isFinite(retryAfter)
    ? retryAfter
    : null;
}

export function AiDrawer({ open, onClose }: AiDrawerProps) {
  const { messages } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [includeSelection, setIncludeSelection] = useState(false);
  const [history, setHistory] = useState<AiHistoryItem[]>([]);
  const [response, setResponse] = useState<string | null>(null);
  const [originalSnapshot, setOriginalSnapshot] = useState<string>("");
  const [credits, setCredits] = useState<AiCredits>({
    remaining: null,
    limit: null,
    resetAt: null,
  });
  const aiEdit = useAiEdit();
  const aiGenerate = useAiGenerate();
  const source = useEditorStore((state) => state.source);
  const setSource = useEditorStore((state) => state.setSource);
  const editorInstance = useEditorStore((state) => state.editorInstance);
  const plan = useAuthStore((state) => state.user?.plan || "free");
  const { data: assets } = useAssets();
  const assetNames = assets?.assets?.map((asset) => asset.name) || [];
  const defaultLimit = planLimits[plan].aiCredits;
  const remaining = credits.remaining ?? defaultLimit;
  const limit = credits.limit ?? defaultLimit;
  const creditsExhausted = remaining !== null && remaining <= 0;

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 pb-3 pt-5">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            {messages.ai.title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--muted)] hover:border-[var(--line-hover)] hover:text-[var(--ink)]"
          >
            {messages.ai.close}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AiCreditsIndicator
            remaining={remaining}
            limit={limit}
            resetAt={credits.resetAt}
          />

          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <AiPromptInput
              value={prompt}
              includeSelection={includeSelection}
              disabled={creditsExhausted || aiEdit.isPending}
              isSending={aiEdit.isPending}
              onChange={setPrompt}
              onToggleSelection={setIncludeSelection}
              onSend={() => {
                if (!prompt.trim()) return;
                const selection = editorInstance?.getSelection?.();
                const selectionText =
                  includeSelection && selection
                    ? editorInstance
                        ?.getModel?.()
                        ?.getValueInRange?.(selection)
                    : "";
                const currentCode =
                  selectionText && selectionText.trim().length > 0
                    ? selectionText
                    : source;
                aiEdit.mutate(
                  {
                    prompt,
                    current_code: currentCode,
                    asset_names: assetNames,
                  },
                  {
                    onSuccess: (data) => {
                      setCredits(data.credits);
                      setOriginalSnapshot(source);
                      setResponse(data.code);
                      setHistory((prev) => [
                        { prompt, response: data.code },
                        ...prev.slice(0, 2),
                      ]);
                      setPrompt("");
                    },
                    onError: (error) => {
                      const retryAfter = getRetryAfterSeconds(error);
                      if (!retryAfter) return;
                      setCredits({
                        remaining: 0,
                        limit,
                        resetAt: Date.now() + retryAfter * 1000,
                      });
                    },
                  }
                );
              }}
            />
            <AiImageUpload
              disabled={creditsExhausted}
              onUpload={(base64) => {
                aiGenerate.mutate(
                  { image_base64: base64 },
                  {
                    onSuccess: (data) => {
                      setCredits(data.credits);
                      setOriginalSnapshot(source);
                      setResponse(data.code);
                      setHistory((prev) => [
                        {
                          prompt: messages.ai.uploadedScreenshot,
                          response: data.code,
                        },
                        ...prev.slice(0, 2),
                      ]);
                    },
                    onError: (error) => {
                      const retryAfter = getRetryAfterSeconds(error);
                      if (!retryAfter) return;
                      setCredits({
                        remaining: 0,
                        limit,
                        resetAt: Date.now() + retryAfter * 1000,
                      });
                    },
                  }
                );
              }}
            />
          </div>

          <AiResponseView
            response={response}
            original={originalSnapshot}
            onApply={() => {
              if (!response) return;
              setSource(response);
              setResponse(null);
            }}
            onDiscard={() => setResponse(null)}
          />

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-dim)]">
              {messages.ai.historyTitle}
            </p>
            <div className="mt-3 space-y-2">
              {history.length === 0 && (
                <p className="text-xs text-[var(--muted-dim)]">
                  {messages.ai.historyEmpty}
                </p>
              )}
              {history.map((item, index) => (
                <div
                  key={`${item.prompt}-${index}`}
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs text-[var(--muted)]"
                >
                  <p className="text-[var(--ink)]">{item.prompt}</p>
                  <p className="mt-1 line-clamp-2">{item.response}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-xs text-[var(--muted)]">
            {includeSelection
              ? messages.ai.selectionEnabled
              : messages.ai.selectionDisabled}
          </p>
        </div>
      </aside>
    </div>,
    document.body
  );
}
