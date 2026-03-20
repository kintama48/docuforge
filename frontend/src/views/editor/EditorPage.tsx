"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/src/components/auth/ProtectedRoute";
import { CommandPalette } from "@/src/components/editor/CommandPalette";
import { DocuMasterWidget } from "@/src/components/editor/DocuMasterWidget";
import {
  EditorLayout,
  type EditorPane,
} from "@/src/components/editor/EditorLayout";
import { EditorStatusBar } from "@/src/components/editor/EditorStatusBar";
import { EditorToolbar } from "@/src/components/editor/EditorToolbar";
import { ImageExportDialog } from "@/src/components/editor/ImageExportDialog";
import { KeyboardShortcutsModal } from "@/src/components/editor/KeyboardShortcutsModal";
import { PublishDialog } from "@/src/components/editor/PublishDialog";
import { TemplateSettingsDialog } from "@/src/components/editor/TemplateSettingsDialog";
import { VersionHistoryPanel } from "@/src/components/editor/VersionHistoryPanel";
import { useDebounce } from "@/src/hooks/use-debounce";
import { useEditorCommands } from "@/src/hooks/use-editor-commands";
import { useKeyboard } from "@/src/hooks/use-keyboard";
import { usePreviewImageRender, usePreviewRender } from "@/src/hooks/use-render";
import {
  useForkTemplate,
  usePublishVersion,
  useTemplate,
  useTemplateVersion,
  useTemplates,
} from "@/src/hooks/use-templates";
import type { TemplateVersionSummary } from "@/src/lib/api-types";
import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";

type EditorTab = "preview" | "data" | "diag" | "api" | "blocks";

