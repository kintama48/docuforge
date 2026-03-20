import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

import type { ReactNode } from "react";
import {
  Container,
  PageIntro,
} from "@/src/components/layout/page-primitives";

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

      <Container as="main" width="article" className="pb-20 pt-12 lg:pt-16">
        <PageIntro
          eyebrow="Legal"
          title={title}
          description={subtitle}
          width="reading"
          meta={
            <p className="eyebrow text-[var(--muted)]">
              Last updated: {lastUpdated}
            </p>
          }
        />

        <div className="mt-10 space-y-10 text-sm leading-7 text-[var(--muted)]">
          {children}
        </div>
      </Container>

      <SiteFooter />
    </div>
  );
}
