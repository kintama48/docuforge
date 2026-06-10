"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { env } from "@/src/config/env";
import type { TemplateDetail } from "@/src/lib/api-types";

type Props = {
  template: TemplateDetail;
};

export function TemplateCurlSnippet({ template }: Props) {
  const [copied, setCopied] = useState(false);

  const sampleData = useMemo(() => {
    const defaults = template.live_version?.defaults;
    if (defaults && typeof defaults === "object" && Object.keys(defaults).length > 0) {
      return defaults;
    }
    return {};
  }, [template.live_version]);

  const hasSampleData =
    template.live_version?.defaults != null &&
    Object.keys(template.live_version.defaults).length > 0;

  const apiBaseUrl = env.apiUrl.replace(/\/+$/, "");

  const payload = useMemo(
    () => ({
      template_id: template.id,
      data: sampleData,
    }),
    [template.id, sampleData]
  );

  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const curlCommand = useMemo(
    () =>
      `curl -X POST "${apiBaseUrl}/v1/render" \\
  -H "X-API-Key: \${DOCUFORGE_API_KEY}" \\
  -H "Content-Type: application/json" \\
  --output "output.pdf" \\
  --data-binary @- <<'JSON'
${payloadJson}
JSON`,
    [apiBaseUrl, payloadJson]
  );

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(curlCommand);
    setCopied(true);
    toast.success("curl command copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-t border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--muted)]">
          API curl snippet
          {!hasSampleData && (
            <span className="ml-2 text-[var(--muted-dim)]">
              (no sample data — fill in &quot;data&quot; before running)
            </span>
          )}
        </p>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
        >
          {copied ? "Copied!" : "Copy curl"}
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-xs text-[var(--ink)]">
        <code>{curlCommand}</code>
      </pre>
    </div>
  );
}
