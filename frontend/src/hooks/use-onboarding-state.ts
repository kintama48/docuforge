"use client";

import { useState } from "react";

const ONBOARDED_KEY = "docuforge_onboarded";
const STEP_KEY = "docuforge_onboarding_step";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

function readSavedStep(): OnboardingStep {
  const savedStep = localStorage.getItem(STEP_KEY);
  const step = savedStep ? Number(savedStep) : 1;
  return step >= 1 && step <= 5 ? (step as OnboardingStep) : 1;
}

function readInitialState(): {
  showFlow: boolean;
  currentStep: OnboardingStep;
  hydrated: boolean;
} {
  if (typeof window === "undefined") {
    return { showFlow: false, currentStep: 1, hydrated: false };
  }

  const onboarded = localStorage.getItem(ONBOARDED_KEY);
  return {
    showFlow: !onboarded,
    currentStep: onboarded ? 1 : readSavedStep(),
    hydrated: true,
  };
}

export function useOnboardingState() {
  const [state, setState] = useState(readInitialState);

  function goToStep(step: OnboardingStep) {
    localStorage.setItem(STEP_KEY, String(step));
    setState((current) => ({ ...current, currentStep: step }));
  }

  function finish() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    localStorage.removeItem(STEP_KEY);
    setState((current) => ({ ...current, showFlow: false }));
  }

  function skip() {
    finish();
  }

  return { ...state, goToStep, finish, skip };
}
