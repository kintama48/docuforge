"use client";

import { planLimits } from "@/src/lib/constants";
import { formatBytes } from "@/src/lib/utils";
import { useI18n } from "@/src/lib/i18n";
import { getDevPlanCopy } from "@/src/lib/dev-plan-content";

function fmtLimit(v: number | null): string {
  if (v === null) return "Unlimited";
  return v.toLocaleString();
}

type PlanTier = "free" | "dev" | "starter" | "pro";

type PlanSectionProps = {
  plan?: PlanTier | null;
  billingEnabled?: boolean;
  onUpgrade: (plan: "dev" | "starter" | "pro") => void;
  onManage?: () => void;
};

export function PlanSection({
  plan,
  billingEnabled,
  onUpgrade,
  onManage,
}: PlanSectionProps) {
  const { messages, locale } = useI18n();
  const devCopy = getDevPlanCopy(locale);
  const currentPlan: PlanTier = plan ?? "free";
  const isBillingEnabled = billingEnabled ?? true;
  const planMeta: Record<PlanTier, { name: string; price: string; blurb: string }> = {
    free: {
      name: messages.settings.free,
      price: messages.pricing.plans[0].price,
      blurb: messages.settings.planFreeBlurb,
    },
    dev: {
      name: devCopy.name,
      price: devCopy.price,
      blurb: devCopy.blurb,
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
    <section className="rounded-2xl border border-[#27272a] bg-[#111113] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {messages.settings.planTitle}
          </h2>
          <p className="mt-1 text-xs text-[#71717a]">
            {messages.settings.planSubtitle}
          </p>
        </div>
        {isBillingEnabled && currentPlan !== "free" && (
          <button
            onClick={() => onManage?.()}
            className="rounded-md border border-[#27272a] px-3 py-2 text-xs text-white hover:border-[#3f3f46]"
          >
            {messages.settings.manageSubscription}
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(planMeta) as PlanTier[]).map((tier) => {
          const details = planMeta[tier];
          const limit = planLimits[tier];
          const isCurrent = currentPlan === tier;
          return (
            <div
              key={tier}
              className={`rounded-xl border px-4 py-4 ${
                isCurrent
                  ? "border-[#3b82f6] bg-[#0f172a]"
                  : "border-[#27272a] bg-[#0f1117]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  {details.name}
                </h3>
                {isCurrent && (
                  <span className="rounded-full border border-[#3b82f6] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[#93c5fd]">
                    {messages.settings.current}
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-semibold text-white">
                {details.price}
                <span className="text-xs text-[#71717a]">
                  {messages.settings.perMonth}
                </span>
              </p>
              <p className="mt-2 text-xs text-[#a1a1aa]">{details.blurb}</p>
              <ul className="mt-3 space-y-1 text-xs text-[#a1a1aa]">
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
              {isBillingEnabled && tier !== "free" && !isCurrent && (
                <button
                  onClick={() => onUpgrade(tier)}
                  className="mt-4 w-full rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
                >
                  {tier === "dev"
                    ? devCopy.upgradeLabel
                    : tier === "starter"
                      ? messages.settings.upgradeStarter
                      : messages.settings.upgradePro}
                </button>
              )}
              {isBillingEnabled && tier === "free" && currentPlan === "free" && (
                <button
                  onClick={() => onUpgrade("dev")}
                  className="mt-4 w-full rounded-md border border-[#27272a] px-3 py-2 text-xs text-white hover:border-[#3f3f46]"
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
