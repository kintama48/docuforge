import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";
import { DiagnosticsPanel } from "@/src/components/editor/DiagnosticsPanel";
import { useEditorStore } from "@/src/stores/editor";

describe("DiagnosticsPanel", () => {
  beforeEach(() => {
    useEditorStore.setState({
      renderError: {
        message: "Bad",
        file: "main.typ",
        line: 2,
        column: 3,
      },
      renderDuration: 120,
      revealError: vi.fn(),
    } as any);
  });

  it("renders errors and allows reveal", () => {
    renderWithProviders(<DiagnosticsPanel />);

    fireEvent.click(screen.getByText(/main.typ/i));
    const revealError = useEditorStore.getState().revealError as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(revealError).toHaveBeenCalledWith(2, 3);
  });

  it("shows empty state when no errors", () => {
    useEditorStore.setState({ renderError: null } as any);
    renderWithProviders(<DiagnosticsPanel />);
    expect(screen.getByText(/no errors/i)).toBeInTheDocument();
  });
});
