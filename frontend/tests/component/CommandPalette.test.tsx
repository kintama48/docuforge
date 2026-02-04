import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { CommandPalette } from "@/src/components/editor/CommandPalette";

describe("CommandPalette", () => {
  it("invokes command on select", () => {
    const action = vi.fn();
    renderWithProviders(
      <CommandPalette
        open={true}
        onClose={() => {}}
        items={[
          {
            id: "dashboard",
            label: "Go to Dashboard",
            onSelect: action,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByText(/go to dashboard/i));
    expect(action).toHaveBeenCalled();
  });
});
