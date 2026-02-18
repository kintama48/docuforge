"use client";

import { useI18n } from "@/src/lib/i18n";

type ProfileSectionProps = {
  email?: string | null;
  plan?: "free" | "starter" | "pro" | null;
  billingEnabled?: boolean;
  onUpgrade: (plan: "starter" | "pro") => void;
  onManage?: () => void;
};

export function ProfileSection({
  email,
  plan,
  billingEnabled = true,
  onUpgrade,
  onManage,
}: ProfileSectionProps) {
  const { messages } = useI18n();
  const badge =
    !plan
      ? messages.settings.planUnknown
      : plan === "free"
        ? messages.settings.free
        : plan === "starter"
          ? messages.settings.starter
          : messages.settings.pro;

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
            onClick={() => onUpgrade("starter")}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            {messages.settings.upgradeStarter}
          </button>
          <button
            onClick={() => onUpgrade("pro")}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
          >
            {messages.settings.upgradePro}
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
