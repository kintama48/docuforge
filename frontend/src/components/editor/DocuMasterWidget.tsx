"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/src/components/brand/BrandLogo";
import { useAiEdit } from "@/src/hooks/use-ai";
import { useAssets } from "@/src/hooks/use-assets";
import { useEditorStore } from "@/src/stores/editor";

type DocuMasterWidgetProps = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
};

export function DocuMasterWidget({
  open,
  onToggle,
  onClose,
}: DocuMasterWidgetProps) {
  const aiEdit = useAiEdit();
  const source = useEditorStore((state) => state.source);
  const setSource = useEditorStore((state) => state.setSource);
  const { data: assets } = useAssets();
  const assetNames = assets?.assets?.map((asset) => asset.name) || [];

  const [prompt, setPrompt] = useState("");
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    if (!showHint) return;
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 10_000);

    return () => clearTimeout(timer);
  }, [showHint]);

  const dismissHint = () => {
    setShowHint(false);
  };

  const handleSend = () => {
    if (!prompt.trim() || aiEdit.isPending) return;
    setErrorMessage(null);
    aiEdit.mutate(
      {
        prompt: prompt.trim(),
        current_code: source,
        asset_names: assetNames,
      },
      {
        onSuccess: (data) => {
          setLastSnapshot(source);
          setSource(data.code);
          setPrompt("");
        },
        onError: () => {
          setErrorMessage("DocuMaster AI request failed. Please try again.");
        },
      }
    );
  };

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed bottom-16 right-4 z-[65] inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] transition hover:border-[var(--line-hover)]"
        aria-label="Open DocuMaster"
      >
        <BrandLogo className="h-7 w-7" />
      </button>

      {showHint && !open && (
        <div className="fixed left-4 top-24 z-[66] w-72 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)] shadow-[var(--shadow)]">
          <div className="flex items-start justify-between gap-2">
            <p>
              <span className="font-semibold text-[var(--ink)]">DocuMaster:</span>{" "}
              Ask for edits in plain English and apply them to your template.
            </p>
            <button
              onClick={dismissHint}
              className="rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] hover:border-[var(--line-hover)] hover:text-[var(--ink)]"
              aria-label="Dismiss hint"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="animate-[fade-up_0.22s_ease] fixed bottom-3 left-1/2 z-[70] w-[min(980px,calc(100%-1.5rem))] -translate-x-1/2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow)]">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
              DocuMaster
            </span>
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe the change you want in this template..."
              className="h-10 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--line-hover)]"
            />
            <button
              onClick={handleSend}
              disabled={!prompt.trim() || aiEdit.isPending}
              className="h-10 rounded-md bg-[var(--accent)] px-4 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
            >
              {aiEdit.isPending ? "Applying..." : "Apply"}
            </button>
            <button
              onClick={onClose}
              className="h-10 rounded-md border border-[var(--line)] px-3 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
            >
              Close
            </button>
          </div>

          {(lastSnapshot || errorMessage) && (
            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <span className={errorMessage ? "text-[var(--bad)]" : "text-[var(--muted)]"}>
                {errorMessage ?? "Edits applied to template source."}
              </span>
              {lastSnapshot && !errorMessage && (
                <button
                  onClick={() => {
                    setSource(lastSnapshot);
                    setLastSnapshot(null);
                  }}
                  className="rounded-md border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--ink)] hover:border-[var(--line-hover)]"
                >
                  Undo
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
