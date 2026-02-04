"use client";

import Link from "next/link";
import type { Template } from "@/src/lib/api-types";
import { formatDate } from "@/src/lib/utils";
import { useI18n } from "@/src/lib/i18n";

export function TemplateCard({ template }: { template: Template }) {
  const { messages } = useI18n();
  return (
    <Link
      href={`/editor/${template.id}`}
      className="rounded-2xl border border-[#27272a] bg-[#111113] p-5 transition hover:border-[#3f3f46]"
    >
      <div className="mb-4 h-24 w-full rounded-xl border border-[#27272a] bg-gradient-to-br from-[#10131c] via-[#0f1117] to-[#1b1f2a]" />
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{template.name}</p>
        {template.is_official && (
          <span className="rounded-full border border-[#3b82f6]/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[#93c5fd]">
            {messages.templateCard.officialBadge}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-[#71717a]">
        {template.description || messages.templateCard.noDescription}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs text-[#71717a]">
        <span>
          v{template.live_version?.version_number ?? 0}
        </span>
        <span>{formatDate(template.updated_at)}</span>
      </div>
    </Link>
  );
}
