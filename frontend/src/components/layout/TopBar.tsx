"use client";

import Link from "next/link";
import { List, SignOut } from "@phosphor-icons/react";
import { useAuthStore } from "@/src/stores/auth";
import { ThemeToggle } from "@/src/app/components/theme-toggle";

export function TopBar({
  onOpenNavigation,
}: {
  onOpenNavigation: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="border-b border-[var(--line)] bg-[var(--surface-2)]">
      <div className="page-shell-console flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onOpenNavigation}
              aria-label="Open navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] lg:hidden"
            >
              <List className="h-4 w-4" />
            </button>
            <div>
              <p className="text-sm text-[var(--muted)]">Welcome back</p>
              <p className="break-all text-base font-semibold text-[var(--ink)] sm:break-normal">
                {user?.email || "developer@docuforge.dev"}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)] sm:hidden">
            {user?.plan || "free"} plan
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="hidden rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)] sm:inline-flex">
            {user?.plan || "free"} plan
          </span>
          <ThemeToggle />
          <Link href="/docs" className="btn btn-secondary btn-sm">
            Docs
          </Link>
          <button
            type="button"
            onClick={logout}
            className="btn btn-secondary btn-sm"
            aria-label="Log out"
          >
            <SignOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
