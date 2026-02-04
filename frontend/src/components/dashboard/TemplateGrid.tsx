"use client";

import { useTemplates } from "@/src/hooks/use-templates";
import { TemplateCard } from "@/src/components/dashboard/TemplateCard";
import { useI18n } from "@/src/lib/i18n";

type TemplateGridProps = {
  includeOfficial?: boolean;
};

export function TemplateGrid({ includeOfficial = false }: TemplateGridProps) {
  const { messages } = useI18n();
  const { data, isLoading } = useTemplates(includeOfficial);
  const templates = includeOfficial
    ? data?.templates || []
    : (data?.templates || []).filter((template) => !template.is_official);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-32 rounded-2xl border border-[#27272a] bg-[#111113] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!templates.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#27272a] bg-[#111113] p-8 text-center text-sm text-[#71717a]">
        {messages.dashboard.emptyTemplates}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  );
}
