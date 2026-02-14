"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useI18n } from "@/src/lib/i18n";

export type CommandItem = {
  id: string;
  label: string;
  onSelect: () => void;
  keywords?: string;
  group?: string;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
};

export function CommandPalette({ open, onClose, items }: CommandPaletteProps) {
  const { messages } = useI18n();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  if (!open) return null;

  const grouped = items.reduce<Record<string, CommandItem[]>>((acc, item) => {
    const key = item.group || messages.editor.commandGroupFallback;
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <Command
        className="relative w-full max-w-xl rounded-2xl border border-[--line] bg-[--surface] p-4 text-white shadow-2xl"
        shouldFilter
      >
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder={messages.editor.commandSearchPlaceholder}
          className="w-full rounded-md border border-[--line] bg-[--surface-2] px-3 py-2 text-sm outline-none"
        />
        <Command.List className="mt-3 max-h-72 overflow-y-auto">
          <Command.Empty className="p-3 text-xs text-[--muted-dim]">
            {messages.editor.commandNoResults}
          </Command.Empty>
          {Object.entries(grouped).map(([group, groupItems]) => (
            <Command.Group key={group} heading={group} className="text-xs">
              {groupItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.keywords || ""}`}
                  onSelect={() => {
                    item.onSelect();
                    onClose();
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm aria-selected:bg-[--surface-active]"
                >
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
