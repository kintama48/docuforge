"use client";

import { planLimits } from "@/src/lib/constants";
import { formatBytes } from "@/src/lib/utils";
import { useI18n } from "@/src/lib/i18n";

function fmtLimit(v: number | null): string {
  if (v === null) return "Unlimited";
  return v.toLocaleString();
}

type PlanTier = "free" | "starter" | "pro";

type PlanSectionProps = {
  plan?: PlanTier | null;
  billingEnabled?: boolean;
  onUpgrade: (plan: "starter" | "pro") => void;
  onManage?: () => void;
};

export function PlanSection({
  plan,
  billingEnabled = true,
  onUpgrade,
  onManage,
}: PlanSectionProps) {
  const { messages } = useI18n();
  const currentPlan: PlanTier = plan ?? "free";
  const planMeta: Record<PlanTier, { name: string; price: string; blurb: string }> = {
    free: {
      name: messages.settings.free,
      price: messages.pricing.plans[0].price,
      blurb: messages.settings.planFreeBlurb,
    },
    starter: {
      name: messages.settings.starter,
      price: messages.pricing.plans[1].price,
      blurb: messages.settings.planStarterBlurb,
    },
    pro: {
      name: messages.settings.pro,
      price: messages.pricing.plans[2].price,
      blurb: messages.settings.planProBlurb,
    },
  };

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            {messages.settings.planTitle}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-dim)]">
            {messages.settings.planSubtitle}
          </p>
        </div>
        {billingEnabled && currentPlan !== "free" && (
          <button
            onClick={() => onManage?.()}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
          >
            {messages.settings.manageSubscription}
          </button>
        )}
      </div>

      {!billingEnabled && (
        <p className="mt-3 text-xs text-[var(--muted-dim)]">Billing disabled</p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {(Object.keys(planMeta) as PlanTier[]).map((tier) => {
          const details = planMeta[tier];
          const limit = planLimits[tier];
          const isCurrent = currentPlan === tier;
          return (
            <div
              key={tier}
              className={`rounded-xl border px-4 py-4 ${
                isCurrent
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line)] bg-[var(--surface-2)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  {details.name}
                </h3>
                {isCurrent && (
                  <span className="rounded-full border border-[var(--accent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
                    {messages.settings.current}
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                {details.price}
                <span className="text-xs text-[var(--muted-dim)]">
                  {messages.settings.perMonth}
                </span>
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">{details.blurb}</p>
              <ul className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                <li>
                  {fmtLimit(limit.renders)} {messages.settings.monthlyRenders}
                </li>
                <li>
                  {fmtLimit(limit.aiCredits)} {messages.settings.aiCredits}
                </li>
                <li>
                  {fmtLimit(limit.templates)} {messages.settings.templates}
                </li>
                <li>
                  {limit.assetsBytes !== null ? formatBytes(limit.assetsBytes) : "Unlimited"} {messages.settings.assets}
                </li>
              </ul>
              {billingEnabled && tier !== "free" && !isCurrent && (
                <button
                  onClick={() => onUpgrade(tier)}
                  className="mt-4 w-full rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
                >
                  {tier === "starter"
                    ? messages.settings.upgradeStarter
                    : messages.settings.upgradePro}
                </button>
              )}
              {billingEnabled && tier === "free" && currentPlan === "free" && (
                <button
                  onClick={() => onUpgrade("starter")}
                  className="mt-4 w-full rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
                >
                  {messages.settings.comparePaid}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
