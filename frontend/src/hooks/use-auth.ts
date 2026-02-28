"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/src/lib/api";
import type {
  ApiKeyReveal,
  LoginResult,
  RegisterResult,
  ResendChallengeResponse,
  User,
  VerifyEmailResponse,
  VerifyTwoFactorResponse,
} from "@/src/lib/api-types";
import { useAuthStore } from "@/src/stores/auth";
import { useOnboardingStore } from "@/src/stores/onboarding";
import { sanitizeAppRedirect } from "@/src/lib/redirect";

type LoginPayload = { email: string; password: string };
type RegisterPayload = { email: string; password: string };
type VerifyCodePayload = { challenge_id: string; code: string };
type ResendCodePayload = { challenge_id: string };

const DEFAULT_REDIRECT = "/dashboard";
const ONBOARDING_REDIRECT = "/onboarding";

function hasAuthToken(
  response: unknown
): response is { token: string; user: User } {
  if (!response || typeof response !== "object") return false;
  const candidate = response as Record<string, unknown>;
  const user = candidate.user;
  if (typeof candidate.token !== "string" || !user || typeof user !== "object") return false;

  const typedUser = user as Record<string, unknown>;
  const plan = typedUser.plan;
  const validPlan =
    plan === "free" || plan === "dev" || plan === "starter" || plan === "pro";

  return (
    typeof typedUser.id === "string" &&
    typeof typedUser.email === "string" &&
    validPlan
  );
}

function hasApiKey(response: unknown): response is { api_key: ApiKeyReveal } {
  if (!response || typeof response !== "object") return false;
  const candidate = response as Record<string, unknown>;
  const apiKey = candidate.api_key;
  if (!apiKey || typeof apiKey !== "object") return false;
  return typeof (apiKey as Record<string, unknown>).raw_key === "string";
}

function useResolvedAuthRedirect(defaultPath = DEFAULT_REDIRECT): string {
  const searchParams = useSearchParams();
  return sanitizeAppRedirect(searchParams?.get("redirect"), defaultPath);
}

export function useLogin() {
  const router = useRouter();
  const redirect = useResolvedAuthRedirect();

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      api.post<LoginResult>("/v1/auth/login", payload),
    onSuccess: (data) => {
      if (!hasAuthToken(data)) return;
      useAuthStore.getState().login(data.token, data.user);
      router.push(redirect);
    },
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      api.post<RegisterResult>("/v1/auth/register", payload),
    onSuccess: (data) => {
      if (!hasAuthToken(data) || !hasApiKey(data)) return;
      useAuthStore.getState().login(data.token, data.user);
      useOnboardingStore.getState().setApiKey(data.api_key.raw_key);
      router.push(ONBOARDING_REDIRECT);
    },
  });
}

export function useVerifyEmail() {
  const router = useRouter();
  const redirect = useResolvedAuthRedirect();

  return useMutation({
    mutationFn: (payload: VerifyCodePayload) =>
      api.post<VerifyEmailResponse>("/v1/auth/verify-email", payload),
    onSuccess: (data) => {
      useAuthStore.getState().login(data.token, data.user);

      if (data.api_key?.raw_key) {
        useOnboardingStore.getState().setApiKey(data.api_key.raw_key);
        router.push(ONBOARDING_REDIRECT);
        return;
      }

      router.push(redirect);
    },
  });
}

export function useResendEmailVerification() {
  return useMutation({
    mutationFn: (payload: ResendCodePayload) =>
      api.post<ResendChallengeResponse>("/v1/auth/resend-verification", payload),
  });
}

export function useVerifyTwoFactor() {
  const router = useRouter();
  const redirect = useResolvedAuthRedirect();

  return useMutation({
    mutationFn: (payload: VerifyCodePayload) =>
      api.post<VerifyTwoFactorResponse>("/v1/auth/2fa/verify", payload),
    onSuccess: (data) => {
      useAuthStore.getState().login(data.token, data.user);
      router.push(redirect);
    },
  });
}

export function useResendTwoFactor() {
  return useMutation({
    mutationFn: (payload: ResendCodePayload) =>
      api.post<ResendChallengeResponse>("/v1/auth/2fa/resend", payload),
  });
}

export function isVerificationRequiredResponse(
  data: LoginResult | RegisterResult
): data is Extract<LoginResult | RegisterResult, { verification_required: true }> {
  return (
    typeof data === "object" &&
    data !== null &&
    "verification_required" in data &&
    data.verification_required === true &&
    typeof (data as { challenge_id?: unknown }).challenge_id === "string"
  );
}

export function isTwoFactorRequiredResponse(
  data: LoginResult
): data is Extract<LoginResult, { two_factor_required: true }> {
  return (
    typeof data === "object" &&
    data !== null &&
    "two_factor_required" in data &&
    data.two_factor_required === true &&
    typeof (data as { challenge_id?: unknown }).challenge_id === "string"
  );
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}
