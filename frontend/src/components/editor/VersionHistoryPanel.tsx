"use client";

import { TemplateDetail } from "@/src/lib/api-types";
import { formatDate } from "@/src/lib/utils";
import { useI18n } from "@/src/lib/i18n";

type VersionHistoryPanelProps = {
  open: boolean;
  template?: TemplateDetail;
  onClose: () => void;
  onSelectVersion: (versionId: string) => void;
  currentVersionId?: string | null;
  viewingVersionId?: string | null;
  onRevert?: (versionId: string) => void;
};

export function VersionHistoryPanel({
  open,
  template,
  onClose,
  onSelectVersion,
  currentVersionId,
  viewingVersionId,
  onRevert,
}: VersionHistoryPanelProps) {
  const { messages } = useI18n();
  if (!open) return null;

  const versions = template?.versions || [];

  return (
    <div
      className="absolute right-0 top-0 z-30 h-full w-full max-w-sm border-l border-[--line] bg-[--surface-2] p-4"
      data-testid="version-history-panel"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          {messages.editor.historyTitle}
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-[--muted-dim] hover:text-white"
        >
          {messages.editor.historyClose}
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {versions.length === 0 && (
          <p className="text-xs text-[--muted-dim]">
            {messages.editor.historyNoVersions}
          </p>
        )}
        {versions.map((version) => {
          const isCurrent = version.id === currentVersionId;
          const isViewing = version.id === viewingVersionId;
          return (
            <button
              key={version.id}
              onClick={() => onSelectVersion(version.id)}
              data-testid={`version-item-${version.version_number}`}
              className={`w-full rounded-lg border p-3 text-left text-xs text-[--muted] hover:border-[--line-hover] ${
                isViewing ? "border-[--accent] bg-[--surface]" : "border-[--line] bg-[--surface]"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  v{version.version_number}
                </p>
                {isCurrent && (
                  <span className="rounded-full bg-[--accent-soft] px-2 py-0.5 text-[10px] text-white">
                    {messages.editor.historyCurrent}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[--muted-dim]">
                {version.commit_message || messages.editor.historyNoMessage}
              </p>
              <p className="mt-2 text-[10px] text-[--muted-dim]">
                {formatDate(version.created_at)}
              </p>
            </button>
          );
        })}
      </div>
      {viewingVersionId && onRevert && (
        <div className="mt-4 rounded-lg border border-[--line] bg-[--surface] p-3">
          <p className="text-xs text-[--muted]">
            {messages.editor.historyViewingNote}
          </p>
          <button
            onClick={() => onRevert(viewingVersionId)}
            className="mt-3 w-full rounded-md bg-[--accent] px-3 py-2 text-xs font-semibold text-white hover:bg-[--accent-strong]"
          >
            {messages.editor.historyRevert}
          </button>
        </div>
      )}
    </div>
  );
}
