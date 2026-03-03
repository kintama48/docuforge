import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

import type { ReactNode } from "react";

type LegalLayoutProps = {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  children,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen page-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-6 pb-20 pt-12 lg:pt-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Legal
          </p>
          <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-pretty text-base text-[var(--muted)]">
            {subtitle}
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Last updated: {lastUpdated}
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm text-[var(--muted)]">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
