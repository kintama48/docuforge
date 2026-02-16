"use client";

import { useEffect, useState } from "react";
import { useDeleteTemplate, useUpdateTemplate } from "@/src/hooks/use-templates";
import { useEditorStore } from "@/src/stores/editor";
import { Modal } from "@/src/components/ui/Modal";
import { useI18n } from "@/src/lib/i18n";

type TemplateSettingsDialogProps = {
  open: boolean;
  templateId: string;
  onClose: () => void;
};

export function TemplateSettingsDialog({
  open,
  templateId,
  onClose,
}: TemplateSettingsDialogProps) {
  const { messages } = useI18n();
  const deleteTemplate = useDeleteTemplate(templateId);
  const updateTemplate = useUpdateTemplate(templateId);
  const templateName = useEditorStore((state) => state.templateName);
  const templateDescription = useEditorStore((state) => state.templateDescription);
  const setTemplateName = useEditorStore((state) => state.setTemplateName);
  const setTemplateDescription = useEditorStore(
    (state) => state.setTemplateDescription
  );
  const [name, setName] = useState(templateName);
  const [description, setDescription] = useState(templateDescription);

  useEffect(() => {
    setName(templateName);
  }, [templateName]);

  useEffect(() => {
    setDescription(templateDescription);
  }, [templateDescription]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={messages.editor.templateSettingsTitle}
    >
      <label className="text-xs text-[--muted]">
        {messages.templateDialog.nameLabel}
      </label>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="mt-2 w-full rounded-md border border-[--line] bg-[--surface-2] px-3 py-2 text-xs text-white"
      />
      <label className="mt-4 text-xs text-[--muted]">
        {messages.templateDialog.descriptionLabel}
      </label>
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        className="mt-2 h-20 w-full resize-none rounded-md border border-[--line] bg-[--surface-2] p-3 text-xs text-white"
        placeholder={messages.templateDialog.descriptionPlaceholder}
      />
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => deleteTemplate.mutate(undefined)}
          className="rounded-md border border-[--line] px-3 py-2 text-xs text-[--bad]"
        >
          {messages.editor.deleteTemplate}
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-[--line] px-3 py-2 text-xs text-white"
          >
            {messages.templateDialog.cancel}
          </button>
          <button
            onClick={() => {
              updateTemplate.mutate(
                {
                  name,
                  description: description || null,
                },
                {
                  onSuccess: (data) => {
                    setTemplateName(data.template.name);
                    setTemplateDescription(data.template.description || "");
                    onClose();
                  },
                }
              );
            }}
            className="rounded-md bg-[--accent] px-3 py-2 text-xs font-semibold text-white hover:bg-[--accent-strong]"
          >
            {messages.editor.save}
          </button>
        </div>
      </div>
    </Modal>
  );
}
