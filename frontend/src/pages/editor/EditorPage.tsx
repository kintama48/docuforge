"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/src/components/auth/ProtectedRoute";
import { AiDrawer } from "@/src/components/editor/AiDrawer";
import { CommandPalette } from "@/src/components/editor/CommandPalette";
import { EditorLayout } from "@/src/components/editor/EditorLayout";
import { EditorStatusBar } from "@/src/components/editor/EditorStatusBar";
import { EditorToolbar } from "@/src/components/editor/EditorToolbar";
import { KeyboardShortcutsModal } from "@/src/components/editor/KeyboardShortcutsModal";
import { PublishDialog } from "@/src/components/editor/PublishDialog";
import { TemplateSettingsDialog } from "@/src/components/editor/TemplateSettingsDialog";
import { VersionHistoryPanel } from "@/src/components/editor/VersionHistoryPanel";
import { useDebounce } from "@/src/hooks/use-debounce";
import { useKeyboard } from "@/src/hooks/use-keyboard";
import { usePreviewRender } from "@/src/hooks/use-render";
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

export default function EditorPage() {
  const { messages } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = params?.id;
  const { data, isLoading } = useTemplate(templateId);
  const templatesQuery = useTemplates(true);
  const forkTemplate = useForkTemplate();
  const publishVersion = usePublishVersion(templateId);
  const templateVersion = useTemplateVersion(templateId);
  const loadTemplate = useEditorStore((state) => state.loadTemplate);
  const loadVersion = useEditorStore((state) => state.loadVersion);
  const source = useEditorStore((state) => state.source);
  const files = useEditorStore((state) => state.files);
  const dataString = useEditorStore((state) => state.dataString);
  const dataObject = useEditorStore((state) => state.data);
  const rateLimitUntil = useEditorStore((state) => state.rateLimitUntil);
  const setRateLimitUntil = useEditorStore((state) => state.setRateLimitUntil);
  const setReadOnly = useEditorStore((state) => state.setReadOnly);
  const setViewingVersion = useEditorStore((state) => state.setViewingVersion);
  const readOnly = useEditorStore((state) => state.readOnly);
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);

  const debouncedSource = useDebounce(source, 800);
  const debouncedData = useDebounce(dataString, 500);
  const previewRender = usePreviewRender();

  // Store mutate in a ref to avoid recreating the useEffect dependency
  // FE-C1 fix: useMutation returns a new object each render, causing infinite loops
  const previewRenderRef = useRef(previewRender.mutate);
  useEffect(() => {
    previewRenderRef.current = previewRender.mutate;
  }, [previewRender.mutate]);

  const [activeTab, setActiveTab] = useState<"preview" | "data" | "diag">(
    "preview"
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [autoRender, setAutoRender] = useState(true);
  const [showAi, setShowAi] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showRightPane, setShowRightPane] = useState(true);

  useEffect(() => {
    if (data?.template) {
      loadTemplate(data.template);
      setViewingVersionId(null);
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

  useEffect(() => {
    if (!autoRender) return;
    if (rateLimitUntil && Date.now() < rateLimitUntil) return;
    if (!debouncedSource) return;
    try {
      JSON.parse(debouncedData || "{}");
    } catch {
      return;
    }
    // Use ref to call mutate - avoids infinite loop from previewRender in deps
    previewRenderRef.current({
      source: debouncedSource,
      files,
      data: dataObject,
    });
  }, [debouncedSource, debouncedData, files, dataObject, autoRender, rateLimitUntil]);

  useKeyboard(
    [
      {
        key: "s",
        ctrl: true,
        handler: () =>
          previewRender.mutate({ source, files, data: dataObject }),
      },
      {
        key: "s",
        meta: true,
        handler: () =>
          previewRender.mutate({ source, files, data: dataObject }),
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
          setActiveTab((prev) => (prev === "data" ? "preview" : "data")),
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

  const commandItems = useMemo(() => {
    const items = [
      {
        id: "dashboard",
        label: messages.editor.commandDashboard,
        group: messages.editor.commandNavigation,
        onSelect: () => router.push("/dashboard"),
      },
      {
        id: "settings",
        label: messages.editor.commandSettings,
        group: messages.editor.commandNavigation,
        onSelect: () => router.push("/settings"),
      },
      {
        id: "publish",
        label: messages.editor.commandPublish,
        group: messages.editor.commandEditor,
        onSelect: () => setShowPublish(true),
      },
      {
        id: "download",
        label: messages.editor.downloadPdf,
        group: messages.editor.commandEditor,
        onSelect: () => {
          const pdfBlob = useEditorStore.getState().pdfBlob;
          const templateName = useEditorStore.getState().templateName;
          if (!pdfBlob) return;
          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${templateName || "template"}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
        },
      },
      {
        id: "ai",
        label: messages.editor.commandAi,
        group: messages.editor.commandEditor,
        onSelect: () => setShowAi(true),
      },
      {
        id: "toggle-preview",
        label: showRightPane
          ? messages.editor.commandHidePreview
          : messages.editor.commandShowPreview,
        group: messages.editor.commandEditor,
        onSelect: () => setShowRightPane((prev) => !prev),
      },
      {
        id: "toggle-history",
        label: messages.editor.commandToggleHistory,
        group: messages.editor.commandEditor,
        onSelect: () => setShowHistory((prev) => !prev),
      },
      {
        id: "toggle-sidebar",
        label: showSidebar
          ? messages.editor.commandHideSidebar
          : messages.editor.commandShowSidebar,
        group: messages.editor.commandEditor,
        onSelect: () => setShowSidebar((prev) => !prev),
      },
      {
        id: "data-tab",
        label: messages.editor.commandToggleData,
        group: messages.editor.commandEditor,
        onSelect: () =>
          setActiveTab((prev) => (prev === "data" ? "preview" : "data")),
      },
      {
        id: "diag-tab",
        label: messages.editor.commandToggleDiagnostics,
        group: messages.editor.commandEditor,
        onSelect: () =>
          setActiveTab((prev) => (prev === "diag" ? "preview" : "diag")),
      },
      {
        id: "auto-render",
        label: autoRender
          ? messages.editor.commandDisableAutoRender
          : messages.editor.commandEnableAutoRender,
        group: messages.editor.commandEditor,
        onSelect: () => setAutoRender((prev) => !prev),
      },
      {
        id: "shortcuts",
        label: messages.editor.commandShortcuts,
        group: messages.editor.commandEditor,
        onSelect: () => setShowShortcuts(true),
      },
    ];

    if (readOnly) {
      items.push({
        id: "edit-current",
        label: messages.editor.commandEditCurrent,
        group: messages.editor.commandEditor,
        onSelect: () => {
          setReadOnly(false);
          setViewingVersion(null);
          setViewingVersionId(null);
        },
      });
    }

    if (templatesQuery.data?.templates?.length) {
      templatesQuery.data.templates.forEach((template) => {
        items.push({
          id: `template-${template.id}`,
          label: messages.editor.commandOpenTemplate.replace(
            "{name}",
            template.name
          ),
          group: messages.editor.commandTemplates,
          onSelect: () => router.push(`/editor/${template.id}`),
        });
      });
    }

    return items;
  }, [
    router,
    showRightPane,
    showSidebar,
    autoRender,
    templatesQuery.data?.templates,
    readOnly,
    messages,
    setReadOnly,
    setViewingVersion,
  ]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] text-sm text-[#a1a1aa]">
        {messages.editor.loading}
      </div>
    );
  }

  if (!data?.template) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] text-sm text-[#a1a1aa]">
        {messages.editor.notFound}
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-[#0a0a0b] text-white">
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
        />
        <EditorLayout
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showSidebar={showSidebar}
          showRightPane={showRightPane}
          onOpenAi={() => setShowAi(true)}
        />
        <EditorStatusBar />

        <AiDrawer open={showAi} onClose={() => setShowAi(false)} />
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
        <CommandPalette
          open={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          items={commandItems}
        />
      </div>
    </ProtectedRoute>
  );
}
