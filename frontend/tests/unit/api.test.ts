import { describe, expect, it, vi, beforeEach } from "vitest";
import { api } from "@/src/lib/api";
import { useAuthStore } from "@/src/stores/auth";
import { toast } from "sonner";

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
      "http://localhost:3000/console/usage",
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
      "http://localhost:3000/console/usage",
      expect.objectContaining({
        headers: {},
      })
    );
  });

  it("refreshes session and retries once after 401", async () => {
    useAuthStore.setState({
      token: "expired-token",
      user: { id: "usr_1", email: "test@example.com", plan: "free" },
    });

    let usageCallCount = 0;
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/console/usage")) {
        usageCallCount += 1;
        if (usageCallCount === 1) {
          return new Response(
            JSON.stringify({ error: "unauthorized", message: "expired" }),
            { status: 401 }
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (url.endsWith("/console/auth/refresh")) {
        return new Response(
          JSON.stringify({
            token: "new-token",
            user: { id: "usr_1", email: "test@example.com", plan: "free" },
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ message: "Logged out" }), {
        status: 200,
      });
    });

    const result = await api.get<{ ok: boolean }>("/v1/usage");
    expect(result.ok).toBe(true);
    expect(useAuthStore.getState().token).toBe("new-token");
  });

  it("clears auth on 401 when refresh fails", async () => {
    useAuthStore.setState({ token: "test-token", user: null });
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/console/usage")) {
        return new Response(
          JSON.stringify({ error: "unauthorized", message: "expired" }),
          { status: 401 }
        );
      }
      if (url.endsWith("/console/auth/refresh")) {
        return new Response(
          JSON.stringify({ error: "unauthorized", message: "refresh failed" }),
          { status: 401 }
        );
      }
      return new Response(JSON.stringify({ message: "Logged out" }), {
        status: 200,
      });
    });

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

  it("handles 204 responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
    } as any);
    const result = await api.delete("/v1/templates/1");
    expect(result).toBeNull();
  });

  it("handles invalid JSON errors", async () => {
    const response = new Response("not-json", { status: 400 });
    const jsonSpy = vi.spyOn(response, "json").mockRejectedValue(new Error("bad"));
    vi.spyOn(global, "fetch").mockResolvedValue(response);

    await expect(api.get("/v1/usage")).rejects.toBeDefined();
    expect(jsonSpy).toHaveBeenCalled();
  });

  it("handles status based toasts", async () => {
    const toastSpy = vi.mocked(toast.error);

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "payment", message: "402" }), {
        status: 402,
      })
    );
    await expect(api.get("/v1/usage")).rejects.toBeDefined();
    expect(toastSpy).toHaveBeenCalledWith("Upgrade required to continue.");

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "rate_limited", message: "429", details: { retryAfter: 3 } }), {
        status: 429,
      })
    );
    await expect(api.get("/v1/usage")).rejects.toBeDefined();
    expect(toastSpy).toHaveBeenCalledWith("Rate limited — try again in 3 seconds.");

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "rate_limited", message: "429" }), {
        status: 429,
      })
    );
    await expect(api.get("/v1/usage")).rejects.toBeDefined();
    expect(toastSpy).toHaveBeenCalledWith("Rate limited — try again shortly.");

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "server_error", message: "500" }), {
        status: 500,
      })
    );
    await expect(api.get("/v1/usage")).rejects.toBeDefined();
    expect(toastSpy).toHaveBeenCalledWith("Something went wrong. Please retry.");
  });

  it("does not set content-type for FormData", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["data"]), "file.txt");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await api.post("/v1/assets", formData);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/console/assets",
      expect.objectContaining({
        headers: expect.not.objectContaining({ "Content-Type": "application/json" }),
      })
    );
  });

  it("handles postRaw errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "bad_request", message: "400" }), {
        status: 400,
      })
    );

    await expect(api.postRaw("/v1/render/preview", { source: "" })).rejects.toBeDefined();
  });
});
