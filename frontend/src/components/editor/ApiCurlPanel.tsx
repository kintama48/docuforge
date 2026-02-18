"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { env } from "@/src/config/env";
import { useEditorStore } from "@/src/stores/editor";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function ApiCurlPanel() {
  const templateId = useEditorStore((state) => state.templateId);
  const templateName = useEditorStore((state) => state.templateName);
  const dataString = useEditorStore((state) => state.dataString);
  const dataError = useEditorStore((state) => state.dataError);
  const publishedVersion = useEditorStore((state) => state.publishedVersion);
  const isDirty = useEditorStore((state) => state.isDirty);

  const parsedData = useMemo(() => {
    try {
      return JSON.parse(dataString || "{}");
    } catch {
      return {};
    }
  }, [dataString]);

  const payload = useMemo(
    () => ({
      template_id: templateId || "tpl_your_template_id",
      data: parsedData,
    }),
    [templateId, parsedData]
  );

  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const apiBaseUrl = env.apiUrl.replace(/\/+$/, "");

  const curlCommand = useMemo(
    () => `curl -X POST "${apiBaseUrl}/v1/render" \\
  -H "X-API-Key: \${DOCUFORGE_API_KEY:-docu_live_your_key}" \\
  -H "Content-Type: application/json" \\
  --data-binary @- \\
  --output "\${DOCUFORGE_OUTPUT:-output.pdf}" <<'JSON'
${payloadJson}
JSON`,
    [apiBaseUrl, payloadJson]
  );

  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--line)] bg-[var(--surface)]">
      <div className="border-b border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
        API quick start
      </div>
      <div className="flex-1 space-y-3 p-3">
        <p className="text-xs text-[var(--muted)]">
          Render and download PDF in one command from your terminal.
        </p>

        {!templateId && (
          <p className="rounded-md border border-[var(--warn)]/35 bg-[var(--warn)]/10 px-3 py-2 text-xs text-[var(--warn)]">
            Template ID is missing. Open a template first.
          </p>
        )}

        {Boolean(dataError) && (
          <p className="rounded-md border border-[var(--bad)]/35 bg-[var(--bad)]/10 px-3 py-2 text-xs text-[var(--bad)]">
            Data JSON is invalid. Command is using an empty object until fixed.
          </p>
        )}

        {publishedVersion === null && (
          <p className="rounded-md border border-[var(--warn)]/35 bg-[var(--warn)]/10 px-3 py-2 text-xs text-[var(--warn)]">
            This template is not published yet. Publish first before using
            production API render.
          </p>
        )}

        {isDirty && (
          <p className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
            You have unsaved editor changes. API render uses the last published
            version, not your local draft.
          </p>
        )}

        <pre className="max-h-72 overflow-auto rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs text-[var(--ink)]">
          <code>{curlCommand}</code>
        </pre>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => {
              await navigator.clipboard?.writeText(curlCommand);
              toast.success("curl command copied");
            }}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            Copy curl
          </button>
          <button
            onClick={() => {
              const filename = toSlug(templateName || "docuforge-render");
              const script = `#!/usr/bin/env bash
set -euo pipefail

${curlCommand}
`;
              const blob = new Blob([script], { type: "text/x-shellscript" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${filename}.sh`;
              link.click();
              URL.revokeObjectURL(url);
              toast.success("Script downloaded");
            }}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
          >
            Download .sh
          </button>
        </div>
      </div>
    </div>
  );
}
