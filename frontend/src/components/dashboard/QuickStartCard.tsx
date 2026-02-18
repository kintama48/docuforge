"use client";

import { useApiKeys } from "@/src/hooks/use-api-keys";
import { useI18n } from "@/src/lib/i18n";

export function QuickStartCard() {
  const { messages } = useI18n();
  const { data } = useApiKeys();
  const keyPrefix = data?.keys?.[0]?.prefix || "docu_live_...";
  const apiKeyPlaceholder = "${DOCUFORGE_API_KEY:-docu_live_your_key}";

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-dim)]">
        {messages.dashboard.quickStartLabel}
      </p>
      <p className="mt-3 text-sm text-[var(--ink)]">
        {messages.dashboard.apiKeyPrefixLabel}
      </p>
      <div className="mt-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
        {keyPrefix}
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-[var(--surface-2)] p-3 text-xs text-[var(--muted)]">
        <code>{`curl -X POST "$DOCUFORGE_API_URL/v1/render" \\
  -H "X-API-Key: ${apiKeyPlaceholder}" \\
  -H "Content-Type: application/json" \\
  -d '{ "template_id": "tpl_123", "data": {} }'`}</code>
      </pre>
    </div>
  );
}
