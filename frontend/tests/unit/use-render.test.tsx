import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePreviewRender } from "@/src/hooks/use-render";
import { useEditorStore } from "@/src/stores/editor";

const postRaw = vi.fn();

vi.mock("@/src/lib/api", () => ({
  api: { postRaw: (...args: any[]) => postRaw(...args) },
}));

describe("usePreviewRender", () => {
  function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    postRaw.mockReset();
    useEditorStore.setState({
      setPdfResult: vi.fn(),
      setRenderError: vi.fn(),
      setRateLimitUntil: vi.fn(),
      renderStatus: "idle",
    } as any);
  });

  it("sets pdf result on success", async () => {
    postRaw.mockResolvedValue(
      new Response(new Blob(["pdf"]), {
        status: 200,
        headers: { "X-Render-Duration": "12" },
      })
    );

    const { result } = renderHook(() => usePreviewRender(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ source: "= Hi", files: {}, data: {} });
    });

    const setPdfResult = useEditorStore.getState().setPdfResult as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(setPdfResult).toHaveBeenCalled();
  });

  it("defaults render duration when header is missing", async () => {
    postRaw.mockResolvedValue(
      new Response(new Blob(["pdf"]), {
        status: 200,
      })
    );

    const { result } = renderHook(() => usePreviewRender(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ source: "= Hi", files: {}, data: {} });
    });

    const setPdfResult = useEditorStore.getState().setPdfResult as unknown as ReturnType<
      typeof vi.fn
    >;
    const call = (setPdfResult as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1]).toBe(0);
  });

  it("handles rate limited errors", async () => {
    postRaw.mockRejectedValue({
      error: "rate_limited",
      details: { retryAfter: 2 },
    });

    const { result } = renderHook(() => usePreviewRender(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ source: "= Hi", files: {}, data: {} }).catch(() => {});
    });

    const setRateLimitUntil = useEditorStore.getState().setRateLimitUntil as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(setRateLimitUntil).toHaveBeenCalled();
  });

  it("defaults retryAfter when missing", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);
    postRaw.mockRejectedValue({ error: "rate_limited", details: {} });

    const { result } = renderHook(() => usePreviewRender(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ source: "= Hi", files: {}, data: {} }).catch(() => {});
    });

    const setRateLimitUntil = useEditorStore.getState().setRateLimitUntil as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(setRateLimitUntil).toHaveBeenCalledWith(6000);
    nowSpy.mockRestore();
  });

  it("handles compile errors", async () => {
    postRaw.mockRejectedValue({
      error: "compile_error",
      message: "Bad",
      details: { file: "main.typ", line: 2, column: 3 },
    });

    const { result } = renderHook(() => usePreviewRender(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ source: "= Hi", files: {}, data: {} }).catch(() => {});
    });

    const setRenderError = useEditorStore.getState().setRenderError as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(setRenderError).toHaveBeenCalledWith({
      message: "Bad",
      file: "main.typ",
      line: 2,
      column: 3,
    });
  });

  it("falls back to default compile error details", async () => {
    postRaw.mockRejectedValue({
      error: "compile_error",
      details: {},
    });

    const { result } = renderHook(() => usePreviewRender(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ source: "= Hi", files: {}, data: {} }).catch(() => {});
    });

    const setRenderError = useEditorStore.getState().setRenderError as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(setRenderError).toHaveBeenCalledWith({
      message: "Compilation error",
      file: "main.typ",
      line: 1,
      column: 1,
    });
  });

  it("handles generic errors", async () => {
    postRaw.mockRejectedValue({ error: "server_error" });

    const { result } = renderHook(() => usePreviewRender(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ source: "= Hi", files: {}, data: {} }).catch(() => {});
    });

    const setRenderError = useEditorStore.getState().setRenderError as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(setRenderError).toHaveBeenCalledWith({
      message: "Render failed",
      file: "main.typ",
      line: 1,
      column: 1,
    });
  });

  it("ignores abort errors", async () => {
    postRaw.mockRejectedValue({ name: "AbortError" });

    const { result } = renderHook(() => usePreviewRender(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ source: "= Hi", files: {}, data: {} }).catch(() => {});
    });

    const setRenderError = useEditorStore.getState().setRenderError as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(setRenderError).not.toHaveBeenCalled();
  });

  it("aborts previous request before starting a new one", async () => {
    const signals: AbortSignal[] = [];
    postRaw.mockImplementation((_path: string, _body: unknown, signal?: AbortSignal) => {
      if (signal) signals.push(signal);
      return Promise.resolve(new Response(new Blob(["pdf"]), { status: 200 }));
    });

    const { result } = renderHook(() => usePreviewRender(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ source: "= Hi", files: {}, data: {} });
      await result.current.mutateAsync({ source: "= Hi", files: {}, data: {} });
    });

    expect(signals.length).toBeGreaterThanOrEqual(2);
    expect(signals[0].aborted).toBe(true);
  });

  it("supports low_code_spec payloads", async () => {
    postRaw.mockResolvedValue(
      new Response(new Blob(["pdf"]), {
        status: 200,
        headers: { "X-Render-Duration": "7" },
      })
    );

    const { result } = renderHook(() => usePreviewRender(), { wrapper });
    const lowCodeSpec = {
      version: 1 as const,
      blocks: [{ type: "paragraph" as const, props: { text: "Hello" } }],
    };

    await act(async () => {
      await result.current.mutateAsync({ low_code_spec: lowCodeSpec, data: {} });
    });

    expect(postRaw).toHaveBeenCalledWith(
      "/v1/render/preview",
      { low_code_spec: lowCodeSpec, data: {} },
      expect.any(AbortSignal)
    );
  });
});
