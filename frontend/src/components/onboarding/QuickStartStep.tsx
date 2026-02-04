"use client";

import Link from "next/link";
import { useI18n } from "@/src/lib/i18n";

type QuickStartStepProps = {
  apiKey: string | null;
  templateId: string | null;
};

export function QuickStartStep({ apiKey, templateId }: QuickStartStepProps) {
  const { messages } = useI18n();
  const template = templateId || "tpl_demo";
  return (
    <section className="mt-8 rounded-2xl border border-[#27272a] bg-[#111113] p-6">
      <h2 className="text-lg font-semibold">
        {messages.onboarding.firstRequestTitle}
      </h2>
      <p className="mt-2 text-sm text-[#a1a1aa]">
        {messages.onboarding.firstRequestSubtitle}
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0f1117] p-4 text-xs text-[#a1a1aa]">
        <code>{`curl -X POST "$DOCUFORGE_API_URL/v1/render" \\
  -H "X-API-Key: ${apiKey || "docu_live_..."}" \\
  -H "Content-Type: application/json" \\
  -d '{ "template_id": "${template}", "data": {} }'`}</code>
      </pre>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/editor/${template}`}
          className="rounded-md bg-[#3b82f6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
        >
          {messages.onboarding.openEditor}
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-[#27272a] px-4 py-2 text-xs text-white hover:border-[#3f3f46]"
        >
          {messages.onboarding.goDashboard}
        </Link>
      </div>
    </section>
  );
}
