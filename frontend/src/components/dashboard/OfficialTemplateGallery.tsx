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
      <p className="text-sm text-[var(--muted-dim)]">
        {messages.dashboard.officialTemplatesEmpty}
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {officialTemplates.map((template) => (
        <div
          key={template.id}
          className="min-w-[220px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
        >
          <p className="text-sm font-semibold text-[var(--ink)]">{template.name}</p>
          <p className="mt-2 text-xs text-[var(--muted-dim)]">
            {template.description || messages.dashboard.officialTemplateDescription}
          </p>
          <button
            onClick={() =>
              forkTemplate.mutate({
                id: template.id,
                name: `${template.name} Copy`,
              })
            }
            className="mt-4 w-full rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
          >
            {messages.dashboard.forkTemplate}
          </button>
        </div>
      ))}
    </div>
  );
}
