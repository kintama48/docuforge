"use client";

import { useI18n } from "@/src/lib/i18n";
import { getDevPlanCopy } from "@/src/lib/dev-plan-content";

type ProfileSectionProps = {
  email?: string | null;
  plan?: "free" | "dev" | "starter" | "pro" | null;
  onUpgrade: (plan: "dev" | "starter" | "pro") => void;
  onManage?: () => void;
};

export function ProfileSection({
  email,
  plan,
  billingEnabled = true,
  onUpgrade,
  onManage,
}: ProfileSectionProps) {
  const { messages, locale } = useI18n();
  const devCopy = getDevPlanCopy(locale);
  const planLabels: Record<NonNullable<ProfileSectionProps["plan"]>, string> = {
    free: messages.settings.free,
    dev: devCopy.name,
    starter: messages.settings.starter,
    pro: messages.settings.pro,
  };
  const badge = !plan ? messages.settings.planUnknown : planLabels[plan];

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold text-[var(--ink)]">
        {messages.settings.profileTitle}
      </h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {email || "developer@docuforge.dev"}
      </p>
      <span className="mt-3 inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {badge}
      </span>

      {billingEnabled && plan === "free" ? (
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
      ) : billingEnabled ? (
        <button
          onClick={() => onManage?.()}
          className="mt-4 rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
        >
          {messages.settings.manageSubscription}
        </button>
      ) : (
        <p className="mt-4 text-xs text-[var(--muted-dim)]">Billing disabled</p>
      )}
    </section>
  );
}
