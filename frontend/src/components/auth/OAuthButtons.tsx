"use client";

import { useSearchParams } from "next/navigation";
import {
  GithubLogo,
  GoogleLogo,
  WindowsLogo,
} from "@phosphor-icons/react";
import { env } from "@/src/config/env";
import { useI18n } from "@/src/lib/i18n";
import { sanitizeAppRedirect } from "@/src/lib/redirect";

const providers = [
  { id: "google", icon: GoogleLogo, iconClassName: "text-[#fbbc05]" },
  { id: "microsoft", icon: WindowsLogo, iconClassName: "text-[#00a4ef]" },
  { id: "github", icon: GithubLogo, iconClassName: "text-white" },
] as const;

export function OAuthButtons() {
  const searchParams = useSearchParams();
  const { messages } = useI18n();
  const redirect = sanitizeAppRedirect(searchParams?.get("redirect"), "/dashboard");
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
            const url = new URL(`${env.apiUrl}/console/auth/oauth/${provider.id}`);
            url.searchParams.set("redirect", redirect);
            window.location.href = url.toString();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-[#27272a] bg-[#0f1117] px-3 py-2 text-xs text-white transition hover:border-[#3f3f46]"
        >
          <provider.icon
            className={`h-4 w-4 shrink-0 ${provider.iconClassName}`}
            aria-hidden="true"
            weight="fill"
          />
          {labels[provider.id]}
        </button>
      ))}
    </div>
  );
}
