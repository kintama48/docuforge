"use client";

import { toast } from "sonner";
import { useI18n } from "@/src/lib/i18n";

type ApiKeyRevealStepProps = {
  apiKey: string | null;
  onContinue: () => void;
};

export function ApiKeyRevealStep({ apiKey, onContinue }: ApiKeyRevealStepProps) {
  const { messages } = useI18n();
  return (
    <section className="mt-8 rounded-2xl border border-[#27272a] bg-[#111113] p-6">
      <h2 className="text-lg font-semibold">{messages.onboarding.apiKeyTitle}</h2>
      <p className="mt-2 text-sm text-[#a1a1aa]">
        {messages.onboarding.apiKeySubtitle}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#27272a] bg-[#0f1117] px-4 py-3">
        <span className="font-mono text-sm text-white">
          {apiKey || "docu_live_••••••••"}
        </span>
        <button
          onClick={() => {
            if (apiKey) {
              navigator.clipboard?.writeText(apiKey);
              toast.success(messages.settings.apiKeyCopied);
            }
          }}
          className="rounded-md border border-[#27272a] px-3 py-1 text-xs text-white hover:border-[#3f3f46]"
        >
          {messages.settings.copy}
        </button>
      </div>
      <button
        onClick={onContinue}
        className="mt-6 rounded-md bg-[#3b82f6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
      >
        {messages.onboarding.savedKey}
      </button>
    </section>
  );
}
