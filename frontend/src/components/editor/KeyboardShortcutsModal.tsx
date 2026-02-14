"use client";

import { Modal } from "@/src/components/ui/Modal";
import { useI18n } from "@/src/lib/i18n";

type KeyboardShortcutsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function KeyboardShortcutsModal({
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
  const { messages } = useI18n();
  const shortcuts = [
    ["Ctrl+S / Cmd+S", messages.editor.shortcutRender],
    ["Ctrl+K / Cmd+K", messages.editor.shortcutCommandPalette],
    ["Ctrl+Shift+P", messages.editor.shortcutPublish],
    ["Ctrl+Shift+A", messages.editor.shortcutAi],
    ["Ctrl+Shift+H", messages.editor.shortcutHistory],
    ["Ctrl+Shift+D", messages.editor.shortcutData],
    ["Ctrl+\\", messages.editor.shortcutSidebar],
    ["Esc", messages.editor.shortcutClose],
  ] as const;

  return (
    <Modal open={open} onClose={onClose} title={messages.editor.keyboardShortcuts}>
      <div className="space-y-3 text-xs text-[--muted]">
        {shortcuts.map(([combo, action]) => (
          <div
            key={combo}
            className="flex items-center justify-between rounded-md border border-[--line] bg-[--surface-2] px-3 py-2"
          >
            <span className="text-white">{combo}</span>
            <span>{action}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
