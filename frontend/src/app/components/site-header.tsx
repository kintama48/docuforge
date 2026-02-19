"use client";

import Link from "next/link";
import { useI18n } from "@/src/lib/i18n";
import { getConsoleLocaleUrl } from "@/src/lib/urls";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { useLocalePath } from "@/src/lib/use-locale-path";
import { getContentHubCopy } from "@/src/lib/content-hub";

export function SiteHeader() {
  const { messages, locale } = useI18n();
  const contentCopy = getContentHubCopy(locale);
  const localePath = useLocalePath();
  const consoleUrl = getConsoleLocaleUrl("/dashboard", locale);
  return (
    <header className="border-b border-[var(--line)] bg-[var(--bg)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href={localePath("/")} className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] font-display text-xs tracking-[0.2em] text-[var(--muted)]">
            DF
          </span>
          <span className="font-display text-lg text-[var(--ink)]">
            DocuForge
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
          <Link href={localePath("/#features")} className="hover:text-[var(--ink)]">
            {messages.nav.features}
          </Link>
          <Link href={localePath("/#workflow")} className="hover:text-[var(--ink)]">
            {messages.nav.workflow}
          </Link>
          <Link href={localePath("/pricing")} className="hover:text-[var(--ink)]">
            {messages.nav.pricing}
          </Link>
          <Link href={localePath("/docs")} className="hover:text-[var(--ink)]">
            {messages.nav.docs}
          </Link>
          <Link href={localePath("/blog")} className="hover:text-[var(--ink)]">
            {contentCopy.navBlogs}
          </Link>
          <Link href={localePath("/playground")} className="hover:text-[var(--ink)]">
            {contentCopy.navPlayground}
          </Link>
          <Link href={localePath("/#api")} className="hover:text-[var(--ink)]">
            {messages.nav.api}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <ThemeToggle />
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href={localePath("/docs")}
              className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
            >
              {messages.nav.readDocs}
            </Link>
            <Link
              href={consoleUrl}
              className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              {messages.nav.openConsole}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
