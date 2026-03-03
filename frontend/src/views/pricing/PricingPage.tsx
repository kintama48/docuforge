"use client";

import Link from "next/link";
import { Check } from "@phosphor-icons/react";
import { SiteFooter } from "@/src/app/components/site-footer";
import { SiteHeader } from "@/src/app/components/site-header";
import { useI18n } from "@/src/lib/i18n";
import { getConsoleLocaleUrl } from "@/src/lib/urls";
import { planLimits } from "@/src/lib/constants";
import { formatBytes } from "@/src/lib/utils";
import { getDevPlanCopy } from "@/src/lib/dev-plan-content";

function fmtLimit(v: number | null): string {
  if (v === null) return "Unlimited";
  return v.toLocaleString();
}

type PlanKey = "free" | "dev" | "starter" | "pro" | "enterprise";

const planOrder: PlanKey[] = ["free", "dev", "starter", "pro", "enterprise"];

const planBenefits: Record<PlanKey, string[]> = {
  free: [
    "Core render API access",
    "Template editor + preview",
    "Community support",
  ],
  dev: [
    "Best for solo builders",
    "Higher monthly throughput",
    "Production-ready API keys",
  ],
  starter: [
    "Team collaboration baseline",
    "Higher automation capacity",
    "Priority issue handling",
  ],
  pro: [
    "High-volume throughput",
    "Faster queue prioritization",
    "Expanded support coverage",
  ],
  enterprise: [
    "Dedicated architecture review",
    "Custom throughput envelopes",
    "Security + procurement support",
  ],
};

type CompareValue = string | boolean;

