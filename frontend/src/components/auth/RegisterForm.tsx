"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  extractApiErrorMessage,
  isVerificationRequiredResponse,
  useRegister,
  useResendEmailVerification,
  useVerifyEmail,
} from "@/src/hooks/use-auth";
import type { ApiError } from "@/src/lib/api-types";
import { OAuthButtons } from "@/src/components/auth/OAuthButtons";
import { useI18n } from "@/src/lib/i18n";

type FormValues = { email: string; password: string; confirmPassword: string };
type RegisterStep = "credentials" | "verify-email";

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

export function RegisterForm() {
  const { messages } = useI18n();
  const [step, setStep] = useState<RegisterStep>("credentials");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resendRemainingMs, setResendRemainingMs] = useState<number>(0);

  const schema = z
    .object({
      email: z.string().email(),
      password: z.string().min(8, messages.auth.passwordMin),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.auth.passwordMismatch,
      path: ["confirmPassword"],
    });

  const registerMutation = useRegister();
  const verifyEmail = useVerifyEmail();
  const resendEmail = useResendEmailVerification();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const errorMessage = (() => {
    if (step !== "credentials") return null;
    if (!registerMutation.isError) return null;
    const error = parseApiError(registerMutation.error);
    if (error?.error === "conflict") {
      return messages.auth.errorEmailExists;
    }
    if (error?.error === "unknown_error") {
      return error.message || messages.auth.errorApiUnavailable;
    }
    return error?.message || messages.auth.errorRegisterFailed;
  })();

  const challengeError = (() => {
    if (step !== "verify-email") return null;

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

  async function submitRegistration(values: FormValues) {
    setStatusMessage(null);

    try {
      const response = await registerMutation.mutateAsync({
        email: values.email,
        password: values.password,
      });

      if (isVerificationRequiredResponse(response)) {
        setStep("verify-email");
        setChallengeId(response.challenge_id);
        setResendRemainingMs(Math.max(0, response.resend_after_ms));
        setVerificationCode("");
      }
    } catch {
      // Mutation error state is rendered by the form.
    }
  }

  async function submitVerificationCode() {
    if (!challengeId) return;
    setStatusMessage(null);

    try {
      await verifyEmail.mutateAsync({
        challenge_id: challengeId,
        code: verificationCode,
      });
    } catch {
      // Mutation error state is rendered by the form.
    }
  }

  async function resendCode() {
    if (!challengeId) return;
    setStatusMessage(null);

    try {
      const response = await resendEmail.mutateAsync({
        challenge_id: challengeId,
      });
      setChallengeId(response.challenge_id);
      setResendRemainingMs(Math.max(0, response.resend_after_ms));
      setStatusMessage(response.sent ? messages.auth.resendSuccess : null);
    } catch {
      // Mutation error state is rendered by the form.
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
  }

  const resendRemainingSeconds = Math.ceil(resendRemainingMs / 1000);
  const resendButtonLabel = resendEmail.isPending
    ? messages.auth.resendingButton
    : resendRemainingMs > 0
      ? messages.auth.resendCodeIn.replace("{seconds}", String(resendRemainingSeconds))
      : messages.auth.resendCodeButton;

  return (
    <div className="space-y-4">
      {step === "credentials" ? (
        <form
          onSubmit={handleSubmit((values) => void submitRegistration(values))}
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

          <div>
            <label htmlFor="confirmPassword" className="text-sm text-[#a1a1aa]">
              {messages.auth.confirmPasswordLabel}
            </label>
            <input
              {...register("confirmPassword")}
              id="confirmPassword"
              type="password"
              className="mt-2 w-full rounded-md border border-[#27272a] bg-[#0f1117] px-3 py-2 text-white outline-none focus:border-[#3b82f6]"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-[#ef4444]">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {errorMessage && (
            <p className="text-sm text-[#ef4444]">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full rounded-md bg-[#3b82f6] py-2 text-sm font-semibold text-white transition hover:bg-[#2563eb] disabled:opacity-60"
          >
            {registerMutation.isPending
              ? messages.auth.registerLoading
              : messages.auth.registerButton}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitVerificationCode();
          }}
          className="space-y-4"
        >
          <div>
            <h2 className="text-sm font-semibold text-white">{messages.auth.verifyEmailTitle}</h2>
            <p className="mt-1 text-xs text-[#a1a1aa]">
              {messages.auth.registerVerifyEmailSubtitle}
            </p>
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
            disabled={verifyEmail.isPending || verificationCode.length !== 6}
            className="w-full rounded-md bg-[#3b82f6] py-2 text-sm font-semibold text-white transition hover:bg-[#2563eb] disabled:opacity-60"
          >
            {verifyEmail.isPending ? messages.auth.verifyingButton : messages.auth.verifyEmailButton}
          </button>

          <button
            type="button"
            onClick={() => void resendCode()}
            disabled={resendEmail.isPending || !challengeId || resendRemainingMs > 0}
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
