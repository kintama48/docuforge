"use client";

import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";

export function DiagnosticsPanel() {
  const { messages } = useI18n();
  const renderError = useEditorStore((state) => state.renderError);
  const renderDuration = useEditorStore((state) => state.renderDuration);
  const revealError = useEditorStore((state) => state.revealError);

  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--line)] bg-[var(--surface)]">
      <div className="border-b border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
        {messages.editor.diagnosticsTitle}
      </div>
      <div className="flex-1 p-3 text-xs text-[var(--muted)]">
        {renderError ? (
          <button
            onClick={() =>
              revealError(renderError.line, renderError.column)
            }
            className="text-left text-[var(--bad)] hover:underline"
          >
            ✕ {renderError.file}:{renderError.line}:{renderError.column} —{" "}
            {renderError.message}
          </button>
        ) : (
          <div className="text-[var(--good)]">
            {messages.editor.diagnosticsNoErrors}
          </div>
        )}
        {renderDuration && (
          <p className="mt-2 text-[var(--muted-dim)]">
            {messages.editor.diagnosticsLastRender.replace(
              "{duration}",
              String(renderDuration)
            )}
          </p>
        )}
      </div>
    </div>
  );
}