export default function PricingPage() {
  const { messages, locale } = useI18n();
  const devCopy = getDevPlanCopy(locale);
  const consoleRegisterUrl = getConsoleLocaleUrl("/register", locale);
  const localizedPlans: Record<
    PlanKey,
    { name: string; price: string; description: string; cta: string }
  > = {
    free: {
      name: messages.pricing.plans[0].name,
      price: messages.pricing.plans[0].price,
      description: messages.pricing.plans[0].description,
      cta: messages.pricing.plans[0].cta,
    },
    dev: {
      name: devCopy.name,
      price: devCopy.price,
      description: devCopy.description,
      cta: devCopy.cta,
    },
    starter: {
      name: messages.pricing.plans[1].name,
      price: messages.pricing.plans[1].price,
      description: messages.pricing.plans[1].description,
      cta: messages.pricing.plans[1].cta,
    },
    pro: {
      name: messages.pricing.plans[2].name,
      price: messages.pricing.plans[2].price,
      description: messages.pricing.plans[2].description,
      cta: messages.pricing.plans[2].cta,
    },
    enterprise: {
      name: messages.pricing.plans[3].name,
      price: messages.pricing.plans[3].price,
      description: messages.pricing.plans[3].description,
      cta: messages.pricing.plans[3].cta,
    },
  };

  const compareRows: Array<{ label: string; values: Record<PlanKey, CompareValue> }> = [
    {
      label: messages.pricing.rendersPerMonth,
      values: {
        free: fmtLimit(planLimits.free.renders),
        dev: fmtLimit(planLimits.dev.renders),
        starter: fmtLimit(planLimits.starter.renders),
        pro: fmtLimit(planLimits.pro.renders),
        enterprise: "Unlimited",
      },
    },
    {
      label: messages.pricing.aiCreditsPerMonth,
      values: {
        free: fmtLimit(planLimits.free.aiCredits),
        dev: fmtLimit(planLimits.dev.aiCredits),
        starter: fmtLimit(planLimits.starter.aiCredits),
        pro: fmtLimit(planLimits.pro.aiCredits),
        enterprise: "Unlimited",
      },
    },
    {
      label: messages.pricing.templatesLabel,
      values: {
        free: fmtLimit(planLimits.free.templates),
        dev: fmtLimit(planLimits.dev.templates),
        starter: fmtLimit(planLimits.starter.templates),
        pro: fmtLimit(planLimits.pro.templates),
        enterprise: "Unlimited",
      },
    },
    {
      label: messages.pricing.assetsLabel,
      values: {
        free: planLimits.free.assetsBytes ? formatBytes(planLimits.free.assetsBytes) : "Unlimited",
        dev: planLimits.dev.assetsBytes ? formatBytes(planLimits.dev.assetsBytes) : "Unlimited",
        starter: planLimits.starter.assetsBytes ? formatBytes(planLimits.starter.assetsBytes) : "Unlimited",
        pro: planLimits.pro.assetsBytes ? formatBytes(planLimits.pro.assetsBytes) : "Unlimited",
        enterprise: "Unlimited",
      },
    },
    {
      label: "Priority support",
      values: {
        free: false,
        dev: false,
        starter: true,
        pro: true,
        enterprise: true,
      },
    },
    {
      label: "Advanced security controls",
      values: {
        free: false,
        dev: false,
        starter: true,
        pro: true,
        enterprise: true,
      },
    },
  ];

  return (
    <div className="min-h-screen page-background">
      <SiteHeader />

      <main>
        <section className="section-pad">
          <div className="mx-auto w-full max-w-[1460px] px-6 xl:px-8">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                {messages.pricing.label}
              </p>
              <h1 className="mt-3 font-heading text-balance text-4xl text-[var(--ink)] sm:text-5xl xl:text-6xl">
                {messages.pricing.title}
              </h1>
              <p className="font-script mt-4 max-w-3xl text-pretty text-lg leading-relaxed text-[var(--muted)]">
                {messages.pricing.subtitle}
              </p>
            </div>

            <div className="mt-10 overflow-x-auto pb-2">
              <div className="min-w-[1260px] rounded-[30px] border border-[var(--line)] bg-[var(--surface)]">
                <div className="grid grid-cols-5">
                  {planOrder.map((key, index) => {
                    const plan = localizedPlans[key];
                    const limits = planLimits[key];
                    const featured = key === "dev";
                    const isCustom = key === "enterprise";

                    return (
                      <article
                        key={key}
                        className={`relative flex h-full flex-col px-6 pb-7 ${
                          index > 0 ? "border-l border-[var(--line)]" : ""
                        } ${featured ? "bg-[color-mix(in_oklab,var(--accent-soft),var(--surface)_65%)]" : ""} ${featured ? "pt-14" : "pt-7"}`}
                      >
                        {featured ? (
                          <p className="absolute inset-x-0 top-0 rounded-t-none bg-[var(--ink)] py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                            {messages.pricing.popularLabel}
                          </p>
                        ) : null}

                        <h2 className="font-heading text-3xl text-[var(--ink)]">
                          {plan.name}
                        </h2>
                        <p className="mt-2 min-h-[64px] text-sm leading-6 text-[var(--muted)]">
                          {plan.description}
                        </p>

                        <div className="mt-4 min-h-[78px]">
                          {isCustom ? (
                            <>
                              <p className="font-heading text-[2.45rem] leading-none text-[var(--ink)]">
                                Custom
                              </p>
                              <p className="mt-2 text-sm text-[var(--muted)]">
                                Annual contract
                              </p>
                            </>
                          ) : (
                            <p className="flex items-end gap-1 text-[3.25rem] font-semibold leading-[0.9] text-[var(--ink)]">
                              {plan.price}
                              <span className="pb-1 text-sm font-medium text-[var(--muted)]">
                                {messages.pricing.perMonth}
                              </span>
                            </p>
                          )}
                        </div>

                        <Link
                          href={isCustom ? "mailto:hello@docuforge.app" : consoleRegisterUrl}
                          className={`mt-4 inline-flex h-12 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold ${
                            featured
                              ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
                              : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--line-hover)] hover:bg-[var(--surface-2)]"
                          }`}
                        >
                          {plan.cta}
                        </Link>

                        <div className="mt-6 border-t border-[var(--line)] pt-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                            Includes
                          </p>
                          <ul className="mt-3 space-y-2 text-sm text-[var(--ink)]">
                            {planBenefits[key].map((benefit) => (
                              <li key={benefit} className="flex items-start gap-2">
                                <Check
                                  className="phosphor-icon mt-0.5 h-4 w-4 text-[var(--good)]"
                                  weight="bold"
                                  aria-hidden="true"
                                />
                                <span className="leading-6">{benefit}</span>
                              </li>
                            ))}
                          </ul>

                          <ul className="mt-4 space-y-1.5 text-sm leading-6 text-[var(--muted)]">
                            <li>{fmtLimit(limits.renders)} {messages.pricing.rendersPerMonth}</li>
                            <li>{fmtLimit(limits.aiCredits)} {messages.pricing.aiCreditsPerMonth}</li>
                            <li>{fmtLimit(limits.templates)} {messages.pricing.templatesLabel}</li>
                            <li>
                              {limits.assetsBytes !== null ? formatBytes(limits.assetsBytes) : "Unlimited"}{" "}
                              {messages.pricing.assetsLabel}
                            </li>
                          </ul>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 max-w-3xl text-sm text-[var(--muted)]">
              <span className="font-script">{messages.pricing.footnote}</span>
            </div>

            <div className="mt-16">
              <h2 className="font-heading text-3xl text-[var(--ink)] sm:text-4xl">
                Compare plan limits at a glance
              </h2>
              <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead className="bg-[var(--surface-2)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        Capability
                      </th>
                      {planOrder.map((key) => (
                        <th
                          key={`head-${key}`}
                          className="border-l border-[var(--line)] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]"
                        >
                          {localizedPlans[key].name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((row) => (
                      <tr key={row.label}>
                        <td className="border-t border-[var(--line)] px-4 py-3 font-medium text-[var(--ink)]">
                          {row.label}
                        </td>
                        {planOrder.map((key) => {
                          const value = row.values[key];
                          return (
                            <td
                              key={`${row.label}-${key}`}
                              className="border-l border-t border-[var(--line)] px-4 py-3 text-[var(--muted)]"
                            >
                              {typeof value === "boolean" ? (
                                value ? (
                                  <Check className="phosphor-icon h-4 w-4 text-[var(--good)]" weight="bold" aria-label="Included" />
                                ) : (
                                  <span aria-label="Not included">-</span>
                                )
                              ) : (
                                value
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
