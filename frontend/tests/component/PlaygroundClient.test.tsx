import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "../helpers/render";
import { server } from "../helpers/msw-server";
import PlaygroundClient from "@/src/app/playground/playground-client";

const sessionResponse = {
  session_id: "pps_test_123",
  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  remaining_renders: 30,
};

describe("PlaygroundClient", () => {
  beforeEach(() => {
    server.use(
      http.post("http://localhost:3000/v1/render/public/session", async () =>
        HttpResponse.json(sessionResponse)
      ),
      http.post("http://localhost:3000/v1/render/public/preview", async () =>
        new HttpResponse(new Blob(["%PDF-1.4 playground-test"], { type: "application/pdf" }), {
          headers: {
            "Content-Type": "application/pdf",
            "X-Preview-Session-Remaining-Renders": "29",
            "X-Preview-Session-Expires-At": new Date(Date.now() + 4 * 60 * 1000).toISOString(),
          },
        })
      )
    );
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
      expect(screen.getByTitle(/docuforge playground preview/i)).toBeInTheDocument();
    }, { timeout: 4000 });

    const previewFrame = screen.getByTestId("playground-preview-frame");
    expect(previewFrame).toHaveClass("overflow-hidden");
    expect(previewFrame).toHaveClass("isolate");

    expect(screen.getByText(/remaining previews: 29/i)).toBeInTheDocument();
  });

  it("shows console-style block controls in quick edits mode", async () => {
    const previewBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post("http://localhost:3000/v1/render/public/preview", async ({ request }) => {
        previewBodies.push((await request.json()) as Record<string, unknown>);
        return new HttpResponse(new Blob(["%PDF-1.4 playground-test"], { type: "application/pdf" }), {
          headers: {
            "Content-Type": "application/pdf",
            "X-Preview-Session-Remaining-Renders": "29",
            "X-Preview-Session-Expires-At": new Date(Date.now() + 4 * 60 * 1000).toISOString(),
          },
        });
      })
    );

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
