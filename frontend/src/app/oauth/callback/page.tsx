"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { env } from "@/src/config/env";
import { useAuthStore } from "@/src/stores/auth";
import { useOnboardingStore } from "@/src/stores/onboarding";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams?.get("code");
    if (!code) {
      router.replace("/login?error=oauth_failed");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`${env.apiUrl}/v1/auth/oauth/exchange`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error("OAuth exchange failed");
        }

        const data = (await response.json()) as {
          token: string;
          user: {
            id: string;
            email: string;
            plan: "free" | "dev" | "starter" | "pro";
          };
          api_key?: string;
          redirect?: string;
        };

        if (cancelled || !data?.token || !data?.user) {
          return;
        }

        useAuthStore.getState().login(data.token, data.user);

        if (data.api_key) {
          useOnboardingStore.getState().setApiKey(data.api_key);
          router.replace("/onboarding");
          return;
        }

        router.replace(data.redirect || "/dashboard");
      } catch {
        if (!cancelled) {
          router.replace("/login?error=oauth_failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] text-xs text-[#a1a1aa]">
      Signing you in…
    </div>
  );
}
