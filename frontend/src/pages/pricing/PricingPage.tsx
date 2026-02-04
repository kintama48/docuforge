"use client";

import Link from "next/link";
import { SiteFooter } from "@/src/app/components/site-footer";
import { SiteHeader } from "@/src/app/components/site-header";
import { useI18n } from "@/src/lib/i18n";
import { planLimits } from "@/src/lib/constants";
import { useLocalePath } from "@/src/lib/use-locale-path";

type PlanKey = "free" | "starter" | "pro" | "enterprise";

const planOrder: PlanKey[] = ["free", "starter", "pro", "enterprise"];

export default function PricingPage() {
  const { messages } = useI18n();
  const localePath = useLocalePath();
  return (
    <div className="min-h-screen page-background">
      <SiteHeader />

      <main>
        <section className="section-pad">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                {messages.pricing.label}
              </p>
              <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
                {messages.pricing.title}
              </h1>
              <p className="mt-4 text-pretty text-base text-[var(--muted)]">
                {messages.pricing.subtitle}
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {planOrder.map((key, index) => {
                const plan = messages.pricing.plans[index];
                const limits = planLimits[key];
                const featured = key === "starter";
                const isCustom = key === "enterprise";
                return (
                  <div
                    key={key}
                    className={`rounded-2xl border p-6 ${
                      featured
                        ? "border-[var(--accent)] bg-[var(--surface)] shadow-[var(--shadow)]"
                        : "border-[var(--line)] bg-[var(--surface)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[var(--ink)]">
                      {plan.name}
                    </h2>
                    {featured && (
                      <span className="rounded-full border border-[var(--accent)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
                          {messages.pricing.popularLabel}
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-[var(--ink)]">
                    {plan.price}
                    {!isCustom && (
                      <span className="text-xs text-[var(--muted)]">
                        {messages.pricing.perMonth}
                      </span>
                    )}
                  </p>
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      {plan.description}
                    </p>
                    <ul className="mt-6 space-y-2 text-sm text-[var(--muted)]">
                      <li>
                        {limits.renders} {messages.pricing.rendersPerMonth}
                      </li>
                      <li>
                        {limits.aiCredits} {messages.pricing.aiCreditsPerMonth}
                      </li>
                      <li>
                        {limits.templates} {messages.pricing.templatesLabel}
                      </li>
                      <li>{limits.assets} {messages.pricing.assetsLabel}</li>
                    </ul>
                    <Link
                      href={
                        isCustom
                          ? "mailto:hello@docuforge.dev"
                          : localePath("/register")
                      }
                      className={`mt-6 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold ${
                        featured
                          ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
                          : "border border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink)]"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-sm text-[var(--muted)]">
              {messages.pricing.footnote}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
