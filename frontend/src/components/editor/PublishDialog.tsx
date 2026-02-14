"use client";

import { useState } from "react";
import { usePublishVersion } from "@/src/hooks/use-templates";
import { useEditorStore } from "@/src/stores/editor";
import { Modal } from "@/src/components/ui/Modal";
import { useI18n } from "@/src/lib/i18n";

type PublishDialogProps = {
  open: boolean;
  templateId: string;
  onClose: () => void;
};

export function PublishDialog({ open, templateId, onClose }: PublishDialogProps) {
  const { messages } = useI18n();
  const [message, setMessage] = useState("");
  const publish = usePublishVersion(templateId);
  const markClean = useEditorStore((state) => state.markClean);
  const setPublishedVersion = useEditorStore(
    (state) => state.setPublishedVersion
  );
  const source = useEditorStore((state) => state.source);
  const files = useEditorStore((state) => state.files);
  const defaults = useEditorStore((state) => state.data);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={messages.editor.publishDialogTitle}
    >
      <label className="text-xs text-[--muted]">
        {messages.editor.commitMessageLabel}
      </label>
      <input
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className="mt-2 w-full rounded-md border border-[--line] bg-[--surface-2] px-3 py-2 text-xs text-white"
        placeholder={messages.editor.commitMessagePlaceholder}
      />
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-md border border-[--line] px-3 py-2 text-xs text-white"
        >
          {messages.templateDialog.cancel}
        </button>
        <button
          onClick={() => {
            publish.mutate(
              {
                id: templateId,
                source,
                files,
                defaults,
                commit_message: message || undefined,
              },
              {
                onSuccess: (data) => {
                  setPublishedVersion(data.version.version_number);
                  markClean();
                  onClose();
                },
              }
            );
          }}
          disabled={publish.isPending}
          className="rounded-md bg-[--accent] px-3 py-2 text-xs font-semibold text-white hover:bg-[--accent-strong] disabled:opacity-60"
        >
          {publish.isPending ? messages.editor.publishing : messages.editor.publish}
        </button>
      </div>
    </Modal>
  );
}
