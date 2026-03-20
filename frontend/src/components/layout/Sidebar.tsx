"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, GearSix, SquaresFour } from "@phosphor-icons/react";
import { cn } from "@/src/lib/utils";
import { BrandLogo } from "@/src/components/brand/BrandLogo";

export const consoleNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
  { href: "/editor", label: "Editor", icon: FileText },
  { href: "/settings", label: "Settings", icon: GearSix },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden w-60 border-r border-[var(--line)] bg-[var(--surface-2)] px-4 py-6 lg:block",
        className
      )}
    >
      <div className="flex items-center gap-3 px-2">
        <BrandLogo className="h-10 w-10" />
        <div>
          <p className="text-sm font-semibold">DocuForge</p>
          <p className="text-xs text-[var(--muted-dim)]">Developer Console</p>
        </div>
      </div>

      <nav className="mt-10 flex flex-col gap-2">
        {consoleNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
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
      </nav>
    </aside>
  );
}
