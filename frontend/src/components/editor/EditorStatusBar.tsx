"use client";

import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";

export function EditorStatusBar() {
  const { messages } = useI18n();
  const renderDuration = useEditorStore((state) => state.renderDuration);
  const renderError = useEditorStore((state) => state.renderError);
  const isDirty = useEditorStore((state) => state.isDirty);
  const readOnly = useEditorStore((state) => state.readOnly);
  const publishedVersion = useEditorStore((state) => state.publishedVersion);
  const viewingVersion = useEditorStore((state) => state.viewingVersion);
  const cursor = useEditorStore((state) => state.cursorPosition);

  return (
    <footer className="grid grid-cols-3 items-center border-t border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-xs text-[var(--muted)]">
      <span>
        {viewingVersion
          ? `${messages.editor.statusViewing}${viewingVersion}`
          : readOnly
            ? messages.editor.statusReadOnly
            : isDirty
              ? messages.editor.statusDraftUnsaved
              : publishedVersion
                ? `${messages.editor.statusPublished}${publishedVersion}`
                : messages.editor.statusDraft}
      </span>
      <span className="text-center">
        {cursor ? `Ln ${cursor.line}, Col ${cursor.column}` : "Ln —, Col —"}
      </span>
      <span className="text-right">
        {renderError
          ? messages.editor.statusError
          : renderDuration
            ? `${messages.editor.statusRendered} ${renderDuration}ms`
            : messages.editor.statusIdle}
      </span>
    </footer>
  );
}
