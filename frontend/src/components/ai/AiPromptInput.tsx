"use client";

import { useI18n } from "@/src/lib/i18n";

type AiPromptInputProps = {
  value: string;
  includeSelection: boolean;
  disabled?: boolean;
  isSending?: boolean;
  onChange: (value: string) => void;
  onToggleSelection: (next: boolean) => void;
  onSend: () => void;
};

export function AiPromptInput({
  value,
  includeSelection,
  disabled,
  isSending,
  onChange,
  onToggleSelection,
  onSend,
}: AiPromptInputProps) {
  const { messages } = useI18n();
  return (
    <div>
      <label className="text-xs text-[var(--muted)]">
        {messages.ai.promptLabel}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-2 h-24 w-full resize-none rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-xs text-[var(--ink)] outline-none"
        placeholder={messages.ai.promptPlaceholder}
      />
      <label className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
        <input
          type="checkbox"
          checked={includeSelection}
          onChange={(event) => onToggleSelection(event.target.checked)}
        />
        {messages.ai.includeSelection}
      </label>
      <button
        onClick={onSend}
        disabled={disabled}
        className="mt-3 w-full rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {disabled
          ? messages.ai.creditsExhausted
          : isSending
            ? messages.ai.sending
            : messages.ai.send}
      </button>
    </div>
  );
}
