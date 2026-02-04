"use client";

import { useSearchParams } from "next/navigation";
import { env } from "@/src/config/env";
import { useI18n } from "@/src/lib/i18n";

const providers = [
  { id: "google" },
  { id: "microsoft" },
  { id: "github" },
] as const;

export function OAuthButtons() {
  const searchParams = useSearchParams();
  const { messages } = useI18n();
  const redirect = searchParams?.get("redirect") || "/dashboard";
  const labels: Record<(typeof providers)[number]["id"], string> = {
    google: messages.auth.oauthGoogle,
    microsoft: messages.auth.oauthMicrosoft,
    github: messages.auth.oauthGithub,
  };

  return (
    <div className="grid gap-2">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => {
            const url = new URL(`${env.apiUrl}/v1/auth/oauth/${provider.id}`);
            url.searchParams.set("redirect", redirect);
            window.location.href = url.toString();
          }}
          className="w-full rounded-md border border-[#27272a] bg-[#0f1117] px-3 py-2 text-xs text-white transition hover:border-[#3f3f46]"
        >
          {labels[provider.id]}
        </button>
      ))}
    </div>
  );
}
