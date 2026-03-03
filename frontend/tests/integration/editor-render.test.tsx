import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { usePreviewRender } from "@/src/hooks/use-render";
import { api } from "@/src/lib/api";
import { useEditorStore } from "@/src/stores/editor";

function RenderRunner() {
  const { mutate } = usePreviewRender();
  useEffect(() => {
    mutate({ source: "#set page()", files: {}, data: {} });
  }, [mutate]);
  return null;
}

describe("editor render flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useEditorStore.getState().reset();
    vi.spyOn(api, "postRaw").mockResolvedValue(
      new Response(new Blob(["%PDF-1.4 test"], { type: "application/pdf" }), {
        headers: { "X-Render-Duration": "42" },
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useEditorStore.getState().reset();
  });

  it("stores pdf url after render", async () => {
    renderWithProviders(<RenderRunner />);
    await waitFor(() =>
      expect(useEditorStore.getState().pdfUrl).toBeTruthy()
    );
  });
});
