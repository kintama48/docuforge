"use client";

import { useI18n } from "@/src/lib/i18n";

type ApiKeyRowProps = {
  name: string;
  prefix: string;
  lastUsedLabel: string;
  createdLabel: string;
  onCopy: () => void;
  onRevoke: () => void;
};

export function ApiKeyRow({
  name,
  prefix,
  lastUsedLabel,
  createdLabel,
  onCopy,
  onRevoke,
}: ApiKeyRowProps) {
  const { messages } = useI18n();
  return (
    <tr className="border-t border-[#27272a]">
      <td className="py-2 text-white">{name}</td>
      <td className="py-2 font-mono text-[11px] text-[#a1a1aa]">{prefix}</td>
      <td className="py-2">{lastUsedLabel}</td>
      <td className="py-2">{createdLabel}</td>
      <td className="py-2 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={onCopy}
            className="rounded-md border border-[#27272a] px-2 py-1 text-[11px] text-white hover:border-[#3f3f46]"
          >
            {messages.settings.copy}
          </button>
          <button
            onClick={onRevoke}
            className="rounded-md border border-[#27272a] px-2 py-1 text-[11px] text-white hover:border-[#3f3f46]"
          >
            {messages.settings.revoke}
          </button>
        </div>
      </td>
    </tr>
  );
}
