"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutGrid, Settings } from "lucide-react";
import { cn } from "@/src/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/editor/demo", label: "Editor", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 border-r border-[#27272a] bg-[#0f1117] px-4 py-6 lg:block">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#27272a] text-xs font-semibold tracking-[0.2em] text-[#a1a1aa]">
          DF
        </div>
        <div>
          <p className="text-sm font-semibold">DocuForge</p>
          <p className="text-xs text-[#71717a]">Developer Console</p>
        </div>
      </div>

      <nav className="mt-10 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-[#1a1a1f] text-white"
                  : "text-[#a1a1aa] hover:bg-[#14161d] hover:text-white"
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
