"use client";

import { AppShell } from "@/src/components/layout/AppShell";
import { ProtectedRoute } from "@/src/components/auth/ProtectedRoute";
import { useUsage } from "@/src/hooks/use-usage";
import { useAuthStore } from "@/src/stores/auth";
import { useCreateCheckout } from "@/src/hooks/use-billing";
import { ProfileSection } from "@/src/components/settings/ProfileSection";
import { UsageSection } from "@/src/components/settings/UsageSection";
import { ApiKeySection } from "@/src/components/settings/ApiKeySection";
import { QuickStartGuide } from "@/src/components/settings/QuickStartGuide";
import { PlanSection } from "@/src/components/settings/PlanSection";
import { toast } from "sonner";
import { useI18n } from "@/src/lib/i18n";
import { env } from "@/src/config/env";

export default function SettingsPage() {
  const { messages } = useI18n();
  const { data: usage } = useUsage();
  const user = useAuthStore((state) => state.user);
  const createCheckout = useCreateCheckout();
  const billingEnabled = env.billingEnabled && env.billingProvider !== "none";
  const portalUrl = env.billingPortalUrl;

  const handleUpgrade = (plan: "starter" | "pro") => {
    if (!billingEnabled) {
      toast.info("Billing is currently disabled.");
      return;
    }
    createCheckout.mutate({ plan });
  };

  const handleManage = () => {
    if (!billingEnabled) {
      toast.info("Billing is currently disabled.");
      return;
    }
    if (portalUrl) {
      window.location.href = portalUrl;
      return;
    }
    toast.info(messages.settings.portalNotConfigured);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="max-w-5xl space-y-10">
          <ProfileSection
            email={user?.email}
            plan={user?.plan}
            billingEnabled={billingEnabled}
            onUpgrade={handleUpgrade}
            onManage={handleManage}
          />
          <PlanSection
            plan={user?.plan}
            billingEnabled={billingEnabled}
            onUpgrade={handleUpgrade}
            onManage={handleManage}
          />
          <UsageSection usage={usage} />
          <ApiKeySection />
          <QuickStartGuide />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
