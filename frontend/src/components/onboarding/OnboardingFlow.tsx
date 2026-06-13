"use client";

import { useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTemplates, useForkTemplate } from "@/src/hooks/use-templates";
import { useOnboardingStore } from "@/src/stores/onboarding";
import { env } from "@/src/config/env";
import type { OnboardingStep } from "@/src/hooks/use-onboarding-state";

// ─── Step 1: Welcome ─────────────────────────────────────────────────────────

function WelcomeStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 text-4xl">👉</div>
      <h2 className="text-2xl font-semibold">Generate your first PDF</h2>
      <p className="mt-3 max-w-sm text-sm text-[#a1a1aa]">
        In about 2 minutes you&apos;ll have a real PDF in your hands and a curl
        snippet you can paste straight into production.
      </p>
      <button
        onClick={onNext}
        className="mt-8 rounded-md bg-[#3b82f6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb]"
      >
        Let&apos;s go →
      </button>
      <button
        onClick={onSkip}
        className="mt-4 text-xs text-[#71717a] hover:text-white"
      >
        Skip onboarding
      </button>
    </div>
  );
}

// ─── Step 2: Pick template ────────────────────────────────────────────────────

type TemplateItem = { id: string; name: string; description?: string | null };

function TemplateStep({
  onPick,
  onSkip,
}: {
  onPick: (template: TemplateItem) => void;
  onSkip: () => void;
}) {
  const { data } = useTemplates(true);
  const official =
    data?.templates?.filter((t) => t.is_official).slice(0, 3) ?? [];

  const fallback: TemplateItem[] = [
    { id: "invoice", name: "Invoice", description: "Professional invoice PDF" },
    { id: "receipt", name: "Receipt", description: "Simple payment receipt" },
    { id: "report", name: "Report", description: "Clean business report" },
  ];

  const items: TemplateItem[] = official.length ? official : fallback;

  return (
    <div>
      <h2 className="text-xl font-semibold">Pick a starter template</h2>
      <p className="mt-2 text-sm text-[#a1a1aa]">
        We&apos;ll fork it into your account so you can customise it freely.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {items.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-[#27272a] bg-[#0f1117] p-4"
          >
            <p className="text-sm font-semibold">{t.name}</p>
            <p className="mt-1 text-xs text-[#71717a]">
              {t.description ?? "Official template"}
            </p>
            <button
              onClick={() => onPick(t)}
              className="mt-4 w-full rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
            >
              Use this
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onSkip}
        className="mt-6 text-xs text-[#a1a1aa] hover:text-white"
      >
        Skip — I&apos;ll choose later
      </button>
    </div>
  );
}

// ─── Step 3: Edit fields ──────────────────────────────────────────────────────

function EditStep({
  templateId,
  onNext,
  onSkip,
}: {
  templateId: string | null;
  onNext: () => void;
  onSkip: () => void;
}) {
  const editorHref = templateId
    ? `/editor/${templateId}?onboarding=1&step=4`
    : "/dashboard";

  return (
    <div>
      <h2 className="text-xl font-semibold">Edit your template fields</h2>
      <p className="mt-2 text-sm text-[#a1a1aa]">
        Open the editor to fill in your data. The form view lets you edit
        fields without touching any markup.
      </p>
      <div className="mt-6 rounded-xl border border-[#27272a] bg-[#0f1117] p-4 text-sm text-[#71717a]">
        {templateId ? (
          <span>
            Template forked: <span className="font-mono text-white">{templateId}</span>
          </span>
        ) : (
          <span>No template selected — you can edit any template from the dashboard.</span>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={editorHref}
          className="rounded-md bg-[#3b82f6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
        >
          Open editor (form view)
        </Link>
        <button
          onClick={onNext}
          className="rounded-md border border-[#27272a] px-4 py-2 text-xs text-white hover:border-[#3f3f46]"
        >
          Continue
        </button>
      </div>
      <button
        onClick={onSkip}
        className="mt-4 block text-xs text-[#71717a] hover:text-white"
      >
        Skip — I&apos;ll edit later
      </button>
    </div>
  );
}

// ─── Step 4: Download PDF ─────────────────────────────────────────────────────

function DownloadStep({
  templateId,
  onNext,
}: {
  templateId: string | null;
  onNext: () => void;
}) {
  const editorHref = templateId ? `/editor/${templateId}` : "/dashboard";

  return (
    <div>
      <h2 className="text-xl font-semibold">Download your PDF</h2>
      <p className="mt-2 text-sm text-[#a1a1aa]">
        Head into the editor to render and download your first PDF.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={editorHref}
          className="rounded-md bg-[#3b82f6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
        >
          Open editor &amp; download
        </Link>
        <button
          onClick={onNext}
          className="rounded-md border border-[#27272a] px-4 py-2 text-xs text-white hover:border-[#3f3f46]"
        >
          Looks good! Continue →
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Use via API ──────────────────────────────────────────────────────

function ApiStep({
  templateId,
  apiKey,
  onFinish,
}: {
  templateId: string | null;
  apiKey: string | null;
  onFinish: () => void;
}) {
  const apiBaseUrl = env.apiUrl.replace(/\/+$/, "");
  const template = templateId ?? "tpl_your_template_id";
  const key = apiKey ?? "docu_live_your_key";

  const curlCommand = `curl -X POST "${apiBaseUrl}/v1/render" \\
  -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{ "template_id": "${template}", "data": {} }'`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard?.writeText(curlCommand);
    toast.success("curl command copied");
  }, [curlCommand]);

  return (
    <div>
      <div className="mb-2 text-4xl">👉</div>
      <h2 className="text-xl font-semibold">Use via API</h2>
      <p className="mt-2 text-sm text-[#a1a1aa]">
        Paste this into your terminal — or wire it into your backend. That&apos;s it.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0f1117] p-4 text-xs text-[#a1a1aa]">
        <code>{curlCommand}</code>
      </pre>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={handleCopy}
          className="rounded-md bg-[#3b82f6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"
        >
          Copy curl
        </button>
        <Link
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-[#27272a] px-4 py-2 text-xs text-white hover:border-[#3f3f46]"
        >
          Open API docs
        </Link>
        <button
          onClick={onFinish}
          className="rounded-md border border-[#27272a] px-4 py-2 text-xs text-white hover:border-[#3f3f46]"
        >
          Finish
        </button>
      </div>
    </div>
  );
}

// ─── Main OnboardingFlow ──────────────────────────────────────────────────────

type Props = {
  currentStep: OnboardingStep;
  onStep: (step: OnboardingStep) => void;
  onFinish: () => void;
  onSkip: () => void;
};

export function OnboardingFlow({ currentStep, onStep, onFinish, onSkip }: Props) {
  const forkTemplate = useForkTemplate({ navigate: false });
  const apiKey = useOnboardingStore((state) => state.apiKey);
  const forkedTemplateId = useOnboardingStore((state) => state.forkedTemplateId);
  const setForkedTemplateId = useOnboardingStore((state) => state.setForkedTemplateId);

  const totalSteps = 5;

  function handlePickTemplate(template: TemplateItem) {
    // If it's a real official template (has UUID-like id), fork it
    if (template.id && template.id.length > 10) {
      forkTemplate.mutate(
        { id: template.id, name: `${template.name} Copy` },
        {
          onSuccess: (data) => {
            setForkedTemplateId(data.template.id);
            onStep(3);
          },
          onError: () => {
            // Best-effort: continue without fork
            onStep(3);
          },
        }
      );
    } else {
      onStep(3);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding flow"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#27272a] bg-[#111113] p-8 text-white shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs text-[#71717a]">
            Step {currentStep} / {totalSteps}
          </span>
          <button
            onClick={onSkip}
            className="text-xs text-[#71717a] hover:text-white"
            aria-label="Skip onboarding"
          >
            Skip onboarding ×
          </button>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i + 1 <= currentStep ? "bg-[#3b82f6]" : "bg-[#27272a]"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        {currentStep === 1 && (
          <WelcomeStep onNext={() => onStep(2)} onSkip={onSkip} />
        )}
        {currentStep === 2 && (
          <TemplateStep
            onPick={handlePickTemplate}
            onSkip={() => onStep(3)}
          />
        )}
        {currentStep === 3 && (
          <EditStep
            templateId={forkedTemplateId}
            onNext={() => onStep(4)}
            onSkip={() => onStep(4)}
          />
        )}
        {currentStep === 4 && (
          <DownloadStep
            templateId={forkedTemplateId}
            onNext={() => onStep(5)}
          />
        )}
        {currentStep === 5 && (
          <ApiStep
            templateId={forkedTemplateId}
            apiKey={apiKey}
            onFinish={onFinish}
          />
        )}
      </div>
    </div>
  );
}
