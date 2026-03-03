"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { collectLowCodeFields, inferLowCodeDefaults } from "@/src/lib/low-code";
import {
  buildSampleDataFromPaths,
  extractDynamicFieldPathsFromSource,
} from "@/src/lib/template-fields";
import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";
import { useTheme } from "@/src/lib/theme";

export function DataEditor() {
  const { messages } = useI18n();
  const { resolvedTheme } = useTheme();
  const dataString = useEditorStore((state) => state.dataString);
  const dataError = useEditorStore((state) => state.dataError);
  const setData = useEditorStore((state) => state.setData);
  const source = useEditorStore((state) => state.source);
  const lowCodeSpec = useEditorStore((state) => state.lowCodeSpec);

  const Monaco = useMemo(
    () => dynamic(() => import("@monaco-editor/react"), { ssr: false }),
    []
  );
  const monacoTheme = resolvedTheme === "dark" ? "docuforge-dark" : "vs";
  const detectedFields = useMemo(() => {
    if (lowCodeSpec) return collectLowCodeFields(lowCodeSpec);
    return extractDynamicFieldPathsFromSource(source);
  }, [lowCodeSpec, source]);

  const samplePayload = useMemo(() => {
    if (lowCodeSpec) return inferLowCodeDefaults(lowCodeSpec);
    return buildSampleDataFromPaths(detectedFields);
  }, [detectedFields, lowCodeSpec]);

  return (
    <div
      className={`flex h-full flex-col rounded-lg border bg-[var(--surface)] ${
        dataError ? "border-[var(--bad)]" : "border-[var(--line)]"
      }`}
    >
      <div className="border-b border-[var(--line)] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)]">{messages.editor.dataTitle}</p>
          {detectedFields.length > 0 && (
            <button
              onClick={() => setData(JSON.stringify(samplePayload, null, 2))}
              className="rounded-md border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--ink)] hover:border-[var(--line-hover)]"
            >
              Generate sample JSON
            </button>
          )}
        </div>
        {detectedFields.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {detectedFields.slice(0, 8).map((field) => (
              <span
                key={field}
                className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
              >
                {field}
              </span>
            ))}
            {detectedFields.length > 8 && (
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                +{detectedFields.length - 8} more
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex-1">
        <Monaco
          height="100%"
          language="json"
          theme={monacoTheme}
          value={dataString}
          onChange={(val) => {
            setData(val ?? "{}");
          }}
          options={{
            fontSize: 12,
            minimap: { enabled: false },
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </div>
      {dataError && (
        <div className="border-t border-[var(--line)] px-3 py-2 text-xs text-[var(--bad)]">
          {dataError}
        </div>
      )}
    </div>
  );
}
