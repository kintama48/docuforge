import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { FileExplorer } from "@/src/components/editor/FileExplorer";
import { useEditorStore } from "@/src/stores/editor";

describe("FileExplorer", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("adds a new file", () => {
    renderWithProviders(<FileExplorer />);
    fireEvent.click(screen.getByText(/\+ add/i));
    fireEvent.change(screen.getByPlaceholderText(/utils.typ/i), {
      target: { value: "utils.typ" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add file/i }));
    expect(screen.getByText("utils.typ")).toBeInTheDocument();
  });
});
