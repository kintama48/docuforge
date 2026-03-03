"use client";

import Link from "next/link";
import { SignOut } from "@phosphor-icons/react";
import { useAuthStore } from "@/src/stores/auth";
import { ThemeToggle } from "@/src/app/components/theme-toggle";

export function TopBar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-2)] px-6 py-4">
      <div>
        <p className="text-sm text-[var(--muted)]">Welcome back</p>
        <p className="text-base font-semibold text-[var(--ink)]">
          {user?.email || "developer@docuforge.dev"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          {user?.plan || "free"} plan
        </span>
        <ThemeToggle />
        <Link
          href="/docs"
          className="btn btn-secondary btn-sm"
        >
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
    </header>
  );
}
