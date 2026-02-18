"use client";

import Link from "next/link";
import { useAuthStore } from "@/src/stores/auth";
import { ThemeToggle } from "@/src/app/components/theme-toggle";

export function TopBar() {
  const user = useAuthStore((state) => state.user);

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
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--line-hover)]"
        >
          Docs
        </Link>
      </div>
    </header>
  );
}
