"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";

export function DataEditor() {
  const { messages } = useI18n();
  const dataString = useEditorStore((state) => state.dataString);
  const dataError = useEditorStore((state) => state.dataError);
  const setData = useEditorStore((state) => state.setData);

  const Monaco = useMemo(
    () => dynamic(() => import("@monaco-editor/react"), { ssr: false }),
    []
  );

  return (
    <div
      className={`flex h-full flex-col rounded-lg border bg-[#111113] ${
        dataError ? "border-[#ef4444]" : "border-[#27272a]"
      }`}
    >
      <div className="border-b border-[#27272a] px-3 py-2 text-xs text-[#a1a1aa]">
        {messages.editor.dataTitle}
      </div>
      <div className="flex-1">
        <Monaco
          height="100%"
          language="json"
          theme="docuforge-dark"
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
        <div className="border-t border-[#27272a] px-3 py-2 text-xs text-[#ef4444]">
          {dataError}
        </div>
      )}
    </div>
  );
}
