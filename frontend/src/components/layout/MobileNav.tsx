"use client";

import Link from "next/link";
import { BrandLogo } from "@/src/components/brand/BrandLogo";
import { useAuthStore } from "@/src/stores/auth";

export function MobileNav() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <nav className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 lg:hidden">
      <span className="flex items-center gap-2">
        <BrandLogo className="h-7 w-7" />
        <span className="text-sm font-semibold text-[var(--ink)]">DocuForge</span>
      </span>
      <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
        <Link href="/dashboard" className="hover:text-[var(--ink)]">
          Dashboard
        </Link>
        <Link href="/settings" className="hover:text-[var(--ink)]">
          Settings
        </Link>
        <button type="button" onClick={logout} className="hover:text-[var(--ink)]">
          Log out
        </button>
      </div>
    </nav>
  );
}
