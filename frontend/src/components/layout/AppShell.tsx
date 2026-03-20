"use client";

import { ReactNode, useState } from "react";
import { MobileNav } from "@/src/components/layout/MobileNav";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { TopBar } from "@/src/components/layout/TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <TopBar onOpenNavigation={() => setMobileNavOpen(true)} />
          <main className="page-shell-console flex-1 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
