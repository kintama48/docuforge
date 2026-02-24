"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/src/lib/api";
import type { LoginResponse, RegisterResponse } from "@/src/lib/api-types";
import { useAuthStore } from "@/src/stores/auth";
import { useOnboardingStore } from "@/src/stores/onboarding";
import { sanitizeAppRedirect } from "@/src/lib/redirect";

type LoginPayload = { email: string; password: string };
type RegisterPayload = { email: string; password: string };

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = sanitizeAppRedirect(searchParams?.get("redirect"), "/dashboard");

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      api.post<LoginResponse>("/v1/auth/login", payload),
    onSuccess: (data) => {
      useAuthStore.getState().login(data.token, data.user);
      router.push(redirect);
    },
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      api.post<RegisterResponse>("/v1/auth/register", payload),
    onSuccess: (data) => {
      useAuthStore.getState().login(data.token, data.user);
      useOnboardingStore.getState().setApiKey(data.api_key.raw_key);
      router.push("/onboarding");
    },
  });
}
