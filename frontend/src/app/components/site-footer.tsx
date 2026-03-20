"use client";

import Link from "next/link";
import { useI18n } from "@/src/lib/i18n";
import { getConsoleLocaleUrl } from "@/src/lib/urls";
import { useLocalePath } from "@/src/lib/use-locale-path";
import { getContentHubCopy } from "@/src/lib/content-hub";
import { BrandLogo } from "@/src/components/brand/BrandLogo";
import { Container } from "@/src/components/layout/page-primitives";
import {
  publicAnchorRoutes,
  publicRoutes,
} from "@/src/lib/public-route-contract";

export function SiteFooter() {
  const { messages, locale } = useI18n();
  const contentCopy = getContentHubCopy(locale);
  const localePath = useLocalePath();
  const consoleUrl = getConsoleLocaleUrl("/dashboard", locale);
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
      <Container width="marketing" className="py-12">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo className="h-10 w-10 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-1.5" />
              <div className="flex flex-col leading-none">
                <span className="text-[1.15rem] font-semibold tracking-tight text-[var(--ink)]">
                  DocuForge
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Developer console
                </span>
              </div>
            </div>
            <p className="mt-3 max-w-sm text-sm text-[var(--muted)]">
              {messages.footer.blurb}
            </p>
          </div>

          <div className="text-sm">
            <p className="font-semibold text-[var(--ink)]">
              {messages.footer.product}
            </p>
            <div className="mt-3 flex flex-col gap-2 text-[var(--muted)]">
              <Link
                href={localePath(publicAnchorRoutes.features)}
                className="hover:text-[var(--ink)]"
              >
                {messages.footer.links.features}
              </Link>
              <Link
                href={localePath(publicAnchorRoutes.workflow)}
                className="hover:text-[var(--ink)]"
              >
                {messages.footer.links.workflow}
              </Link>
              <Link
                href={localePath(publicRoutes.pricing)}
                className="hover:text-[var(--ink)]"
              >
                {messages.footer.links.pricing}
              </Link>
              <Link
                href={localePath(publicRoutes.blog)}
                className="hover:text-[var(--ink)]"
              >
                {contentCopy.navBlogs}
              </Link>
              <Link href={consoleUrl} className="hover:text-[var(--ink)]">
                {messages.footer.links.console}
              </Link>
            </div>
          </div>

          <div className="text-sm">
            <p className="font-semibold text-[var(--ink)]">
              {messages.footer.developers}
            </p>
            <div className="mt-3 flex flex-col gap-2 text-[var(--muted)]">
              <Link
                href={localePath(publicRoutes.docs)}
                className="hover:text-[var(--ink)]"
              >
                {messages.footer.links.apiDocs}
              </Link>
              <Link
                href={localePath(publicRoutes.playground)}
                className="hover:text-[var(--ink)]"
              >
                {contentCopy.navPlayground}
              </Link>
              <Link
                href={localePath(publicAnchorRoutes.api)}
                className="hover:text-[var(--ink)]"
              >
                {messages.footer.links.quickStart}
              </Link>
              <Link
                href={localePath(publicRoutes.templates)}
                className="hover:text-[var(--ink)]"
              >
                {messages.footer.links.templates}
              </Link>
            </div>
          </div>

          <div className="text-sm">
            <p className="font-semibold text-[var(--ink)]">
              {messages.footer.company}
            </p>
            <div className="mt-3 flex flex-col gap-2 text-[var(--muted)]">
              <Link
                href={localePath(publicRoutes.docs)}
                className="hover:text-[var(--ink)]"
              >
                {messages.footer.links.principles}
              </Link>
              <Link
                href={localePath(publicRoutes.compare)}
                className="hover:text-[var(--ink)]"
              >
                {messages.footer.links.system}
              </Link>
              <Link
                href={localePath(publicRoutes.docs)}
                className="hover:text-[var(--ink)]"
              >
                {messages.footer.links.status}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 text-xs text-[var(--muted)]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              {messages.footer.legal}
            </span>
            <Link
              href={localePath(publicRoutes.terms)}
              className="hover:text-[var(--ink)]"
            >
              {messages.footer.links.terms}
            </Link>
            <Link
              href={localePath(publicRoutes.privacy)}
              className="hover:text-[var(--ink)]"
            >
              {messages.footer.links.privacy}
            </Link>
            <Link
              href={localePath(publicRoutes.contentPolicy)}
              className="hover:text-[var(--ink)]"
            >
              {messages.footer.links.contentPolicy}
            </Link>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span>{messages.footer.rights}</span>
            <span>{messages.footer.tagline}</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
