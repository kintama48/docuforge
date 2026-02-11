import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("shows validation error for invalid names", () => {
    renderWithProviders(<FileExplorer />);
    fireEvent.click(screen.getByText(/\+ add/i));
    fireEvent.change(screen.getByPlaceholderText(/utils.typ/i), {
      target: { value: "notes.txt" },
    });
    expect(screen.getByText(/must end/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add file/i })).toBeDisabled();
  });

  it("rejects reserved and duplicate filenames", () => {
    useEditorStore.setState({ files: { "utils.typ": "content" } } as any);
    renderWithProviders(<FileExplorer />);
    fireEvent.click(screen.getByText(/\+ add/i));
    fireEvent.change(screen.getByPlaceholderText(/utils.typ/i), {
      target: { value: "main.typ" },
    });
    expect(screen.getByText(/reserved/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/utils.typ/i), {
      target: { value: "utils.typ" },
    });
    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
  });

  it("renames files from the rename modal", () => {
    useEditorStore.setState({
      files: { "utils.typ": "content" },
      activeFile: "utils.typ",
    } as any);
    renderWithProviders(<FileExplorer />);

    fireEvent.click(screen.getByText(/rename/i));
    const input = screen.getByDisplayValue("utils.typ");
    fireEvent.change(input, { target: { value: "helpers.typ" } });
    const renameButtons = screen.getAllByRole("button", { name: /rename/i });
    fireEvent.click(renameButtons[1]);

    expect(screen.getByText("helpers.typ")).toBeInTheDocument();
  });

  it("prevents invalid rename and allows cancel", () => {
    const renameFile = vi.fn();
    useEditorStore.setState({
      files: { "utils.typ": "content" },
      activeFile: "utils.typ",
      renameFile,
    } as any);
    renderWithProviders(<FileExplorer />);

    fireEvent.click(screen.getByText(/rename/i));
    fireEvent.change(screen.getByDisplayValue("utils.typ"), {
      target: { value: "main.typ" },
    });
    const renameButtons = screen.getAllByRole("button", { name: /rename/i });
    expect(renameButtons[1]).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(renameFile).not.toHaveBeenCalled();
  });

  it("deletes files after confirmation", () => {
    useEditorStore.setState({
      files: { "utils.typ": "content" },
      activeFile: "utils.typ",
    } as any);
    renderWithProviders(<FileExplorer />);

    fireEvent.click(screen.getByText(/delete/i));
    fireEvent.click(screen.getAllByRole("button", { name: /delete/i })[1]);

    expect(screen.queryByText("utils.typ")).not.toBeInTheDocument();
  });
});
