import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";
import { LowCodeBlocksPanel } from "@/src/components/editor/LowCodeBlocksPanel";
import { useEditorStore } from "@/src/stores/editor";

describe("LowCodeBlocksPanel", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("shows fallback when guided spec is unavailable", () => {
    renderWithProviders(<LowCodeBlocksPanel />);
    expect(
      screen.getByText(/Blocks are not available for this template/i)
    ).toBeInTheDocument();
  });

  it("calls setLowCodeSpec when adding a block", () => {
    const setLowCodeSpec = vi.fn();
    useEditorStore.setState({
      lowCodeSpec: {
        version: 1,
        blocks: [{ type: "paragraph", props: { text: "Hello" } }],
      },
      setLowCodeSpec,
    } as any);

    renderWithProviders(<LowCodeBlocksPanel />);
    fireEvent.click(screen.getByRole("button", { name: /\+ Header/i }));

    expect(setLowCodeSpec).toHaveBeenCalledTimes(1);
    const next = setLowCodeSpec.mock.calls[0]?.[0];
    expect(next.blocks).toHaveLength(2);
    expect(next.blocks[1]?.type).toBe("header");
  });

  it("keeps one selected table column minimum", () => {
    useEditorStore.setState({
      lowCodeSpec: {
        version: 1,
        blocks: [
          {
            type: "line_items_table",
            props: { columns: ["name"] },
          },
        ],
      },
    } as any);

    renderWithProviders(<LowCodeBlocksPanel />);
    const checkbox = screen.getByRole("checkbox", { name: /name/i });
    expect(checkbox).toBeDisabled();
  });
});
