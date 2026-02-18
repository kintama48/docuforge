"use client";

import { useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { useCreateTemplate, useForkTemplate, useTemplates } from "@/src/hooks/use-templates";
import { DEFAULT_TEMPLATE_DEFAULTS, DEFAULT_TEMPLATE_SOURCE } from "@/src/lib/template-defaults";
import { getGuidedTemplatePreset, listGuidedTemplatePresets } from "@/src/lib/low-code";
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
  const guidedPresets = listGuidedTemplatePresets();

  const officialTemplates =
    data?.templates?.filter((template) => template.is_official) || [];

  return (
    <Modal open={open} onClose={onClose} title={messages.templateDialog.title}>
      <label className="text-xs text-[var(--muted)]">
        {messages.templateDialog.nameLabel}
      </label>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink)]"
        placeholder={messages.templateDialog.namePlaceholder}
      />

      <label className="mt-4 text-xs text-[var(--muted)]">
        {messages.templateDialog.descriptionLabel}
      </label>
      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink)]"
        placeholder={messages.templateDialog.descriptionPlaceholder}
      />

      <label className="mt-4 text-xs text-[var(--muted)]">
        {messages.templateDialog.startFromLabel}
      </label>
      <select
        value={starterId}
        onChange={(event) => setStarterId(event.target.value)}
        className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink)]"
      >
        <option value="blank">{messages.templateDialog.blankOption}</option>
        {guidedPresets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {`Guided: ${preset.name}`}
          </option>
        ))}
        {officialTemplates.map((template) => (
          <option key={template.id} value={template.id}>
            {`${messages.templateCard.officialBadge}: ${template.name}`}
          </option>
        ))}
      </select>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)]"
        >
          {messages.templateDialog.cancel}
        </button>
        <button
          onClick={() => {
            const trimmedName = name.trim();
            const trimmedDescription = description.trim();
            if (!trimmedName) return;
            const normalizedDescription = trimmedDescription || null;

            if (starterId === "blank") {
              createTemplate.mutate(
                {
                  name: trimmedName,
                  description: normalizedDescription,
                  source: DEFAULT_TEMPLATE_SOURCE,
                  defaults: DEFAULT_TEMPLATE_DEFAULTS,
                  files: {},
                },
                { onSuccess: onClose }
              );
            } else if (starterId.startsWith("guided-")) {
              const preset = getGuidedTemplatePreset(starterId);
              if (!preset) return;
              createTemplate.mutate(
                {
                  name: trimmedName,
                  description: normalizedDescription,
                  low_code_spec: preset.spec,
                },
                { onSuccess: onClose }
              );
            } else {
              forkTemplate.mutate(
                { id: starterId, name: trimmedName },
                { onSuccess: onClose }
              );
            }
          }}
          disabled={
            !name.trim() || createTemplate.isPending || forkTemplate.isPending
          }
          className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {createTemplate.isPending || forkTemplate.isPending
            ? messages.templateDialog.creating
            : messages.templateDialog.create}
        </button>
      </div>
    </Modal>
  );
}
