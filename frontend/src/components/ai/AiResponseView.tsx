"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { registerTypstLanguage } from "@/src/lib/typst";
import { useI18n } from "@/src/lib/i18n";
import { useTheme } from "@/src/lib/theme";

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
  const { resolvedTheme } = useTheme();
  const DiffEditor = useMemo(
    () =>
      dynamic(async () => {
        const mod = await import("@monaco-editor/react");
        return mod.DiffEditor;
      }, { ssr: false }),
    []
  );

  if (!response) return null;

  const monacoTheme =
    resolvedTheme === "dark" ? "docuforge-dark" : "docuforge-light";

  return (
    <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="text-xs font-semibold text-[var(--ink)]">
        {messages.ai.responseTitle}
      </p>
      <div className="mt-3 h-48 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-2)]">
        <DiffEditor
          height="100%"
          original={original}
          modified={response}
          language="typst"
          theme={monacoTheme}
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
          className="rounded-md bg-[var(--good)] px-3 py-2 text-xs font-semibold text-white"
        >
          {messages.ai.apply}
        </button>
        <button
          onClick={onDiscard}
          className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)]"
        >
          {messages.ai.discard}
        </button>
      </div>
    </div>
  );
}
