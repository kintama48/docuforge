import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/src/hooks/use-api-keys";
import type { ReactNode } from "react";

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiDelete = vi.fn();

vi.mock("@/src/lib/api", () => ({
  api: {
    get: (...args: any[]) => apiGet(...args),
    post: (...args: any[]) => apiPost(...args),
    delete: (...args: any[]) => apiDelete(...args),
  },
}));

describe("use-api-keys hooks", () => {
  let client: QueryClient;

  function wrapper({ children }: { children: ReactNode }) {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiDelete.mockReset();
  });

  it("fetches api keys", async () => {
    apiGet.mockResolvedValue({ keys: [] });
    renderHook(() => useApiKeys(), { wrapper });
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/v1/auth/keys"));
  });

  it("creates keys and invalidates queries", async () => {
    apiPost.mockResolvedValue({ raw_key: "docu_live_new", prefix: "docu_live_" });

    const { result } = renderHook(() => useCreateApiKey(), { wrapper });
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    await act(async () => {
      await result.current.mutateAsync({ name: "New key" });
    });

    expect(apiPost).toHaveBeenCalledWith("/v1/auth/keys", { name: "New key" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["api-keys"] });
  });

  it("revokes keys and invalidates queries", async () => {
    apiDelete.mockResolvedValue(null);

    const { result } = renderHook(() => useRevokeApiKey(), { wrapper });
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    await act(async () => {
      await result.current.mutateAsync("key_1");
    });

    expect(apiDelete).toHaveBeenCalledWith("/v1/auth/keys/key_1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["api-keys"] });
  });
});
