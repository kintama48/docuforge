import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { FileExplorer } from "@/src/components/editor/FileExplorer";
import { useEditorStore } from "@/src/stores/editor";

describe("FileExplorer", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("renders single-file mode UI with main.typ", () => {
    renderWithProviders(<FileExplorer />);

    expect(screen.getByText("main.typ")).toBeInTheDocument();
    expect(
      screen.getByText(/single-file mode is enabled for a simpler editing flow/i)
    ).toBeInTheDocument();
  });

  it("activates main.typ when clicked", () => {
    useEditorStore.setState({
      activeFile: "notes.typ",
      files: { "main.typ": "content", "notes.typ": "notes" },
    } as any);

    renderWithProviders(<FileExplorer />);

    fireEvent.click(screen.getByText("main.typ"));

    expect(useEditorStore.getState().activeFile).toBe("main.typ");
  });

  it("does not expose add, rename, or delete controls in single-file mode", () => {
    renderWithProviders(<FileExplorer />);
    expect(screen.queryByText(/\+ add/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rename/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
  });
});
