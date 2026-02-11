import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAiEdit, useAiGenerate } from "@/src/hooks/use-ai";
import type { ReactNode } from "react";

const postRaw = vi.fn();

vi.mock("@/src/lib/api", () => ({
  api: { postRaw: (...args: any[]) => postRaw(...args) },
}));

describe("use-ai hooks", () => {
  function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    postRaw.mockReset();
  });

  it("extracts credits from rate limit headers", async () => {
    postRaw.mockResolvedValue(
      new Response(JSON.stringify({ code: "#set page()", tokens_used: 12 }), {
        status: 200,
        headers: {
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": "5",
          "X-RateLimit-Reset": "1700000000",
        },
      })
    );

    const { result } = renderHook(() => useAiEdit(), { wrapper });
    let data: any;
    await act(async () => {
      data = await result.current.mutateAsync({
        prompt: "Update",
        current_code: "#set page()",
        asset_names: [],
      });
    });

    expect(data.credits).toEqual({
      limit: 20,
      remaining: 5,
      resetAt: 1700000000 * 1000,
    });
  });

  it("returns null credits when headers are missing", async () => {
    postRaw.mockResolvedValue(
      new Response(JSON.stringify({ code: "#set page()", tokens_used: 12 }), {
        status: 200,
      })
    );

    const { result } = renderHook(() => useAiGenerate(), { wrapper });
    let data: any;
    await act(async () => {
      data = await result.current.mutateAsync({
        image_base64: "abc",
      });
    });

    expect(data.credits).toEqual({ limit: null, remaining: null, resetAt: null });
  });
});
