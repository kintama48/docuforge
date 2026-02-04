"use client";

import { useMemo } from "react";
import { useI18n } from "@/src/lib/i18n";

type ProfileSectionProps = {
  email?: string | null;
  plan?: "free" | "starter" | "pro" | null;
  onUpgrade: (plan: "starter" | "pro") => void;
  onManage?: () => void;
};

export function ProfileSection({
  email,
  plan,
  onUpgrade,
  onManage,
}: ProfileSectionProps) {
  const { messages } = useI18n();
  const planLabels: Record<NonNullable<ProfileSectionProps["plan"]>, string> = {
    free: messages.settings.free,
    starter: messages.settings.starter,
    pro: messages.settings.pro,
  };
  const badge = useMemo(() => {
    if (!plan) return messages.settings.planUnknown;
    return planLabels[plan];
  }, [plan, planLabels, messages.settings.planUnknown]);

  return (
    <section className="rounded-2xl border border-[#27272a] bg-[#111113] p-6">
      <h2 className="text-lg font-semibold text-white">
        {messages.settings.profileTitle}
      </h2>
      <p className="mt-2 text-sm text-[#a1a1aa]">
        {email || "developer@docuforge.dev"}
      </p>
      <span className="mt-3 inline-flex items-center rounded-full border border-[#27272a] bg-[#0f1117] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#a1a1aa]">
        {badge}
      </span>

      {plan === "free" ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => onUpgrade("starter")}
            className="rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
          >
            {messages.settings.upgradeStarter}
          </button>
          <button
            onClick={() => onUpgrade("pro")}
            className="rounded-md border border-[#27272a] px-3 py-2 text-xs text-white hover:border-[#3f3f46]"
          >
            {messages.settings.upgradePro}
          </button>
        </div>
      ) : (
        <button
          onClick={() => onManage?.()}
          className="mt-4 rounded-md border border-[#27272a] px-3 py-2 text-xs text-white hover:border-[#3f3f46]"
        >
          {messages.settings.manageSubscription}
        </button>
      )}
    </section>
  );
}
