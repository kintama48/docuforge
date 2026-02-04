"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import type { AiEditResponse } from "@/src/lib/api-types";

type AiPayload = {
  prompt: string;
  current_code: string;
  asset_names: string[];
};

export type AiCredits = {
  remaining: number | null;
  limit: number | null;
  resetAt: number | null;
};

type AiResponseWithCredits = AiEditResponse & { credits: AiCredits };

function extractCredits(response: Response): AiCredits {
  const limit = response.headers.get("X-RateLimit-Limit");
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");
  return {
    limit: limit ? Number(limit) : null,
    remaining: remaining ? Number(remaining) : null,
    resetAt: reset ? Number(reset) * 1000 : null,
  };
}

export function useAiEdit() {
  return useMutation({
    mutationFn: async (payload: AiPayload) => {
      const response = await api.postRaw("/v1/ai/edit", payload);
      const data = (await response.json()) as AiEditResponse;
      return { ...data, credits: extractCredits(response) } as AiResponseWithCredits;
    },
  });
}

export function useAiGenerate() {
  return useMutation({
    mutationFn: async (payload: { image_base64: string }) => {
      const response = await api.postRaw("/v1/ai/generate", payload);
      const data = (await response.json()) as AiEditResponse;
      return { ...data, credits: extractCredits(response) } as AiResponseWithCredits;
    },
  });
}
