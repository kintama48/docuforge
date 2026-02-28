"use client";

import { LowCodeBlocksEditor } from "@/src/components/editor/LowCodeBlocksEditor";
import { useEditorStore } from "@/src/stores/editor";

export function LowCodeBlocksPanel() {
  const lowCodeSpec = useEditorStore((state) => state.lowCodeSpec);
  const setLowCodeSpec = useEditorStore((state) => state.setLowCodeSpec);

  return <LowCodeBlocksEditor lowCodeSpec={lowCodeSpec} onChange={setLowCodeSpec} />;
}
