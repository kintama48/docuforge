"use client";

import Link from "next/link";
import { X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/src/components/brand/BrandLogo";
import { useAuthStore } from "@/src/stores/auth";
import { consoleNavItems } from "@/src/components/layout/Sidebar";
import { cn } from "@/src/lib/utils";

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const logout = useAuthStore((state) => state.logout);
  const pathname = usePathname();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        className="absolute inset-0 bg-[rgba(15,17,21,0.35)]"
        onClick={onClose}
      />
      <aside className="relative h-full max-w-[20rem] border-r border-[var(--line)] bg-[var(--surface)] px-4 py-5 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <span className="flex items-center gap-3">
            <BrandLogo className="h-9 w-9 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-1.5" />
            <span>
              <span className="block text-sm font-semibold text-[var(--ink)]">
                DocuForge
              </span>
              <span className="block text-xs text-[var(--muted-dim)]">
                Developer Console
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-6 grid gap-2">
          {consoleNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                  active
                    ? "bg-[var(--surface-active)] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/docs"
            onClick={onClose}
            className="flex items-center rounded-xl px-3 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
          >
            Docs
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => {
            logout();
            onClose();
          }}
          className="mt-6 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-3 text-sm font-semibold text-[var(--ink)]"
        >
          Log out
        </button>
      </aside>
    </div>
  );
}
