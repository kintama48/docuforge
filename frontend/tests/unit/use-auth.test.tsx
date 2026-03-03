import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useLogin,
  useRegister,
  useResendEmailVerification,
  useResendTwoFactor,
  useVerifyEmail,
  useVerifyTwoFactor,
} from "@/src/hooks/use-auth";
import { useAuthStore } from "@/src/stores/auth";
import { useOnboardingStore } from "@/src/stores/onboarding";
import type { ReactNode } from "react";

const post = vi.fn();
const push = vi.fn();

vi.mock("@/src/lib/api", () => ({
  api: { post: (...args: any[]) => post(...args) },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({
    get: () => "/welcome",
  }),
}));

describe("use-auth hooks", () => {
  function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    post.mockReset();
    push.mockReset();
    useAuthStore.setState({ token: null, user: null });
    useOnboardingStore.setState({ apiKey: null });
  });

  it("logs in and redirects", async () => {
    const loginSpy = vi.spyOn(useAuthStore.getState(), "login");
    post.mockResolvedValue({
      token: "tok",
      user: { id: "usr", email: "test@docuforge.dev", plan: "free" },
    });

    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        email: "test@docuforge.dev",
        password: "password",
      });
    });

    expect(loginSpy).toHaveBeenCalledWith("tok", {
      id: "usr",
      email: "test@docuforge.dev",
      plan: "free",
    });
    expect(push).toHaveBeenCalledWith("/welcome");
  });

  it("registers and stores api key", async () => {
    const loginSpy = vi.spyOn(useAuthStore.getState(), "login");
    const setApiKeySpy = vi.spyOn(useOnboardingStore.getState(), "setApiKey");
    post.mockResolvedValue({
      token: "tok",
      user: { id: "usr", email: "new@docuforge.dev", plan: "starter" },
      api_key: { raw_key: "docu_live_new", prefix: "docu_live_" },
    });

    const { result } = renderHook(() => useRegister(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        email: "new@docuforge.dev",
        password: "password123",
      });
    });

    expect(loginSpy).toHaveBeenCalledWith("tok", {
      id: "usr",
      email: "new@docuforge.dev",
      plan: "starter",
    });
    expect(setApiKeySpy).toHaveBeenCalledWith("docu_live_new");
    expect(push).toHaveBeenCalledWith("/onboarding");
  });

  it("keeps login pending when email verification is required", async () => {
    const loginSpy = vi.spyOn(useAuthStore.getState(), "login");
    post.mockResolvedValue({
      verification_required: true,
      challenge_id: "otp_login_verify",
      expires_in_ms: 600000,
      resend_after_ms: 30000,
    });

    const { result } = renderHook(() => useLogin(), { wrapper });
    let response: unknown;

    await act(async () => {
      response = await result.current.mutateAsync({
        email: "secure@docuforge.dev",
        password: "password",
      });
    });

    expect(response).toMatchObject({
      verification_required: true,
      challenge_id: "otp_login_verify",
    });
    expect(loginSpy).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps login pending when 2FA is required", async () => {
    const loginSpy = vi.spyOn(useAuthStore.getState(), "login");
    post.mockResolvedValue({
      two_factor_required: true,
      challenge_id: "otp_login_2fa",
      expires_in_ms: 600000,
      resend_after_ms: 30000,
      user: { id: "usr", email: "secure@docuforge.dev", plan: "free" },
    });

    const { result } = renderHook(() => useLogin(), { wrapper });
    let response: unknown;

    await act(async () => {
      response = await result.current.mutateAsync({
        email: "secure@docuforge.dev",
        password: "password",
      });
    });

    expect(response).toMatchObject({
      two_factor_required: true,
      challenge_id: "otp_login_2fa",
    });
    expect(loginSpy).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps register pending when email verification is required", async () => {
    const loginSpy = vi.spyOn(useAuthStore.getState(), "login");
    post.mockResolvedValue({
      verification_required: true,
      challenge_id: "otp_register_verify",
      expires_in_ms: 600000,
      resend_after_ms: 30000,
      user: { id: "usr", email: "new@docuforge.dev", plan: "free" },
    });

    const { result } = renderHook(() => useRegister(), { wrapper });
    let response: unknown;

    await act(async () => {
      response = await result.current.mutateAsync({
        email: "new@docuforge.dev",
        password: "password123",
      });
    });

    expect(response).toMatchObject({
      verification_required: true,
      challenge_id: "otp_register_verify",
    });
    expect(loginSpy).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("verifies email and routes to onboarding when api key is returned", async () => {
    const loginSpy = vi.spyOn(useAuthStore.getState(), "login");
    const setApiKeySpy = vi.spyOn(useOnboardingStore.getState(), "setApiKey");
    post.mockResolvedValue({
      email_verified: true,
      token: "tok_verify",
      user: { id: "usr", email: "new@docuforge.dev", plan: "free" },
      api_key: {
        raw_key: "docu_live_verify",
        prefix: "docu_live_",
        name: "Default",
        note: "Save this key",
      },
    });

    const { result } = renderHook(() => useVerifyEmail(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        challenge_id: "otp_register_verify",
        code: "123456",
      });
    });

    expect(post).toHaveBeenCalledWith("/v1/auth/verify-email", {
      challenge_id: "otp_register_verify",
      code: "123456",
    });
    expect(loginSpy).toHaveBeenCalledWith("tok_verify", {
      id: "usr",
      email: "new@docuforge.dev",
      plan: "free",
    });
    expect(setApiKeySpy).toHaveBeenCalledWith("docu_live_verify");
    expect(push).toHaveBeenCalledWith("/onboarding");
  });

  it("verifies email and routes to redirect when api key is not returned", async () => {
    const loginSpy = vi.spyOn(useAuthStore.getState(), "login");
    const setApiKeySpy = vi.spyOn(useOnboardingStore.getState(), "setApiKey");
    post.mockResolvedValue({
      email_verified: true,
      token: "tok_verify_login",
      user: { id: "usr", email: "secure@docuforge.dev", plan: "free" },
    });

    const { result } = renderHook(() => useVerifyEmail(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        challenge_id: "otp_login_verify",
        code: "123456",
      });
    });

    expect(loginSpy).toHaveBeenCalledWith("tok_verify_login", {
      id: "usr",
      email: "secure@docuforge.dev",
      plan: "free",
    });
    expect(setApiKeySpy).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/welcome");
  });

  it("verifies two-factor code and routes to redirect", async () => {
    const loginSpy = vi.spyOn(useAuthStore.getState(), "login");
    post.mockResolvedValue({
      token: "tok_2fa",
      user: { id: "usr", email: "secure@docuforge.dev", plan: "free" },
    });

    const { result } = renderHook(() => useVerifyTwoFactor(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        challenge_id: "otp_login_2fa",
        code: "123456",
      });
    });

    expect(post).toHaveBeenCalledWith("/v1/auth/2fa/verify", {
      challenge_id: "otp_login_2fa",
      code: "123456",
    });
    expect(loginSpy).toHaveBeenCalledWith("tok_2fa", {
      id: "usr",
      email: "secure@docuforge.dev",
      plan: "free",
    });
    expect(push).toHaveBeenCalledWith("/welcome");
  });

  it("resends verification and 2FA challenges", async () => {
    post.mockResolvedValue({
      sent: true,
      challenge_id: "otp_resend",
      expires_in_ms: 600000,
      resend_after_ms: 30000,
    });

    const { result: emailResend } = renderHook(() => useResendEmailVerification(), {
      wrapper,
    });
    const { result: twoFactorResend } = renderHook(() => useResendTwoFactor(), {
      wrapper,
    });

    await act(async () => {
      await emailResend.current.mutateAsync({ challenge_id: "otp_email" });
      await twoFactorResend.current.mutateAsync({ challenge_id: "otp_2fa" });
    });

    expect(post).toHaveBeenNthCalledWith(1, "/v1/auth/resend-verification", {
      challenge_id: "otp_email",
    });
    expect(post).toHaveBeenNthCalledWith(2, "/v1/auth/2fa/resend", {
      challenge_id: "otp_2fa",
    });
  });
});
