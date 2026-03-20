"use client";

import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { ApiCurlPanel } from "@/src/components/editor/ApiCurlPanel";
import { AssetPanel } from "@/src/components/editor/AssetPanel";
import { DataEditor } from "@/src/components/editor/DataEditor";
import { DiagnosticsPanel } from "@/src/components/editor/DiagnosticsPanel";
import { FileExplorer } from "@/src/components/editor/FileExplorer";
import { LowCodeBlocksPanel } from "@/src/components/editor/LowCodeBlocksPanel";
import { EditorPowerBar } from "@/src/components/editor/EditorToolbar";
import { MonacoEditor } from "@/src/components/editor/MonacoEditor";
import { PdfPreview } from "@/src/components/editor/PdfPreview";
import { useMediaQuery } from "@/src/hooks/use-media-query";
import { useI18n } from "@/src/lib/i18n";
import { desktopMediaQuery } from "@/src/lib/responsive";
import { cn } from "@/src/lib/utils";
import { useEditorStore } from "@/src/stores/editor";

export type EditorTab = "preview" | "data" | "diag" | "api" | "blocks";
export type EditorPane = "files" | "editor" | EditorTab;

type EditorLayoutProps = {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  mobilePane: EditorPane;
  onMobilePaneChange: (pane: EditorPane) => void;
  showSidebar: boolean;
  showRightPane: boolean;
  onOpenAi: () => void;
  editorMode: "code" | "low-code";
  advancedTypstEnabled: boolean;
};

