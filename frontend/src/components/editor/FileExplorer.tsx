"use client";

import { useMemo, useState } from "react";
import { useEditorStore } from "@/src/stores/editor";
import { Modal } from "@/src/components/ui/Modal";
import { useI18n } from "@/src/lib/i18n";

export function FileExplorer() {
  const { messages } = useI18n();
  const files = useEditorStore((state) => state.files);
  const activeFile = useEditorStore((state) => state.activeFile);
  const setActiveFile = useEditorStore((state) => state.setActiveFile);
  const addFile = useEditorStore((state) => state.addFile);
  const removeFile = useEditorStore((state) => state.removeFile);
  const renameFile = useEditorStore((state) => state.renameFile);

  const [showAdd, setShowAdd] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [renameTarget, setRenameTarget] = useState<string | null>(null);

  const fileList = useMemo(
    () => ["main.typ", ...Object.keys(files)],
    [files]
  );

  const invalidName = (name: string, current?: string | null) => {
    const trimmed = name.trim();
    if (!trimmed.endsWith(".typ")) return messages.editor.fileMustEnd;
    if (trimmed === "main.typ") return messages.editor.fileReserved;
    if (files[trimmed] && trimmed !== current)
      return messages.editor.fileExists;
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-[--muted-dim]">
          {messages.editor.filesTitle}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs text-[--muted] hover:text-white"
        >
          + {messages.editor.addFile}
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {fileList.map((file) => (
          <div
            key={file}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-xs ${
              activeFile === file
                ? "bg-[--surface-active] text-white"
                : "text-[--muted] hover:bg-[--surface-hover]"
            }`}
          >
            <button onClick={() => setActiveFile(file)} className="flex-1 text-left">
              {file}
            </button>
            {file !== "main.typ" && (
              <div className="flex items-center gap-2 text-[11px] text-[--muted-dim]">
                <button
                  onClick={() => {
                    setRenameTarget(file);
                    setRenameValue(file);
                    setShowRename(true);
                  }}
                  className="hover:text-white"
                >
                  {messages.editor.rename}
                </button>
                <button
                  onClick={() => {
                    setDeleteTarget(file);
                    setShowDeleteConfirm(true);
                  }}
                  className="text-[--bad] hover:text-[--bad-hover]"
                >
                  {messages.editor.delete}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={messages.editor.addFileTitle}
      >
        <label className="text-xs text-[--muted]">
          {messages.editor.filenameLabel}
        </label>
        <input
          value={newFileName}
          onChange={(event) => setNewFileName(event.target.value)}
          className="mt-2 w-full rounded-md border border-[--line] bg-[--surface-2] px-3 py-2 text-xs text-white"
          placeholder={messages.editor.filenamePlaceholder}
        />
        {newFileName && invalidName(newFileName) && (
          <p className="mt-2 text-xs text-[--bad]">
            {invalidName(newFileName)}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setShowAdd(false)}
            className="rounded-md border border-[--line] px-3 py-2 text-xs text-white"
          >
            {messages.templateDialog.cancel}
          </button>
          <button
            onClick={() => {
              const error = invalidName(newFileName);
              if (error) return;
              addFile(newFileName.trim());
              setNewFileName("");
              setShowAdd(false);
            }}
            disabled={Boolean(invalidName(newFileName))}
            className="rounded-md bg-[--accent] px-3 py-2 text-xs font-semibold text-white hover:bg-[--accent-strong] disabled:opacity-60"
          >
            {messages.editor.addFileAction}
          </button>
        </div>
      </Modal>

      <Modal
        open={showRename}
        onClose={() => setShowRename(false)}
        title={messages.editor.renameFileTitle}
      >
        <label className="text-xs text-[--muted]">
          {messages.editor.filenameLabel}
        </label>
        <input
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          className="mt-2 w-full rounded-md border border-[--line] bg-[--surface-2] px-3 py-2 text-xs text-white"
        />
        {renameValue && renameTarget && invalidName(renameValue, renameTarget) && (
          <p className="mt-2 text-xs text-[--bad]">
            {invalidName(renameValue, renameTarget)}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setShowRename(false)}
            className="rounded-md border border-[--line] px-3 py-2 text-xs text-white"
          >
            {messages.templateDialog.cancel}
          </button>
          <button
            onClick={() => {
              if (!renameTarget) return;
              const error = invalidName(renameValue, renameTarget);
              if (error) return;
              renameFile(renameTarget, renameValue.trim());
              setShowRename(false);
            }}
            disabled={Boolean(invalidName(renameValue, renameTarget))}
            className="rounded-md bg-[--accent] px-3 py-2 text-xs font-semibold text-white hover:bg-[--accent-strong] disabled:opacity-60"
          >
            {messages.editor.rename}
          </button>
        </div>
      </Modal>

      {/* FE-m4 fix: Use Modal instead of native confirm() */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={messages.editor.delete}
      >
        <p className="text-sm text-[--muted]">
          {deleteTarget
            ? messages.editor.fileDeleteConfirm.replace("{name}", deleteTarget)
            : ""}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="rounded-md border border-[--line] px-3 py-2 text-xs text-white"
          >
            {messages.templateDialog.cancel}
          </button>
          <button
            onClick={() => {
              if (deleteTarget) removeFile(deleteTarget);
              setShowDeleteConfirm(false);
              setDeleteTarget(null);
            }}
            className="rounded-md bg-[--bad] px-3 py-2 text-xs font-semibold text-white hover:bg-[--bad-strong]"
          >
            {messages.editor.delete}
          </button>
        </div>
      </Modal>
    </div>
  );
}
