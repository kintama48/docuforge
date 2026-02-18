"use client";

import { useUsage } from "@/src/hooks/use-usage";
import { useI18n } from "@/src/lib/i18n";

export function UsageCard() {
  const { messages } = useI18n();
  const { data, isLoading } = useUsage();
  const used = data?.renders.used ?? 0;
  const limit = data?.renders.limit ?? 0;
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-dim)]">
        {messages.dashboard.usageLabel}
      </p>
      <p className="mt-3 text-2xl font-semibold text-[var(--ink)]">
        {isLoading ? "—" : `${used} / ${limit}`}
      </p>
      <div className="mt-4 h-2 w-full rounded-full bg-[var(--surface-active)]">
        <div
          className="h-2 rounded-full bg-[var(--accent)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--muted-dim)]">
        {percent}% {messages.dashboard.usageSuffix}
      </p>
    </div>
  );
}
