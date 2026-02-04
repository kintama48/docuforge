"use client";

import { useApiKeys } from "@/src/hooks/use-api-keys";
import { useI18n } from "@/src/lib/i18n";

export function QuickStartCard() {
  const { messages } = useI18n();
  const { data } = useApiKeys();
  const key = data?.keys?.[0]?.prefix || "docu_live_...";

  return (
    <div className="rounded-2xl border border-[#27272a] bg-[#111113] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[#71717a]">
        {messages.dashboard.quickStartLabel}
      </p>
      <p className="mt-3 text-sm text-white">
        {messages.dashboard.apiKeyPrefixLabel}
      </p>
      <div className="mt-2 rounded-lg bg-[#0f1117] px-3 py-2 text-xs text-[#a1a1aa]">
        {key}
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-[#0f1117] p-3 text-xs text-[#a1a1aa]">
        <code>{`curl -X POST "$DOCUFORGE_API_URL/v1/render" \\
  -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{ "template_id": "tpl_123", "data": {} }'`}</code>
      </pre>
    </div>
  );
}
