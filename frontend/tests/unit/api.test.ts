import { describe, expect, it, vi, beforeEach } from "vitest";
import { api } from "@/src/lib/api";
import { useAuthStore } from "@/src/stores/auth";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("api client", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
    vi.restoreAllMocks();
  });

  it("adds auth header when token exists", async () => {
    useAuthStore.setState({ token: "test-token", user: null });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await api.get("/v1/usage");

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/v1/usage",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("omits auth header when token missing", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await api.get("/v1/usage");

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/v1/usage",
      expect.objectContaining({
        headers: {},
      })
    );
  });

  it("clears auth on 401", async () => {
    useAuthStore.setState({ token: "test-token", user: null });
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "unauthorized", message: "401" }), {
        status: 401,
      })
    );

    await expect(api.get("/v1/usage")).rejects.toBeDefined();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("returns raw response for postRaw", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("PDF", { status: 200 })
    );

    const response = await api.postRaw("/v1/render/preview", { source: "" });

    expect(fetchSpy).toHaveBeenCalled();
    expect(response).toBeInstanceOf(Response);
  });
});
