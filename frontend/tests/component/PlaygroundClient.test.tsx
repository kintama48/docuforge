import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import PlaygroundClient from "@/src/app/playground/playground-client";

const sessionResponse = {
  session_id: "pps_test_123",
  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  remaining_renders: 30,
};

const sessionPath = "/v1/render/public/session";
const previewPath = "/v1/render/public/preview";

function getRequestUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe("PlaygroundClient", () => {
  const createPreviewResponse = (remainingRenders = "29") =>
    new Response("%PDF-1.4 playground-test", {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "X-Preview-Session-Remaining-Renders": remainingRenders,
        "X-Preview-Session-Expires-At": new Date(Date.now() + 4 * 60 * 1000).toISOString(),
      },
    });

  const createSessionResponse = () =>
    new Response(JSON.stringify(sessionResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = getRequestUrl(input);

      if (url.includes(sessionPath)) {
        return createSessionResponse();
      }

      if (url.includes(previewPath)) {
        return createPreviewResponse();
      }

      throw new Error(`Unhandled fetch in PlaygroundClient test: ${url}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens Typst mode and editor when advanced button is clicked", async () => {
    renderWithProviders(<PlaygroundClient />);

    await waitFor(() => {
      expect(screen.getByText(/remaining previews:/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /typst \(advanced\)/i }));

    expect(screen.getByText(/typst source/i)).toBeInTheDocument();
    expect(screen.queryByText(/session:/i)).not.toBeInTheDocument();
  });

  it("runs preview and renders iframe output", async () => {
    renderWithProviders(<PlaygroundClient />);

    await waitFor(() => {
      expect(
        vi.mocked(globalThis.fetch).mock.calls.some(([input]) => getRequestUrl(input).includes(previewPath))
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByTitle(/docuforge playground preview/i)).toBeInTheDocument();
    }, { timeout: 4000 });

    const previewFrame = screen.getByTestId("playground-preview-frame");
    expect(previewFrame).toHaveClass("overflow-hidden");
    expect(previewFrame).toHaveClass("isolate");

    expect(screen.getByText(/remaining previews: 29/i)).toBeInTheDocument();
  });

  it("shows console-style block controls in quick edits mode", async () => {
    const previewBodies: Array<Record<string, unknown>> = [];

    vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      const url = getRequestUrl(input);

      if (url.includes(sessionPath)) {
        return new Response(JSON.stringify(sessionResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes(previewPath)) {
        if (typeof init?.body === "string") {
          previewBodies.push(JSON.parse(init.body) as Record<string, unknown>);
        }
        return createPreviewResponse();
      }

      throw new Error(`Unhandled fetch in PlaygroundClient test: ${url}`);
    });

    renderWithProviders(<PlaygroundClient />);

    fireEvent.click(screen.getByRole("button", { name: /edit template/i }));
    expect(screen.getByRole("button", { name: /\+ header/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(previewBodies.length).toBeGreaterThan(0);
    }, { timeout: 4000 });

    fireEvent.click(screen.getByRole("button", { name: /\+ divider/i }));

    await waitFor(() => {
      expect(
        previewBodies.some((body) => {
          const spec = body.low_code_spec as { blocks?: unknown[] } | undefined;
          return Array.isArray(spec?.blocks) && spec.blocks.length === 5;
        })
      ).toBe(true);
    }, { timeout: 4000 });
  });

  it("shows a hint popup that fades out automatically", async () => {
    renderWithProviders(<PlaygroundClient />);

    const hint = screen.getByRole("status");
    expect(hint).toHaveClass("opacity-100");

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveClass("opacity-0");
    }, { timeout: 4000 });
  }, 7000);
});
