"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link2,
  Image,
  Code2,
  Table,
} from "lucide-react";
import { useEditorStore } from "@/src/stores/editor";
import { useI18n } from "@/src/lib/i18n";
import { useMonacoFormatting, type FormatAction } from "@/src/hooks/use-monaco-formatting";

type EditorToolbarProps = {
  onPublish: () => void;
  onOpenHistory: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onFork: () => void;
  onToggleAutoRender: () => void;
  autoRender: boolean;
};

export function EditorToolbar({
  onPublish,
  onOpenHistory,
  onOpenShortcuts,
  onOpenSettings,
  onFork,
  onToggleAutoRender,
  autoRender,
}: EditorToolbarProps) {
  const { messages } = useI18n();
  const [openMenu, setOpenMenu] = useState(false);
  const templateName = useEditorStore((state) => state.templateName);
  const isDirty = useEditorStore((state) => state.isDirty);
  const publishedVersion = useEditorStore((state) => state.publishedVersion);
  const pdfBlob = useEditorStore((state) => state.pdfBlob);

  return (
    <header className="flex items-center justify-between border-b border-[#27272a] bg-[#0f1117] px-4 py-3">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-[#a1a1aa] hover:text-white"
        >
          {messages.editor.backToDashboard}
        </Link>
        <div>
          <p className="text-sm font-semibold text-white">
            {templateName || messages.editor.untitledTemplate}
          </p>
          <p className="text-xs text-[#71717a]">
            {isDirty
              ? messages.editor.statusDraftUnsaved
              : publishedVersion
                ? `${messages.editor.statusPublished}${publishedVersion}`
                : messages.editor.statusDraft}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
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
          className="rounded-md border border-[#27272a] px-3 py-2 text-xs text-white hover:border-[#3f3f46] disabled:opacity-60"
        >
          {messages.editor.downloadPdf}
        </button>
        <button
          onClick={onPublish}
          className="rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
        >
          {messages.editor.publish}
        </button>
        <div className="relative">
          <button
            onClick={() => setOpenMenu((prev) => !prev)}
            data-testid="editor-more-menu"
            className="rounded-md border border-[#27272a] px-3 py-2 text-xs text-white hover:border-[#3f3f46]"
          >
            {messages.editor.more}
          </button>
          {openMenu && (
            <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-[#27272a] bg-[#111113] p-2 text-xs text-white shadow-lg">
              <button
                onClick={() => {
                  onFork();
                  setOpenMenu(false);
                }}
                className="w-full rounded-md px-2 py-2 text-left hover:bg-[#1a1a1f]"
              >
                {messages.editor.forkTemplate}
              </button>
              <button
                onClick={() => {
                  onOpenHistory();
                  setOpenMenu(false);
                }}
                data-testid="editor-open-history"
                className="w-full rounded-md px-2 py-2 text-left hover:bg-[#1a1a1f]"
              >
                {messages.editor.versionHistory}
              </button>
              <button
                onClick={() => {
                  onOpenSettings();
                  setOpenMenu(false);
                }}
                className="w-full rounded-md px-2 py-2 text-left hover:bg-[#1a1a1f]"
              >
                {messages.editor.templateSettings}
              </button>
              <button
                onClick={() => {
                  onOpenShortcuts();
                  setOpenMenu(false);
                }}
                className="w-full rounded-md px-2 py-2 text-left hover:bg-[#1a1a1f]"
              >
                {messages.editor.keyboardShortcuts}
              </button>
              <button
                onClick={() => {
                  onToggleAutoRender();
                  setOpenMenu(false);
                }}
                className="w-full rounded-md px-2 py-2 text-left hover:bg-[#1a1a1f]"
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

const toolbarGroups: { id: FormatAction; icon: typeof Bold; label: string }[][] = [
  [
    { id: "bold", icon: Bold, label: "Bold" },
    { id: "italic", icon: Italic, label: "Italic" },
    { id: "underline", icon: Underline, label: "Underline" },
    { id: "strike", icon: Strikethrough, label: "Strikethrough" },
  ],
  [
    { id: "h1", icon: Heading1, label: "Heading 1" },
    { id: "h2", icon: Heading2, label: "Heading 2" },
    { id: "bullet", icon: List, label: "Bullet list" },
    { id: "number", icon: ListOrdered, label: "Numbered list" },
  ],
  [
    { id: "link", icon: Link2, label: "Link" },
    { id: "image", icon: Image, label: "Image" },
    { id: "code", icon: Code2, label: "Code block" },
    { id: "table", icon: Table, label: "Table" },
  ],
];

export function EditorPowerBar() {
  const { applyAction, ready } = useMonacoFormatting();

  return (
    <div className="border-b border-[#27272a] bg-[#0f1117] px-2 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {toolbarGroups.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`} className="flex items-center gap-1">
            {group.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => applyAction(id)}
                disabled={!ready}
                title={label}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#27272a] text-[#a1a1aa] transition hover:border-[#3f3f46] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
            {groupIndex < toolbarGroups.length - 1 && (
              <span className="mx-1 h-4 w-px bg-[#27272a]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
