"use client";

import { create } from "zustand";

type OnboardingState = {
  apiKey: string | null;
  forkedTemplateId: string | null;
  setApiKey: (apiKey: string | null) => void;
  setForkedTemplateId: (id: string | null) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  apiKey: null,
  forkedTemplateId: null,
  setApiKey: (apiKey) => set({ apiKey }),
  setForkedTemplateId: (id) => set({ forkedTemplateId: id }),
  reset: () => set({ apiKey: null, forkedTemplateId: null }),
}));
