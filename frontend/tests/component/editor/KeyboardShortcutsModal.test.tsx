import { describe, it, expect } from "vitest";
import { renderWithProviders } from "@/tests/helpers/render";
import { KeyboardShortcutsModal } from "@/src/components/editor/KeyboardShortcutsModal";

describe("KeyboardShortcutsModal", () => {
  it("renders shortcuts when open", () => {
    const { getByText } = renderWithProviders(
      <KeyboardShortcutsModal open={true} onClose={() => {}} />
    );

    expect(getByText("Ctrl+S / Cmd+S")).toBeInTheDocument();
    expect(getByText("Ctrl+K / Cmd+K")).toBeInTheDocument();
  });
});
