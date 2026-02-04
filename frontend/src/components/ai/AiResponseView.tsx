"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { registerTypstLanguage } from "@/src/lib/typst";
import { useI18n } from "@/src/lib/i18n";

type AiResponseViewProps = {
  response: string | null;
  original: string;
  onApply: () => void;
  onDiscard: () => void;
};

export function AiResponseView({
  response,
  original,
  onApply,
  onDiscard,
}: AiResponseViewProps) {
  const { messages } = useI18n();
  const DiffEditor = useMemo(
    () =>
      dynamic(async () => {
        const mod = await import("@monaco-editor/react");
        return mod.DiffEditor;
      }, { ssr: false }),
    []
  );

  if (!response) return null;

  return (
    <div className="mt-6 rounded-xl border border-[#27272a] bg-[#111113] p-4">
      <p className="text-xs font-semibold text-white">
        {messages.ai.responseTitle}
      </p>
      <div className="mt-3 h-48 overflow-hidden rounded-lg border border-[#27272a] bg-[#0a0a0b]">
        <DiffEditor
          height="100%"
          original={original}
          modified={response}
          language="typst"
          theme="docuforge-dark"
          beforeMount={(monaco) => {
            registerTypstLanguage(monaco);
          }}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            fontSize: 12,
            wordWrap: "on",
          }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onApply}
          className="rounded-md bg-[#22c55e] px-3 py-2 text-xs font-semibold text-white"
        >
          {messages.ai.apply}
        </button>
        <button
          onClick={onDiscard}
          className="rounded-md border border-[#27272a] px-3 py-2 text-xs text-white"
        >
          {messages.ai.discard}
        </button>
      </div>
    </div>
  );
}
