"use client";

import Link from "next/link";

export function MobileNav() {
  return (
    <nav className="flex items-center justify-between border-b border-[#27272a] bg-[#0f1117] px-4 py-3 lg:hidden">
      <span className="text-sm font-semibold text-white">DocuForge</span>
      <div className="flex items-center gap-3 text-sm text-[#a1a1aa]">
        <Link href="/dashboard" className="hover:text-white">
          Dashboard
        </Link>
        <Link href="/settings" className="hover:text-white">
          Settings
        </Link>
      </div>
    </nav>
  );
}
