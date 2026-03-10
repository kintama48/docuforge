"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  extractApiErrorMessage,
  isTwoFactorRequiredResponse,
  isVerificationRequiredResponse,
  useLogin,
  useResendEmailVerification,
  useResendTwoFactor,
  useVerifyEmail,
  useVerifyTwoFactor,
} from "@/src/hooks/use-auth";
import { OAuthButtons } from "@/src/components/auth/OAuthButtons";
import type { ApiError } from "@/src/lib/api-types";
import { useI18n } from "@/src/lib/i18n";

type FormValues = { email: string; password: string };
type LoginStep = "credentials" | "verify-email" | "two-factor";

function parseApiError(error: unknown): ApiError | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as Record<string, unknown>;
  const errorCode = typeof candidate.error === "string" ? candidate.error : "unknown_error";
  const message = typeof candidate.message === "string" ? candidate.message : "";
  const details =
    candidate.details && typeof candidate.details === "object"
      ? (candidate.details as Record<string, unknown>)
      : undefined;
  return { error: errorCode, message, details };
}

export function LoginForm() {
  const { messages } = useI18n();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resendRemainingMs, setResendRemainingMs] = useState<number>(0);

  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1, messages.auth.passwordRequired),
  });

  const login = useLogin();
  const verifyEmail = useVerifyEmail();
  const resendEmail = useResendEmailVerification();
  const verifyTwoFactor = useVerifyTwoFactor();
  const resendTwoFactor = useResendTwoFactor();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const errorMessage = (() => {
    if (step !== "credentials") return null;
    if (!login.isError) return null;
    const error = parseApiError(login.error);
    if (error?.error === "unknown_error") {
      return error.message || messages.auth.errorApiUnavailable;
    }
    return error?.message || messages.auth.errorInvalidCredentials;
  })();

  const challengeError = (() => {
    if (step === "credentials") return null;

    if (step === "verify-email") {
      if (verifyEmail.isError) {
        return extractApiErrorMessage(
          verifyEmail.error,
          messages.auth.errorVerifyEmailCode
        );
      }
      if (resendEmail.isError) {
        return extractApiErrorMessage(
          resendEmail.error,
          messages.auth.errorResendVerificationCode
        );
      }
      return null;
    }

    if (verifyTwoFactor.isError) {
      return extractApiErrorMessage(
        verifyTwoFactor.error,
        messages.auth.errorVerifyTwoFactorCode
      );
    }
    if (resendTwoFactor.isError) {
      return extractApiErrorMessage(
        resendTwoFactor.error,
        messages.auth.errorResendTwoFactorCode
      );
    }
    return null;
  })();

  useEffect(() => {
    if (resendRemainingMs <= 0) return;

    const timer = window.setInterval(() => {
      setResendRemainingMs((current) =>
        current <= 1000 ? 0 : current - 1000
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendRemainingMs]);

  async function submitCredentials(values: FormValues) {
    setStatusMessage(null);

    try {
      const response = await login.mutateAsync(values);

      if (isVerificationRequiredResponse(response)) {
        setStep("verify-email");
        setChallengeId(response.challenge_id);
        setResendRemainingMs(Math.max(0, response.resend_after_ms));
        setVerificationCode("");
        return;
      }

      if (isTwoFactorRequiredResponse(response)) {
        setStep("two-factor");
        setChallengeId(response.challenge_id);
        setResendRemainingMs(Math.max(0, response.resend_after_ms));
        setVerificationCode("");
      }
    } catch {
      // Mutation error state is surfaced through `login.isError`.
    }
  }

  async function submitChallengeCode() {
    if (!challengeId) return;
    setStatusMessage(null);

    try {
      if (step === "verify-email") {
        await verifyEmail.mutateAsync({
          challenge_id: challengeId,
          code: verificationCode,
        });
        return;
      }

      await verifyTwoFactor.mutateAsync({
        challenge_id: challengeId,
        code: verificationCode,
      });
    } catch {
      // Mutation errors are rendered through `challengeError`.
    }
  }

  async function resendCode() {
    if (!challengeId) return;
    setStatusMessage(null);

    try {
      const response =
        step === "verify-email"
          ? await resendEmail.mutateAsync({ challenge_id: challengeId })
          : await resendTwoFactor.mutateAsync({ challenge_id: challengeId });

      setChallengeId(response.challenge_id);
      setResendRemainingMs(Math.max(0, response.resend_after_ms));
      setStatusMessage(response.sent ? messages.auth.resendSuccess : null);
    } catch {
      // Mutation errors are rendered through `challengeError`.
    }
  }

  function resetToCredentials() {
    setStep("credentials");
    setChallengeId(null);
    setResendRemainingMs(0);
    setVerificationCode("");
    setStatusMessage(null);
    verifyEmail.reset();
    resendEmail.reset();
    verifyTwoFactor.reset();
    resendTwoFactor.reset();
  }

  const challengeTitle =
    step === "verify-email" ? messages.auth.verifyEmailTitle : messages.auth.twoFactorTitle;
  const challengeSubtitle =
    step === "verify-email"
      ? messages.auth.verifyEmailChallengeSubtitle
      : messages.auth.twoFactorChallengeSubtitle;
  const verifying = step === "verify-email" ? verifyEmail.isPending : verifyTwoFactor.isPending;
  const resending = step === "verify-email" ? resendEmail.isPending : resendTwoFactor.isPending;
  const resendRemainingSeconds = Math.ceil(resendRemainingMs / 1000);
  const resendButtonLabel = resending
    ? messages.auth.resendingButton
    : resendRemainingMs > 0
      ? messages.auth.resendCodeIn.replace("{seconds}", String(resendRemainingSeconds))
      : messages.auth.resendCodeButton;

  return (
    <div className="space-y-4">
      {step === "credentials" ? (
        <form
          onSubmit={handleSubmit((values) => void submitCredentials(values))}
          className="space-y-4"
        >
          <OAuthButtons />
          <div className="flex items-center gap-3 text-xs text-[#71717a]">
            <span className="h-px flex-1 bg-[#27272a]" />
            <span>{messages.auth.orDivider}</span>
            <span className="h-px flex-1 bg-[#27272a]" />
          </div>
          <div>
            <label htmlFor="email" className="text-sm text-[#a1a1aa]">
              {messages.auth.emailLabel}
            </label>
            <input
              {...register("email")}
              id="email"
              type="email"
              autoFocus
              className="mt-2 w-full rounded-md border border-[#27272a] bg-[#0f1117] px-3 py-2 text-white outline-none focus:border-[#3b82f6]"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-[#ef4444]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="text-sm text-[#a1a1aa]">
              {messages.auth.passwordLabel}
            </label>
            <input
              {...register("password")}
              id="password"
              type="password"
              className="mt-2 w-full rounded-md border border-[#27272a] bg-[#0f1117] px-3 py-2 text-white outline-none focus:border-[#3b82f6]"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-[#ef4444]">
                {errors.password.message}
              </p>
            )}
          </div>

          {errorMessage && (
            <p className="text-sm text-[#ef4444]">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full rounded-md bg-[#3b82f6] py-2 text-sm font-semibold text-white transition hover:bg-[#2563eb] disabled:opacity-60"
          >
            {login.isPending ? messages.auth.loginLoading : messages.auth.loginButton}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitChallengeCode();
          }}
          className="space-y-4"
        >
          <div>
            <h2 className="text-sm font-semibold text-white">{challengeTitle}</h2>
            <p className="mt-1 text-xs text-[#a1a1aa]">{challengeSubtitle}</p>
          </div>

          <div>
            <label htmlFor="verificationCode" className="text-sm text-[#a1a1aa]">
              {messages.auth.verificationCodeLabel}
            </label>
            <input
              id="verificationCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
              className="mt-2 w-full rounded-md border border-[#27272a] bg-[#0f1117] px-3 py-2 text-white outline-none focus:border-[#3b82f6]"
            />
          </div>

          {statusMessage && (
            <p className="text-xs text-[#10b981]">{statusMessage}</p>
          )}
          {challengeError && (
            <p className="text-sm text-[#ef4444]">{challengeError}</p>
          )}

          <button
            type="submit"
            disabled={verifying || verificationCode.length !== 6}
            className="w-full rounded-md bg-[#3b82f6] py-2 text-sm font-semibold text-white transition hover:bg-[#2563eb] disabled:opacity-60"
          >
            {verifying ? messages.auth.verifyingButton : messages.auth.verifyCodeButton}
          </button>

          <button
            type="button"
            onClick={() => void resendCode()}
            disabled={resending || !challengeId || resendRemainingMs > 0}
            className="w-full rounded-md border border-[#27272a] bg-transparent py-2 text-sm font-semibold text-white transition hover:border-[#3f3f46] disabled:opacity-60"
          >
            {resendButtonLabel}
          </button>

          <button
            type="button"
            onClick={resetToCredentials}
            className="w-full rounded-md border border-transparent bg-transparent py-2 text-xs text-[#a1a1aa] transition hover:text-white"
          >
            {messages.auth.useDifferentEmail}
          </button>
        </form>
      )}
    </div>
  );
}
