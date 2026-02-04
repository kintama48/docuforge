"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/src/hooks/use-api-keys";
import { Modal } from "@/src/components/ui/Modal";
import { ApiKeyRow } from "@/src/components/settings/ApiKeyRow";
import { formatDate } from "@/src/lib/utils";
import { useI18n } from "@/src/lib/i18n";

function toDate(value: number | null) {
  if (!value) return null;
  const ms = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(ms);
}

export function ApiKeySection() {
  const { messages } = useI18n();
  const { data } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const [openCreateKey, setOpenCreateKey] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");

  const keys = data?.keys || [];
  const keyPrefix = keys[0]?.prefix || "docu_live_...";

  const formattedKeys = useMemo(
    () =>
      keys.map((key) => {
        const lastUsedDate = toDate(key.last_used_at);
        return {
          ...key,
          lastUsedLabel: lastUsedDate
            ? formatDistanceToNow(lastUsedDate, { addSuffix: true })
            : messages.settings.never,
          createdLabel: formatDate(key.created_at),
        };
      }),
    [keys, messages.settings.never]
  );

  return (
    <section className="rounded-2xl border border-[#27272a] bg-[#111113] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {messages.settings.apiKeysTitle}
          </h2>
          <p className="mt-1 text-xs text-[#71717a]">
            {messages.settings.apiKeysSubtitle}
          </p>
        </div>
        <button
          onClick={() => setOpenCreateKey(true)}
          className="rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
        >
          {messages.settings.createNewKey}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs text-[#a1a1aa]">
          <thead className="text-[11px] uppercase tracking-[0.18em] text-[#71717a]">
            <tr>
              <th className="py-2">{messages.settings.keyNameLabel}</th>
              <th className="py-2">{messages.settings.keyPrefix}</th>
              <th className="py-2">{messages.settings.lastUsed}</th>
              <th className="py-2">{messages.settings.created}</th>
              <th className="py-2 text-right">{messages.settings.actions}</th>
            </tr>
          </thead>
          <tbody>
            {formattedKeys.length ? (
              formattedKeys.map((key) => (
                <ApiKeyRow
                  key={key.id}
                  name={key.name}
                  prefix={key.prefix}
                  lastUsedLabel={key.lastUsedLabel}
                  createdLabel={key.createdLabel}
                  onCopy={() => {
                    navigator.clipboard?.writeText(key.prefix);
                    toast.success(messages.settings.keyPrefixCopied);
                  }}
                  onRevoke={() => {
                    if (
                      confirm(
                        messages.settings.revokeConfirm
                      )
                    ) {
                      revokeKey.mutate(key.id);
                    }
                  }}
                />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[#71717a]">
                  {messages.settings.noKeys}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={openCreateKey}
        onClose={() => setOpenCreateKey(false)}
        title={messages.settings.createKeyTitle}
      >
        <label className="text-xs text-[#a1a1aa]">
          {messages.settings.keyNameLabel}
        </label>
        <input
          value={keyName}
          onChange={(event) => setKeyName(event.target.value)}
          className="mt-2 w-full rounded-md border border-[#27272a] bg-[#0f1117] px-3 py-2 text-xs text-white"
          placeholder={messages.settings.keyNamePlaceholder}
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setOpenCreateKey(false)}
            className="rounded-md border border-[#27272a] px-3 py-2 text-xs text-white"
          >
            {messages.settings.cancel}
          </button>
          <button
            onClick={() => {
              if (!keyName.trim()) return;
              createKey.mutate(
                { name: keyName.trim() },
                {
                  onSuccess: (payload) => {
                    setNewKey(payload.raw_key);
                    setOpenCreateKey(false);
                    setKeyName("");
                  },
                }
              );
            }}
            disabled={!keyName.trim()}
            className="rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb] disabled:opacity-60"
          >
            {messages.settings.create}
          </button>
        </div>
      </Modal>

      <Modal
        open={Boolean(newKey)}
        onClose={() => {}}
        dismissable={false}
        title={messages.settings.saveKeyTitle}
      >
        <p className="text-xs text-[#a1a1aa]">
          {messages.settings.saveKeyBody}
        </p>
        <div className="mt-3 rounded-lg border border-[#27272a] bg-[#0f1117] px-3 py-2 font-mono text-xs text-white">
          {newKey || keyPrefix}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (newKey) {
                navigator.clipboard?.writeText(newKey);
                toast.success(messages.settings.apiKeyCopied);
              }
            }}
            className="rounded-md border border-[#27272a] px-3 py-2 text-xs text-white hover:border-[#3f3f46]"
          >
            {messages.settings.copy}
          </button>
          <button
            onClick={() => setNewKey(null)}
            className="rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
          >
            {messages.settings.savedKey}
          </button>
        </div>
      </Modal>
    </section>
  );
}
