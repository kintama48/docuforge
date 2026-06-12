"use client";

import { useTemplates, useForkTemplate } from "@/src/hooks/use-templates";

const STARTER_NAMES = ["Standard Invoice", "Thermal Receipt", "Business Report"];

const STARTER_META: Record<
  string,
  { label: string; icon: string; description: string }
> = {
  "Standard Invoice": {
    label: "Start with Invoice",
    icon: "📄",
    description: "Itemised billing with tax, totals and company branding.",
  },
  "Thermal Receipt": {
    label: "Start with Receipt",
    icon: "🧾",
    description: "Compact 80 mm POS receipt with items and payment summary.",
  },
  "Business Report": {
    label: "Start with Report",
    icon: "📊",
    description: "Multi-page report with cover page, TOC, and sections.",
  },
};

export function StarterTemplatePicker() {
  const { data } = useTemplates(true);
  const forkTemplate = useForkTemplate();

  const officialTemplates = data?.templates?.filter((t) => t.is_official) ?? [];
  const starters = officialTemplates.filter((t) =>
    STARTER_NAMES.includes(t.name)
  );

  // Don't render if templates haven't loaded yet or none of the 3 are seeded
  if (!data || starters.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--ink)]">
        Start from a template
      </h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Fork a ready-to-render starter — no blank canvas required.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {starters.map((template) => {
          const meta = STARTER_META[template.name];
          return (
            <button
              key={template.id}
              onClick={() =>
                forkTemplate.mutate({
                  id: template.id,
                  name: template.name,
                })
              }
              disabled={forkTemplate.isPending}
              className="flex flex-col items-start rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-left transition hover:border-[var(--line-hover)] disabled:opacity-60"
            >
              <span className="text-2xl" aria-hidden="true">
                {meta?.icon ?? "📄"}
              </span>
              <p className="mt-3 text-sm font-semibold text-[var(--ink)]">
                {meta?.label ?? `Start with ${template.name}`}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-dim)]">
                {meta?.description ?? template.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
