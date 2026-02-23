"use client";

import Link from "next/link";
import { useI18n } from "@/src/lib/i18n";
import { getConsoleLocaleUrl } from "@/src/lib/urls";
import { useLocalePath } from "@/src/lib/use-locale-path";
import { getContentHubCopy } from "@/src/lib/content-hub";
import { BrandLogo } from "@/src/components/brand/BrandLogo";

export function SiteFooter() {
  const { messages, locale } = useI18n();
  const contentCopy = getContentHubCopy(locale);
  const localePath = useLocalePath();
  const consoleUrl = getConsoleLocaleUrl("/dashboard", locale);
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-12 xl:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo className="h-10 w-10 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-1.5" />
              <div className="flex flex-col leading-none">
                <span className="font-display text-[1.3rem] tracking-tight text-[var(--ink)]">
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
              <Link href={localePath("/#features")} className="hover:text-[var(--ink)]">
                {messages.footer.links.features}
              </Link>
              <Link href={localePath("/#workflow")} className="hover:text-[var(--ink)]">
                {messages.footer.links.workflow}
              </Link>
              <Link href={localePath("/pricing")} className="hover:text-[var(--ink)]">
                {messages.footer.links.pricing}
              </Link>
              <Link href={localePath("/blog")} className="hover:text-[var(--ink)]">
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
              <Link href={localePath("/docs")} className="hover:text-[var(--ink)]">
                {messages.footer.links.apiDocs}
              </Link>
              <Link href={localePath("/playground")} className="hover:text-[var(--ink)]">
                {contentCopy.navPlayground}
              </Link>
              <Link href={localePath("/#api")} className="hover:text-[var(--ink)]">
                {messages.footer.links.quickStart}
              </Link>
              <Link href={localePath("/templates")} className="hover:text-[var(--ink)]">
                {messages.footer.links.templates}
              </Link>
            </div>
          </div>

          <div className="text-sm">
            <p className="font-semibold text-[var(--ink)]">
              {messages.footer.company}
            </p>
            <div className="mt-3 flex flex-col gap-2 text-[var(--muted)]">
              <Link href={localePath("/docs")} className="hover:text-[var(--ink)]">
                {messages.footer.links.principles}
              </Link>
              <Link href={localePath("/compare")} className="hover:text-[var(--ink)]">
                {messages.footer.links.system}
              </Link>
              <Link href={localePath("/docs")} className="hover:text-[var(--ink)]">
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
            <Link href={localePath("/terms")} className="hover:text-[var(--ink)]">
              {messages.footer.links.terms}
            </Link>
            <Link href={localePath("/privacy")} className="hover:text-[var(--ink)]">
              {messages.footer.links.privacy}
            </Link>
            <Link href={localePath("/content-policy")} className="hover:text-[var(--ink)]">
              {messages.footer.links.contentPolicy}
            </Link>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span>{messages.footer.rights}</span>
            <span>{messages.footer.tagline}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
