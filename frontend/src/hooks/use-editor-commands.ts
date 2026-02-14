import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTemplates } from "@/src/hooks/use-templates";
import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";

type CommandItem = {
  id: string;
  label: string;
  group: string;
  onSelect: () => void;
};

type UseEditorCommandsOptions = {
  showRightPane: boolean;
  showSidebar: boolean;
  autoRender: boolean;
  readOnly: boolean;
  onToggleRightPane: () => void;
  onToggleSidebar: () => void;
  onToggleAutoRender: () => void;
  onToggleActiveTab: (newTab: "preview" | "data" | "diag") => void;
  onOpenPublish: () => void;
  onOpenAi: () => void;
  onOpenHistory: () => void;
  onOpenShortcuts: () => void;
  onEditCurrent: () => void;
};

export function useEditorCommands(options: UseEditorCommandsOptions): CommandItem[] {
  const { messages } = useI18n();
  const router = useRouter();
  const templatesQuery = useTemplates(true);

  return useMemo(() => {
    const items: CommandItem[] = [
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
        onSelect: options.onOpenPublish,
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
        onSelect: options.onOpenAi,
      },
      {
        id: "toggle-preview",
        label: options.showRightPane
          ? messages.editor.commandHidePreview
          : messages.editor.commandShowPreview,
        group: messages.editor.commandEditor,
        onSelect: options.onToggleRightPane,
      },
      {
        id: "toggle-history",
        label: messages.editor.commandToggleHistory,
        group: messages.editor.commandEditor,
        onSelect: options.onOpenHistory,
      },
      {
        id: "toggle-sidebar",
        label: options.showSidebar
          ? messages.editor.commandHideSidebar
          : messages.editor.commandShowSidebar,
        group: messages.editor.commandEditor,
        onSelect: options.onToggleSidebar,
      },
      {
        id: "data-tab",
        label: messages.editor.commandToggleData,
        group: messages.editor.commandEditor,
        onSelect: () => options.onToggleActiveTab("data"),
      },
      {
        id: "diag-tab",
        label: messages.editor.commandToggleDiagnostics,
        group: messages.editor.commandEditor,
        onSelect: () => options.onToggleActiveTab("diag"),
      },
      {
        id: "auto-render",
        label: options.autoRender
          ? messages.editor.commandDisableAutoRender
          : messages.editor.commandEnableAutoRender,
        group: messages.editor.commandEditor,
        onSelect: options.onToggleAutoRender,
      },
      {
        id: "shortcuts",
        label: messages.editor.commandShortcuts,
        group: messages.editor.commandEditor,
        onSelect: options.onOpenShortcuts,
      },
    ];

    if (options.readOnly) {
      items.push({
        id: "edit-current",
        label: messages.editor.commandEditCurrent,
        group: messages.editor.commandEditor,
        onSelect: options.onEditCurrent,
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
    messages,
    options.showRightPane,
    options.showSidebar,
    options.autoRender,
    options.readOnly,
    options.onToggleRightPane,
    options.onToggleSidebar,
    options.onToggleAutoRender,
    options.onToggleActiveTab,
    options.onOpenPublish,
    options.onOpenAi,
    options.onOpenHistory,
    options.onOpenShortcuts,
    options.onEditCurrent,
    templatesQuery.data?.templates,
  ]);
}
