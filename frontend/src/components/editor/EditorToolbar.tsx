"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  TextHOne,
  TextHTwo,
  ListBullets,
  ListNumbers,
  LinkSimple,
  Image,
  Code,
  Table,
} from "@phosphor-icons/react";
import { ThemeToggle } from "@/src/app/components/theme-toggle";
import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";
import { useMonacoFormatting, type FormatAction } from "@/src/hooks/use-monaco-formatting";

type EditorToolbarProps = {
  onPublish: () => void;
  onOpenHistory: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onFork: () => void;
  onExportImages: () => void;
  onToggleAutoRender: () => void;
  autoRender: boolean;
  isLowCodeMode: boolean;
  advancedTypstEnabled: boolean;
  onToggleAdvancedTypst: () => void;
  onOpenBlocks: () => void;
};

export function EditorToolbar({
  onPublish,
  onOpenHistory,
  onOpenShortcuts,
  onOpenSettings,
  onFork,
  onExportImages,
  onToggleAutoRender,
  autoRender,
  isLowCodeMode,
  advancedTypstEnabled,
  onToggleAdvancedTypst,
  onOpenBlocks,
}: EditorToolbarProps) {
  const { messages } = useI18n();
  const dashboardLabel = messages.editor.backToDashboard.replace(/^←\s*/, "");
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const templateName = useEditorStore((state) => state.templateName);
  const isDirty = useEditorStore((state) => state.isDirty);
  const publishedVersion = useEditorStore((state) => state.publishedVersion);
  const pdfBlob = useEditorStore((state) => state.pdfBlob);

  useEffect(() => {
    if (!openMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        menuButtonRef.current?.contains(target)
      ) {
        return;
      }
      setOpenMenu(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);

  return (
    <header className="relative z-30 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)]">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          <span>{dashboardLabel}</span>
        </Link>
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            {templateName || messages.editor.untitledTemplate}
          </p>
          <p className="text-xs text-[var(--muted-dim)]">
            {isDirty
              ? messages.editor.statusDraftUnsaved
              : publishedVersion
                ? `${messages.editor.statusPublished}${publishedVersion}`
                : messages.editor.statusDraft}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {isLowCodeMode && (
          <>
            <button
              onClick={onOpenBlocks}
              className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
            >
              Blocks
            </button>
            <button
              onClick={onToggleAdvancedTypst}
              className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
            >
              Advanced Typst: {advancedTypstEnabled ? "On" : "Off"}
            </button>
          </>
        )}
        <button
          onClick={onToggleAutoRender}
          title={
            autoRender
              ? "Auto-preview ON — click to disable"
              : "Auto-preview OFF — click to enable"
          }
          className={`rounded-md border px-3 py-2 text-xs transition ${
            autoRender
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-80"
              : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-hover)] hover:text-[var(--ink)]"
          }`}
        >
          Auto-preview: {autoRender ? "ON" : "OFF"}
        </button>
        <button
          onClick={() => {
            if (!pdfBlob) return;
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${templateName || "template"}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
          }}
          disabled={!pdfBlob}
          className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)] disabled:opacity-60"
        >
          {messages.editor.downloadPdf}
        </button>
        <button
          onClick={onExportImages}
          className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
        >
          Export images
        </button>
        <button
          onClick={onPublish}
          className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
        >
          {messages.editor.publish}
        </button>
        <div className="relative">
          <button
            ref={menuButtonRef}
            onClick={() => setOpenMenu((prev) => !prev)}
            data-testid="editor-more-menu"
            className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
          >
            {messages.editor.more}
          </button>
          {openMenu && (
            <div
              ref={menuRef}
              className="absolute right-0 z-[70] mt-2 w-52 rounded-md border border-[var(--line)] bg-[var(--surface)] p-2 text-xs text-[var(--ink)] shadow-[var(--shadow)]"
            >
              <button
                onClick={() => {
                  onFork();
                  setOpenMenu(false);
                }}
                className="w-full rounded-md px-2 py-2 text-left hover:bg-[var(--surface-active)]"
              >
                {messages.editor.forkTemplate}
              </button>
              <button
                onClick={() => {
                  onOpenHistory();
                  setOpenMenu(false);
                }}
                data-testid="editor-open-history"
                className="w-full rounded-md px-2 py-2 text-left hover:bg-[var(--surface-active)]"
              >
                {messages.editor.versionHistory}
              </button>
              <button
                onClick={() => {
                  onOpenSettings();
                  setOpenMenu(false);
                }}
                className="w-full rounded-md px-2 py-2 text-left hover:bg-[var(--surface-active)]"
              >
                {messages.editor.templateSettings}
              </button>
              <button
                onClick={() => {
                  onOpenShortcuts();
                  setOpenMenu(false);
                }}
                className="w-full rounded-md px-2 py-2 text-left hover:bg-[var(--surface-active)]"
              >
                {messages.editor.keyboardShortcuts}
              </button>
              <button
                onClick={() => {
                  onToggleAutoRender();
                  setOpenMenu(false);
                }}
                className="w-full rounded-md px-2 py-2 text-left hover:bg-[var(--surface-active)]"
              >
                {messages.editor.autoRender}:{" "}
                {autoRender ? messages.editor.autoRenderOn : messages.editor.autoRenderOff}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const toolbarGroups: { id: FormatAction; icon: typeof TextB; label: string }[][] = [
  [
    { id: "bold", icon: TextB, label: "Bold" },
    { id: "italic", icon: TextItalic, label: "Italic" },
    { id: "underline", icon: TextUnderline, label: "Underline" },
    { id: "strike", icon: TextStrikethrough, label: "Strikethrough" },
  ],
  [
    { id: "h1", icon: TextHOne, label: "Heading 1" },
    { id: "h2", icon: TextHTwo, label: "Heading 2" },
    { id: "bullet", icon: ListBullets, label: "Bullet list" },
    { id: "number", icon: ListNumbers, label: "Numbered list" },
  ],
  [
    { id: "link", icon: LinkSimple, label: "Link" },
    { id: "image", icon: Image, label: "Image" },
    { id: "code", icon: Code, label: "Code block" },
    { id: "table", icon: Table, label: "Table" },
  ],
];

export function EditorPowerBar() {
  const { applyAction, ready } = useMonacoFormatting();

  return (
    <div className="border-b border-[var(--line)] bg-[var(--surface-2)] px-2 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {toolbarGroups.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`} className="flex items-center gap-1">
            {group.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => applyAction(id)}
                disabled={!ready}
                title={label}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--line-hover)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
            {groupIndex < toolbarGroups.length - 1 && (
              <span className="mx-1 h-4 w-px bg-[var(--line)]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
