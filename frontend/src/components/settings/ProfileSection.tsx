"use client";

import { useI18n } from "@/src/lib/i18n";
import { getDevPlanCopy } from "@/src/lib/dev-plan-content";

type ProfileSectionProps = {
  email?: string | null;
  plan?: "free" | "dev" | "starter" | "pro" | null;
  billingEnabled?: boolean;
  onUpgrade: (plan: "dev" | "starter" | "pro") => void;
  onManage?: () => void;
};

export function ProfileSection({
  email,
  plan,
  billingEnabled,
  onUpgrade,
  onManage,
}: ProfileSectionProps) {
  const { messages, locale } = useI18n();
  const devCopy = getDevPlanCopy(locale);
  const isBillingEnabled = billingEnabled ?? true;
  const planLabels: Record<NonNullable<ProfileSectionProps["plan"]>, string> = {
    free: messages.settings.free,
    dev: devCopy.name,
    starter: messages.settings.starter,
    pro: messages.settings.pro,
  };
  const badge = !plan ? messages.settings.planUnknown : planLabels[plan];

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

      {isBillingEnabled && plan === "free" ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => onUpgrade("dev")}
            className="rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
          >
            {devCopy.upgradeLabel}
          </button>
          <button
            onClick={() => onUpgrade("starter")}
            className="rounded-md border border-[#27272a] px-3 py-2 text-xs text-white hover:border-[#3f3f46]"
          >
            {messages.settings.upgradeStarter}
          </button>
        </div>
      ) : isBillingEnabled ? (
        <button
          onClick={() => onManage?.()}
          className="mt-4 rounded-md border border-[#27272a] px-3 py-2 text-xs text-white hover:border-[#3f3f46]"
        >
          {messages.settings.manageSubscription}
        </button>
      ) : null}
    </section>
  );
}