export function EditorLayout({
  activeTab,
  onTabChange,
  mobilePane,
  onMobilePaneChange,
  showSidebar,
  showRightPane,
  onOpenAi,
  editorMode,
  advancedTypstEnabled,
}: EditorLayoutProps) {
  const { messages } = useI18n();
  const insertSnippet = useEditorStore((state) => state.insertSnippet);
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const blockMode = editorMode === "low-code" && !advancedTypstEnabled;
  const showCodeEditor = !blockMode;
  const effectiveMobilePane =
    !blockMode && mobilePane === "blocks" ? "preview" : mobilePane;

  const rightPaneTabs: Array<{ key: EditorTab; label: string }> = [
    { key: "preview", label: messages.editor.tabPreview },
    { key: "data", label: messages.editor.tabData },
    { key: "diag", label: messages.editor.tabDiagnostics },
    { key: "api", label: "API" },
    ...(editorMode === "low-code"
      ? ([{ key: "blocks", label: "Blocks" }] as Array<{
          key: EditorTab;
          label: string;
        }>)
      : []),
  ];

  const sidebarContent = (
    <div className="h-full overflow-auto border-r border-[var(--line)] p-4">
      <FileExplorer />
      <AssetPanel />
      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-dim)]">
          {messages.editor.snippetsTitle}
        </p>
        <div className="mt-3 flex flex-col gap-2 text-xs text-[var(--muted)]">
          <button
            onClick={() =>
              insertSnippet('#set page(paper: "a4", margin: (x: 2cm, y: 2.5cm))')
            }
            disabled={!showCodeEditor}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-left hover:border-[var(--line-hover)]"
          >
            {messages.editor.snippetPageSetup}
          </button>
          <button
            onClick={() =>
              insertSnippet(
                "#table(\n  columns: 3,\n  [Header 1], [Header 2], [Header 3],\n)"
              )
            }
            disabled={!showCodeEditor}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-left hover:border-[var(--line-hover)]"
          >
            {messages.editor.snippetTable}
          </button>
          <button
            onClick={() => insertSnippet('#image("filename.png", width: 50%)')}
            disabled={!showCodeEditor}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-left hover:border-[var(--line-hover)]"
          >
            {messages.editor.snippetImage}
          </button>
          <button
            onClick={() =>
              insertSnippet("#set page(header: [= Title], footer: [#page])")
            }
            disabled={!showCodeEditor}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-left hover:border-[var(--line-hover)]"
          >
            {messages.editor.snippetHeaderFooter}
          </button>
          <button
            onClick={() => insertSnippet("#for item in items {\n  \n}")}
            disabled={!showCodeEditor}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-left hover:border-[var(--line-hover)]"
          >
            {messages.editor.snippetForLoop}
          </button>
          <button
            onClick={() => insertSnippet("#datetime.today().display()")}
            disabled={!showCodeEditor}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-left hover:border-[var(--line-hover)]"
          >
            {messages.editor.snippetDate}
          </button>
        </div>
      </div>
      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-dim)]">
          {messages.editor.aiTitle}
        </p>
        <button
          onClick={onOpenAi}
          className="mt-3 w-full rounded-md border border-[var(--line)] px-3 py-2 text-left text-xs text-[var(--muted)] hover:border-[var(--line-hover)] hover:text-[var(--ink)]"
        >
          {messages.editor.aiOpenAssistant}
        </button>
      </div>
    </div>
  );

  const editorContent = (
    <div className="flex h-full flex-col">
      {showCodeEditor ? <EditorPowerBar /> : null}
      <div className="min-h-0 flex-1">
        {showCodeEditor ? (
          <MonacoEditor />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--muted)]">
            Blocks mode is active. Use the Blocks tab to edit this template.
          </div>
        )}
      </div>
    </div>
  );

  const rightPaneContent = (
    <>
      {activeTab === "preview" && <PdfPreview />}
      {activeTab === "data" && <DataEditor />}
      {activeTab === "diag" && <DiagnosticsPanel />}
      {activeTab === "api" && <ApiCurlPanel />}
      {activeTab === "blocks" && editorMode === "low-code" && (
        <LowCodeBlocksPanel />
      )}
    </>
  );

  if (!isDesktop) {
    const mobileTabs: Array<{ key: EditorPane; label: string }> = [
      { key: "files", label: "Files" },
      { key: "editor", label: "Editor" },
      ...rightPaneTabs,
    ];

    return (
      <div className="flex h-full min-h-0 flex-col bg-[var(--surface-2)]">
        <div className="border-b border-[var(--line)] bg-[var(--surface)]">
          <div className="flex w-max min-w-full gap-2 px-3 py-3 text-xs text-[var(--muted)]">
            {mobileTabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key === "files" || item.key === "editor") {
                    onMobilePaneChange(item.key);
                    return;
                  }
                  onTabChange(item.key);
                  onMobilePaneChange(item.key);
                }}
                className={cn(
                  "rounded-md px-3 py-2 whitespace-nowrap",
                  effectiveMobilePane === item.key
                    ? "bg-[var(--surface-active)] text-[var(--ink)]"
                    : "hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {effectiveMobilePane === "files" ? (
            <div className="h-full bg-[var(--surface-2)]">{sidebarContent}</div>
          ) : null}

          {effectiveMobilePane === "editor" ? (
            <div className="h-full bg-[var(--surface-2)]">{editorContent}</div>
          ) : null}

          {effectiveMobilePane !== "files" && effectiveMobilePane !== "editor" ? (
            <div className="h-full overflow-auto bg-[var(--surface-2)] p-4">
              {rightPaneContent}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <PanelGroup direction="horizontal" className="h-full min-h-0 overflow-hidden">
      {showSidebar ? (
        <>
          <Panel defaultSize={18} minSize={12} className="bg-[var(--surface-2)]">
            {sidebarContent}
          </Panel>
          <PanelResizeHandle className="w-1 bg-[var(--bg)] hover:bg-[var(--accent-soft)]" />
        </>
      ) : null}
      <Panel defaultSize={47} minSize={30} className="bg-[var(--surface-2)]">
        {editorContent}
      </Panel>
      {showRightPane ? (
        <>
          <PanelResizeHandle className="w-1 bg-[var(--bg)] hover:bg-[var(--accent-soft)]" />
          <Panel defaultSize={35} minSize={25} className="bg-[var(--surface-2)]">
            <div className="flex h-full flex-col gap-3 p-4">
              <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                {rightPaneTabs.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onTabChange(item.key)}
                    className={cn(
                      "rounded-md px-3 py-1",
                      activeTab === item.key
                        ? "bg-[var(--surface-active)] text-[var(--ink)]"
                        : "hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1">{rightPaneContent}</div>
            </div>
          </Panel>
        </>
      ) : null}
    </PanelGroup>
  );
}
