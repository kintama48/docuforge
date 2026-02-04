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
    <div className="rounded-2xl border border-[#27272a] bg-[#111113] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[#71717a]">
        {messages.dashboard.usageLabel}
      </p>
      <p className="mt-3 text-2xl font-semibold text-white">
        {isLoading ? "—" : `${used} / ${limit}`}
      </p>
      <div className="mt-4 h-2 w-full rounded-full bg-[#1f2937]">
        <div
          className="h-2 rounded-full bg-[#3b82f6]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[#71717a]">
        {percent}% {messages.dashboard.usageSuffix}
      </p>
    </div>
  );
}
