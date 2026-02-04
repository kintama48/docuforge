"use client";

import { Fragment } from "react";
import { useI18n } from "@/src/lib/i18n";

type TemplateItem = {
  id: string;
  name: string;
  description?: string | null;
  is_official?: boolean;
};

type TemplatePickerStepProps = {
  templates: TemplateItem[];
  fallbackNames: string[];
  onPick: (template: TemplateItem) => void;
  onSkip: () => void;
};

export function TemplatePickerStep({
  templates,
  fallbackNames,
  onPick,
  onSkip,
}: TemplatePickerStepProps) {
  const { messages } = useI18n();
  const items = templates.length
    ? templates
    : fallbackNames.map((name) => ({
        id: name,
        name,
        description: messages.dashboard.officialTemplateDescription,
        is_official: true,
      }));

  return (
    <section className="mt-8 rounded-2xl border border-[#27272a] bg-[#111113] p-6">
      <h2 className="text-lg font-semibold">
        {messages.onboarding.chooseTemplateTitle}
      </h2>
      <p className="mt-2 text-sm text-[#a1a1aa]">
        {messages.onboarding.chooseTemplateSubtitle}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((template) => (
          <Fragment key={template.id}>
            <div className="rounded-xl border border-[#27272a] bg-[#0f1117] p-4">
              <p className="text-sm font-semibold">{template.name}</p>
              <p className="mt-1 text-xs text-[#71717a]">
                {template.description || messages.dashboard.officialTemplateDescription}
              </p>
              <button
                onClick={() => onPick(template)}
                className="mt-4 w-full rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
              >
                {messages.onboarding.useThis}
              </button>
            </div>
          </Fragment>
        ))}
      </div>
      <button
        onClick={onSkip}
        className="mt-6 text-xs text-[#a1a1aa] hover:text-white"
      >
        {messages.onboarding.skip}
      </button>
    </section>
  );
}
