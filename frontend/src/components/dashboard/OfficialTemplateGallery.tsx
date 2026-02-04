"use client";

import { useTemplates, useForkTemplate } from "@/src/hooks/use-templates";
import { useI18n } from "@/src/lib/i18n";

export function OfficialTemplateGallery() {
  const { messages } = useI18n();
  const { data } = useTemplates(true);
  const forkTemplate = useForkTemplate();
  const officialTemplates =
    data?.templates?.filter((template) => template.is_official) || [];

  if (officialTemplates.length === 0) {
    return (
      <p className="text-sm text-[#71717a]">
        {messages.dashboard.officialTemplatesEmpty}
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {officialTemplates.map((template) => (
        <div
          key={template.id}
          className="min-w-[220px] rounded-2xl border border-[#27272a] bg-[#111113] p-4"
        >
          <p className="text-sm font-semibold text-white">{template.name}</p>
          <p className="mt-2 text-xs text-[#71717a]">
            {template.description || messages.dashboard.officialTemplateDescription}
          </p>
          <button
            onClick={() =>
              forkTemplate.mutate({
                id: template.id,
                name: `${template.name} Copy`,
              })
            }
            className="mt-4 w-full rounded-md border border-[#27272a] px-3 py-2 text-xs text-white hover:border-[#3f3f46]"
          >
            {messages.dashboard.forkTemplate}
          </button>
        </div>
      ))}
    </div>
  );
}
