"use client";

import { useState, useEffect } from "react";

const ONBOARDED_KEY = "docuforge_onboarded";
const STEP_KEY = "docuforge_onboarding_step";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export function useOnboardingState() {
  const [showFlow, setShowFlow] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem(ONBOARDED_KEY);
    if (!onboarded) {
      const savedStep = localStorage.getItem(STEP_KEY);
      const step = savedStep ? (Number(savedStep) as OnboardingStep) : 1;
      setCurrentStep(step >= 1 && step <= 5 ? step : 1);
      setShowFlow(true);
    }
    setHydrated(true);
  }, []);

  function goToStep(step: OnboardingStep) {
    setCurrentStep(step);
    localStorage.setItem(STEP_KEY, String(step));
  }

  function finish() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    localStorage.removeItem(STEP_KEY);
    setShowFlow(false);
  }

  function skip() {
    finish();
  }

  return { showFlow, currentStep, hydrated, goToStep, finish, skip };
}
