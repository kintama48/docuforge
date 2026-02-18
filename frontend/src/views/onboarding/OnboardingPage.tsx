"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/src/components/auth/ProtectedRoute";
import { useTemplates, useForkTemplate } from "@/src/hooks/use-templates";
import { useOnboardingStore } from "@/src/stores/onboarding";
import { TemplatePickerStep } from "@/src/components/onboarding/TemplatePickerStep";
import { ApiKeyRevealStep } from "@/src/components/onboarding/ApiKeyRevealStep";
import { QuickStartStep } from "@/src/components/onboarding/QuickStartStep";
import { useI18n } from "@/src/lib/i18n";

export default function OnboardingPage() {
  const { messages } = useI18n();
  const starterNames = messages.templates.items.slice(0, 5);
  const [step, setStep] = useState(1);
  const { data } = useTemplates(true);
  const forkTemplate = useForkTemplate({ navigate: false });
  const apiKey = useOnboardingStore((state) => state.apiKey);
  const setForkedTemplateId = useOnboardingStore(
    (state) => state.setForkedTemplateId
  );
  const forkedTemplateId = useOnboardingStore(
    (state) => state.forkedTemplateId
  );

  const templates =
    data?.templates?.filter((template) => template.is_official) || [];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0b] px-6 py-12 text-white">
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">
              {messages.onboarding.title}
            </h1>
            <p className="text-xs text-[#71717a]">
              {messages.onboarding.stepLabel} {step} / 3
            </p>
          </div>

          {step === 1 && (
            <TemplatePickerStep
              templates={templates}
              fallbackNames={starterNames}
              onPick={(template) => {
                if (template.id && templates.length) {
                  forkTemplate.mutate(
                    { id: template.id, name: `${template.name} Copy` },
                    {
                      onSuccess: (data) => {
                        setForkedTemplateId(data.template.id);
                        setStep(2);
                      },
                    }
                  );
                } else {
                  setForkedTemplateId(null);
                  setStep(2);
                }
              }}
              onSkip={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <ApiKeyRevealStep
              apiKey={apiKey}
              onContinue={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <QuickStartStep apiKey={apiKey} templateId={forkedTemplateId} />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
