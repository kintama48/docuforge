"use client";

import Link from "next/link";
import { useI18n } from "@/src/lib/i18n";
import { getConsoleLocaleUrl } from "@/src/lib/urls";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { useLocalePath } from "@/src/lib/use-locale-path";
import { getContentHubCopy } from "@/src/lib/content-hub";
import { BrandLogo } from "@/src/components/brand/BrandLogo";

export function SiteHeader() {
  const { messages, locale } = useI18n();
  const contentCopy = getContentHubCopy(locale);
  const localePath = useLocalePath();
  const consoleUrl = getConsoleLocaleUrl("/dashboard", locale);

  const navLinks = [
    { href: localePath("/#features"), label: messages.nav.features },
    { href: localePath("/#workflow"), label: messages.nav.workflow },
    { href: localePath("/pricing"), label: messages.nav.pricing },
    { href: localePath("/docs"), label: messages.nav.docs },
    { href: localePath("/#api"), label: messages.nav.api },
    {
      href: localePath("/blog"),
      label: contentCopy.navBlogs,
      desktopOnly: true,
    },
    {
      href: localePath("/playground"),
      label: contentCopy.navPlayground,
      desktopOnly: true,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-6 py-3 xl:px-8">
        <Link href={localePath("/")} className="flex shrink-0 items-center gap-3">
          <BrandLogo className="h-10 w-10 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-sm" priority />
          <span className="flex flex-col leading-none">
            <span className="text-[1.2rem] font-semibold tracking-tight text-[var(--ink)]">
              DocuForge
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)] md:block">
              Developer console
            </span>
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)] ${item.desktopOnly ? "hidden xl:inline-flex" : "inline-flex"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href={localePath("/docs")}
              className="btn btn-secondary btn-sm"
            >
              {messages.nav.readDocs}
            </Link>
            <Link
              href={consoleUrl}
              className="btn btn-primary btn-sm"
            >
              {messages.nav.openConsole}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
