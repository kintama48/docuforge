"use client";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { AssetPanel } from "@/src/components/editor/AssetPanel";
import { DataEditor } from "@/src/components/editor/DataEditor";
import { DiagnosticsPanel } from "@/src/components/editor/DiagnosticsPanel";
import { FileExplorer } from "@/src/components/editor/FileExplorer";
import { EditorPowerBar } from "@/src/components/editor/EditorToolbar";
import { MonacoEditor } from "@/src/components/editor/MonacoEditor";
import { PdfPreview } from "@/src/components/editor/PdfPreview";
import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";

type EditorLayoutProps = {
  activeTab: "preview" | "data" | "diag";
  onTabChange: (tab: "preview" | "data" | "diag") => void;
  showSidebar: boolean;
  showRightPane: boolean;
  onOpenAi: () => void;
};

export function EditorLayout({
  activeTab,
  onTabChange,
  showSidebar,
  showRightPane,
  onOpenAi,
}: EditorLayoutProps) {
  const { messages } = useI18n();
  const insertSnippet = useEditorStore((state) => state.insertSnippet);

  return (
    <PanelGroup direction="horizontal" className="h-full">
      {showSidebar && (
        <>
          <Panel defaultSize={18} minSize={12} className="bg-[--surface-2]">
            <div className="h-full border-r border-[--line] p-4">
              <FileExplorer />
              <AssetPanel />
              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[--muted-dim]">
                  {messages.editor.snippetsTitle}
                </p>
                <div className="mt-3 flex flex-col gap-2 text-xs text-[--muted]">
                  <button
                    onClick={() =>
                      insertSnippet(
                        '#set page(paper: "a4", margin: (x: 2cm, y: 2.5cm))'
                      )
                    }
                    className="rounded-md border border-[--line] px-3 py-2 text-left hover:border-[--line-hover]"
                  >
                    {messages.editor.snippetPageSetup}
                  </button>
                  <button
                    onClick={() =>
                      insertSnippet(
                        "#table(\n  columns: 3,\n  [Header 1], [Header 2], [Header 3],\n)"
                      )
                    }
                    className="rounded-md border border-[--line] px-3 py-2 text-left hover:border-[--line-hover]"
                  >
                    {messages.editor.snippetTable}
                  </button>
                  <button
                    onClick={() => insertSnippet('#image("filename.png", width: 50%)')}
                    className="rounded-md border border-[--line] px-3 py-2 text-left hover:border-[--line-hover]"
                  >
                    {messages.editor.snippetImage}
                  </button>
                  <button
                    onClick={() =>
                      insertSnippet("#set page(header: [= Title], footer: [#page])")
                    }
                    className="rounded-md border border-[--line] px-3 py-2 text-left hover:border-[--line-hover]"
                  >
                    {messages.editor.snippetHeaderFooter}
                  </button>
                  <button
                    onClick={() => insertSnippet("#for item in items {\n  \n}")}
                    className="rounded-md border border-[--line] px-3 py-2 text-left hover:border-[--line-hover]"
                  >
                    {messages.editor.snippetForLoop}
                  </button>
                  <button
                    onClick={() => insertSnippet("#datetime.today().display()")}
                    className="rounded-md border border-[--line] px-3 py-2 text-left hover:border-[--line-hover]"
                  >
                    {messages.editor.snippetDate}
                  </button>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[--muted-dim]">
                  {messages.editor.aiTitle}
                </p>
                <button
                  onClick={onOpenAi}
                  className="mt-3 w-full rounded-md border border-[--line] px-3 py-2 text-left text-xs text-[--muted] hover:border-[--line-hover] hover:text-white"
                >
                  🤖 {messages.editor.aiOpenAssistant}
                </button>
              </div>
            </div>
          </Panel>
          <PanelResizeHandle className="w-1 bg-[--bg] hover:bg-[--accent-soft]" />
        </>
      )}
      <Panel defaultSize={47} minSize={30} className="bg-[--surface-2]">
        <div className="flex h-full flex-col">
          <EditorPowerBar />
          <div className="flex-1">
            <MonacoEditor />
          </div>
        </div>
      </Panel>
      {showRightPane && (
        <>
          <PanelResizeHandle className="w-1 bg-[--bg] hover:bg-[--accent-soft]" />
          <Panel defaultSize={35} minSize={25} className="bg-[--surface-2]">
            <div className="flex h-full flex-col gap-3 p-4">
              <div className="flex gap-2 text-xs text-[--muted]">
                {[
                  ["preview", messages.editor.tabPreview],
                  ["data", messages.editor.tabData],
                  ["diag", messages.editor.tabDiagnostics],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() =>
                      onTabChange(key as "preview" | "data" | "diag")
                    }
                    className={`rounded-md px-3 py-1 ${
                      activeTab === key
                        ? "bg-[--surface-active] text-white"
                        : "hover:bg-[--surface-hover]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex-1">
                {activeTab === "preview" && <PdfPreview />}
                {activeTab === "data" && <DataEditor />}
                {activeTab === "diag" && <DiagnosticsPanel />}
              </div>
            </div>
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}
