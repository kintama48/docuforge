"use client";

import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/src/lib/i18n";
import { getConsoleLocaleUrl } from "@/src/lib/urls";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { useLocalePath } from "@/src/lib/use-locale-path";
import { getContentHubCopy } from "@/src/lib/content-hub";
import { BrandLogo } from "@/src/components/brand/BrandLogo";
import { Container } from "@/src/components/layout/page-primitives";
import {
  publicAnchorRoutes,
  publicRoutes,
} from "@/src/lib/public-route-contract";
import { cn } from "@/src/lib/utils";

export function SiteHeader() {
  const { messages, locale } = useI18n();
  const contentCopy = getContentHubCopy(locale);
  const localePath = useLocalePath();
  const consoleUrl = getConsoleLocaleUrl("/dashboard", locale);
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: localePath(publicAnchorRoutes.features), label: messages.nav.features },
    { href: localePath(publicAnchorRoutes.workflow), label: messages.nav.workflow },
    { href: localePath(publicRoutes.pricing), label: messages.nav.pricing },
    { href: localePath(publicRoutes.docs), label: messages.nav.docs },
    { href: localePath(publicAnchorRoutes.api), label: messages.nav.api },
    {
      href: localePath(publicRoutes.blog),
      label: contentCopy.navBlogs,
      desktopOnly: true,
    },
    {
      href: localePath(publicRoutes.playground),
      label: contentCopy.navPlayground,
      desktopOnly: true,
    },
  ];
  const visibleNavLinks = navLinks.filter((item) => !item.desktopOnly);
  const extraNavLinks = navLinks.filter((item) => item.desktopOnly);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur">
      <Container width="marketing" className="flex items-center gap-3 py-3">
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

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]",
                item.desktopOnly ? "hidden 2xl:inline-flex" : "inline-flex"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href={localePath(publicRoutes.docs)}
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

        <button
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="site-header-menu"
          onClick={() => setMenuOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] transition hover:border-[var(--line-hover)] xl:hidden"
        >
          {menuOpen ? <X className="h-4 w-4" /> : <List className="h-4 w-4" />}
        </button>
      </Container>

      {menuOpen ? (
        <div id="site-header-menu" className="border-t border-[var(--line)] bg-[var(--surface)] xl:hidden">
          <Container width="marketing" className="grid gap-6 py-4">
            <nav className="grid gap-2">
              {visibleNavLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--line-hover)] hover:bg-[var(--surface-2)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {extraNavLinks.length > 0 ? (
              <div className="grid gap-2">
                {extraNavLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--line-hover)] hover:bg-[var(--surface-2)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="flex flex-wrap items-center gap-3">
                <LocaleSwitcher />
                <ThemeToggle />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={localePath(publicRoutes.docs)}
                  onClick={() => setMenuOpen(false)}
                  className="btn btn-secondary"
                >
                  {messages.nav.readDocs}
                </Link>
                <Link
                  href={consoleUrl}
                  onClick={() => setMenuOpen(false)}
                  className="btn btn-primary"
                >
                  {messages.nav.openConsole}
                </Link>
              </div>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
