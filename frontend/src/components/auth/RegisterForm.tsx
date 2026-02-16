"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@/src/hooks/use-auth";
import type { ApiError } from "@/src/lib/api-types";
import { OAuthButtons } from "@/src/components/auth/OAuthButtons";
import { useI18n } from "@/src/lib/i18n";

type FormValues = { email: string; password: string; confirmPassword: string };

export function RegisterForm() {
  const { messages } = useI18n();
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const errorMessage = (() => {
    if (!registerMutation.isError) return null;
    const error = registerMutation.error as unknown as ApiError | undefined;
    if (error?.error === "conflict") {
      return messages.auth.errorEmailExists;
    }
    if (error?.error === "unknown_error") {
      return error.message || messages.auth.errorApiUnavailable;
    }
    return error?.message || messages.auth.errorRegisterFailed;
  })();

  return (
    <form
      onSubmit={handleSubmit((values) =>
        registerMutation.mutate({
          email: values.email,
          password: values.password,
        })
      )}
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
  );
}
