"use client";

import Link from "next/link";
import { useAuthStore } from "@/src/stores/auth";

export function TopBar() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="flex items-center justify-between border-b border-[#27272a] bg-[#0f1117] px-6 py-4">
      <div>
        <p className="text-sm text-[#a1a1aa]">Welcome back</p>
        <p className="text-base font-semibold text-white">
          {user?.email || "developer@docuforge.dev"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-[#27272a] bg-[#111113] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#a1a1aa]">
          {user?.plan || "free"} plan
        </span>
        <Link
          href="/docs"
          className="rounded-md border border-[#27272a] px-3 py-2 text-sm text-white transition hover:border-[#3f3f46]"
        >
          Docs
        </Link>
      </div>
    </header>
  );
}
