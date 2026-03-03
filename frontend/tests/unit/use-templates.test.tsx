import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useTemplates,
  useTemplate,
  useCreateTemplate,
  usePublishVersion,
  useForkTemplate,
  useDeleteTemplate,
  useUpdateTemplate,
  useTemplateVersion,
} from "@/src/hooks/use-templates";
import { api } from "@/src/lib/api";

const pushSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushSpy,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/src/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("use-templates hooks", () => {
  function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.delete).mockReset();
    pushSpy.mockReset();
  });

  it("fetches templates with includeOfficial flag", async () => {
    vi.mocked(api.get).mockResolvedValue({ templates: [], pagination: { page: 1, limit: 10, total: 0 } } as any);
    renderHook(() => useTemplates(false), { wrapper });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/v1/templates?include_official=false");
    });
  });

  it("fetches template by id", async () => {
    vi.mocked(api.get).mockResolvedValue({ template: { id: "tpl" } } as any);
    renderHook(() => useTemplate("tpl"), { wrapper });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/v1/templates/tpl");
    });
  });

  it("creates templates and navigates", async () => {
    vi.mocked(api.post).mockResolvedValue({ template: { id: "tpl_1" } } as any);
    const { result } = renderHook(() => useCreateTemplate(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: "New", source: "#set page()" });
    });

    expect(api.post).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith("/editor/tpl_1");
  });

  it("publishes versions using default id", async () => {
    vi.mocked(api.post).mockResolvedValue({ version: { version_number: 2 } } as any);
    const { result } = renderHook(() => usePublishVersion("tpl_1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ source: "#set page()", files: {}, defaults: {} });
    });

    expect(api.post).toHaveBeenCalledWith("/v1/templates/tpl_1/publish", expect.any(Object));
  });

  it("forks templates and respects navigate=false", async () => {
    vi.mocked(api.post).mockResolvedValue({ template: { id: "tpl_2" } } as any);
    const { result } = renderHook(() => useForkTemplate({ navigate: false }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "tpl_1", name: "Fork" });
    });

    expect(api.post).toHaveBeenCalledWith("/v1/templates/tpl_1/fork", { name: "Fork" });
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("deletes templates and redirects", async () => {
    vi.mocked(api.delete).mockResolvedValue({} as any);
    const { result } = renderHook(() => useDeleteTemplate("tpl_3"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(api.delete).toHaveBeenCalledWith("/v1/templates/tpl_3");
    expect(pushSpy).toHaveBeenCalledWith("/dashboard");
  });

  it("updates templates", async () => {
    vi.mocked(api.patch).mockResolvedValue({ template: { id: "tpl_4" } } as any);
    const { result } = renderHook(() => useUpdateTemplate("tpl_4"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: "Updated" });
    });

    expect(api.patch).toHaveBeenCalledWith("/v1/templates/tpl_4", { name: "Updated" });
  });

  it("fetches template versions", async () => {
    vi.mocked(api.get).mockResolvedValue({ version: { id: "ver_1" } } as any);
    const { result } = renderHook(() => useTemplateVersion("tpl_5"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("ver_1");
    });

    expect(api.get).toHaveBeenCalledWith("/v1/templates/tpl_5/versions/ver_1");
  });

  it("creates template with low_code_spec payload", async () => {
    vi.mocked(api.post).mockResolvedValue({ template: { id: "tpl_low_code" } } as any);
    const { result } = renderHook(() => useCreateTemplate(), { wrapper });

    const lowCodeSpec = {
      version: 1 as const,
      blocks: [{ type: "header" as const, props: { title: "{{invoice.title}}" } }],
    };

    await act(async () => {
      await result.current.mutateAsync({ name: "Guided", low_code_spec: lowCodeSpec });
    });

    expect(api.post).toHaveBeenCalledWith("/v1/templates", {
      name: "Guided",
      low_code_spec: lowCodeSpec,
    });
  });

  it("publishes version with low_code_spec payload", async () => {
    vi.mocked(api.post).mockResolvedValue({ version: { version_number: 3 } } as any);
    const { result } = renderHook(() => usePublishVersion("tpl_1"), { wrapper });

    const lowCodeSpec = {
      version: 1 as const,
      blocks: [{ type: "paragraph" as const, props: { text: "{{invoice.notes}}" } }],
    };

    await act(async () => {
      await result.current.mutateAsync({ low_code_spec: lowCodeSpec });
    });

    expect(api.post).toHaveBeenCalledWith("/v1/templates/tpl_1/publish", {
      files: undefined,
      defaults: undefined,
      commit_message: undefined,
      low_code_spec: lowCodeSpec,
    });
  });
});
