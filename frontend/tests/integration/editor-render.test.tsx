import { describe, expect, it } from "vitest";
import { useEffect } from "react";
import { waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { usePreviewRender } from "@/src/hooks/use-render";
import { useEditorStore } from "@/src/stores/editor";

function RenderRunner() {
  const preview = usePreviewRender();
  useEffect(() => {
    preview.mutate({ source: "#set page()", files: {}, data: {} });
  }, [preview]);
  return null;
}

describe("editor render flow", () => {
  it("stores pdf url after render", async () => {
    renderWithProviders(<RenderRunner />);
    await waitFor(() =>
      expect(useEditorStore.getState().pdfUrl).toBeTruthy()
    );
  });
});
