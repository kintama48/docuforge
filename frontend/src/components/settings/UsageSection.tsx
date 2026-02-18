"use client";

import { useMemo } from "react";
import type { UsageResponse } from "@/src/lib/api-types";
import { planLimits } from "@/src/lib/constants";
import { formatBytes } from "@/src/lib/utils";
import { useI18n } from "@/src/lib/i18n";

function buildDailySeries(usage?: UsageResponse) {
  const used = usage?.renders.used ?? 0;
  const start = usage?.period?.start ? new Date(usage.period.start) : null;
  const end = usage?.period?.end ? new Date(usage.period.end) : null;
  const dayCount =
    start && end
      ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
      : 30;
  const base = Math.floor(used / dayCount);
  const remainder = used - base * dayCount;
  return Array.from({ length: dayCount }, (_, index) =>
    index < remainder ? base + 1 : base
  );
}

export function UsageSection({ usage }: { usage?: UsageResponse }) {
  const { messages } = useI18n();
  const daily = useMemo(() => buildDailySeries(usage), [usage]);
  const maxValue = Math.max(1, ...daily);

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold text-[var(--ink)]">
        {messages.settings.usageTitle}
      </h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {usage?.renders.used ?? 0} / {usage?.renders.limit ?? 0}{" "}
        {messages.settings.usageSummary}
      </p>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-dim)]">
          {messages.settings.dailyRenders}
        </p>
        <div className="mt-4 flex h-24 items-end gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
          {daily.map((value, index) => (
            <div
              key={`${value}-${index}`}
              className="flex-1 rounded-sm bg-[var(--accent)]/70"
              style={{ height: `${Math.round((value / maxValue) * 100)}%` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-dim)]">
          {messages.settings.planLimits}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--muted)]">
            <thead className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">
              <tr>
                <th className="py-2">{messages.settings.feature}</th>
                <th className="py-2">{messages.settings.free}</th>
                <th className="py-2">{messages.settings.starter}</th>
                <th className="py-2">{messages.settings.pro}</th>
              </tr>
            </thead>
            <tbody>
              {[
                [messages.settings.monthlyRenders, "renders"],
                [messages.settings.aiCredits, "aiCredits"],
                [messages.settings.templates, "templates"],
                [messages.settings.assets, "assetsBytes"],
              ].map(([label, key]) => {
                const fmt = (v: number | null) => {
                  if (v === null) return "Unlimited";
                  if (key === "assetsBytes") return formatBytes(v);
                  return v.toLocaleString();
                };
                return (
                  <tr key={label} className="border-t border-[var(--line)]">
                    <td className="py-2 text-[var(--ink)]">{label}</td>
                    <td className="py-2">{fmt(planLimits.free[key as keyof typeof planLimits.free])}</td>
                    <td className="py-2">{fmt(planLimits.starter[key as keyof typeof planLimits.starter])}</td>
                    <td className="py-2">{fmt(planLimits.pro[key as keyof typeof planLimits.pro])}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
