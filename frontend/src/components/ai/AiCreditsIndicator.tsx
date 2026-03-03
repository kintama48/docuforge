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
    ? Math.max(0, Math.ceil((resetAt - new Date().getTime()) / 60000))
    : null;
  const exhausted = remaining !== null && remaining <= 0;

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--ink)]">
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
      <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-2)]">
        <div
          className="h-1.5 rounded-full bg-[var(--accent)]"
          style={{ width: `${progress ?? 0}%` }}
        />
      </div>
      {exhausted && resetMinutes !== null && (
        <p className="mt-2 text-[11px] text-[var(--warn)]">
          {messages.ai.creditsResetIn.replace(
            "{minutes}",
            String(resetMinutes)
          )}
        </p>
      )}
    </div>
  );
}
