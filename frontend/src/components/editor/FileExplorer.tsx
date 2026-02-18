"use client";

import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";

export function FileExplorer() {
  const { messages } = useI18n();
  const activeFile = useEditorStore((state) => state.activeFile);
  const setActiveFile = useEditorStore((state) => state.setActiveFile);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-dim)]">
          {messages.editor.filesTitle}
        </p>
      </div>
      <div className="mt-3">
        <button
          onClick={() => setActiveFile("main.typ")}
          className={`w-full rounded-md px-3 py-2 text-left text-xs ${
            activeFile === "main.typ"
              ? "bg-[var(--surface-active)] text-[var(--ink)]"
              : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
          }`}
        >
          main.typ
        </button>
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted-dim)]">
        Single-file mode is enabled for a simpler editing flow.
      </p>
    </div>
  );
}
