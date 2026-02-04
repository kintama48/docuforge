"use client";

import { useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { useCreateTemplate, useForkTemplate, useTemplates } from "@/src/hooks/use-templates";
import { DEFAULT_TEMPLATE_DEFAULTS, DEFAULT_TEMPLATE_SOURCE } from "@/src/lib/template-defaults";
import { useI18n } from "@/src/lib/i18n";

type CreateTemplateDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateTemplateDialog({
  open,
  onClose,
}: CreateTemplateDialogProps) {
  const { messages } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [starterId, setStarterId] = useState("blank");
  const { data } = useTemplates(true);
  const createTemplate = useCreateTemplate();
  const forkTemplate = useForkTemplate();

  const officialTemplates =
    data?.templates?.filter((template) => template.is_official) || [];

  return (
    <Modal open={open} onClose={onClose} title={messages.templateDialog.title}>
      <label className="text-xs text-[#a1a1aa]">
        {messages.templateDialog.nameLabel}
      </label>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="mt-2 w-full rounded-md border border-[#27272a] bg-[#0f1117] px-3 py-2 text-xs text-white"
        placeholder={messages.templateDialog.namePlaceholder}
      />

      <label className="mt-4 text-xs text-[#a1a1aa]">
        {messages.templateDialog.descriptionLabel}
      </label>
      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        className="mt-2 w-full rounded-md border border-[#27272a] bg-[#0f1117] px-3 py-2 text-xs text-white"
        placeholder={messages.templateDialog.descriptionPlaceholder}
      />

      <label className="mt-4 text-xs text-[#a1a1aa]">
        {messages.templateDialog.startFromLabel}
      </label>
      <select
        value={starterId}
        onChange={(event) => setStarterId(event.target.value)}
        className="mt-2 w-full rounded-md border border-[#27272a] bg-[#0f1117] px-3 py-2 text-xs text-white"
      >
        <option value="blank">{messages.templateDialog.blankOption}</option>
        {officialTemplates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-md border border-[#27272a] px-3 py-2 text-xs text-white"
        >
          {messages.templateDialog.cancel}
        </button>
        <button
          onClick={() => {
            if (!name.trim()) return;
            if (starterId === "blank") {
              createTemplate.mutate(
                {
                  name,
                  description: description || null,
                  source: DEFAULT_TEMPLATE_SOURCE,
                  defaults: DEFAULT_TEMPLATE_DEFAULTS,
                  files: {},
                },
                { onSuccess: onClose }
              );
            } else {
              forkTemplate.mutate(
                { id: starterId, name },
                { onSuccess: onClose }
              );
            }
          }}
          disabled={
            !name.trim() || createTemplate.isPending || forkTemplate.isPending
          }
          className="rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb] disabled:opacity-60"
        >
          {createTemplate.isPending || forkTemplate.isPending
            ? messages.templateDialog.creating
            : messages.templateDialog.create}
        </button>
      </div>
    </Modal>
  );
}
