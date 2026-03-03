"use client";

import Link from "next/link";
import type { Template } from "@/src/lib/api-types";
import { formatDate } from "@/src/lib/utils";
import { useI18n } from "@/src/lib/i18n";

export function TemplateCard({ template }: { template: Template }) {
  const { messages } = useI18n();
  const previewLabel = template.description
    ? template.description.slice(0, 70)
    : `Template: ${template.name}`;

  return (
    <Link
      href={`/editor/${template.id}`}
      className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:border-[var(--line-hover)]"
    >
      <div className="mb-4 flex h-24 w-full items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 text-center">
        <div>
          <p className="text-xs text-[var(--ink)]">{previewLabel}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--ink)]">{template.name}</p>
        {template.is_official && (
          <span className="rounded-full border border-[var(--accent)]/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
            {messages.templateCard.officialBadge}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-[var(--muted-dim)]">
        {template.description || messages.templateCard.noDescription}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted-dim)]">
        <span>
          v{template.live_version?.version_number ?? 0}
        </span>
        <span>{formatDate(template.updated_at)}</span>
      </div>
    </Link>
  );
}
