"use client";

import { useState } from "react";
import { AppShell } from "@/src/components/layout/AppShell";
import { ProtectedRoute } from "@/src/components/auth/ProtectedRoute";
import { UsageCard } from "@/src/components/dashboard/UsageCard";
import { QuickStartCard } from "@/src/components/dashboard/QuickStartCard";
import { TemplateGrid } from "@/src/components/dashboard/TemplateGrid";
import { OfficialTemplateGallery } from "@/src/components/dashboard/OfficialTemplateGallery";
import { CreateTemplateDialog } from "@/src/components/dashboard/CreateTemplateDialog";
import { useI18n } from "@/src/lib/i18n";

export default function DashboardPage() {
  const { messages } = useI18n();
  const [openCreate, setOpenCreate] = useState(false);
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="grid gap-6">
          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <UsageCard />
            <QuickStartCard />
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {messages.dashboard.myTemplates}
              </h2>
              <button
                onClick={() => setOpenCreate(true)}
                className="rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
              >
                {messages.dashboard.createTemplate}
              </button>
            </div>
            <div className="mt-4">
              <TemplateGrid />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {messages.dashboard.officialTemplates}
              </h2>
            </div>
            <div className="mt-4">
              <OfficialTemplateGallery />
            </div>
          </section>
        </div>
        <CreateTemplateDialog
          open={openCreate}
          onClose={() => setOpenCreate(false)}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
