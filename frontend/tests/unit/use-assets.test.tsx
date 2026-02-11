import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAssets, useUploadAsset, useDeleteAsset } from "@/src/hooks/use-assets";

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiDelete = vi.fn();

if (!globalThis.crypto?.subtle) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  globalThis.crypto = { subtle: { digest: vi.fn() } };
}

vi.mock("@/src/lib/api", () => ({
  api: {
    get: (...args: any[]) => apiGet(...args),
    post: (...args: any[]) => apiPost(...args),
    delete: (...args: any[]) => apiDelete(...args),
  },
}));

describe("use-assets", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiDelete.mockReset();
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  it("fetches assets", async () => {
    apiGet.mockResolvedValue({ assets: [] });
    const { result } = renderHook(() => useAssets(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiGet).toHaveBeenCalledWith("/v1/assets");
  });

  it("uploads asset and confirms", async () => {
    const uploadUrl = { upload_url: "https://upload.local", asset_id: "asset-1" };
    apiPost
      .mockResolvedValueOnce(uploadUrl)
      .mockResolvedValueOnce({ ok: true });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    const digestSpy = vi
      .spyOn(globalThis.crypto.subtle, "digest")
      .mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);

    const { result } = renderHook(() => useUploadAsset(), { wrapper });
    const file = new File(["data"], "logo.png", { type: "image/png" }) as File & {
      arrayBuffer: () => Promise<ArrayBuffer>;
    };
    file.arrayBuffer = async () => new TextEncoder().encode("data").buffer;

    await act(async () => {
      await result.current.mutateAsync(file);
    });

    expect(apiPost).toHaveBeenCalledWith("/v1/assets/upload-url", {
      filename: "logo.png",
      content_type: "image/png",
      size_bytes: file.size,
    });
    expect(fetchSpy).toHaveBeenCalledWith("https://upload.local", {
      method: "PUT",
      body: file,
    });

    expect(apiPost).toHaveBeenCalledWith("/v1/assets", {
      asset_id: "asset-1",
      name: "logo.png",
      hash: "010203",
    });

    fetchSpy.mockRestore();
    digestSpy.mockRestore();
  });

  it("deletes asset", async () => {
    apiDelete.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useDeleteAsset(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("asset-1");
    });

    expect(apiDelete).toHaveBeenCalledWith("/v1/assets/asset-1");
  });
});