export default function EditorPage() {
  const { messages } = useI18n();
  const params = useParams<{ id: string }>();
  const templateId = params?.id;
  const { data, isLoading } = useTemplate(templateId);
  useTemplates(true);
  const forkTemplate = useForkTemplate();
  const publishVersion = usePublishVersion(templateId);
  const templateVersion = useTemplateVersion(templateId);
  const loadTemplate = useEditorStore((state) => state.loadTemplate);
  const loadVersion = useEditorStore((state) => state.loadVersion);
  const source = useEditorStore((state) => state.source);
  const lowCodeSpec = useEditorStore((state) => state.lowCodeSpec);
  const editorMode = useEditorStore((state) => state.editorMode);
  const advancedTypstEnabled = useEditorStore(
    (state) => state.advancedTypstEnabled
  );
  const files = useEditorStore((state) => state.files);
  const dataString = useEditorStore((state) => state.dataString);
  const dataObject = useEditorStore((state) => state.data);
  const rateLimitUntil = useEditorStore((state) => state.rateLimitUntil);
  const setRateLimitUntil = useEditorStore((state) => state.setRateLimitUntil);
  const setReadOnly = useEditorStore((state) => state.setReadOnly);
  const setViewingVersion = useEditorStore((state) => state.setViewingVersion);
  const setAdvancedTypstEnabled = useEditorStore(
    (state) => state.setAdvancedTypstEnabled
  );
  const readOnly = useEditorStore((state) => state.readOnly);
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);

  const isLowCodeMode = editorMode === "low-code";
  const blockMode = isLowCodeMode && !advancedTypstEnabled;

  const debouncedSource = useDebounce(source, 300);
  const debouncedData = useDebounce(dataString, 300);
  const previewRender = usePreviewRender();
  const previewImageRender = usePreviewImageRender();

  // Store mutate in a ref to avoid recreating the useEffect dependency
  // FE-C1 fix: useMutation returns a new object each render, causing infinite loops
  const previewRenderRef = useRef(previewRender.mutate);
  useEffect(() => {
    previewRenderRef.current = previewRender.mutate;
  }, [previewRender.mutate]);

  const [activeTab, setActiveTab] = useState<EditorTab>("preview");
  const [showSidebar, setShowSidebar] = useState(true);
  const [autoRender, setAutoRender] = useState(true);
  const [showAi, setShowAi] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showRightPane, setShowRightPane] = useState(true);
  const [showImageExport, setShowImageExport] = useState(false);
  const [mobilePane, setMobilePane] = useState<EditorPane>("editor");

  useEffect(() => {
    if (data?.template) {
      loadTemplate(data.template);
    }
  }, [data, loadTemplate]);

  useEffect(() => {
    if (!rateLimitUntil) return;
    const remaining = rateLimitUntil - Date.now();
    if (remaining <= 0) {
      setRateLimitUntil(null);
      return;
    }
    const handle = setTimeout(() => {
      setRateLimitUntil(null);
    }, remaining);
    return () => clearTimeout(handle);
  }, [rateLimitUntil, setRateLimitUntil]);

  const normalizeTab = (tab: EditorTab): EditorTab => {
    if (!blockMode && tab === "blocks") return "preview";
    return tab;
  };
  const effectiveActiveTab = normalizeTab(activeTab);

  useEffect(() => {
    if (!autoRender) return;
    if (rateLimitUntil && Date.now() < rateLimitUntil) return;
    try {
      JSON.parse(debouncedData || "{}");
    } catch {
      return;
    }
    if (blockMode) {
      if (!lowCodeSpec) return;
      previewRenderRef.current({
        low_code_spec: lowCodeSpec,
        data: dataObject,
      });
      return;
    }
    if (!debouncedSource) return;
    // Use ref to call mutate - avoids infinite loop from previewRender in deps
    previewRenderRef.current({
      source: debouncedSource,
      files,
      data: dataObject,
    });
  }, [
    debouncedSource,
    debouncedData,
    files,
    dataObject,
    autoRender,
    rateLimitUntil,
    blockMode,
    lowCodeSpec,
  ]);

  const triggerRender = () => {
    if (blockMode) {
      if (!lowCodeSpec) return;
      previewRender.mutate({
        low_code_spec: lowCodeSpec,
        data: dataObject,
      });
      return;
    }
    previewRender.mutate({ source, files, data: dataObject });
  };

  useKeyboard(
    [
      {
        key: "s",
        ctrl: true,
        handler: triggerRender,
      },
      {
        key: "s",
        meta: true,
        handler: triggerRender,
      },
      {
        key: "p",
        ctrl: true,
        shift: true,
        handler: () => setShowPublish(true),
      },
      {
        key: "a",
        ctrl: true,
        shift: true,
        handler: () => setShowAi((prev) => !prev),
      },
      {
        key: "h",
        ctrl: true,
        shift: true,
        handler: () => setShowHistory((prev) => !prev),
      },
      {
        key: "d",
        ctrl: true,
        shift: true,
        handler: () =>
          setActiveTab((prev) => {
            const next = prev === "data" ? "preview" : "data";
            setMobilePane(next);
            return next;
          }),
      },
      {
        key: "\\",
        ctrl: true,
        handler: () => setShowSidebar((prev) => !prev),
      },
      {
        key: "k",
        ctrl: true,
        handler: () => setShowCommandPalette(true),
      },
      {
        key: "Escape",
        handler: () => {
          setShowAi(false);
          setShowHistory(false);
          setShowPublish(false);
          setShowShortcuts(false);
          setShowSettings(false);
          setShowCommandPalette(false);
        },
      },
    ],
    true
  );

  const commandItems = useEditorCommands({
    showRightPane,
    showSidebar,
    autoRender,
    readOnly,
    isLowCodeMode,
    onToggleRightPane: () => setShowRightPane((prev) => !prev),
    onToggleSidebar: () => setShowSidebar((prev) => !prev),
    onToggleAutoRender: () => setAutoRender((prev) => !prev),
    onToggleActiveTab: (newTab) => {
      setActiveTab((prev) => {
        const nextTab = normalizeTab(newTab);
        const finalTab = normalizeTab(prev) === nextTab ? "preview" : nextTab;
        setMobilePane(finalTab);
        return finalTab;
      });
    },
    onOpenPublish: () => setShowPublish(true),
    onOpenAi: () => setShowAi((prev) => !prev),
    onOpenHistory: () => setShowHistory(true),
    onOpenShortcuts: () => setShowShortcuts(true),
    onEditCurrent: () => {
      setReadOnly(false);
      setViewingVersion(null);
      setViewingVersionId(null);
    },
  });

  const handleOpenVersion = (version: TemplateVersionSummary) => {
    setViewingVersionId(version.id);
    setReadOnly(true);
    setViewingVersion(version.version_number);
    templateVersion.mutate(version.id);
  };

  useEffect(() => {
    if (templateVersion.data?.version) {
      loadVersion(templateVersion.data.version);
    }
  }, [templateVersion.data, loadVersion]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-sm text-[var(--muted)]">
        {messages.editor.loading}
      </div>
    );
  }

  if (!data?.template) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-sm text-[var(--muted)]">
        {messages.editor.notFound}
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="relative flex h-screen min-h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
        <EditorToolbar
          onPublish={() => setShowPublish(true)}
          onOpenHistory={() => setShowHistory(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenShortcuts={() => setShowShortcuts(true)}
          onFork={() =>
            forkTemplate.mutate({
              id: data.template.id,
              name: `${data.template.name} Copy`,
            })
          }
          autoRender={autoRender}
          onToggleAutoRender={() => setAutoRender((prev) => !prev)}
          onExportImages={() => setShowImageExport(true)}
          isLowCodeMode={isLowCodeMode}
          advancedTypstEnabled={advancedTypstEnabled}
          onToggleAdvancedTypst={() =>
            setAdvancedTypstEnabled(!advancedTypstEnabled)
          }
          onOpenBlocks={() => {
            setShowRightPane(true);
            setActiveTab(normalizeTab("blocks"));
            setMobilePane(normalizeTab("blocks"));
          }}
        />
        <div className="min-h-0 flex-1">
          <EditorLayout
            activeTab={effectiveActiveTab}
            onTabChange={(tab) => {
              const nextTab = normalizeTab(tab);
              setActiveTab(nextTab);
              setMobilePane(nextTab);
            }}
            mobilePane={mobilePane}
            onMobilePaneChange={setMobilePane}
            showSidebar={showSidebar}
            showRightPane={showRightPane}
            onOpenAi={() => setShowAi((prev) => !prev)}
            editorMode={editorMode}
            advancedTypstEnabled={advancedTypstEnabled}
          />
        </div>
        <EditorStatusBar />

        <DocuMasterWidget
          open={showAi}
          onToggle={() => setShowAi((prev) => !prev)}
          onClose={() => setShowAi(false)}
        />
        <VersionHistoryPanel
          open={showHistory}
          onClose={() => setShowHistory(false)}
          template={data.template}
          currentVersionId={data.template.live_version?.id ?? null}
          viewingVersionId={viewingVersionId}
          onSelectVersion={(versionId) => {
            const version = data.template.versions.find(
              (item) => item.id === versionId
            );
            if (version) {
              handleOpenVersion(version);
            }
          }}
          onRevert={(versionId) => {
            const version = templateVersion.data?.version;
            if (!version || version.id !== versionId) return;
            publishVersion.mutate({
              source: version.source,
              low_code_spec: version.low_code_spec ?? undefined,
              files: version.files ?? undefined,
              defaults: version.defaults ?? undefined,
              commit_message: `Revert to v${version.version_number}`,
            });
            setReadOnly(false);
            setViewingVersion(null);
            setViewingVersionId(null);
          }}
        />
        <PublishDialog
          open={showPublish}
          onClose={() => setShowPublish(false)}
          templateId={data.template.id}
        />
        <KeyboardShortcutsModal
          open={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
        <TemplateSettingsDialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
          templateId={data.template.id}
        />
        <ImageExportDialog
          open={showImageExport}
          pending={previewImageRender.isPending}
          onClose={() => setShowImageExport(false)}
          onExport={(options) => {
            const onSuccess = (result: {
              blob: Blob;
              filename: string;
              contentType: string;
            }) => {
              const url = URL.createObjectURL(result.blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = result.filename;
              anchor.click();
              URL.revokeObjectURL(url);
              setShowImageExport(false);
            };

            if (blockMode) {
              if (!lowCodeSpec) return;
              previewImageRender.mutate(
                {
                  low_code_spec: lowCodeSpec,
                  data: dataObject,
                  ...options,
                },
                { onSuccess }
              );
              return;
            }

            previewImageRender.mutate(
              {
                source,
                files,
                data: dataObject,
                ...options,
              },
              { onSuccess }
            );
          }}
        />
        <CommandPalette
          open={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          items={commandItems}
        />
      </div>
    </ProtectedRoute>
  );
}
