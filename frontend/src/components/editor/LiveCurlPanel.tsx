"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { env } from "@/src/config/env";
import { useEditorStore } from "@/src/stores/editor";

/**
 * KAN-31: Shows a copy-paste curl snippet below the PDF preview after the
 * first successful render. Uses the user's CURRENT data JSON (live state),
 * not the template's stored defaults — the "aha moment" integration hook.
 */
export function LiveCurlPanel() {
  const renderCount = useEditorStore((state) => state.renderCount);
  const templateId = useEditorStore((state) => state.templateId);
  const dataString = useEditorStore((state) => state.dataString);
  const dataError = useEditorStore((state) => state.dataError);

  const [expanded, setExpanded] = useState(false);

  // Only show after at least one successful render
  if (renderCount === 0) return null;

  return (
    <LiveCurlPanelInner
      templateId={templateId}
      dataString={dataString}
      dataError={dataError}
      expanded={expanded}
      onToggle={() => setExpanded((prev) => !prev)}
    />
  );
}

type InnerProps = {
  templateId: string | null;
  dataString: string;
  dataError: string | null;
  expanded: boolean;
  onToggle: () => void;
};

function LiveCurlPanelInner({
  templateId,
  dataString,
  dataError,
  expanded,
  onToggle,
}: InnerProps) {
  const parsedData = useMemo(() => {
    try {
      return JSON.parse(dataString || "{}");
    } catch {
      return {};
    }
  }, [dataString]);

  const payload = useMemo(
    () => ({
      template_id: templateId ?? "tpl_your_template_id",
      data: parsedData,
    }),
    [templateId, parsedData]
  );

  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const apiBaseUrl = env.apiUrl.replace(/\/+$/, "");

  const curlCommand = useMemo(
    () =>
      `curl -X POST "${apiBaseUrl}/v1/render" \\
  -H "X-API-Key: \${DOCUFORGE_API_KEY:-docu_live_your_key}" \\
  -H "Content-Type: application/json" \\
  --data-binary @- \\
  --output "\${DOCUFORGE_OUTPUT:-output.pdf}" <<'JSON'
${payloadJson}
JSON`,
    [apiBaseUrl, payloadJson]
  );

  return (
    <div className="mt-2 rounded-lg border border-[var(--line)] bg-[var(--surface)]">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
      >
        <span className="font-medium">Run this render via API</span>
        <span className="select-none">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-[var(--line)] px-3 pb-3 pt-2">
          {Boolean(dataError) && (
            <p className="rounded-md border border-[var(--bad)]/35 bg-[var(--bad)]/10 px-2 py-1.5 text-xs text-[var(--bad)]">
              Data JSON is invalid — snippet uses an empty object.
            </p>
          )}
          <pre className="max-h-56 overflow-auto rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-2 text-xs text-[var(--ink)]">
            <code>{curlCommand}</code>
          </pre>
          <button
            onClick={async () => {
              await navigator.clipboard?.writeText(curlCommand);
              toast.success("curl command copied");
            }}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            Copy curl
          </button>
        </div>
      )}
    </div>
  );
}
