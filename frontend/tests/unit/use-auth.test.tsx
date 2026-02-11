import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLogin, useRegister } from "@/src/hooks/use-auth";
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
});
