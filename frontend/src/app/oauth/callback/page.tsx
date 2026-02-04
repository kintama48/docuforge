"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/src/stores/auth";
import { useOnboardingStore } from "@/src/stores/onboarding";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams?.get("token");
    const userId = searchParams?.get("user_id");
    const email = searchParams?.get("email");
    const plan = (searchParams?.get("plan") as
      | "free"
      | "starter"
      | "pro"
      | null) ?? "free";
    const apiKey = searchParams?.get("api_key");
    const redirect = searchParams?.get("redirect") || "/dashboard";

    if (!token || !userId || !email) {
      router.replace("/login?error=oauth_failed");
      return;
    }

    useAuthStore.getState().login(token, { id: userId, email, plan });

    if (apiKey) {
      useOnboardingStore.getState().setApiKey(apiKey);
      router.replace("/onboarding");
      return;
    }

    router.replace(redirect);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] text-xs text-[#a1a1aa]">
      Signing you in…
    </div>
  );
}
