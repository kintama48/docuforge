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

  const keys = useMemo(() => data?.keys || [], [data?.keys]);
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
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            {messages.settings.apiKeysTitle}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-dim)]">
            {messages.settings.apiKeysSubtitle}
          </p>
        </div>
        <button
          onClick={() => setOpenCreateKey(true)}
          className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
        >
          {messages.settings.createNewKey}
        </button>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Key prefixes are identifiers only. Use the full secret key for API
        requests.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs text-[var(--muted)]">
          <thead className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">
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
                <td colSpan={5} className="py-6 text-center text-[var(--muted-dim)]">
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
        <label className="text-xs text-[var(--muted)]">
          {messages.settings.keyNameLabel}
        </label>
        <input
          value={keyName}
          onChange={(event) => setKeyName(event.target.value)}
          className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink)]"
          placeholder={messages.settings.keyNamePlaceholder}
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setOpenCreateKey(false)}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)]"
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
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
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
        <p className="text-xs text-[var(--muted)]">
          {messages.settings.saveKeyBody}
        </p>
        <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--ink)]">
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
            className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
          >
            {messages.settings.copy}
          </button>
          <button
            onClick={() => setNewKey(null)}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            {messages.settings.savedKey}
          </button>
        </div>
      </Modal>
    </section>
  );
}
