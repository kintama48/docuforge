"use client";

import { useI18n } from "@/src/lib/i18n";

type AiCreditsIndicatorProps = {
  remaining: number | null;
  limit: number | null;
  resetAt?: number | null;
};

export function AiCreditsIndicator({
  remaining,
  limit,
  resetAt,
}: AiCreditsIndicatorProps) {
  const { messages } = useI18n();
  const progress =
    limit && remaining !== null
      ? Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)))
      : null;
  const resetMinutes = resetAt
    ? Math.max(0, Math.ceil((resetAt - Date.now()) / 60000))
    : null;
  const exhausted = remaining !== null && remaining <= 0;

  return (
    <div className="rounded-xl border border-[#27272a] bg-[#111113] p-4 text-xs text-[#a1a1aa]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white">
          {messages.ai.creditsTitle}
        </p>
        <p>
          {remaining !== null && limit !== null
            ? messages.ai.creditsRemaining
                .replace("{remaining}", String(remaining))
                .replace("{limit}", String(limit))
            : messages.ai.creditsChecking}
        </p>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-[#1f2937]">
        <div
          className="h-1.5 rounded-full bg-[#3b82f6]"
          style={{ width: `${progress ?? 0}%` }}
        />
      </div>
      {exhausted && resetMinutes !== null && (
        <p className="mt-2 text-[11px] text-[#f97316]">
          {messages.ai.creditsResetIn.replace(
            "{minutes}",
            String(resetMinutes)
          )}
        </p>
      )}
    </div>
  );
}
