import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { AiResponseView } from "@/src/components/ai/AiResponseView";

vi.mock("@monaco-editor/react", () => ({
  DiffEditor: (props: { modified: string }) => (
    <div data-testid="diff-editor">{props.modified}</div>
  ),
}));

describe("AiResponseView", () => {
  it("renders response and handles actions", () => {
    const onApply = vi.fn();
    const onDiscard = vi.fn();

    renderWithProviders(
      <AiResponseView
        response="#set page()"
        original="original"
        onApply={onApply}
        onDiscard={onDiscard}
      />
    );

    expect(screen.getByText(/ai response/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(onApply).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /discard/i }));
    expect(onDiscard).toHaveBeenCalled();
  });
});
