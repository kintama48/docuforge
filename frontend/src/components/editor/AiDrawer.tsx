"use client";

import { useEffect, useState } from "react";
import { useAiEdit, useAiGenerate, type AiCredits } from "@/src/hooks/use-ai";
import { useAssets } from "@/src/hooks/use-assets";
import { useEditorStore } from "@/src/stores/editor";
import { useAuthStore } from "@/src/stores/auth";
import { planLimits } from "@/src/lib/constants";
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
  const remaining = credits.remaining;
  const limit = credits.limit;
  const creditsExhausted = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (credits.limit !== null) return;
    const limitValue = planLimits[plan].aiCredits;
    setCredits({ remaining: limitValue, limit: limitValue, resetAt: null });
  }, [credits.limit, plan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <aside className="relative h-full w-full max-w-md border-l border-[#27272a] bg-[#0f1117] p-5 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{messages.ai.title}</h2>
          <button
            onClick={onClose}
            className="text-xs text-[#71717a] hover:text-white"
          >
            {messages.ai.close}
          </button>
        </div>

        <div className="mt-4">
          <AiCreditsIndicator
            remaining={remaining}
            limit={limit}
            resetAt={credits.resetAt}
          />
        </div>

        <div className="mt-4">
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
                  onError: (error: any) => {
                    if (error?.details?.retryAfter) {
                      setCredits({
                        remaining: 0,
                        limit: credits.limit ?? 0,
                        resetAt: Date.now() + error.details.retryAfter * 1000,
                      });
                    }
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
                      { prompt: messages.ai.uploadedScreenshot, response: data.code },
                      ...prev.slice(0, 2),
                    ]);
                  },
                  onError: (error: any) => {
                    if (error?.details?.retryAfter) {
                      setCredits({
                        remaining: 0,
                        limit: credits.limit ?? 0,
                        resetAt: Date.now() + error.details.retryAfter * 1000,
                      });
                    }
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
          <p className="text-xs uppercase tracking-[0.2em] text-[#71717a]">
            {messages.ai.historyTitle}
          </p>
          <div className="mt-3 space-y-2">
            {history.length === 0 && (
              <p className="text-xs text-[#71717a]">
                {messages.ai.historyEmpty}
              </p>
            )}
            {history.map((item, index) => (
              <div
                key={`${item.prompt}-${index}`}
                className="rounded-lg border border-[#27272a] bg-[#111113] p-3 text-xs text-[#a1a1aa]"
              >
                <p className="text-white">{item.prompt}</p>
                <p className="mt-1 line-clamp-2">{item.response}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-xs text-[#71717a]">
          {includeSelection
            ? messages.ai.selectionEnabled
            : messages.ai.selectionDisabled}
        </p>
      </aside>
    </div>
  );
}
