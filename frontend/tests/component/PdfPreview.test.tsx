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

  it("renders iframe and shows rendering overlay", () => {
    useEditorStore.setState({
      pdfUrl: "blob:preview",
      renderStatus: "rendering",
    } as any);

    renderWithProviders(<PdfPreview />);
    expect(screen.getByTitle(/pdf preview/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rendering/i).length).toBeGreaterThan(0);
  });

  it("shows ready state when preview is available", () => {
    useEditorStore.setState({
      pdfUrl: "blob:preview",
      renderStatus: "success",
    } as any);

    renderWithProviders(<PdfPreview />);
    expect(screen.getByText(/ready/i)).toBeInTheDocument();
  });
});
