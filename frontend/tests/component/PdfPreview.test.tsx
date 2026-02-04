import { describe, expect, it, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { PdfPreview } from "@/src/components/editor/PdfPreview";
import { useEditorStore } from "@/src/stores/editor";

describe("PdfPreview", () => {
  beforeEach(() => {
    useEditorStore.setState({ pdfUrl: null, renderStatus: "idle" });
  });

  it("shows placeholder when no PDF", () => {
    renderWithProviders(<PdfPreview />);
    expect(
      screen.getByText(/press ctrl\+s or edit code/i)
    ).toBeInTheDocument();
  });
});
