"use client";

import { AppShell } from "@/src/components/layout/AppShell";
import { ProtectedRoute } from "@/src/components/auth/ProtectedRoute";
import { useApiKeys } from "@/src/hooks/use-api-keys";
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

export default function SettingsPage() {
  const { messages } = useI18n();
  const { data: usage } = useUsage();
  const { data: keys } = useApiKeys();
  const user = useAuthStore((state) => state.user);
  const createCheckout = useCreateCheckout();
  const apiKey = keys?.keys?.[0]?.prefix || "docu_live_...";
  const portalUrl = process.env.NEXT_PUBLIC_STRIPE_PORTAL_URL;

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="max-w-5xl space-y-10">
          <ProfileSection
            email={user?.email}
            plan={user?.plan}
            onUpgrade={(plan) => createCheckout.mutate({ plan })}
            onManage={() => {
              if (portalUrl) {
                window.location.href = portalUrl;
                return;
              }
              toast.info(messages.settings.portalNotConfigured);
            }}
          />
          <PlanSection
            plan={user?.plan}
            onUpgrade={(plan) => createCheckout.mutate({ plan })}
            onManage={() => {
              if (portalUrl) {
                window.location.href = portalUrl;
                return;
              }
              toast.info(messages.settings.portalNotConfigured);
            }}
          />
          <UsageSection usage={usage} />
          <ApiKeySection />
          <QuickStartGuide apiKey={apiKey} />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
